import { readFile } from "node:fs/promises";
import { Upstream, UpstreamSource } from "../util/type";
import { ParseNodeList } from "./parse";

export interface ResourceStatus {
    name: string;
    source: UpstreamSource;
    from: string;
    format: string;
    refresh?: number;
    ready: boolean;
    contentLength: number;
    lastSuccessAt?: string;
    lastErrorAt?: string;
    lastError?: string;
    failureCount: number;
}

function Delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function ErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export class Resource {
    content: string = "";
    private timer: NodeJS.Timeout | undefined = undefined;
    private stopped = false;
    private readyResolved = false;
    private readyResolve: (() => void) | undefined = undefined;
    private readyReject: ((error: unknown) => void) | undefined = undefined;
    private lastSuccessAt: Date | undefined = undefined;
    private lastErrorAt: Date | undefined = undefined;
    private lastError: string | undefined = undefined;
    private failureCount = 0;

    ready: Promise<void>;

    constructor(private upstream: Upstream) {
        this.ready = new Promise((resolve, reject) => {
            this.readyResolve = resolve;
            this.readyReject = reject;
        });

        if (this.upstream.refresh) {
            void this.refreshLoop(true);
        } else {
            void this.oneTimeFetch();
        }
    }

    get format() {
        return this.upstream.format;
    }

    get encoding() {
        return this.upstream.encoding;
    }

    get isReady() {
        return this.readyResolved;
    }

    stop() {
        this.stopped = true;
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
    }

    status(): ResourceStatus {
        const status: ResourceStatus = {
            name: this.upstream.name,
            source: this.upstream.source,
            from: this.upstream.from,
            format: this.upstream.format,
            ready: this.readyResolved,
            contentLength: this.content.length,
            failureCount: this.failureCount,
        };

        if (this.upstream.refresh !== undefined) status.refresh = this.upstream.refresh;
        if (this.lastSuccessAt) status.lastSuccessAt = this.lastSuccessAt.toISOString();
        if (this.lastErrorAt) status.lastErrorAt = this.lastErrorAt.toISOString();
        if (this.lastError) status.lastError = this.lastError;

        return status;
    }

    private markSuccess(content: string) {
        this.content = content;
        this.lastSuccessAt = new Date();
        this.lastError = undefined;
        this.failureCount = 0;

        if (!this.readyResolved) {
            this.readyResolved = true;
            this.readyResolve?.();
        }
    }

    private markFailure(error: unknown) {
        this.lastErrorAt = new Date();
        this.lastError = ErrorMessage(error);
        this.failureCount += 1;
    }

    private retryTimes() {
        return this.upstream.retry ?? 3;
    }

    private retryIntervalMs() {
        return (this.upstream.retryInterval ?? 3) * 1000;
    }

    private retryBackoff() {
        return this.upstream.retryBackoff ?? 2;
    }

    private async fetchWithRetry() {
        let attempt = 0;
        let interval = this.retryIntervalMs();

        while (true) {
            try {
                const content = await this[this.upstream.source]();
                this.markSuccess(content);
                return content;
            } catch (error) {
                this.markFailure(error);
                if (attempt >= this.retryTimes()) throw error;
                await Delay(interval);
                interval *= this.retryBackoff();
                attempt += 1;
            }
        }
    }

    private async oneTimeFetch() {
        try {
            await this.fetchWithRetry();
        } catch (error) {
            this.readyReject?.(error);
        }
    }

    private async refreshLoop(firstRun = false) {
        try {
            await this.fetchWithRetry();
        } catch (error) {
            if (firstRun && !this.readyResolved) this.readyReject?.(error);
            console.error(`Failed to refresh upstream ${this.upstream.name}:`, error);
        } finally {
            if (this.stopped) return;
            this.timer = setTimeout(() => {
                void this.refreshLoop(false);
            }, (this.upstream.refresh ?? 0) * 1000);
        }
    }

    private async [UpstreamSource.Local]() {
        return await readFile(this.upstream.from, { encoding: 'utf-8' });
    }

    private async [UpstreamSource.URI]() {
        const response = await fetch(this.upstream.from);
        if (!response.ok) {
            throw new Error(`Fetch failed (${response.status})`);
        }

        return await response.text();
    }
}

export class ResourceManager {
    private pool: Array<Resource> = [];

    SetUpstreams(upstreams: Upstream[]) {
        this.Clear();
        upstreams.forEach((upstream) => this.AddResource(new Resource(upstream)));
    }

    AddResource(resource: Resource) {
        resource.ready.catch(() => undefined);
        this.pool.push(resource);
    }

    Clear() {
        this.pool.forEach((resource) => resource.stop());
        this.pool = [];
    }

    Status() {
        return this.pool.map((resource) => resource.status());
    }

    async MergeNodes() {
        const nodes = (await Promise.all(this.pool.map(async resource => {
            await resource.ready.catch(() => undefined);
            if (!resource.isReady) return [];
            return ParseNodeList(resource.content, resource.format, resource.encoding);
        }))).flat();

        return nodes;
    }
}

const resource_manager = new ResourceManager();

export function GetResourceManager() {
    return resource_manager;
}
