import type { Template } from '../../types/workspace';
import { ManagedFileField } from './ManagedFileField';
export function TemplateFields({ value }: { value: Template }) {
  return (
    <>
      <label className="field wide">
        输出类型
        <select name="target" defaultValue={value.target}>
          <option value="clash">Clash</option>
          <option value="singbox">sing-box</option>
        </select>
      </label>
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
