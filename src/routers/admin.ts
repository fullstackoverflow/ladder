import Router from '@koa/router';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GetConfigContent, GetConfigPath, SaveConfig } from '../services/config';
import { GetResourceManager } from '../services/resource';
import { GetTemplateContent, GetTemplatePath, SaveTemplate } from '../services/template';

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
    templatePath: GetTemplatePath(),
    resources: GetResourceManager().Status(),
  };
});

router.get('/api/config', async ctx => {
  ctx.type = 'application/json';
  ctx.body = GetConfigContent();
});

router.put('/api/config', async ctx => {
  try {
    await SaveConfig(await ReadBody(ctx));
    ctx.body = 'ok';
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

router.get('/api/template', async ctx => {
  ctx.type = 'application/json';
  ctx.body = GetTemplateContent();
});

router.put('/api/template', async ctx => {
  try {
    await SaveTemplate(await ReadBody(ctx));
    ctx.body = 'ok';
  } catch (error) {
    ctx.status = 400;
    ctx.body = error instanceof Error ? error.message : String(error);
  }
});

export default router;

