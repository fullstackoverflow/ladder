import { readFile } from "node:fs/promises";
import { Upstream, UpstreamSource } from "../util/type";
import { ParseNodeList } from "./parse";


export class Resource {
    content: string = "";
    private timer: NodeJS.Timeout | undefined = undefined;
    ready: Promise<void>;
    private ready_resolve: (() => void) | undefined = undefined;
    private ready_reject: (() => void) | undefined = undefined;

    constructor(private upstream: Upstream) {
        this.ready = new Promise((resolve, reject) => {
            this.ready_resolve = resolve;
            this.ready_reject = reject;
        })
        if (this.upstream.refresh) {
            this.timerLoop();
        } else {
            this.oneTimeFetch();
        }
    }

    get format() {
        return this.upstream.format;
    }

    get encoding() {
        return this.upstream.encoding;
    }

    private async oneTimeFetch() {
        this.content = await this[this.upstream.source]();
        if (this.ready_resolve) {
            this.ready_resolve();
        }
    }

    private async timerLoop() {
        if (!this.timer) {
            this.content = await this[this.upstream.source]();
            if (this.ready_resolve) {
                this.ready_resolve();
            }
        }
        this.timer = setTimeout(async () => {
            this.content = await this[this.upstream.source]();
            this.timerLoop();
        }, this.upstream.refresh as number * 1000);
    }

    private async  [UpstreamSource.Local]() {
        return await readFile(this.upstream.from, { encoding: 'utf-8' });
    }

    private async  [UpstreamSource.URI]() {
        const response = await fetch(this.upstream.from);
        const content = await response.text();
        return content;
    }
}

export class ResourceManager {
    private pool: Array<Resource> = [];

    constructor() {

    }

    AddResource(resource: Resource) {
        this.pool.push(resource);
    }

    async MergeNodes() {
        const nodes = (await Promise.all(this.pool.map(async resource => {
            await resource.ready;
            const content = resource.content;
            const nodes = ParseNodeList(content, resource.format, resource.encoding);
            return nodes;
        }))).flat();
        return nodes;
    }
}

const resource_manager = new ResourceManager();

export function GetResourceManager(){
    return resource_manager;
}
