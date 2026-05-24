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
    const dnsProfiles = profiles.filter((profile) => profile.dns && profile.dns.servers.length > 0 && profile.dns.nodeDomains.length > 0);
    if (dnsProfiles.length === 0) return;

    if (!skeleton.dns || typeof skeleton.dns !== 'object' || Array.isArray(skeleton.dns)) {
        skeleton.dns = {};
    }

    const dns = skeleton.dns as AnyObject;
    const servers = Array.isArray(dns.servers) ? dns.servers : [];
    const rules = Array.isArray(dns.rules) ? dns.rules : [];
    const profileRules: AnyObject[] = [];

    for (const profile of dnsProfiles) {
        const profileDns = profile.dns;
        if (!profileDns) continue;

        servers.push(...profileDns.servers);

        profileRules.push({
            action: 'route',
            domain: profileDns.nodeDomains,
            server: profileDns.servers[0]?.tag,
        });
    }

    dns.servers = servers;
    dns.rules = [...profileRules, ...rules];
    if (!dns.final && servers[0]?.tag) dns.final = servers[0].tag;
}

export function MergeProfiles(template: Template, profiles: Profile[]): Template {
    const nodes = profiles.flatMap((profile) => profile.nodes as Node[]);
    const merged = MergeTemplate(template, nodes) as AnyObject;
    MergeDnsProfiles(merged, profiles);
    return merged as Template;
}
