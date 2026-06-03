import Router from '@koa/router';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { validate } from 'typia';
import { GetConfig, GetConfigPath, SaveConfig } from '../services/config';
import { GetResourceManager } from '../services/resource';
import { Render } from '../services/template';
import { Config } from '../util/type';

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
    join(process.cwd(), 'src', 'static', name),
    join(process.cwd(), 'dist', 'static', name),
    join(__dirname, '..', 'static', name),
  ];

  let lastError: unknown;
  for (const path of candidates) {
    try {
      return await readFile(path, { encoding: 'utf8' });
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

  const nodeTemplates = await Promise.all((config.upstreams ?? [])
    .map((upstream, upstreamIndex) => ({ upstream, upstreamIndex }))
    .filter(({ upstream }) => Boolean(upstream.nodeTemplatePath))
    .map(async ({ upstream, upstreamIndex }) => ({
      upstreamIndex,
      upstreamName: upstream.name,
      ...(await ReadOptionalFile(upstream.nodeTemplatePath!)),
    })));

  return {
    configPath: GetConfigPath(),
    config,
    templates,
    nodeTemplates,
    resources: GetResourceManager().Status(),
  };
}

function ValidateConfig(config: Config) {
  const result = validate<Config>(config);
  if (!result.success) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }
}

function AllowedFilePaths(config = GetConfig()) {
  return new Set([
    ...(config.templates ?? []).map((template) => template.path),
    ...(config.upstreams ?? [])
      .map((upstream) => upstream.nodeTemplatePath)
      .filter((path): path is string => Boolean(path)),
  ]);
}

async function RenderPreview(target: string, config: Config, files: Record<string, string> = {}) {
  const outputTemplate = (config.templates ?? []).find((template) => template.target === target);
  if (!outputTemplate) throw new Error(`template not found for target:${target}`);

  const template = files[outputTemplate.path] ?? await readFile(outputTemplate.path, { encoding: 'utf8' });
  const profiles = await GetResourceManager().Profiles();
  return Render(template, profiles);
}

router.get('/', async ctx => {
  ctx.redirect('/admin');
});

router.get('/admin', async ctx => {
  ctx.type = 'html';
  ctx.body = await ReadStaticFile('admin.html');
});

router.get('/admin/app.css', async ctx => {
  ctx.type = 'text/css';
  ctx.body = await ReadStaticFile('admin.css');
});

router.get('/admin/app.js', async ctx => {
  ctx.type = 'application/javascript';
  ctx.body = await ReadStaticFile('admin.js');
});

router.get('/api/status', async ctx => {
  ctx.body = {
    configPath: GetConfigPath(),
    templates: TemplatesWithUrls(),
    resources: GetResourceManager().Status(),
  };
});

router.get('/api/admin/state', async ctx => {
  ctx.body = await AdminState();
});

router.put('/api/admin/config', async ctx => {
  try {
    const config = await ReadJson<Config>(ctx);
    ValidateConfig(config);
    const saved = SaveConfig(config);
    GetResourceManager().SetUpstreams(saved.upstreams ?? []);
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

router.post('/api/admin/preview/profiles', async ctx => {
  try {
    ctx.body = {
      raw: await GetResourceManager().RawProfiles(),
      rendered: await GetResourceManager().Profiles(),
    };
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/admin/preview/profiles/raw', async ctx => {
  try {
    ctx.body = await GetResourceManager().RawProfiles();
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/admin/preview/profiles/raw/:index', async ctx => {
  const index = Number(ctx.params.index);
  if (!Number.isInteger(index) || index < 0) {
    ctx.status = 400;
    ctx.body = 'invalid upstream index';
    return;
  }

  try {
    ctx.body = await GetResourceManager().RawProfile(index);
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/admin/preview/profiles/rendered', async ctx => {
  try {
    ctx.body = await GetResourceManager().Profiles();
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.post('/api/sync', async ctx => {
  try {
    ctx.body = {
      resources: await GetResourceManager().Sync(),
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

export default router;
