import { Plus } from 'lucide-react';
import { useWorkspaceContext } from '../app/WorkspaceProvider';
import type { DialogData } from '../types/workspace';
export function AddButton({ kind }: { kind: DialogData['kind'] }) {
  const { busy, openDialog } = useWorkspaceContext();
  return (
    <button
      className="button primary"
      disabled={Boolean(busy)}
      onClick={() => openDialog(kind)}
    >
      <Plus size={16} />
      新增{kind === 'templates' ? '模板' : kind === 'rules' ? '规则源' : '上游'}
    </button>
  );
}
