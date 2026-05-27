import { readFileSync, watch, FSWatcher } from "fs";
import { writeFile } from "node:fs/promises";
import { AnyObject, Profile, Template } from '../util/type';
import { Node } from "./node";

let template: Template | undefined = undefined;
let templatePath: string | undefined = undefined;
let watcher: FSWatcher | undefined = undefined;
let reloadTimer: NodeJS.Timeout | undefined = undefined;

const BUILTIN_OUTBOUND_TYPES = new Set(['selector', 'urltest', 'direct', 'block']);

function Clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function TagOf(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function IsPlainIPv4(value: string) {
    return /^\d+\.\d+\.\d+\.\d+$/.test(value);
}

function IsPlainIPv6(value: string) {
    return value.includes(':') && /^[0-9a-f:]+$/i.test(value);
}

function IsDomainAddress(value: unknown): value is string {
    if (typeof value !== 'string' || !value.trim()) return false;
    return !IsPlainIPv4(value) && !IsPlainIPv6(value);
}

function ResolveDnsBootstrapTag(skeleton: AnyObject, dns: AnyObject, servers: AnyObject[]) {
    const route = skeleton.route && typeof skeleton.route === 'object' && !Array.isArray(skeleton.route)
        ? skeleton.route as AnyObject
        : {};
    const routeResolver = route.default_domain_resolver;
    if (typeof routeResolver === 'string' && routeResolver.trim()) return routeResolver.trim();
    if (routeResolver && typeof routeResolver === 'object') {
        const server = TagOf(routeResolver.server);
        if (server) return server;
    }

    const final = TagOf(dns.final);
    if (final) return final;

    return TagOf(servers[0]?.tag);
}

function WithDomainResolver(server: AnyObject, resolverTag: string) {
    if (!resolverTag || !IsDomainAddress(server.server) || server.domain_resolver) return server;
    return {
        ...server,
        domain_resolver: resolverTag,
    };
}

function WithOutboundDomainResolver(node: Node, resolverTag: string): Node {
    const outbound = node as AnyObject;
    if (!resolverTag || !IsDomainAddress(node.server) || outbound.domain_resolver) return node;
    return {
        ...node,
        domain_resolver: {
            server: resolverTag,
        },
    };
}

function DedupeNodes(nodes: Node[]): Node[] {
    const usedTags = new Set<string>();
    return nodes.map((node) => {
        const tag = TagOf(node.tag);
        let uniqueTag = tag;
        let index = 2;

        while (usedTags.has(uniqueTag)) {
            uniqueTag = `${tag} (${index})`;
            index += 1;
        }

        usedTags.add(uniqueTag);
        return uniqueTag === tag ? node : { ...node, tag: uniqueTag };
    });
}

export function LoadTemplate(path: string) {
    templatePath = path;
    const content = readFileSync(path, { encoding: 'utf8' });
    template = JSON.parse(content);
    return template;
}

export function GetTemplate() {
    return template;
}

export function GetTemplateContent() {
    if (!templatePath) throw new Error('template path is not initialized');
    return readFileSync(templatePath, { encoding: 'utf8' });
}

export function GetTemplatePath() {
    return templatePath;
}

export async function SaveTemplate(content: string) {
    if (!templatePath) throw new Error('template path is not initialized');
    const nextTemplate = JSON.parse(content);
    await writeFile(templatePath, JSON.stringify(nextTemplate, null, 2), { encoding: 'utf8' });
    template = nextTemplate;
}

export function WatchTemplate() {
    if (!templatePath) throw new Error('template path is not initialized');
    watcher?.close();
    watcher = watch(templatePath, () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
            try {
                LoadTemplate(templatePath as string);
            } catch (error) {
                console.error('Failed to reload template:', error);
            }
        }, 100);
    });
}

export function MergeTemplate(template: Template, nodes: Node[]): Template {
    const skeleton = Clone(template) as AnyObject;
    if (!Array.isArray(skeleton.outbounds)) {
        throw new Error('template outbounds[] is required');
    }

    const mergedNodes = DedupeNodes(nodes);
    const nodeTags = mergedNodes.map((node) => TagOf(node.tag)).filter(Boolean);
    const kept = (skeleton.outbounds as AnyObject[]).filter((outbound) =>
        BUILTIN_OUTBOUND_TYPES.has(String(outbound?.type || '').toLowerCase())
    );

    const selectorTag = '🚀 节点选择';
    const autoTag = '🎈 自动选择';
    const directTag = '🎯 全球直连';
    const fallbackTag = '🐟 漏网之鱼';
    const globalTag = 'GLOBAL';

    for (const outbound of kept) {
        if (!Array.isArray(outbound.outbounds)) continue;

        const tag = TagOf(outbound.tag);
        const type = String(outbound.type || '').toLowerCase();

        if (type === 'selector' && tag === selectorTag) outbound.outbounds = [autoTag, ...nodeTags];
        if (type === 'urltest' && tag === autoTag) outbound.outbounds = [...nodeTags];
        if (type === 'selector' && tag === fallbackTag) outbound.outbounds = [selectorTag, directTag];
        if (type === 'selector' && tag === globalTag) outbound.outbounds = [selectorTag, autoTag, directTag, fallbackTag];
    }

    skeleton.outbounds = [...kept, ...mergedNodes];
    return skeleton as Template;
}

function MergeDnsProfiles(skeleton: AnyObject, profiles: Profile[]) {
    const dnsProfiles = profiles.filter((profile) => profile.dns && profile.dns.servers.length > 0);
    if (dnsProfiles.length === 0) {
        console.info(`[template] no profile dns to merge profiles=${profiles.length}`);
        return;
    }

    if (!skeleton.dns || typeof skeleton.dns !== 'object' || Array.isArray(skeleton.dns)) {
        skeleton.dns = {};
    }

    const dns = skeleton.dns as AnyObject;
    const servers = Array.isArray(dns.servers) ? dns.servers : [];
    const bootstrapResolverTag = ResolveDnsBootstrapTag(skeleton, dns, servers);

    for (const profile of dnsProfiles) {
        const profileDns = profile.dns;
        if (!profileDns) continue;

        const profileServers = profileDns.servers.map((server) => WithDomainResolver(server, bootstrapResolverTag));
        servers.push(...profileServers);
        console.info(`[template] merging dns profile=${profile.name} servers=${profileDns.servers.length} resolver=${bootstrapResolverTag} selected=${profileDns.servers[0]?.tag ?? ''}`);
    }

    dns.servers = servers;
    if (!dns.final && servers[0]?.tag) dns.final = servers[0].tag;
    console.info(`[template] merged dns profiles=${dnsProfiles.length} totalServers=${servers.length}`);
}

function ResolveProfileNodes(profiles: Profile[]): Node[] {
    return profiles.flatMap((profile) => {
        const nodes = profile.nodes as Node[];
        const resolverTag = TagOf(profile.dns?.servers[0]?.tag);
        if (!resolverTag) return nodes;

        let resolved = 0;
        const nextNodes = nodes.map((node) => {
            const nextNode = WithOutboundDomainResolver(node, resolverTag);
            if (nextNode !== node) resolved += 1;
            return nextNode;
        });

        console.info(`[template] applied outbound domain resolver profile=${profile.name} resolver=${resolverTag} nodes=${resolved}`);
        return nextNodes;
    });
}

export function MergeProfiles(template: Template, profiles: Profile[]): Template {
    const nodes = ResolveProfileNodes(profiles);
    console.info(`[template] merging profiles=${profiles.length} nodes=${nodes.length}`);
    const merged = MergeTemplate(template, nodes) as AnyObject;
    MergeDnsProfiles(merged, profiles);
    return merged as Template;
}
