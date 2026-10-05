import {
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
} from 'lucide-react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';

export function Topbar() {
  const {
    current,
    failures,
    ready,
    allResources,
    busy,
    data,
    run,
    load,
    sync,
    previewOpen,
    setPreviewOpen,
  } = useWorkspaceContext();
  return (
    <header className="topbar">
      <div className="breadcrumb">
        工作区
        <ChevronRight size={14} />
        <span>{current.label}</span>
      </div>
      <div className="topbar-actions">
        <span className="health">
          <span className={`connection-dot ${failures ? 'offline' : ''}`} />
          {failures
            ? `${failures} 个来源异常`
            : `${ready}/${allResources.length} 来源就绪`}
        </span>
        <button
          className="icon-button"
          title="刷新工作区"
          aria-label="刷新工作区"
          disabled={Boolean(busy)}
          onClick={() => void run('load', load, '工作区已刷新')}
        >
          <RefreshCw size={16} className={busy === 'load' ? 'spin' : ''} />
        </button>
        <button
          className="button"
          disabled={Boolean(busy) || !data}
          onClick={() => void run('sync', () => sync(), '全部来源已同步')}
        >
          <RefreshCw size={15} className={busy === 'sync' ? 'spin' : ''} />
          同步全部
        </button>
        <button
          className={`button preview-toggle ${previewOpen ? 'selected' : ''}`}
          onClick={() => setPreviewOpen((open) => !open)}
        >
          {previewOpen ? (
            <PanelRightClose size={16} />
          ) : (
            <PanelRightOpen size={16} />
          )}
          预览
        </button>
      </div>
    </header>
  );
}
