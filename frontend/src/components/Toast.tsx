import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useWorkspaceContext } from '../app/WorkspaceProvider';

export function Toast() {
  const { toast, setToast } = useWorkspaceContext();
  if (!toast) return null;
  return (
    <div
      className={`toast ${toast.error ? 'error' : ''}`}
      role={toast.error ? 'alert' : 'status'}
    >
      {toast.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{toast.message}</span>
      <button
        className="icon-button"
        aria-label="关闭通知"
        onClick={() => setToast(null)}
      >
        <X size={15} />
      </button>
    </div>
  );
}
