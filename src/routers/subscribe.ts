import Router from '@koa/router';
import { GetResourceManager } from '../services/resource';
import { GetTemplate, MergeProfiles } from '../services/template';

const router = new Router();

router.get('/subscribe', async ctx => {
  const template = GetTemplate();
  if (!template) throw new Error('template is not loaded');

  const profiles = await GetResourceManager().Profiles();
  ctx.body = MergeProfiles(template, profiles);
});

export default router;
