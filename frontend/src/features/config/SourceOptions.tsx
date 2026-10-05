import type { Source } from '../../types/workspace';
export function SourceOptions({ value }: { value: Source }) {
  return (
    <details className="advanced wide">
      <summary>刷新与高级设置</summary>
      <div className="advanced-grid">
        <label className="field">
          编码
          <select name="encoding" defaultValue={value.encoding || ''}>
            <option value="">无</option>
            <option value="base64">Base64</option>
          </select>
        </label>
        <label className="field">
          刷新间隔（秒）
          <input
            name="refresh"
            type="number"
            min="1"
            defaultValue={value.refresh}
            placeholder="不自动刷新"
          />
        </label>
        <label className="field">
          重试次数
          <input
            name="retry"
            type="number"
            min="0"
            defaultValue={value.retry}
            placeholder="3"
          />
        </label>
        <label className="field">
          重试间隔（秒）
          <input
            name="retryInterval"
            type="number"
            min="0"
            step="any"
            defaultValue={value.retryInterval}
            placeholder="3"
          />
        </label>
        <label className="field">
          退避倍数
          <input
            name="retryBackoff"
            type="number"
            min="1"
            step="any"
            defaultValue={value.retryBackoff}
            placeholder="2"
          />
        </label>
      </div>
    </details>
  );
}
