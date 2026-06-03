import { FSWatcher, readFileSync, watch, writeFileSync } from "fs";

export class BaseFile {
    private watcher: FSWatcher;
    private content: string | undefined = undefined;

    constructor(public path: string) {
        this.watcher = watch(this.path, () => {
            this.UpdateContent();
        });
    }

    private UpdateContent() {
        try {
            this.content = readFileSync(this.path, { encoding: 'utf8' });
        } catch (error) {
            console.error(`Failed to read file at ${this.path}:`, error);
        }
    }

    ReadContent() {
        if (!this.content) {
            this.UpdateContent();
        }
        return this.content;
    }

    WriteContent(content: string) {
        writeFileSync(this.path, content, { encoding: 'utf8' });
        this.content = content;
    }

}
