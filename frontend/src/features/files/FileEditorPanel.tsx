import { Check, FileCode2, Save, Search } from 'lucide-react';
import { useState } from 'react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { Editor } from '../../components/editor/Editor';
export function FileEditorPanel({ path }: { path?: string }) {
  const [searchRequest, setSearchRequest] = useState(0);
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
          <button
            className="button compact"
            title="查找 / 替换（Ctrl / ⌘ + F 或 H）"
            onClick={() => setSearchRequest((request) => request + 1)}
          >
            <Search size={14} />
            查找 / 替换
          </button>
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
        searchRequest={searchRequest}
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
      <footer className="editor-status">
        <span>{fileMeta?.category} · UTF-8</span>
        <span>Ctrl / ⌘ + S 保存</span>
      </footer>
    </div>
  );
}
