import { existsSync, statSync } from "node:fs";
import { tags } from "typia";

export type FilePath = tags.TagBase<{
    kind: "postfix";
    target: "string";
    value: "must exist and be a regular file"
    validate: `(() => { try { return $importNamespace("fs", "node:fs").statSync($input).isFile(); } catch { return false; } })()`;
}>;

export type AnyObject = Record<string, any>;

export enum OutputTarget {
    Clash = 'clash'
}

export interface OutputTemplate {
    name: string
    target: OutputTarget
    path: string
}

export enum UpstreamSource {
    Local = 'local',
    URI = 'URI'
}

export enum UpstreamFormat {
    JSON = 'json',
    Yaml = 'yaml',
    NodeList = 'node-list',
}

export enum UpstreamEncoding {
    Base64 = 'base64'
}

interface SourceData {
    /**
     * 本地文件/订阅地址
     */
    name: string
    /**
     * 文件路径/url
     */
    from: string
    format: UpstreamFormat
}

export interface RemoteUpstream extends SourceData {
    source: UpstreamSource.URI
    /**
     * 内容是否编码过(仅支持base64解码目前)
     */
    encoding?: UpstreamEncoding
    /**
     * 内容(解码后)的格式(json/yaml/node-list)
     */
    /**
     * 定时刷新时间
     */
    refresh?: number
    /**
     * 拉取失败重试次数
     */
    retry?: number
    /**
     * 重试间隔秒数
     */
    retryInterval?: number
    /**
     * 重试退避倍数
     */
    retryBackoff?: number
}

export interface LocalUpstream extends SourceData {
    source: UpstreamSource.Local
    encoding?: never
    refresh?: never
    retry?: never
    retryInterval?: never
    retryBackoff?: never
}

export type Upstream = LocalUpstream | RemoteUpstream;

export interface Config {
    templates: Array<OutputTemplate>,
    upstreams: Array<Upstream>
    rules?: Array<RuleSource>
}

/** Ordered files; each parsed payload occupies one slot in $.rules. */
export type RuleSource = (Omit<LocalUpstream, 'format'> | Omit<RemoteUpstream, 'format'>) & {
    format: UpstreamFormat.JSON | UpstreamFormat.Yaml
};
