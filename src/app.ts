import Koa from 'koa';
import router from './routers/index';
import { parseArgs } from 'node:util';
import { validate } from 'typia';
import { Options } from './util/global';
import { GetConfig, SetConfigPath } from './services/config';
import { GetResourceManager, GetRuleManager } from './services/resource';

const { values } = parseArgs({
    options: {
        config: {
            type: 'string',
            short: 'c',
        },
        port: {
            type: 'string',
            short: 'p',
        },
    },
});

const result = validate<Options>(values);
if (!result.success) {
    console.error(JSON.stringify(result.errors, null, 4));
    process.exit();
}

SetConfigPath(result.data.config);

const resource_manager = GetResourceManager();
resource_manager.SetUpstreams(GetConfig()?.upstreams ?? []);
GetRuleManager().SetUpstreams(GetConfig().rules ?? []);

export const app = new Koa();

app.use(router.routes());
app.use(router.allowedMethods());
const port = Number(result.data.port);
const server = app.listen(port, () => {
    const address = server.address();
    console.log(`Server is running at ${typeof address === 'object' && address ? address.port : port}`);
});
