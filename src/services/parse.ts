import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { UpstreamEncoding, UpstreamFormat } from "../util/type";
import { NormalizeNodes, ParseURI, ParseURIs, Node } from "./node";
import { Render } from "./template";

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

async function RenderTemplatePayload(payload: unknown, nodeTemplatePath: string | undefined) {
    if (!nodeTemplatePath) return payload;

    const template = await readFile(nodeTemplatePath, { encoding: 'utf8' });
    const rendered = Render(template, payload as Record<string, any>);
    console.info(`[parse] applied node template path=${nodeTemplatePath}`);
    return rendered;
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
export function ParseRawProfile(content: string, format: UpstreamFormat, encoding: UpstreamEncoding | undefined): unknown {
    const decoded = Decode(content, encoding);
    return ParseTemplateInput(decoded, format);
}

export async function ParseProfile(content: string, format: UpstreamFormat, encoding: UpstreamEncoding | undefined, nodeTemplatePath?: string): Promise<any> {
    let payload = ParseRawProfile(content, format, encoding);
    if (nodeTemplatePath) {
        payload = await RenderTemplatePayload(payload, nodeTemplatePath);
    }
    return payload;
}
