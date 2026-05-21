import Router from '@koa/router';
import { GetResourceManager } from '../services/resource';
import { GetTemplate, MergeTemplate } from '../services/template';

const router = new Router();

const resources_pool = [];

router.get('/subscribe', async ctx => {
  const template = GetTemplate();
  if (!template) {
    throw new Error();
  } 
  const resource_manager = GetResourceManager();
  const nodes = await resource_manager.MergeNodes();

  ctx.body = MergeTemplate(template, nodes);
});

export default router;
