import Router from '@koa/router';
import adminRouter from './admin';
import subscribeRouter from './subscribe';

const router = new Router();

router.use(adminRouter.routes(), adminRouter.allowedMethods());
router.use(subscribeRouter.routes(), subscribeRouter.allowedMethods());

export default router;
