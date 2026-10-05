import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResourceManager } from './resource';
import { Render } from './template';
import { UpstreamFormat, UpstreamSource } from '../util/type';

test('profiles preserve whole objects, nested rule order, and file indices', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ladder-rules-'));
    const manager = new ResourceManager();
    try {
        const first = { rules: ['DOMAIN,a.example,DIRECT', 'MATCH,Proxy'], metadata: { keep: true } };
        const second = { payload: ['b.example'], other: [1, 2] };
        await writeFile(join(dir, 'first.yaml'), 'rules:\n  - DOMAIN,a.example,DIRECT\n  - MATCH,Proxy\nmetadata:\n  keep: true\n');
        await writeFile(join(dir, 'second.json'), JSON.stringify(second));
        const sources = [
            { name: 'first', source: UpstreamSource.Local, from: join(dir, 'first.yaml'), format: UpstreamFormat.Yaml, retry: 0 },
            { name: 'second', source: UpstreamSource.Local, from: join(dir, 'second.json'), format: UpstreamFormat.JSON, retry: 0 },
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
            name, from: join(dir, name), source: UpstreamSource.Local, format: UpstreamFormat.JSON, retry: 0,
        })));
        await assert.rejects(manager.Profiles(), /ENOENT/);
    } finally {
        manager.Clear();
        await rm(dir, { recursive: true, force: true });
    }
});
