import { X } from 'lucide-react';
import { FileEditorPanel } from './FileEditorPanel';

export function InlineFileEditor({
  path,
  title,
  onClose,
}: {
  path: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <section className="inline-file-editor" aria-label={title}>
      <header className="inline-editor-heading">
        <span>{title}</span>
        <button
          className="icon-button"
          aria-label="收起文件编辑器"
          title="收起编辑器，保留草稿"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>
      <FileEditorPanel path={path} />
    </section>
  );
}
