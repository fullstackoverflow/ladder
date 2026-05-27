import { parse } from "yaml";
import { AnyObject, Profile, ProfileDns, UpstreamEncoding, UpstreamFormat, UpstreamType } from "../util/type";
import { NormalizeClashNodes, NormalizeNodes, ParseURI, ParseURIs, Node } from "./node";

function Decode(content: string, encoding?: UpstreamEncoding): string {
    if (encoding) {
        switch (encoding) {
            case UpstreamEncoding.Base64:
                {
                    return Buffer.from(content.replace(/\s+/g, ''), encoding).toString('utf8');
                }
            default:
                throw new Error(`Unsupported encoding format:${encoding}`)
        }
    } else {
        return content;
    }
}

function NormalizeURIArray(payload: unknown): Node[] {
    if (!Array.isArray(payload)) return [];
    return NormalizeNodes(payload.filter((item): item is string => typeof item === 'string').map(ParseURI));
}

function NormalizeParsedPayload(payload: unknown, type: UpstreamType): Node[] {
    switch (type) {
        case UpstreamType.Clash:
            return NormalizeClashNodes(payload);
        case UpstreamType.URI:
            return NormalizeURIArray(payload);
        default:
            throw new Error(`Unsupported upstream type:${type}`);
    }
}

function IsObject(value: unknown): value is AnyObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ParseStructuredContent(content: string, format: UpstreamFormat): unknown {
    switch (format) {
        case UpstreamFormat.JSON:
            return JSON.parse(content);
        case UpstreamFormat.Yaml:
            return parse(content);
        default:
            throw new Error(`Unsupported structured data format:${format}`);
    }
}

function DnsServerFromClash(value: unknown, prefix: string, index: number): AnyObject | null {
    if (typeof value !== 'string' || !value.trim()) return null;

    const tag = `${prefix} / DNS ${index + 1}`;
    const raw = value.trim();

    if (raw.startsWith('https://')) {
        const url = new URL(raw);
        const server: AnyObject = {
            tag,
            type: 'https',
            server: url.hostname,
            path: `${url.pathname}${url.search}`,
        };

        if (url.port) server.server_port = Number(url.port);
        return server;
    }

    const [host, port] = raw.includes(':') ? raw.split(':', 2) : [raw, undefined];
    if (!host) return null;

    const server: AnyObject = {
        tag,
        type: 'udp',
        server: host,
    };

    if (port) server.server_port = Number(port);
    return server;
}

function ExtractNodeDomains(nodes: Node[]): string[] {
    return [...new Set(nodes
        .map((node) => node.server)
        .filter((server) => typeof server === 'string' && server.trim() && !/^\d+\.\d+\.\d+\.\d+$/.test(server))
    )];
}

function ExtractClashDns(payload: unknown, nodes: Node[], profileName: string): ProfileDns | undefined {
    if (!IsObject(payload)) {
        console.info(`[parse] ${profileName} clash dns skipped: payload is not an object`);
        return undefined;
    }

    if (!IsObject(payload.dns)) {
        console.info(`[parse] ${profileName} clash dns skipped: dns section missing`);
        return undefined;
    }

    const nameservers = payload.dns.nameserver;
    if (!Array.isArray(nameservers)) {
        console.info(`[parse] ${profileName} clash dns skipped: dns.nameserver is not an array`);
        return undefined;
    }

    const servers = nameservers
        .map((server, index) => DnsServerFromClash(server, profileName, index))
        .filter((server): server is AnyObject => server !== null);

    const nodeDomains = ExtractNodeDomains(nodes);
    console.info(`[parse] ${profileName} clash dns candidates nameservers=${nameservers.length} servers=${servers.length} nodeDomains=${nodeDomains.length}`);

    if (servers.length === 0 || nodeDomains.length === 0) {
        console.info(`[parse] ${profileName} clash dns skipped: servers=${servers.length} nodeDomains=${nodeDomains.length}`);
        return undefined;
    }

    return { servers, nodeDomains };
}

function FormatParseNodeList(content: string, format: UpstreamFormat, type: UpstreamType): Node[] {
    switch (format) {
        case UpstreamFormat.JSON:
            {
                return NormalizeParsedPayload(JSON.parse(content), type);
            }
        case UpstreamFormat.Yaml:
            {
                return NormalizeParsedPayload(parse(content), type);
            }
        case UpstreamFormat.Raw:
            {
                if (type !== UpstreamType.URI) {
                    throw new Error(`Unsupported raw upstream type:${type}`);
                }
                return NormalizeNodes(ParseURIs(content));
            }
        default:
            throw new Error(`Unsupported data format:${format}`)
    }
}

export async function ParseNodeList(content: string, format: UpstreamFormat, encoding: UpstreamEncoding | undefined, type: UpstreamType) {
    content = Decode(content, encoding);
    return FormatParseNodeList(content, format, type);
}

export async function ParseProfile(name: string, content: string, format: UpstreamFormat, encoding: UpstreamEncoding | undefined, type: UpstreamType): Promise<Profile> {
    const decoded = Decode(content, encoding);

    if (format === UpstreamFormat.Raw) {
        const nodes = FormatParseNodeList(decoded, format, type);
        console.info(`[parse] profile ${name} type=${type} format=${format} nodes=${nodes.length} dns=no`);
        return {
            name,
            nodes,
        };
    }

    const payload = ParseStructuredContent(decoded, format);
    const nodes = NormalizeParsedPayload(payload, type);
    const profile: Profile = { name, nodes };
    const dns = type === UpstreamType.Clash ? ExtractClashDns(payload, nodes, name) : undefined;

    if (dns) profile.dns = dns;
    console.info(`[parse] profile ${name} type=${type} format=${format} nodes=${nodes.length} dns=${dns ? `yes servers=${dns.servers.length} domains=${dns.nodeDomains.length}` : 'no'}`);
    return profile;
}
