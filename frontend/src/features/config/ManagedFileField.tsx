import { useEffect, useState } from 'react';
import { FilePlus2, Upload } from 'lucide-react';
import { request } from '../../lib/api';

type LibraryFile = { name: string; path: string };
export function ManagedFileField({
  name,
  label,
  value = '',
  optional = false,
  defaultContent = '',
  defaultName = 'source.yaml',
}: {
  name: string;
  label: string;
  value?: string;
  optional?: boolean;
  defaultContent?: string;
  defaultName?: string;
}) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [selected, setSelected] = useState(value);
  const [creating, setCreating] = useState(false);
  const [filename, setFilename] = useState(defaultName);
  const [content, setContent] = useState(defaultContent);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void request<LibraryFile[]>('/api/admin/files')
      .then((next) => {
        if (active) {
          setFiles(next);
          setSelected((current) =>
            next.some((file) => file.path === current) ? current : '',
          );
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function create() {
    setPending(true);
    setError('');
    try {
      const file = await request<LibraryFile>('/api/admin/files', 'POST', {
        name: filename,
        content,
      });
      setFiles(await request<LibraryFile[]>('/api/admin/files'));
      setSelected(file.path);
      setCreating(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="managed-file-field wide">
      <input type="hidden" name="managedFilePending" value={String(pending)} />
      <label className="field">
        {label}
        {optional && <span className="optional">可选</span>}
        <select
          name={name}
          value={selected}
          required={!optional}
          onChange={(event) => setSelected(event.target.value)}
          disabled={pending}
        >
          <option value="">{optional ? '不使用' : '选择文件库中的文件'}</option>
          {files.map((file) => (
            <option key={file.path} value={file.path}>
              {file.name}
            </option>
          ))}
        </select>
      </label>
      <div className="managed-file-actions">
        <button
          type="button"
          className="button compact"
          disabled={pending}
          onClick={() => setCreating(!creating)}
        >
          <FilePlus2 size={14} />
          新建 / 上传文件
        </button>
      </div>
      <p className="field-help">
        文件保存在服务端 data 文件夹，选择后保存配置即可引用。
      </p>
      {creating && (
        <fieldset className="managed-file-create" disabled={pending}>
          <label className="field">
            上传文本文件
            <input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPending(true);
                setFilename(file.name);
                void file
                  .text()
                  .then(setContent)
                  .catch((error) => setError(String(error)))
                  .finally(() => setPending(false));
              }}
            />
          </label>
          <label className="field">
            文件名
            <input
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="source.yaml"
            />
          </label>
          <label className="field">
            初始文件内容
            <textarea
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="button compact"
            disabled={!filename.trim()}
            onClick={() => void create()}
          >
            <Upload size={14} />
            {pending ? '正在创建…' : '创建文件并选用'}
          </button>
          <p className="field-help">
            文件创建后会保留在文件库中，取消配置不会删除文件。
          </p>
        </fieldset>
      )}
      {error && (
        <p className="managed-file-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
