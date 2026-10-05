import {
  ArrowUpRight,
  Copy,
  FileCode2,
  Layers3,
  Settings2,
} from 'lucide-react';
import type { Template } from '../../types/workspace';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { InlineFileEditor } from '../files/InlineFileEditor';
export function TemplateCard({
  template,
  index,
  expanded,
  onOpen,
  onClose,
}: {
  template: Template;
  index: number;
  expanded: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { busy, openDialog, openFile, copy, notify } = useWorkspaceContext();
  return (
    <article
      className={`template-card ${expanded ? 'expanded' : ''}`}
      key={index}
    >
      <div className="template-card-top">
        <span className={`target-icon ${template.target}`}>
          <Layers3 size={23} />
        </span>
        <span className="tag">
          {template.target === 'clash' ? 'Clash' : 'sing-box'}
        </span>
        <span className="spacer" />
        <button
          className="icon-button"
          disabled={Boolean(busy)}
          title="编辑模板配置"
          aria-label={`编辑 ${template.name} 的配置`}
          onClick={() => openDialog('templates', index)}
        >
          <Settings2 size={16} />
        </button>
      </div>
      <h3>{template.name}</h3>
      <p className="source-path">{template.path}</p>
      <button
        className="subscription-url"
        onClick={() =>
          void copy(
            new URL(`/subscribe/${template.target}`, location.origin).href,
            '订阅地址',
          ).catch((error) => notify(error.message, true))
        }
      >
        <code>/subscribe/{template.target}</code>
        <Copy size={14} />
      </button>
      <div className="template-card-actions">
        <button
          className="button"
          onClick={() => {
            openFile(template.path);
            onOpen();
          }}
        >
          <FileCode2 size={15} />
          编辑模板
        </button>
        <a
          className="button"
          href={`/subscribe/${template.target}`}
          target="_blank"
          rel="noreferrer"
        >
          订阅
          <ArrowUpRight size={15} />
        </a>
      </div>
      {expanded && (
        <InlineFileEditor
          path={template.path}
          title={template.name + ' · 输出模板'}
          onClose={onClose}
        />
      )}
    </article>
  );
}
