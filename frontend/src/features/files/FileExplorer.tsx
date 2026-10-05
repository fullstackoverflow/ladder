import { FileText, FolderOpen } from 'lucide-react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';

export function FileExplorer({ onSelect }: { onSelect: () => void }) {
  const { metaFiles, dirtyFiles, selectedFile, setSelectedFile } =
    useWorkspaceContext();
  return (
    <aside className="file-explorer">
      <div className="explorer-heading">
        <FolderOpen size={15} />
        工作区文件<span>{metaFiles.length}</span>
      </div>
      <div className="explorer-list">
        {['输出模板', '节点模板', '本地上游', '规则文件'].map((category) => {
          const group = metaFiles.filter((file) => file.category === category);
          return group.length ? (
            <section key={category}>
              <h3>{category}</h3>
              {group.map((file) => (
                <button
                  className={`file-item ${selectedFile === file.path ? 'active' : ''}`}
                  title={file.path}
                  onClick={() => {
                    setSelectedFile(file.path);
                    onSelect();
                  }}
                  key={file.path}
                >
                  <FileText size={15} />
                  <span>
                    {file.label}
                    <small>{file.path.split(/[/\\]/).pop()}</small>
                  </span>
                  {dirtyFiles.includes(file.path) && (
                    <span className="dirty-dot" aria-label="未保存" />
                  )}
                </button>
              ))}
            </section>
          ) : null;
        })}
      </div>
    </aside>
  );
}
