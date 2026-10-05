import { Braces, Check, FileCode2, LoaderCircle, Save, X } from 'lucide-react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { Editor } from '../../components/editor/Editor';
import { useRawProfile } from './useRawProfile';
export function FileEditorPanel({
  rawOpen,
  setRawOpen,
  path,
}: {
  rawOpen: boolean;
  setRawOpen: (open: boolean) => void;
  path?: string;
}) {
  const {
    metaFiles,
    selectedFile: workspaceFile,
    files,
    setFiles,
    dirtyFiles,
    busy,
    run,
    saveFile,
  } = useWorkspaceContext();
  const selectedFile = path ?? workspaceFile;
  const fileMeta = metaFiles.find((file) => file.path === selectedFile);
  const { raw, rawBusy } = useRawProfile(
    fileMeta?.nodeIndex,
    selectedFile,
    rawOpen,
  );
  return (
    <div className="editor-panel">
      <div className="editor-toolbar">
        <div className="editor-file-title">
          <FileCode2 size={16} />
          <span title={selectedFile}>{selectedFile.split(/[/\\]/).pop()}</span>
          {dirtyFiles.includes(selectedFile) ? (
            <span className="draft-badge">未保存</span>
          ) : (
            <span className="saved-badge">
              <Check size={12} />
              已保存
            </span>
          )}
        </div>
        <div className="editor-actions">
          {fileMeta?.nodeIndex !== undefined && (
            <button
              className="button compact"
              onClick={() => setRawOpen(!rawOpen)}
            >
              <Braces size={14} />
              原始数据
            </button>
          )}
          <button
            className="button primary compact"
            disabled={Boolean(busy)}
            onClick={() =>
              void run(
                'file',
                () => saveFile(selectedFile),
                '文件已保存并重新加载',
              )
            }
          >
            <Save size={14} />
            {busy === 'file' ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
      <div className="editor-path">{selectedFile}</div>
      <Editor
        path={selectedFile}
        value={files[selectedFile] ?? ''}
        onChange={(content) =>
          setFiles((current) => ({
            ...current,
            [selectedFile]: content,
          }))
        }
        onSave={() =>
          void run('file', () => saveFile(selectedFile), '文件已保存并重新加载')
        }
      />
      {rawOpen && (
        <div className="raw-panel">
          <header>
            <span>上游原始数据</span>
            {rawBusy && <LoaderCircle size={14} className="spin" />}
            <button
              className="icon-button"
              aria-label="关闭原始数据"
              onClick={() => setRawOpen(false)}
            >
              <X size={14} />
            </button>
          </header>
          <pre>{raw}</pre>
        </div>
      )}
      <footer className="editor-status">
        <span>{fileMeta?.category} · UTF-8</span>
        <span>Ctrl / ⌘ + S 保存</span>
      </footer>
    </div>
  );
}
