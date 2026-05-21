import Koa from 'koa';
import router from './routers/index';
import { parseArgs } from 'node:util';
import { validate } from 'typia';
import { GetGlobalOptions, Options, SetGlobalOptions } from './util/global';
import { GetConfig, LoadConfig } from './services/config';
import { LoadTemplate } from './services/template';
import { GetResourceManager, Resource } from './services/resource';

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

GetConfig()?.upstreams.forEach(upstream => {
    const resource = new Resource(upstream);
    resource_manager.AddResource(resource);
});

export const app = new Koa();

app.use(router.routes());
app.use(router.allowedMethods());
const port = Number(GetGlobalOptions().port)
app.listen(port);
console.log(`Server is running at ${port}`);
