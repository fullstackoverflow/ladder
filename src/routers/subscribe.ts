import Router from '@koa/router';
import { GetResourceManager } from '../services/resource';
import { GetConfig } from '../services/config';
import { readFile } from 'fs/promises';
import { Render } from '../services/template';

const router = new Router();

function RequiredParam(value: string | undefined, name: string) {
  if (!value) throw new Error(`missing route param:${name}`);
  return value;
}

router.get('/subscribe/:target', async ctx => {
  const target = RequiredParam(ctx.params.target, 'target');
  const output_template = GetConfig().templates?.find(t => t.target === target);
  if (!output_template) {
    ctx.status = 404;
    ctx.body = `template not found for target:${target}`;
    return;
  }
  const template = await readFile(output_template.path, 'utf-8');
  const profiles = await GetResourceManager().Profiles();
  const rendered = Render(template, profiles);
  ctx.body = rendered;
});

export default router;
