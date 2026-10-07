import type { Template } from '../../types/workspace';
import { FileContentField } from './FileContentField';
export function TemplateFields({ value }: { value: Template }) {
  return (
    <>
      <p className="field-help wide">输出格式：Clash YAML</p>
      <FileContentField
        name="path"
        label="模板文件"
        value={value.path}
      />
    </>
  );
}
