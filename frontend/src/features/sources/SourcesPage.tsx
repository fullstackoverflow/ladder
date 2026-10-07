import { ListOrdered, Search, Server } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { Empty } from '../../components/EmptyState';
import { AddButton } from '../../components/AddButton';
import { SourceCard } from './SourceCard';
import { useSourceSorting } from './useSourceSorting';
import { useState } from 'react';
import { InlineFileEditor } from '../files/InlineFileEditor';

export function SourcesPage({ kind }: { kind: 'upstreams' | 'rules' }) {
  const { data, busy, search, openDialog, openFile, run, sync } =
    useWorkspaceContext();
  const { sensors, dragEnd, reorder } = useSourceSorting(kind);
  const [editing, setEditing] = useState<{
    owner: string;
    path: string;
  } | null>(null);
  if (!data) return null;
  const sources = data.config[kind] ?? [];
  const filtered = sources
    .map((source, index) => ({ source, index }))
    .filter(({ source }) =>
      (source.name + ' ' + source.from)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const resources = kind === 'rules' ? data.ruleResources : data.resources;
  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={dragEnd}
      >
        <SortableContext
          items={sources.map((_, index) => `${kind}-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="source-list">
            {filtered.map(({ source, index }) => (
              <SourceCard
                key={kind + '-' + index}
                source={source}
                index={index}
                kind={kind}
                resource={resources.find(
                  (resource) => resource.index === index,
                )}
                busy={Boolean(busy)}
                orderDisabled={Boolean(search)}
                count={sources.length}
                onEdit={() => openDialog(kind, index)}
                onFile={(path) => {
                  openFile(path);
                  setEditing({
                    owner: kind + ':' + source.name + ':' + source.from,
                    path,
                  });
                }}
                onSync={() =>
                  void run('source', () => sync(index, kind), '来源已同步')
                }
                onMove={(delta) => void reorder(index, index + delta)}
              >
                {editing?.owner ===
                  kind + ':' + source.name + ':' + source.from && (
                  <InlineFileEditor
                    key={editing.path}
                    path={editing.path}
                    title={
                      source.name +
                      ' · ' +
                      (kind === 'rules' ? '规则文件' : '上游文件')
                    }
                    onClose={() => setEditing(null)}
                  />
                )}
              </SourceCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {sources.length > 0 &&
        sources.every((source) => source.source !== 'local') && (
          <div className="hint">
            <Server size={16} />
            <p>
              当前来源均为远程
              URL。只有本地文件来源支持编辑文件内容；新增来源时选择“本地文件”，从文件库选择、创建或上传文件后，卡片上会显示“编辑文件内容”按钮。
            </p>
          </div>
        )}
      {!sources.length && (
        <Empty
          icon={kind === 'rules' ? ListOrdered : Server}
          title={
            kind === 'rules' ? '添加你的第一份规则文件' : '连接你的第一个上游'
          }
          description={
            kind === 'rules'
              ? '支持本地 YAML / JSON 文件和远程 URL。'
              : '从远程订阅或本地文件开始，创建节点来源。'
          }
          action={<AddButton kind={kind} />}
        />
      )}
      {sources.length > 0 && (
        <div className="hint">
          <ListOrdered size={16} />
          <p>
            每个文件对应一个数组元素。拖拽手柄或使用上下箭头调整顺序，文件内部的内容与顺序会完整保留。
            {search && '清空搜索后可以调整顺序。'}
          </p>
        </div>
      )}
      {sources.length > 0 && !filtered.length && (
        <Empty
          icon={Search}
          title="没有找到匹配项"
          description="试试其他名称或路径。"
        />
      )}
    </>
  );
}
