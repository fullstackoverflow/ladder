import { parse } from "yaml";
import { UpstreamEncoding, UpstreamFormat, UpstreamType } from "../util/type";
import { NormalizeNodes, ParseURIs, ParseURI, Node } from "./node";

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

function FormatParseNodeList(content: string, format: UpstreamFormat): Node[] {
    switch (format) {
        case UpstreamFormat.JSON:
            {
                return NormalizeNodes(JSON.parse(content));
            }
        case UpstreamFormat.Yaml:
            {
                return NormalizeNodes(parse(content));
            }
        case UpstreamFormat.Raw:
            {
                return NormalizeNodes(ParseURIs(content));
            }
        default:
            throw new Error(`Unsupported data format:${format}`)
    }
}

export async function ParseNodeList(content: string, format: UpstreamFormat, encoding?: UpstreamEncoding) {
    content = Decode(content, encoding);
    return FormatParseNodeList(content, format);
}