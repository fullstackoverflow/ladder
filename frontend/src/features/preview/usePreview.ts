import { useCallback, useEffect, useRef, useState } from 'react';
import type { Config } from '../../types/workspace';
import { request } from '../../lib/api';
export function usePreview(
  config: Config | undefined,
  files: Record<string, string>,
  open: boolean,
) {
  const [previewTab, setPreviewTab] = useState<'rendered' | 'data' | 'config'>(
    'rendered',
  );
  const [target, setTarget] = useState('');
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewSequence = useRef(0);
  const filesRef = useRef(files);
  filesRef.current = files;
  const refreshPreview = useCallback(async () => {
    if (!config) return;
    const sequence = ++previewSequence.current;
    setPreviewBusy(true);
    setPreviewError('');
    try {
      let content: string;
      if (previewTab === 'config') content = JSON.stringify(config, null, 2);
      else if (previewTab === 'data')
        content = JSON.stringify(
          await request('/api/admin/preview/profiles/rendered', 'POST'),
          null,
          2,
        );
      else if (!target) content = '添加输出模板后即可预览。';
      else {
        const output = await request<unknown>(
          '/api/admin/preview/render',
          'POST',
          { target, config, files: filesRef.current },
        );
        content =
          typeof output === 'string' ? output : JSON.stringify(output, null, 2);
      }
      if (sequence === previewSequence.current) setPreview(content);
    } catch (error) {
      if (sequence === previewSequence.current)
        setPreviewError(error instanceof Error ? error.message : String(error));
    } finally {
      if (sequence === previewSequence.current) setPreviewBusy(false);
    }
  }, [config, previewTab, target]);
  useEffect(() => {
    if (open) void refreshPreview();
  }, [open, refreshPreview]);

  useEffect(() => {
    setTarget((current) =>
      config?.templates.some((template) => template.target === current)
        ? current
        : (config?.templates[0]?.target ?? ''),
    );
  }, [config]);
  return {
    previewTab,
    setPreviewTab,
    target,
    setTarget,
    preview,
    previewError,
    previewBusy,
    refreshPreview,
  };
}
