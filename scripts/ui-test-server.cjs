const { mkdirSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawn } = require('node:child_process');

const root = resolve(__dirname, '..');
const dir = join(root, '.cache', 'ui-e2e');
mkdirSync(dir, { recursive: true });
const dataDir = join(dir, 'data');
mkdirSync(dataDir, { recursive: true });
const source = (name, filename, format = 'json') => ({
  name,
  source: 'local',
  from: join(dataDir, filename),
  format,
  retry: 0,
});
const config = {
  templates: [
    {
      name: 'Clash 主配置',
      target: 'clash',
      path: join(dataDir, 'clash.yaml'),
    },
  ],
  upstreams: [source('本地节点', 'nodes.json')],
  rules: [
    source('个人覆盖规则', 'overrides.json'),
    source('通用规则', 'common.yaml', 'yaml'),
  ],
};
writeFileSync(
  join(dataDir, 'nodes.json'),
  JSON.stringify({ proxies: [{ name: 'Demo node' }] }, null, 2),
);
writeFileSync(
  join(dataDir, 'overrides.json'),
  JSON.stringify({ rules: ['DOMAIN,example.com,DIRECT'] }, null, 2),
);
writeFileSync(join(dataDir, 'common.yaml'), 'rules:\n  - MATCH,Proxy\n');
writeFileSync(
  join(dataDir, 'clash.yaml'),
  'proxies:\n  {{ toYaml($.upstreams.flatMap(source => source.proxies)) }}\nrules:\n  {{ toYaml($.rules.flatMap(source => source.rules)) }}\n',
);
writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2));
const child = spawn(
  process.execPath,
  [join(root, 'dist', 'app.js'), '-c', join(dir, 'config.json'), '-p', '4179'],
  { cwd: root, stdio: 'inherit' },
);
child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill());
