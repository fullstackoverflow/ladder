import { useState } from 'react';
import type { Source } from '../../types/workspace';
import { SourceOptions } from './SourceOptions';
import { FileContentField } from './FileContentField';
export function SourceFields({
  value,
  kind,
}: {
  value: Source;
  kind: 'upstreams' | 'rules';
}) {
  const [sourceType, setSourceType] = useState(value.source || 'local');
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
      {sourceType === 'local' ? (
        <FileContentField
          name="from"
          label="本地文件"
          value={value.source === 'local' ? value.from : ''}
        />
      ) : (
        <label className="field wide">
          订阅 URL
          <input
            name="from"
            defaultValue={value.source === 'URI' ? value.from : ''}
            required
            placeholder="https://…"
            type="url"
          />
        </label>
      )}
      {sourceType === 'URI' && <SourceOptions value={value} />}
    </>
  );
}
