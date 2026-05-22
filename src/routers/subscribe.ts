import Router from '@koa/router';
import { GetResourceManager } from '../services/resource';
import { GetTemplate, MergeTemplate } from '../services/template';

const router = new Router();

router.get('/subscribe', async ctx => {
  const template = GetTemplate();
  if (!template) throw new Error('template is not loaded');

  const nodes = await GetResourceManager().MergeNodes();
  ctx.body = MergeTemplate(template, nodes);
});

export default router;

