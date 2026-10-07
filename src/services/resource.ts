import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Upstream, UpstreamSource } from "../util/type";
import { ParseProfile } from "./parse";

export interface ResourceStatus {
    index: number;
    name: string;
    source: UpstreamSource;
    from: string;
    type?: string;
    format: string;
    refresh?: number;
    ready: boolean;
    contentLength: number;
    cachePath?: string;
    restoredFromCache: boolean;
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

function ResourceLabel(upstream: Upstream) {
    return `${upstream.name} format=${upstream.format} source=${upstream.source}`;
}

function OneTimeCachePath(upstream: Upstream) {
    if (upstream.refresh || upstream.source === UpstreamSource.Local) return undefined;

    const key = JSON.stringify({
        name: upstream.name,
        source: upstream.source,
        from: upstream.from,
        format: upstream.format,
        encoding: upstream.encoding,
    });
    const hash = createHash("sha256").update(key).digest("hex").slice(0, 16);
    return join(process.cwd(), ".cache", "resources", `${hash}.txt`);
}

export class Resource {
    content: string = "";
    private timer: NodeJS.Timeout | undefined = undefined;
    private stopped = false;
    private readyResolved = false;
    private restoredFromCache = false;
    private cachePath: string | undefined = undefined;
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
        this.cachePath = OneTimeCachePath(this.upstream);

        if (this.upstream.source === UpstreamSource.URI && this.upstream.refresh) {
            void this.refreshLoop(true);
        } else {
            void this.oneTimeFetch();
        }
    }

    get format() {
        return this.upstream.format;
    }

    get encoding() {
        return this.upstream.source === UpstreamSource.URI ? this.upstream.encoding : undefined;
    }

    get name() {
        return this.upstream.name;
    }

    get isReady() {
        return this.readyResolved;
    }

    async profile(files: Record<string, string> = {}) {
        const draft = this.upstream.source === UpstreamSource.Local ? files[this.upstream.from] : undefined;
        if (draft === undefined) {
            await this.ready;
            if (!this.isReady) throw new Error(`Resource is not ready: ${this.name}`);
        }
        return ParseProfile(draft ?? this.content, this.format, this.encoding);
    }

    stop() {
        this.stopped = true;
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
    }

    async sync() {
        await this.fetchWithRetry();
    }

    status(index: number): ResourceStatus {
        const status: ResourceStatus = {
            index,
            name: this.upstream.name,
            source: this.upstream.source,
            from: this.upstream.from,
            format: this.upstream.format,
            ready: this.readyResolved,
            contentLength: this.content.length,
            restoredFromCache: this.restoredFromCache,
            failureCount: this.failureCount,
        };

        if (this.cachePath !== undefined) status.cachePath = this.cachePath;
        if (this.upstream.refresh !== undefined) status.refresh = this.upstream.refresh;
        if (this.lastSuccessAt) status.lastSuccessAt = this.lastSuccessAt.toISOString();
        if (this.lastErrorAt) status.lastErrorAt = this.lastErrorAt.toISOString();
        if (this.lastError) status.lastError = this.lastError;

        return status;
    }

    private markReady(content: string) {
        this.content = content;
        if (!this.readyResolved) {
            this.readyResolved = true;
            this.readyResolve?.();
        }
    }

    private markSuccess(content: string) {
        this.markReady(content);
        this.restoredFromCache = false;
        this.lastSuccessAt = new Date();
        this.lastError = undefined;
        this.failureCount = 0;
        console.info(`[resource] fetched ${ResourceLabel(this.upstream)} bytes=${content.length}`);
    }

    private async loadCache() {
        if (!this.cachePath) return false;

        try {
            const content = await readFile(this.cachePath, { encoding: 'utf-8' });
            this.markReady(content);
            this.restoredFromCache = true;
            console.info(`[resource] restored cache ${ResourceLabel(this.upstream)} path=${this.cachePath} bytes=${content.length}`);
            return true;
        } catch {
            return false;
        }
    }

    private async persistCache(content: string) {
        if (!this.cachePath) return;

        await mkdir(dirname(this.cachePath), { recursive: true });
        await writeFile(this.cachePath, content, { encoding: 'utf-8' });
        console.info(`[resource] persisted cache ${ResourceLabel(this.upstream)} path=${this.cachePath} bytes=${content.length}`);
    }

    private markFailure(error: unknown) {
        this.lastErrorAt = new Date();
        this.lastError = ErrorMessage(error);
        this.failureCount += 1;
        console.warn(`[resource] fetch failed ${ResourceLabel(this.upstream)} failureCount=${this.failureCount}: ${this.lastError}`);
    }

    private retryTimes() {
        return this.upstream.source === UpstreamSource.Local ? 0 : this.upstream.retry ?? 3;
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
                console.info(`[resource] fetching ${ResourceLabel(this.upstream)} attempt=${attempt + 1}`);
                const content = await this[this.upstream.source]();
                this.markSuccess(content);
                await this.persistCache(content);
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
        const hasCache = await this.loadCache();

        try {
            await this.fetchWithRetry();
        } catch (error) {
            if (!hasCache) this.readyReject?.(error);
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
    private definitions: Upstream[] = [];

    Matches(upstreams: Upstream[]) {
        return JSON.stringify(this.definitions) === JSON.stringify(upstreams);
    }

    SetUpstreams(upstreams: Upstream[]) {
        this.Clear();
        this.definitions = upstreams;
        upstreams.forEach((upstream) => this.AddResource(new Resource(upstream)));
    }

    AddResource(resource: Resource) {
        resource.ready.catch(() => undefined);
        this.pool.push(resource);
    }

    Clear() {
        this.pool.forEach((resource) => resource.stop());
        this.pool = [];
        this.definitions = [];
    }

    Status() {
        return this.pool.map((resource, index) => resource.status(index));
    }

    async Sync(index?: number) {
        if (index !== undefined) {
            const resource = this.pool[index];
            if (!resource) throw new Error(`No upstream at index ${index}`);
            await resource.sync();
            return [resource.status(index)];
        }

        const results = await Promise.allSettled(this.pool.map((resource) => resource.sync()));
        const rejected = results.filter((result) => result.status === 'rejected');
        if (rejected.length === results.length && rejected.length > 0) {
            const reason = rejected[0]?.reason;
            throw reason instanceof Error ? reason : new Error(String(reason));
        }

        return this.Status();
    }

    async Profiles(files: Record<string, string> = {}): Promise<any[]> {
        return Promise.all(this.pool.map(resource => resource.profile(files)));
    }


}

const resource_manager = new ResourceManager();
const rule_manager = new ResourceManager();

export function GetRuleManager() {
    return rule_manager;
}

export async function GetTemplateData(files: Record<string, string> = {}) {
    const [upstreams, rules] = await Promise.all([
        resource_manager.Profiles(files), rule_manager.Profiles(files),
    ]);
    return { upstreams, rules };
}

export function GetResourceManager() {
    return resource_manager;
}
