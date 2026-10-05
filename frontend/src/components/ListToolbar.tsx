import { Search } from 'lucide-react';
import { useWorkspaceContext } from '../app/WorkspaceProvider';

export function ListToolbar({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  const { search, setSearch } = useWorkspaceContext();
  return (
    <div className="list-toolbar">
      <div className="section-label">
        {label}
        <span>{count}</span>
      </div>
      <label className="search-box">
        <Search size={15} />
        <input
          aria-label="搜索来源"
          placeholder="搜索名称或路径…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
    </div>
  );
}
