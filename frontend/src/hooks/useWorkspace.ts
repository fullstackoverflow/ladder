import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminState, Config, ResourceStatus } from '../types/workspace';
import { request } from '../lib/api';
import { knownFiles } from '../lib/files';
export function useWorkspace() {
  const [data, setData] = useState<AdminState | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>({});
  const filesRef = useRef(files);
  const savedRef = useRef(savedFiles);
  filesRef.current = files;
  savedRef.current = savedFiles;
  const [selectedFile, setSelectedFile] = useState('');
  const [loadError, setLoadError] = useState('');
  const apply = useCallback((next: AdminState) => {
    const incoming = Object.fromEntries(
      [...(next.templates || []), ...(next.localFiles || [])].map((file) => [
        file.path,
        file.content,
      ]),
    );
    const allowed = knownFiles(next.config);
    const merged = { ...incoming };
    for (const file of allowed) {
      const draft = filesRef.current[file.path];
      if (draft !== undefined && draft !== savedRef.current[file.path])
        merged[file.path] = draft;
      else merged[file.path] ??= '';
    }
    filesRef.current = merged;
    savedRef.current = incoming;
    setFiles(merged);
    setSavedFiles(incoming);
    setData({
      ...next,
      config: { ...next.config, rules: next.config.rules ?? [] },
    });
    setSelectedFile((current) =>
      allowed.some((file) => file.path === current)
        ? current
        : (allowed[0]?.path ?? ''),
    );
    setLoadError('');
  }, []);
  const load = useCallback(
    async () => apply(await request<AdminState>('/api/admin/state')),
    [apply],
  );
  useEffect(() => {
    void load().catch((error) => setLoadError(error.message));
  }, [load]);
  useEffect(() => {
    if (!data) return;
    let active = true;
    const timer = setInterval(() => {
      void request<{
        resources: ResourceStatus[];
        ruleResources: ResourceStatus[];
      }>('/api/status')
        .then((status) => {
          if (active)
            setData((current) =>
              current
                ? {
                    ...current,
                    resources: status.resources,
                    ruleResources: status.ruleResources,
                  }
                : current,
            );
        })
        .catch(() => undefined);
    }, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [Boolean(data)]);

  async function persist(config: Config) {
    apply(await request<AdminState>('/api/admin/config', 'PUT', config));
  }
  const dirtyFiles = Object.keys(files).filter(
    (path) => files[path] !== (savedFiles[path] ?? ''),
  );
  useEffect(() => {
    if (!dirtyFiles.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyFiles.length]);

  async function saveFile(path = selectedFile) {
    if (!path) return;
    const content = files[path] ?? '';
    await request('/api/admin/file', 'PUT', { path, content });
    savedRef.current = { ...savedRef.current, [path]: content };
    setSavedFiles(savedRef.current);
    await load();
  }
  async function sync(
    index?: number,
    kind: 'upstreams' | 'rules' = 'upstreams',
  ) {
    await request(
      index === undefined
        ? '/api/sync'
        : kind === 'rules'
          ? `/api/rules/sync/${index}`
          : `/api/sync/${index}`,
      'POST',
    );
    await load();
  }

  const metaFiles = data ? knownFiles(data.config) : [];
  return {
    data,
    files,
    setFiles,
    selectedFile,
    setSelectedFile,
    dirtyFiles,
    metaFiles,
    loadError,
    load,
    persist,
    saveFile,
    sync,
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
