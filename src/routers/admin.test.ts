import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

test('admin and subscription share ordered data, local editing, and draft previews', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ladder-admin-'));
    let child: ReturnType<typeof spawn> | undefined;
    try {
        const template = join(dir, 'output.json');
        const local = join(dir, 'upstream.json');
        const a = join(dir, 'a.json');
        const b = join(dir, 'b.yaml');
        await Promise.all([
            writeFile(template, '{{ toJson($) }}'),
            writeFile(local, '{"proxies":[{"name":"node"}]}'),
            writeFile(a, '{"rules":["a"],"metadata":"preserved"}'),
            writeFile(b, 'rules:\n  - b\n'),
        ]);
        const source = (name: string, from: string, format = 'json') => ({ name, from, format, source: 'local', retry: 0 });
        const config = {
            templates: [{ name: 'test', target: 'clash', path: template }],
            upstreams: [source('nodes', local)], rules: [source('a', a), source('b', b, 'yaml')],
        };
        const configPath = join(dir, 'config.json');
        await writeFile(configPath, JSON.stringify(config));
        child = spawn(process.execPath, [join(__dirname, '..', 'app.js'), '-c', configPath, '-p', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
        const base = await new Promise<string>((resolve, reject) => {
            child!.on('error', reject);
            child!.on('exit', code => reject(new Error(`server exited: ${code}`)));
            let output = '';
            child!.stdout!.on('data', chunk => {
                output += chunk.toString();
                const port = output.match(/Server is running at (\d+)/)?.[1];
                if (port && port !== '0') resolve(`http://127.0.0.1:${port}`);
            });
        });
        async function request(path: string, method = 'GET', body?: unknown) {
            const response = await fetch(base + path, {
                method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
            });
            const text = await response.text();
            assert.equal(response.status, 200, text);
            return text === 'ok' ? text : JSON.parse(text);
        }
        const initial = await request('/api/admin/state');
        const page = await fetch(base + '/admin');
        assert.equal(page.status, 200);
        const html = await page.text();
        assert.match(html, /<div id="root"><\/div>/);
        const assets = [...html.matchAll(/(?:src|href)="(\/admin\/assets\/[^" ]+)"/g)].map(match => match[1]!);
        assert.ok(assets.length >= 2);
        for (const path of assets) {
            const asset = await fetch(base + path);
            assert.equal(asset.status, 200);
            assert.match(asset.headers.get('cache-control')!, /immutable/);
            assert.ok((await asset.text()).length > 0);
        }
        assert.equal((await fetch(base + '/admin/assets/missing.js')).status, 404);
        assert.equal(initial.localFiles.length, 3);
        assert.equal((await fetch(base + '/subscribe/singbox')).status, 404);
        const unsupported = await fetch(base + '/api/admin/config', {
            method: 'PUT', body: JSON.stringify({ ...config, templates: [{ ...config.templates[0], target: 'singbox' }] }),
        });
        assert.equal(unsupported.status, 400);
        assert.deepEqual((await request('/subscribe/clash')).rules, [{ rules: ['a'], metadata: 'preserved' }, { rules: ['b'] }]);
        config.rules.reverse();
        await request('/api/admin/config', 'PUT', config);
        assert.deepEqual((await request('/subscribe/clash')).rules, [{ rules: ['b'] }, { rules: ['a'], metadata: 'preserved' }]);
        const saved = await fetch(base + '/api/admin/file', {
            method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: a, content: '{"rules":["saved"]}' }),
        });
        assert.equal(saved.status, 200);
        assert.equal(await readFile(a, 'utf8'), '{"rules":["saved"]}');
        assert.deepEqual((await request('/subscribe/clash')).rules[1], { rules: ['saved'] });
        const preview = await request('/api/admin/preview/render', 'POST', {
            target: 'clash', config, files: { [a]: '{"rules":["draft"]}', [local]: '{"proxies":[]}' },
        });
        assert.deepEqual(preview.rules[1], { rules: ['draft'] });
        assert.deepEqual(preview.upstreams, [{ proxies: [] }]);
        assert.deepEqual((await request('/subscribe/clash')).rules[1], { rules: ['saved'] });
        const draftConfig = { ...config, rules: [...config.rules].reverse() };
        assert.deepEqual((await request('/api/admin/preview/render', 'POST', { target: 'clash', config: draftConfig })).rules[0], { rules: ['saved'] });
        assert.deepEqual((await request('/api/admin/preview/profiles/rendered', 'POST')).rules[0], { rules: ['b'] });
        const forbidden = await fetch(base + '/api/admin/file', {
            method: 'PUT', body: JSON.stringify({ path: join(dir, 'unreferenced.json'), content: '{}' }),
        });
        assert.equal(forbidden.status, 400);
        const managed = await request('/api/admin/files', 'POST', { name: 'managed.json', content: '{"rules":["managed"]}' });
        assert.equal(managed.path, join(dir, 'data', 'managed.json'));
        assert.equal(await readFile(managed.path, 'utf8'), '{"rules":["managed"]}');
        assert.deepEqual(await request('/api/admin/files'), [managed]);
        for (const body of [
            { name: '../escaped.json', content: '{}' },
            { name: '..\\escaped.json', content: '{}' },
            { name: 'managed.json', content: 'overwrite' },
            { name: 'private.json' },
        ]) {
            const invalid = await fetch(base + '/api/admin/files', { method: 'POST', body: JSON.stringify(body) });
            assert.equal(invalid.status, 400);
        }
        assert.equal(await readFile(managed.path, 'utf8'), '{"rules":["managed"]}');
        config.rules[0]!.from = managed.path;
        await request('/api/admin/config', 'PUT', config);
        assert.deepEqual((await request('/subscribe/clash')).rules[0], { rules: ['managed'] });
        await request('/api/admin/file', 'PUT', { path: managed.path, content: '{"rules":["edited"]}' });
        assert.deepEqual((await request('/subscribe/clash')).rules[0], { rules: ['edited'] });
    } finally {
        if (child && child.exitCode === null) {
            const exited = once(child, 'exit');
            child.kill();
            await exited;
        }
        await rm(dir, { recursive: true, force: true });
    }
});
