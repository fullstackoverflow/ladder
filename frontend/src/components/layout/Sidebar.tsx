import { FileText, Layers3 } from 'lucide-react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { views } from '../../app/navigation';

export function Sidebar() {
  const { view, setView, setSearch, countFor, data, loadError, dirtyFiles } =
    useWorkspaceContext();
  return (
    <aside className="sidebar">
      <a href="/admin" className="brand" aria-label="Ladder 工作台">
        <span className="brand-symbol">
          <Layers3 size={22} />
        </span>
        <span>
          Ladder<span className="brand-caption">配置工作台</span>
        </span>
      </a>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="主导航">
        {views.map((item) => (
          <button
            key={item.id}
            aria-label={item.label}
            aria-current={view === item.id ? 'page' : undefined}
            className={`nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => {
              setView(item.id);
              setSearch('');
            }}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            <span className="nav-count">{countFor(item.id)}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className={`connection-dot ${loadError ? 'offline' : ''}`} />
        <span>
          {loadError ? '连接失败' : data ? '本地工作区已连接' : '正在连接…'}
        </span>
        {dirtyFiles.length > 0 && (
          <div className="draft-note">
            <FileText size={13} />
            {dirtyFiles.length} 个文件有未保存修改
          </div>
        )}
      </div>
    </aside>
  );
}
