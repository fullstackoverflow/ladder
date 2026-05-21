import Router from '@koa/router';
import statusRouter from './subscribe';

const router = new Router();

router.use(statusRouter.routes(), statusRouter.allowedMethods());

export default router;
