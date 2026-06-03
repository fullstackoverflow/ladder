import { Config } from "../util/type";
import { BaseFile } from "./file";

let config: BaseFile;

export function SetConfigPath(path: string) {
    config = new BaseFile(path);
}

export function GetConfig(): Config {
    const content = config.ReadContent();
    if (!content) {
        throw new Error(`Failed to read config file at ${config.path}`);
    }
    return JSON.parse(content);
}

export function GetConfigPath(): string {
    return config.path;
}

export function SaveConfig(nextConfig: Config): Config {
    const content = JSON.stringify(nextConfig, null, 2);
    config.WriteContent(`${content}\n`);
    return GetConfig();
}
