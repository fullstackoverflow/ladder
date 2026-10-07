import { useState } from 'react';
import type { Workspace } from './useWorkspace';
import type { Actions } from './useActions';
import type { DialogData, Source, Template } from '../types/workspace';
import { request } from '../lib/api';
export function useConfigDialog(
  { data, persist, load }: Workspace,
  { setBusy, notify }: Actions,
) {
  const [dialog, setDialog] = useState<DialogData | null>(null);
  function openDialog(kind: DialogData['kind'], index: number | null = null) {
    if (!data) return;
    const value =
      index === null
        ? kind === 'templates'
          ? { name: '', target: 'clash' as const, path: '' }
          : {
              name: '',
              source: 'local' as const,
              from: '',
              format: 'yaml' as const,
            }
        : data.config[kind]![index];
    setDialog({ kind, index, value });
  }
  async function saveDialog(
    value: Source | Template,
    contents: Record<string, string>,
  ) {
    if (!data || !dialog) return;
    if (
      dialog.kind === 'templates' &&
      data.config.templates.some(
        (template, index) =>
          index !== dialog.index &&
          template.target === (value as Template).target,
      )
    )
      throw new Error('每种输出类型只能配置一个模板，避免订阅地址冲突。');
    setBusy('config');
    try {
      await request('/api/admin/entry', 'POST', {
        kind: dialog.kind,
        index: dialog.index,
        value,
        contents,
      });
      await load();
      setDialog(null);
      notify('配置已保存');
    } finally {
      setBusy('');
    }
  }
  async function deleteDialog() {
    if (!data || !dialog || dialog.index === null) return;
    setBusy('config');
    try {
      await persist({
        ...data.config,
        [dialog.kind]: data.config[dialog.kind]!.filter(
          (_, index) => index !== dialog.index,
        ),
      });
      setDialog(null);
      notify('配置引用已删除');
    } finally {
      setBusy('');
    }
  }

  return { dialog, setDialog, openDialog, saveDialog, deleteDialog };
}
