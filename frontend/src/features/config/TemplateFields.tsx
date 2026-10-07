import type { Template } from '../../types/workspace';
import { ManagedFileField } from './ManagedFileField';
export function TemplateFields({ value }: { value: Template }) {
  return (
    <>
      <p className="field-help wide">输出格式：Clash YAML</p>
      <ManagedFileField
        name="path"
        label="模板文件"
        value={value.path}
        defaultName="template.yaml"
        defaultContent="{}\n"
      />
    </>
  );
}
