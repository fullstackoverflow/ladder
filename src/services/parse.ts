import { parse } from "yaml";
import { UpstreamEncoding, UpstreamFormat, UpstreamType } from "../util/type";
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
