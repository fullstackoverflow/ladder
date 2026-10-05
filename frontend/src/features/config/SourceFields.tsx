import { useState } from 'react';
import type { Source } from '../../types/workspace';
import { SourceOptions } from './SourceOptions';
export function SourceFields({
  value,
  kind,
}: {
  value: Source;
  kind: 'upstreams' | 'rules';
}) {
  const [sourceType, setSourceType] = useState(value.source || 'URI');
  return (
    <>
      <label className="field">
        来源
        <select
          name="source"
          value={sourceType}
          onChange={(event) =>
            setSourceType(event.target.value as Source['source'])
          }
        >
          <option value="URI">远程 URL</option>
          <option value="local">本地文件</option>
        </select>
      </label>
      <label className="field">
        内容格式
        <select name="format" defaultValue={value.format || 'yaml'}>
          <option value="yaml">YAML</option>
          <option value="json">JSON</option>
          {kind === 'upstreams' && (
            <option value="node-list">节点 URI 列表</option>
          )}
        </select>
      </label>
      <label className="field wide">
        {sourceType === 'local' ? '文件路径' : '订阅 URL'}
        <input
          name="from"
          defaultValue={value.from}
          required
          placeholder={
            sourceType === 'local' ? './sample/source.yaml' : 'https://…'
          }
          type={sourceType === 'local' ? 'text' : 'url'}
        />
      </label>
      {kind === 'upstreams' && (
        <label className="field wide">
          节点模板路径 <span className="optional">可选</span>
          <input
            name="nodeTemplatePath"
            defaultValue={value.nodeTemplatePath}
            placeholder="./templates/provider.node.yaml"
          />
        </label>
      )}
      <SourceOptions value={value} />
    </>
  );
}
