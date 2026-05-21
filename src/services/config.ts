import { validate } from "typia";
import { Config } from '../util/type';
import { readFileSync } from "fs";

let config: Config | undefined = undefined;

export function LoadConfig(path: string) {
    const content = readFileSync(path, { encoding: 'utf8' });
    config = JSON.parse(content);
    const result = validate<Config>(config);
    if (!result.success) {
        console.error(result);
        process.exit();
    }
}

export function GetConfig() {
    return config;
}