import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { GetConfigPath } from './config';

/** Keep uploaded files beside the active config, including isolated test configs. */
export function GetDataDirectory() {
    return join(dirname(resolve(GetConfigPath())), 'data');
}

export async function ListDataFiles() {
    const directory = GetDataDirectory();
    try {
        const entries = await readdir(directory, { withFileTypes: true });
        return entries.filter(entry => entry.isFile()).map(entry => ({
            name: entry.name, path: join(directory, entry.name),
        })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
    }
}

export async function CreateDataFile(name: string, content: string) {
    // A library entry is a filename, never a client-supplied filesystem path.
    if (typeof name !== 'string' || !name.trim() || name !== name.trim() ||
        /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
        throw new Error('请输入有效的文件名，不要填写文件路径');
    }
    if (typeof content !== 'string') throw new Error('文件内容必须是文本');
    const directory = GetDataDirectory();
    await mkdir(directory, { recursive: true });
    const path = join(directory, name);
    try {
        await writeFile(path, content, { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('同名文件已存在，请选择已有文件或换一个文件名');
        throw error;
    }
    return { name, path };
}
