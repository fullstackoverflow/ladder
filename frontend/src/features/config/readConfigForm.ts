import type { DialogData, Source, Template } from '../../types/workspace';
export function readConfigForm(
  data: DialogData,
  form: FormData,
): Source | Template {
  const isTemplate = data.kind === 'templates';
  const string = (key: string) => String(form.get(key) ?? '').trim();
  let next: Source | Template;
  if (isTemplate)
    next = {
      ...data.value,
      name: string('name'),
      target: 'clash',
      path: string('path'),
    };
  else {
    const source: Source = {
      ...(data.value as Source),
      name: string('name'),
      source: string('source') as Source['source'],
      from: string('from'),
      format: string('format') as Source['format'],
    };
    delete source.encoding;
    delete source.nodeTemplatePath;
    if (string('encoding')) source.encoding = 'base64';
    if (data.kind === 'upstreams' && string('nodeTemplatePath'))
      source.nodeTemplatePath = string('nodeTemplatePath');
    for (const key of [
      'refresh',
      'retry',
      'retryInterval',
      'retryBackoff',
    ] as const) {
      delete source[key];
      if (string(key)) source[key] = Number(string(key));
    }
    next = source;
  }

  return next;
}
