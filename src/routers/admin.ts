import Router from '@koa/router';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { validateEquals } from 'typia';
import { GetConfig, GetConfigPath, SaveConfig } from '../services/config';
import { GetResourceManager, GetRuleManager, GetTemplateData, ResourceManager } from '../services/resource';
import { Render } from '../services/template';
import { Config } from '../util/type';
import { SaveEntry, EntryRequest } from '../services/entry';

const router = new Router();

async function ReadBody(ctx: any) {
  return await new Promise<string>((resolve, reject) => {
    let body = '';
    ctx.req.setEncoding('utf8');
    ctx.req.on('data', (chunk: string) => {
      body += chunk;
    });
    ctx.req.on('end', () => resolve(body));
    ctx.req.on('error', reject);
  });
}

async function ReadJson<T>(ctx: any): Promise<T> {
  return JSON.parse(await ReadBody(ctx));
}

async function ReadStaticFile(name: string) {
  const candidates = [
    join(process.cwd(), 'dist', 'static', name),
    join(__dirname, '..', 'static', name),
  ];

  let lastError: unknown;
  for (const path of candidates) {
    try {
      return await readFile(path);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function SubscribeUrl(target: string) {
  return `/subscribe/${encodeURIComponent(target)}`;
}

function TemplatesWithUrls(config = GetConfig()) {
  return (config.templates ?? []).map((template) => ({
    ...template,
    subscribeUrl: SubscribeUrl(template.target),
  }));
}

async function ReadOptionalFile(path: string) {
  try {
    return {
      path,
      exists: true,
      content: await readFile(path, { encoding: 'utf8' }),
    };
  } catch {
    return {
      path,
      exists: false,
      content: '',
    };
  }
}

async function AdminState(config = GetConfig()) {
  const templates = await Promise.all((config.templates ?? []).map(async (template) => ({
    ...template,
    subscribeUrl: SubscribeUrl(template.target),
    ...(await ReadOptionalFile(template.path)),
  })));

  return {
    configPath: GetConfigPath(),
    config,
    templates,
    localFiles: await Promise.all([...(config.upstreams ?? []), ...(config.rules ?? [])]
      .filter(source => source.source === 'local').map(source => ReadOptionalFile(source.from))),
    resources: GetResourceManager().Status(),
    ruleResources: GetRuleManager().Status(),
  };
}

function ValidateConfig(config: Config) {
  const result = validateEquals<Config>(config);
  if (!result.success) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }
}

function AllowedFilePaths(config = GetConfig()) {
  return new Set([
    ...(config.templates ?? []).map((template) => template.path),
    ...[...(config.upstreams ?? []), ...(config.rules ?? [])]
      .filter(source => source.source === 'local').map(source => source.from),

  ]);
}

async function RenderPreview(target: string, config: Config, files: Record<string, string> = {}) {
  const outputTemplate = (config.templates ?? []).find((template) => template.target === target);
  if (!outputTemplate) throw new Error(`template not found for target:${target}`);

  const template = files[outputTemplate.path] ?? await readFile(outputTemplate.path, { encoding: 'utf8' });
  const temporary: ResourceManager[] = [];
  try {
    const managers = [
      [config.upstreams, GetResourceManager()],
      [config.rules ?? [], GetRuleManager()],
    ] as const;
    const [upstreams, rules] = await Promise.all(managers.map(async ([sources, current]) => {
      if (current.Matches(sources)) return current.Profiles(files);
      const manager = new ResourceManager();
      temporary.push(manager);
      manager.SetUpstreams(sources);
      return manager.Profiles(files);
    }));
    return Render(template, { upstreams, rules });
  } finally {
    temporary.forEach(manager => manager.Clear());
  }
}

router.get('/', async ctx => {
  ctx.redirect('/admin');
});

router.get('/admin', async ctx => {
  ctx.type = 'html';
  ctx.set('Cache-Control', 'no-cache');
  ctx.body = await ReadStaticFile('index.html');
});

router.get('/admin/assets/:file', async ctx => {
  const file = ctx.params.file;
  if (!file || !/^[a-zA-Z0-9_.-]+\.(js|css|woff2?|svg)$/.test(file)) {
    ctx.status = 404;
    return;
  }
  try {
    ctx.type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'font/woff2';
    ctx.body = await ReadStaticFile(join('assets', file));
    ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
  } catch {
    ctx.status = 404;
  }
});

router.get('/api/status', async ctx => {
  ctx.body = {
    configPath: GetConfigPath(),
    templates: TemplatesWithUrls(),
    resources: GetResourceManager().Status(),
    ruleResources: GetRuleManager().Status(),
  };
});

router.get('/api/admin/state', async ctx => {
  ctx.body = await AdminState();
});

router.post('/api/admin/entry', async ctx => {
  try {
    const saved = await SaveEntry(await ReadJson<EntryRequest>(ctx));
    GetResourceManager().SetUpstreams(saved.upstreams);
    GetRuleManager().SetUpstreams(saved.rules ?? []);
    ctx.body = await AdminState(saved);
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.put('/api/admin/config', async ctx => {
  try {
    const config = await ReadJson<Config>(ctx);
    ValidateConfig(config);
    const saved = SaveConfig(config);
    GetResourceManager().SetUpstreams(saved.upstreams ?? []);
    GetRuleManager().SetUpstreams(saved.rules ?? []);
    ctx.body = await AdminState(saved);
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.put('/api/admin/file', async ctx => {
  try {
    const body = await ReadJson<{ path: string; content: string }>(ctx);
    if (!body.path) throw new Error('path is required');
    if (!AllowedFilePaths().has(body.path)) {
      throw new Error(`file is not referenced by current config:${body.path}`);
    }

    await mkdir(dirname(body.path), { recursive: true });
    await writeFile(body.path, body.content, { encoding: 'utf8' });
    for (const [sources, manager] of [
      [GetConfig().upstreams, GetResourceManager()],
      [GetConfig().rules ?? [], GetRuleManager()],
    ] as const) {
      await Promise.all(sources.map((source, index) =>
        source.source === 'local' && source.from === body.path ? manager.Sync(index) : Promise.resolve()));
    }
    ctx.body = 'ok';
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/admin/preview/render', async ctx => {
  try {
    const body = await ReadJson<{ target: string; config?: Config; files?: Record<string, string> }>(ctx);
    const config = body.config ?? GetConfig();
    ValidateConfig(config);
    ctx.type = 'text/plain';
    ctx.body = await RenderPreview(body.target, config, body.files);
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/admin/preview/profiles/rendered', async ctx => {
  try {
    ctx.body = await GetTemplateData();
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/sync', async ctx => {
  try {
    ctx.body = {
      resources: await GetResourceManager().Sync(),
      ruleResources: await GetRuleManager().Sync(),
    };
  } catch (error) {
    ctx.status = 502;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/sync/:index', async ctx => {
  const index = Number(ctx.params.index);
  if (!Number.isInteger(index) || index < 0) {
    ctx.status = 400;
    ctx.body = 'invalid upstream index';
    return;
  }

  try {
    ctx.body = {
      resources: await GetResourceManager().Sync(index),
    };
  } catch (error) {
    ctx.status = 502;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/rules/sync/:index', async ctx => {
  const index = Number(ctx.params.index);
  if (!Number.isInteger(index) || index < 0) {
    ctx.status = 400;
    ctx.body = 'invalid rule index';
    return;
  }
  try {
    ctx.body = { ruleResources: await GetRuleManager().Sync(index) };
  } catch (error) {
    ctx.status = 502;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

export default router;
