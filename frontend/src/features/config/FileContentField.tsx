export function FileContentField({
  name,
  label,
  value = '',
}: {
  name: string;
  label: string;
  value?: string;
}) {
  return (
    <div className="file-content-field wide">
      <input type="hidden" name={name} value={value} />
      {value ? (
        <p className="field-help">{label}已保存，内容可在对应卡片中编辑。</p>
      ) : (
        <label className="field">
          {label}内容
          <textarea
            aria-label={`${label}内容`}
            name={`${name}Content`}
            rows={8}
            spellCheck={false}
          />
          <span className="field-help">
            保存时自动创建文件，无需设置文件名或路径。
          </span>
        </label>
      )}
    </div>
  );
}
