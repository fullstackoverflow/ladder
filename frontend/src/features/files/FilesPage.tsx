import { FolderOpen } from 'lucide-react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { Empty } from '../../components/EmptyState';
import { FileExplorer } from './FileExplorer';
import { FileEditorPanel } from './FileEditorPanel';
export function FilesPage() {
  const { metaFiles } = useWorkspaceContext();
  return metaFiles.length ? (
    <div className="file-workspace">
      <FileExplorer />
      <FileEditorPanel />
    </div>
  ) : (
    <Empty
      icon={FolderOpen}
      title="还没有可编辑文件"
      description="添加输出模板或本地来源后，文件会出现在这里。"
    />
  );
}
