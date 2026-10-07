import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResourceManager } from './resource';
import { Render } from './template';
import { UpstreamFormat, UpstreamSource } from '../util/type';
import { UpstreamEncoding } from '../util/type';
import { createServer } from 'node:http';
import { once } from 'node:events';

test('remote subscriptions still decode Base64 and retry failed requests', async () => {
    let requests = 0;
    const payload = { proxies: [{ name: 'remote' }], metadata: { keep: true } };
    const server = createServer((_request, response) => {
        requests += 1;
        if (requests === 1) {
            response.writeHead(503).end('retry');
        } else {
            response.end(Buffer.from(JSON.stringify(payload)).toString('base64'));
        }
    });
    const manager = new ResourceManager();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        const address = server.address();
        assert.ok(address && typeof address === 'object');
        manager.SetUpstreams([{
            name: 'remote', source: UpstreamSource.URI, from: `http://127.0.0.1:${address.port}`,
            format: UpstreamFormat.JSON, encoding: UpstreamEncoding.Base64,
            refresh: 600, retry: 1, retryInterval: 0, retryBackoff: 2,
        }]);
        assert.deepEqual(await manager.Profiles(), [payload]);
        assert.equal(requests, 2);
        assert.equal(manager.Status()[0]!.refresh, 600);
    } finally {
        manager.Clear();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

test('profiles preserve whole objects, nested rule order, and file indices', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ladder-rules-'));
    const manager = new ResourceManager();
    try {
        const first = { rules: ['DOMAIN,a.example,DIRECT', 'MATCH,Proxy'], metadata: { keep: true } };
        const second = { payload: ['b.example'], other: [1, 2] };
        await writeFile(join(dir, 'first.yaml'), 'rules:\n  - DOMAIN,a.example,DIRECT\n  - MATCH,Proxy\nmetadata:\n  keep: true\n');
        await writeFile(join(dir, 'second.json'), JSON.stringify(second));
        const sources = [
            { name: 'first', source: UpstreamSource.Local as const, from: join(dir, 'first.yaml'), format: UpstreamFormat.Yaml },
            { name: 'second', source: UpstreamSource.Local as const, from: join(dir, 'second.json'), format: UpstreamFormat.JSON },
        ];
        manager.SetUpstreams(sources);
        assert.deepEqual(await manager.Profiles(), [first, second]);
        manager.SetUpstreams([...sources].reverse());
        assert.deepEqual(await manager.Profiles(), [second, first]);
        assert.equal(Render('{{ toJson($) }}', { upstreams: [first], rules: [second, first] }),
            JSON.stringify({ upstreams: [first], rules: [second, first] }, null, 2));
        const draft = { rules: ['draft'], metadata: { keep: false } };
        assert.deepEqual(await manager.Profiles({ [sources[0]!.from]: JSON.stringify(draft) }), [second, draft]);
        await writeFile(sources[0]!.from, JSON.stringify(draft));
        await manager.Sync(1);
        assert.deepEqual(await manager.Profiles(), [second, draft]);
    } finally {
        manager.Clear();
        await rm(dir, { recursive: true, force: true });
    }
});

test('a failed file must not shift later files into an earlier index', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ladder-failure-'));
    const manager = new ResourceManager();
    try {
        await writeFile(join(dir, 'ok.json'), '{"rules":[]}');
        manager.SetUpstreams(['missing.json', 'ok.json'].map(name => ({
            name, from: join(dir, name), source: UpstreamSource.Local, format: UpstreamFormat.JSON,
        })));
        await assert.rejects(manager.Profiles(), /ENOENT/);
        assert.equal(manager.Status()[0]!.failureCount, 1);
    } finally {
        manager.Clear();
        await rm(dir, { recursive: true, force: true });
    }
});
