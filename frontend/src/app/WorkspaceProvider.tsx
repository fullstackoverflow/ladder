import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { View } from '../types/workspace';
import { useWorkspace } from '../hooks/useWorkspace';
import { useActions } from '../hooks/useActions';
import { useConfigDialog } from '../hooks/useConfigDialog';
import { views } from './navigation';

function useController() {
  const workspace = useWorkspace();
  const actions = useActions();
  const configDialog = useConfigDialog(workspace, actions);
  const [view, setView] = useState<View>('upstreams');
  const [search, setSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const current = views.find((item) => item.id === view)!;
  const allResources = [
    ...(workspace.data?.resources ?? []),
    ...(workspace.data?.ruleResources ?? []),
  ];
  const ready = allResources.filter((resource) => resource.ready).length;
  const failures = allResources.filter((resource) => resource.lastError).length;
  const countFor = (id: View) =>
    id === 'files'
      ? workspace.metaFiles.length
      : (workspace.data?.config[id]?.length ?? 0);
  function openFile(path: string) {
    workspace.setSelectedFile(path);
  }
  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    actions.notify(label + '已复制');
  }
  return {
    ...workspace,
    ...actions,
    ...configDialog,
    view,
    setView,
    search,
    setSearch,
    previewOpen,
    setPreviewOpen,
    current,
    allResources,
    ready,
    failures,
    countFor,
    openFile,
    copy,
  };
}
const WorkspaceContext = createContext<ReturnType<typeof useController> | null>(
  null,
);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const controller = useController();
  return (
    <WorkspaceContext.Provider value={controller}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspaceContext() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}
