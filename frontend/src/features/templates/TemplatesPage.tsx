import { Layers3, Search } from 'lucide-react';
import { useWorkspaceContext } from '../../app/WorkspaceProvider';
import { Empty } from '../../components/EmptyState';
import { AddButton } from '../../components/AddButton';
import { TemplateCard } from './TemplateCard';
import { useState } from 'react';
export function TemplatesPage() {
  const { data, search } = useWorkspaceContext();
  const [editing, setEditing] = useState<string | null>(null);
  if (!data) return null;
  const templates = data.config.templates;
  const filtered = templates
    .map((template, index) => ({ template, index }))
    .filter(({ template }) =>
      (template.name + ' ' + template.path)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  return (
    <>
      <div className="template-grid">
        {filtered.map(({ template, index }) => (
          <TemplateCard
            key={index}
            template={template}
            index={index}
            expanded={editing === template.path}
            onOpen={() => setEditing(template.path)}
            onClose={() => setEditing(null)}
          />
        ))}
      </div>
      {!templates.length && (
        <Empty
          icon={Layers3}
          title="创建一个输出模板"
          description="通过模板脚本组合上游和规则，生成 Clash 或 sing-box 订阅。"
          action={<AddButton kind="templates" />}
        />
      )}
      {templates.length > 0 && !filtered.length && (
        <Empty
          icon={Search}
          title="没有找到匹配项"
          description="试试其他名称或路径。"
        />
      )}
    </>
  );
}
