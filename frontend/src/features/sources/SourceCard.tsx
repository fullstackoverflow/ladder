import {
  ArrowDown,
  ArrowUp,
  FileText,
  Globe2,
  GripVertical,
  HardDrive,
  RefreshCw,
  Settings2,
  AlertCircle,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Source, ResourceStatus } from '../../types/workspace';
import { Status } from './ResourceStatus';
import type { ReactNode } from 'react';
export function SourceCard({
  source,
  index,
  kind,
  resource,
  busy,
  orderDisabled,
  onEdit,
  onFile,
  onSync,
  onMove,
  count,
  children,
}: {
  source: Source;
  index: number;
  kind: 'upstreams' | 'rules';
  resource?: ResourceStatus;
  busy: boolean;
  orderDisabled: boolean;
  onEdit: () => void;
  onFile: (path: string) => void;
  onSync: () => void;
  onMove: (delta: number) => void;
  count: number;
  children?: ReactNode;
}) {
  const sortable = useSortable({
    id: `${kind}-${index}`,
    disabled: busy || orderDisabled,
  });
  const local = source.source === 'local';
  return (
    <article
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={`source-card ${sortable.isDragging ? 'dragging' : ''} ${children ? 'expanded' : ''}`}
    >
      <div className="rule-order">
        <button
          ref={sortable.setActivatorNodeRef}
          {...sortable.attributes}
          {...sortable.listeners}
          disabled={busy || orderDisabled}
          className="drag-handle"
          aria-label={`拖动 ${source.name} 调整顺序`}
        >
          <GripVertical size={18} />
        </button>
        <span className="index-number">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className={`source-icon ${local ? 'local' : ''}`}>
        {local ? <HardDrive size={20} /> : <Globe2 size={20} />}
      </div>
      <div className="source-main">
        <div className="source-title">
          <h3>{source.name}</h3>
          <Status resource={resource} />
        </div>
        <p className="source-path" title={source.from}>
          {source.from}
        </p>
        <div className="source-meta">
          <span>{local ? '本地文件' : '远程订阅'}</span>
          <span>{source.format.toUpperCase()}</span>
          <code>
            $.{kind}[{index}]
          </code>
          {source.refresh && <span>每 {source.refresh} 秒刷新</span>}
          {resource?.lastSuccessAt && (
            <span>
              同步于{' '}
              {new Date(resource.lastSuccessAt).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <span>
            {resource?.contentLength
              ? `${(resource.contentLength / 1024).toFixed(1)} KB`
              : '—'}
          </span>
        </div>
        {resource?.lastError && (
          <p className="resource-error">
            <AlertCircle size={13} />
            {resource.lastError}
          </p>
        )}
      </div>
      <div className="source-actions">
        <div className="order-buttons">
          <button
            className="icon-button"
            title="上移"
            aria-label={`上移 ${source.name}`}
            disabled={busy || orderDisabled || index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={14} />
          </button>
          <button
            className="icon-button"
            title="下移"
            aria-label={`下移 ${source.name}`}
            disabled={busy || orderDisabled || index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={14} />
          </button>
        </div>
        {local && (
          <button
            className="button compact"
            onClick={() => onFile(source.from)}
          >
            <FileText size={14} />
            编辑文件内容
          </button>
        )}
        <button
          className="icon-button"
          disabled={busy}
          onClick={onSync}
          title="同步"
          aria-label={`同步 ${source.name}`}
        >
          <RefreshCw size={16} />
        </button>
        <button
          className="button compact"
          disabled={busy}
          onClick={onEdit}
          title="来源设置"
          aria-label={`编辑 ${source.name} 的配置`}
        >
          <Settings2 size={16} />
          来源设置
        </button>
      </div>
      {children}
    </article>
  );
}
