import { existsSync, statSync } from "node:fs";
import { tags } from "typia";

export type FilePath = tags.TagBase<{
    kind: "postfix";
    target: "string";
    value: "must exist and be a regular file"
    validate: `(() => { try { return $importNamespace("fs", "node:fs").statSync($input).isFile(); } catch { return false; } })()`;
}>;


export type AnyObject = Record<string, any>;

export interface Template {
    outbounds?: AnyObject[]
    [key: string]: any
}

export enum UpstreamSource {
    Local = 'local',
    URI = 'URI'
}

export enum UpstreamType {
    URI_list = 'URI_list',
    Node_list = 'Node_list'
}

export enum UpstreamFormat {
    JSON = 'json',
    Yaml = 'yaml',
    Raw = 'raw'
}

export enum UpstreamEncoding {
    Base64 = 'base64'
}

export interface Upstream {
    /**
     * 本地文件/订阅地址
     */
    source: UpstreamSource
    name: string
    /**
     * 文件路径/url
     */
    from: string
    /**
     * 内容是否编码过(仅支持base64解码目前)
     */
    encoding?: UpstreamEncoding
    /**
     * 内容(解码后)的格式(json/yaml/raw)
     */
    format: UpstreamFormat
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

export interface Config {
    template?: any,
    upstreams: Array<Upstream>
}
