import { parse } from "yaml";
import { UpstreamEncoding, UpstreamFormat } from "../util/type";
import { ParseURIs } from "./node";

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

function ParseTemplateInput(content: string, format: UpstreamFormat): unknown {
    switch (format) {
        case UpstreamFormat.JSON:
            {
                return JSON.parse(content);
            }
            break;
        case UpstreamFormat.NodeList:
            {
                return ParseURIs(content);
            }
            break;
        case UpstreamFormat.Yaml:
            {
                return parse(content);
            }
            break;
    }
}
export function ParseProfile(content: string, format: UpstreamFormat, encoding: UpstreamEncoding | undefined): unknown {
    const decoded = Decode(content, encoding);
    return ParseTemplateInput(decoded, format);
}
