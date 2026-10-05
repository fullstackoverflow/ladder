import type { Template } from '../../types/workspace';
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
      <label className="field wide">
        模板文件路径
        <input
          name="path"
          defaultValue={value.path}
          required
          placeholder="./templates/clash.yaml"
        />
      </label>
    </>
  );
}
