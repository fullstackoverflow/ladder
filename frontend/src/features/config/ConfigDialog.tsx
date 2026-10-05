import { TemplateFields } from './TemplateFields';
import { SourceFields } from './SourceFields';
import { readConfigForm } from './readConfigForm';
import { useEffect, useRef, useState } from 'react';
import { X, Trash2, LoaderCircle } from 'lucide-react';
import type { DialogData, Source, Template } from '../../types/workspace';

export function ConfigDialog({
  data,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  data: DialogData;
  busy: boolean;
  onClose: () => void;
  onSave: (value: Source | Template) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const isTemplate = data.kind === 'templates';
  const value = data.value;
  const title = isTemplate
    ? '输出模板'
    : data.kind === 'rules'
      ? '规则源'
      : '上游';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = readConfigForm(data, new FormData(event.currentTarget));
    try {
      await onSave(next);
    } catch (error) {
      setError(String(error instanceof Error ? error.message : error));
    }
  }
  return (
    <dialog
      ref={dialog}
      className="config-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header className="dialog-heading">
          <div>
            <span className="eyebrow">
              {data.index === null ? 'NEW RESOURCE' : 'EDIT RESOURCE'}
            </span>
            <h2>
              {data.index === null ? '新增' : '编辑'}
              {title}
            </h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>
        <fieldset disabled={busy} className="form-fields">
          <label className="field wide">
            名称
            <input
              name="name"
              defaultValue={value.name}
              required
              autoFocus
              placeholder="给它一个容易识别的名字"
            />
          </label>
          {isTemplate ? (
            <TemplateFields value={data.value as Template} />
          ) : (
            <SourceFields
              kind={data.kind as 'upstreams' | 'rules'}
              value={data.value as Source}
            />
          )}
        </fieldset>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {deleting && (
          <div className="delete-confirm">
            <p>删除此{title}的配置引用？文件内容会保留。</p>
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() =>
                void onDelete().catch((error) => setError(String(error)))
              }
            >
              确认删除
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setDeleting(false)}
            >
              返回
            </button>
          </div>
        )}
        <footer className="dialog-footer">
          {data.index !== null && (
            <button
              className="button danger-ghost"
              type="button"
              disabled={busy}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={15} />
              删除
            </button>
          )}
          <span className="spacer" />
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button className="button primary" disabled={busy} type="submit">
            {busy && <LoaderCircle className="spin" size={15} />}保存配置
          </button>
        </footer>
      </form>
    </dialog>
  );
}
