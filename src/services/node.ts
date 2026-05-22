export type NodeType = 'anytls' | 'vless' | string;

export interface TlsOptions {
    enabled: boolean;
    server_name?: string;
    insecure?: boolean;
    alpn?: string[];
    utls?: {
        enabled: boolean;
        fingerprint: string;
    };
}

export interface WebsocketTransport {
    type: 'ws';
    path?: string;
    headers?: Record<string, string>;
}

export interface NodeBase {
    tag: string;
    type: NodeType;
    server: string;
    server_port: number;
}

export interface AnyTlsNode extends NodeBase {
    type: 'anytls';
    password: string;
    tls: TlsOptions;
}

export interface VlessNode extends NodeBase {
    type: 'vless';
    uuid: string;
    flow?: string;
    tls?: TlsOptions;
    transport?: WebsocketTransport;
}

export interface GenericNode extends NodeBase {
    [key: string]: unknown;
}

export type KnownNode = AnyTlsNode | VlessNode;
export type Node = KnownNode | GenericNode;

type UriParser = (uri: string) => Node | null;

const EXCLUDED_NODE_TYPES = new Set([
    'direct',
    'reject',
    'selector',
    'urltest',
    'block',
    'dns',
    'shadowsocksr',
]);

const KNOWN_PROXY_SCHEMES = ['anytls', 'vless', 'vmess', 'trojan', 'ss', 'ssr', 'hysteria2', 'hy2'];
const PROXY_URI_RE = new RegExp(`\\b(${KNOWN_PROXY_SCHEMES.join('|')}):\\/\\/`, 'gi');

function truthyParam(value: string | null): boolean {
    if (value === null) return false;
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
}

function decodeHash(hash: string): string {
    return hash ? decodeURIComponent(hash.slice(1)) : '';
}

function parsePort(port: string): number | null {
    const value = Number(port);
    return Number.isInteger(value) && value > 0 ? value : null;
}

function parseAnyTlsUri(uri: string): Node | null {
    let parsed: URL;
    try {
        parsed = new URL(uri);
    } catch {
        return null;
    }

    if (parsed.protocol.toLowerCase() !== 'anytls:') return null;

    const server = parsed.hostname;
    const serverPort = parsePort(parsed.port);
    const password = decodeURIComponent(parsed.username);
    const tag = decodeHash(parsed.hash);

    if (!server || !serverPort || !password || !tag) return null;

    const params = parsed.searchParams;
    const tls: TlsOptions = { enabled: true };
    const sni = params.get('sni') || params.get('peer');
    const insecure = params.get('insecure') || params.get('allowInsecure');
    const alpn = params.get('alpn');
    const fingerprint = params.get('fp') || params.get('client-fingerprint');

    if (sni) tls.server_name = sni;
    if (truthyParam(insecure)) tls.insecure = true;
    if (alpn) tls.alpn = alpn.split(',').map((v) => v.trim()).filter(Boolean);
    if (fingerprint) tls.utls = { enabled: true, fingerprint };

    return {
        tag,
        type: 'anytls',
        server,
        server_port: serverPort,
        password,
        tls,
    };
}

function parseVlessUri(uri: string): Node | null {
    let parsed: URL;
    try {
        parsed = new URL(uri);
    } catch {
        return null;
    }

    if (parsed.protocol.toLowerCase() !== 'vless:') return null;

    const server = parsed.hostname;
    const serverPort = parsePort(parsed.port);
    const uuid = decodeURIComponent(parsed.username);
    const tag = decodeHash(parsed.hash);

    if (!server || !serverPort || !uuid || !tag) return null;

    const params = parsed.searchParams;
    const node: VlessNode = {
        tag,
        type: 'vless',
        server,
        server_port: serverPort,
        uuid,
    };

    const flow = params.get('flow');
    if (flow) node.flow = flow;

    const security = params.get('security');
    if (security === 'tls' || security === 'reality') {
        const tls: TlsOptions = { enabled: true };
        const sni = params.get('sni');
        const insecure = params.get('insecure') || params.get('allowInsecure');
        const fingerprint = params.get('fp') || params.get('client-fingerprint');

        if (sni) tls.server_name = sni;
        if (truthyParam(insecure)) tls.insecure = true;
        if (fingerprint) tls.utls = { enabled: true, fingerprint };
        node.tls = tls;
    }

    const network = params.get('type');
    if (network === 'ws') {
        const path = params.get('path');
        const host = params.get('host');
        const transport: WebsocketTransport = { type: 'ws' };

        if (path) transport.path = path;
        if (host) transport.headers = { Host: host };
        node.transport = transport;
    }

    return node;
}

export function IsNode(value: unknown): value is Node {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    const node = value as Partial<NodeBase>;
    return typeof node.tag === 'string'
        && node.tag.trim().length > 0
        && typeof node.type === 'string'
        && node.type.trim().length > 0
        && typeof node.server === 'string'
        && node.server.trim().length > 0
        && typeof node.server_port === 'number'
        && Number.isInteger(node.server_port)
        && node.server_port > 0
        && !EXCLUDED_NODE_TYPES.has(node.type.trim().toLowerCase());
}

function IsObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function AsString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function AsNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function NormalizeAnyTlsNode(input: Record<string, unknown>, source: 'clash' | 'native' = 'native'): Record<string, unknown> {
    const output: Record<string, unknown> = { ...input };
    const tls: TlsOptions = { enabled: true };

    if (typeof output.name === 'string' && !output.tag) {
        output.tag = output.name;
        delete output.name;
    }

    const port = AsNumber(output.port);
    if (port !== undefined) {
        output.server_port = port;
        delete output.port;
    }

    if (typeof output.tfo === 'boolean') {
        output.tcp_fast_open = output.tfo;
        delete output.tfo;
    }

    if (source === 'clash') {
        delete output.udp;
    }

    if (typeof output['idle-session-check-interval'] === 'number') {
        output.idle_session_check_interval = output['idle-session-check-interval'];
        delete output['idle-session-check-interval'];
    }

    if (typeof output['idle-session-timeout'] === 'number') {
        output.idle_session_timeout = output['idle-session-timeout'];
        delete output['idle-session-timeout'];
    }

    if (typeof output['min-idle-session'] === 'number') {
        output.min_idle_session = output['min-idle-session'];
        delete output['min-idle-session'];
    }

    const sni = AsString(output.sni);
    if (sni) {
        tls.server_name = sni;
        delete output.sni;
    }

    if (typeof output['skip-cert-verify'] === 'boolean') {
        tls.insecure = output['skip-cert-verify'];
        delete output['skip-cert-verify'];
    }

    if (Array.isArray(output.alpn)) {
        tls.alpn = output.alpn.filter((item): item is string => typeof item === 'string');
        delete output.alpn;
    }

    const fingerprint = AsString(output['client-fingerprint']);
    if (fingerprint) {
        tls.utls = { enabled: true, fingerprint };
        delete output['client-fingerprint'];
    }

    output.tls = tls;
    return output;
}

export function NormalizeNode(input: unknown): Node | null {
    if (!IsObject(input)) return null;

    const type = AsString(input.type).toLowerCase();
    const normalized = type === 'anytls' ? NormalizeAnyTlsNode(input) : { ...input };

    return IsNode(normalized) ? normalized : null;
}

export function NormalizeClashNode(input: unknown): Node | null {
    if (!IsObject(input)) return null;

    const type = AsString(input.type).toLowerCase();
    const normalized = type === 'anytls' ? NormalizeAnyTlsNode(input, 'clash') : { ...input };
    delete normalized.udp;

    return IsNode(normalized) ? normalized : null;
}

export function NormalizeNodes(input: unknown): Node[] {
    if (Array.isArray(input)) return input.map(NormalizeNode).filter((node): node is Node => node !== null);

    if (IsObject(input)) {
        for (const key of ['outbounds', 'outbound', 'proxies', 'proxy', 'Proxy']) {
            const value = input[key];
            if (Array.isArray(value)) return NormalizeNodes(value);
        }
    }

    return [];
}

export function NormalizeClashNodes(input: unknown): Node[] {
    if (Array.isArray(input)) return input.map(NormalizeClashNode).filter((node): node is Node => node !== null);

    if (IsObject(input)) {
        for (const key of ['proxies', 'proxy', 'Proxy']) {
            const value = input[key];
            if (Array.isArray(value)) return NormalizeClashNodes(value);
        }
    }

    return [];
}

const URI_PARSERS: Record<string, UriParser> = {
    anytls: parseAnyTlsUri,
    vless: parseVlessUri,
};

export function ParseURI(uri: string): Node | null {
    const scheme = uri.match(/^([a-z0-9+.-]+):\/\//i)?.[1]?.toLowerCase();
    if (!scheme) return null;

    const parser = URI_PARSERS[scheme];
    if (!parser) return null;

    return parser(uri.trim());
}

export function ParseURIs(text: string): Node[] {
    const matches = [...text.matchAll(PROXY_URI_RE)];
    const nodes: Node[] = [];

    for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i];
        if (!match) continue;

        const start = match.index ?? 0;
        const end = matches[i + 1]?.index ?? text.length;
        const uri = text.slice(start, end).replace(/\s+/g, '');
        const node = ParseURI(uri);

        if (node) nodes.push(node);
    }

    return nodes;
}

export function FilterNodes(nodes: unknown[]): Node[] {
    return nodes.filter(IsNode);
}
