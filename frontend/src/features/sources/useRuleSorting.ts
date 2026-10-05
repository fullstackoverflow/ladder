import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
export function useRuleSorting() {
  const { data, busy, persist, run } = useWorkspaceContext();
  async function reorder(from: number, to: number) {
    if (!data || busy) return;
    const rules = [...(data.config.rules ?? [])];
    if (to < 0 || to >= rules.length || from === to) return;
    const [entry] = rules.splice(from, 1);
    rules.splice(to, 0, entry);
    await run(
      'order',
      () => persist({ ...data.config, rules }),
      '规则文件顺序已保存',
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
        Number(String(event.active.id).replace('rule-', '')),
        Number(String(event.over.id).replace('rule-', '')),
      );
  }

  return { sensors, dragEnd, reorder };
}
