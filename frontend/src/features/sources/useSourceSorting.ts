import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
export function useSourceSorting(kind: 'upstreams' | 'rules') {
  const { data, busy, persist, run } = useWorkspaceContext();
  async function reorder(from: number, to: number) {
    if (!data || busy) return;
    const sources = [...(data.config[kind] ?? [])];
    if (
      from < 0 ||
      from >= sources.length ||
      to < 0 ||
      to >= sources.length ||
      from === to
    )
      return;
    const [entry] = sources.splice(from, 1);
    sources.splice(to, 0, entry);
    await run(
      'order',
      () => persist({ ...data.config, [kind]: sources }),
      kind === 'rules' ? '规则文件顺序已保存' : '上游顺序已保存',
    );
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function dragEnd(event: DragEndEvent) {
    if (event.over)
      void reorder(
        Number(String(event.active.id).replace(`${kind}-`, '')),
        Number(String(event.over.id).replace(`${kind}-`, '')),
      );
  }

  return { sensors, dragEnd, reorder };
}
