import type { Config, FileMeta } from '../types/workspace';
export function knownFiles(config: Config): FileMeta[] {
  const files: FileMeta[] = config.templates.map((t) => ({
    path: t.path,
    label: t.name,
    category: '输出模板',
  }));
  config.upstreams.forEach((source) => {
    if (source.source === 'local')
      files.push({
        path: source.from,
        label: source.name,
        category: '本地上游',
      });
  });
  (config.rules ?? []).forEach((source) => {
    if (source.source === 'local')
      files.push({
        path: source.from,
        label: source.name,
        category: '规则文件',
      });
  });
  return files.filter(
    (file, index) =>
      files.findIndex((other) => other.path === file.path) === index,
  );
}
