import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useWorkspaceContext } from './WorkspaceProvider';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { WorkspaceFooter } from '../components/layout/WorkspaceFooter';
import { AddButton } from '../components/AddButton';
import { ListToolbar } from '../components/ListToolbar';
import { Toast } from '../components/Toast';
import { ConfigDialog } from '../features/config/ConfigDialog';
import { SourcesPage } from '../features/sources/SourcesPage';
import { TemplatesPage } from '../features/templates/TemplatesPage';
import { FilesPage } from '../features/files/FilesPage';
import { PreviewPanel } from '../features/preview/PreviewPanel';

export function Workbench() {
  const {
    data,
    view,
    current,
    previewOpen,
    loadError,
    run,
    load,
    countFor,
    dialog,
    busy,
    setDialog,
    saveDialog,
    deleteDialog,
  } = useWorkspaceContext();
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <Topbar />
        <div className={'workspace ' + (previewOpen ? 'with-preview' : '')}>
          <section className="main-content">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{view.toUpperCase()}</span>
                <h1>{current.heading}</h1>
                <p>{current.subtitle}</p>
              </div>
              {view !== 'files' && data && <AddButton kind={view} />}
            </div>
            {loadError ? (
              <div className="connection-error">
                <AlertCircle size={24} />
                <h3>无法连接工作区</h3>
                <p>{loadError}</p>
                <button
                  className="button"
                  onClick={() => void run('load', load)}
                >
                  重试
                </button>
              </div>
            ) : !data ? (
              <div className="loading-state">
                <LoaderCircle size={24} className="spin" />
                <p>正在加载工作区…</p>
              </div>
            ) : (
              <>
                {view !== 'files' && (
                  <ListToolbar
                    label={
                      view === 'rules'
                        ? '文件顺序'
                        : view === 'templates'
                          ? '输出配置'
                          : '全部来源'
                    }
                    count={countFor(view)}
                  />
                )}
                {(view === 'upstreams' || view === 'rules') && (
                  <SourcesPage kind={view} />
                )}
                {view === 'templates' && <TemplatesPage />}
                {view === 'files' && <FilesPage />}
              </>
            )}
            <WorkspaceFooter />
          </section>
          <PreviewPanel />
        </div>
      </main>
      {dialog && (
        <ConfigDialog
          key={dialog.kind + '-' + dialog.index}
          data={dialog}
          busy={Boolean(busy)}
          onClose={() => setDialog(null)}
          onSave={saveDialog}
          onDelete={deleteDialog}
        />
      )}
      <Toast />
    </div>
  );
}
