import { Circle } from 'lucide-react';
import type { ResourceStatus } from '../../types/workspace';
export function Status({ resource }: { resource?: ResourceStatus }) {
  const error = resource?.lastError;
  const label = error
    ? '同步失败'
    : resource?.ready
      ? resource.restoredFromCache
        ? '缓存可用'
        : '已就绪'
      : '等待同步';
  return (
    <span
      className={`status ${error ? 'error' : resource?.ready ? 'ready' : 'pending'}`}
      title={error}
    >
      <Circle size={7} fill="currentColor" />
      {label}
    </span>
  );
}
