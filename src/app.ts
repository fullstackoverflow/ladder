import Koa from 'koa';
import router from './routers/index';
import { parseArgs } from 'node:util';
import { validate } from 'typia';
import { GetGlobalOptions, Options, SetGlobalOptions } from './util/global';
import { GetConfig, LoadConfig, WatchConfig } from './services/config';
import { LoadTemplate, WatchTemplate } from './services/template';
import { GetResourceManager } from './services/resource';

const { values } = parseArgs({
    options: {
        config: {
            type: 'string',
            short: 'c',
        },
        template: {
            type: 'string',
            short: 't',
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

SetGlobalOptions(result.data);

LoadConfig(GetGlobalOptions().config);

LoadTemplate(GetGlobalOptions().template);

const resource_manager = GetResourceManager();
resource_manager.SetUpstreams(GetConfig()?.upstreams ?? []);

WatchConfig((config) => {
    resource_manager.SetUpstreams(config.upstreams);
});

WatchTemplate();

export const app = new Koa();

app.use(router.routes());
app.use(router.allowedMethods());
const port = Number(GetGlobalOptions().port)
app.listen(port);
console.log(`Server is running at ${port}`);
