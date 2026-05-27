import { validate } from "typia";
import { Config } from '../util/type';
import { readFileSync, watch, FSWatcher } from "fs";
import { writeFile } from "node:fs/promises";

let config: Config | undefined = undefined;
let configPath: string | undefined = undefined;
let watcher: FSWatcher | undefined = undefined;
let reloadTimer: NodeJS.Timeout | undefined = undefined;
let onChange: ((config: Config) => void) | undefined = undefined;

export function LoadConfig(path: string) {
    configPath = path;
    const content = readFileSync(path, { encoding: 'utf8' });
    const nextConfig = JSON.parse(content);
    const result = validate<Config>(nextConfig);
    if (!result.success) {
        console.error(result);
        process.exit();
    }
    config = result.data;
    console.info(`[config] loaded ${config.upstreams.length} upstream(s) from ${path}`);
    return config;
}

export async function SaveConfig(content: string) {
    if (!configPath) throw new Error('config path is not initialized');
    const nextConfig = JSON.parse(content);
    const result = validate<Config>(nextConfig);
    if (!result.success) {
        throw new Error(JSON.stringify(result.errors, null, 2));
    }

    await writeFile(configPath, JSON.stringify(result.data, null, 2), { encoding: 'utf8' });
    config = result.data;
    onChange?.(config);
}

export function WatchConfig(callback: (config: Config) => void) {
    if (!configPath) throw new Error('config path is not initialized');
    onChange = callback;
    watcher?.close();
    watcher = watch(configPath, () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
            try {
                const nextConfig = LoadConfig(configPath as string);
                callback(nextConfig);
            } catch (error) {
                console.error('Failed to reload config:', error);
            }
        }, 100);
    });
}

export function GetConfigContent() {
    if (!configPath) throw new Error('config path is not initialized');
    return readFileSync(configPath, { encoding: 'utf8' });
}

export function GetConfigPath() {
    return configPath;
}

export function GetConfig() {
    return config;
}
