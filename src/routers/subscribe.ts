import Router from '@koa/router';
import { GetTemplateData } from '../services/resource';
import { GetConfig } from '../services/config';
import { readFile } from 'fs/promises';
import { Render } from '../services/template';

const router = new Router();

router.get('/subscribe/clash', async ctx => {
  const target = 'clash';
  const output_template = GetConfig().templates?.find(t => t.target === target);
  if (!output_template) {
    ctx.status = 404;
    ctx.body = `template not found for target:${target}`;
    return;
  }
  const template = await readFile(output_template.path, 'utf-8');
  const profiles = await GetTemplateData();
  const rendered = Render(template, profiles);
  ctx.body = rendered;
});

export default router;
