import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { GetConfigPath } from './config';

export function GetDataDirectory() {
    return join(dirname(resolve(GetConfigPath())), 'data');
}

export async function CreateDataFile(content: string, extension: 'yaml' | 'json' | 'txt') {
    if (typeof content !== 'string') throw new Error('文件内容必须是文本');
    const directory = GetDataDirectory();
    await mkdir(directory, { recursive: true });
    const path = join(directory, `${randomUUID()}.${extension}`);
    await writeFile(path, content, { encoding: 'utf8', flag: 'wx' });
    return path;
}
