const { readdirSync } = require('node:fs');
const { join, relative, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const source = join(root, 'src');
const tests = readdirSync(source, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.test.ts'))
  .map(entry => join(root, 'dist', relative(source, join(entry.parentPath, entry.name))).replace(/\.ts$/, '.js'));
if (!tests.length) throw new Error('No source tests found');
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
