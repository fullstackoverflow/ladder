import { Copy, PanelRightClose, RefreshCw, AlertCircle } from 'lucide-react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { usePreview } from './usePreview';
import { Editor } from '../../components/editor/Editor';

export function PreviewPanel() {
  const { data, files, previewOpen, setPreviewOpen, dirtyFiles, copy, notify } =
    useWorkspaceContext();
  const {
    previewTab,
    setPreviewTab,
    target,
    setTarget,
    preview,
    previewError,
    previewBusy,
    refreshPreview,
  } = usePreview(data?.config, files, previewOpen);
  if (!previewOpen) return null;
  return (
    <aside className="preview-panel">
      <header className="preview-heading">
        <div>
          <span className="eyebrow">INSPECTOR</span>
          <h2>配置预览</h2>
        </div>
        <button
          className="icon-button"
          onClick={() => setPreviewOpen(false)}
          aria-label="关闭预览"
        >
          <PanelRightClose size={17} />
        </button>
      </header>
      <div className="preview-tabs">
        {(['rendered', 'data', 'config'] as const).map((tab) => (
          <button
            className={previewTab === tab ? 'active' : ''}
            onClick={() => setPreviewTab(tab)}
            key={tab}
          >
            {tab === 'rendered'
              ? '渲染结果'
              : tab === 'data'
                ? '$ 数据'
                : '配置'}
          </button>
        ))}
      </div>
      <div className="preview-tools">
        {previewTab === 'rendered' ? (
          <select
            aria-label="预览输出类型"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            {data?.config.templates.map((template) => (
              <option key={template.target} value={template.target}>
                {template.name} · {template.target}
              </option>
            ))}
          </select>
        ) : (
          <span>
            {previewTab === 'data'
              ? '当前已加载的来源数据'
              : '当前已保存的配置'}
          </span>
        )}
        <button
          className="icon-button"
          disabled={previewBusy}
          title="刷新预览"
          aria-label="刷新预览"
          onClick={() => void refreshPreview()}
        >
          <RefreshCw size={15} className={previewBusy ? 'spin' : ''} />
        </button>
        <button
          className="icon-button"
          title="复制预览"
          aria-label="复制预览"
          disabled={!preview}
          onClick={() =>
            void copy(preview, '预览内容').catch((error) =>
              notify(error.message, true),
            )
          }
        >
          <Copy size={15} />
        </button>
      </div>
      {previewTab === 'rendered' && dirtyFiles.length > 0 && (
        <div className="preview-draft">预览包含文件草稿 · 修改后点击刷新</div>
      )}
      {previewError ? (
        <div className="preview-error" role="alert">
          <AlertCircle size={18} />
          <pre>{previewError}</pre>
        </div>
      ) : (
        <Editor
          path={
            previewTab === 'rendered' && target === 'clash'
              ? 'preview.yaml'
              : 'preview.json'
          }
          value={preview}
          readOnly
        />
      )}
      <footer className="preview-footer">
        <span>{previewBusy ? '正在生成…' : '只读预览'}</span>
        <span>{preview.split('\n').length} 行</span>
      </footer>
    </aside>
  );
}
