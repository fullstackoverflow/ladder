# ladder

Merge upstream proxy subscriptions into a sing-box config built from `template.json`.

## Features

- Parses raw URI subscriptions
- Parses node-list subscriptions from YAML/JSON objects such as Clash `proxies`
- Supports AnyTLS and VLESS URI parsing
- Merges parsed nodes into the sing-box template selectors and urltest groups
- Keeps sync status for each upstream and retries failed fetches
- Includes `/admin` for status, config editing, and template editing
- Runs locally or in Docker

## Design Notes

- [Design document index](docs/README.md)
- [Multi-template and Clash output plan](docs/multi-template-targets.md)
- [Sing-box and Clash node compatibility research](docs/node-compatibility-research.md)
- [Upstream-bound node template plan](docs/upstream-node-template.md)
- [Admin frontend systematization plan](docs/admin-frontend-plan.md)

## Local Run

Install dependencies:

```bash
npm ci
```

Use the demo config:

```bash
Copy-Item config.example.json config.json
New-Item -ItemType Directory -Force data
Copy-Item template.json data/template.json
Copy-Item templates/template.yml data/template.yml
Copy-Item sample/demo-uri-list.txt data/demo-uri-list.txt
npm run dev
```

Open:

```text
http://127.0.0.1:4000/subscribe
```

Named template subscriptions are also supported when `templates[]` is configured:

```text
http://127.0.0.1:4000/subscribe/singbox
http://127.0.0.1:4000/subscribe/clash
```

Admin page:

```text
http://127.0.0.1:4000/admin
```

The demo setup copies `sample/demo-uri-list.txt` into the file library, so it works without a real subscription URL.

## Config

Example:

```json
{
  "template": "./template.json",
  "templates": [
    {
      "name": "singbox",
      "target": "singbox",
      "path": "./data/template.json"
    },
    {
      "name": "clash",
      "target": "clash",
      "path": "./data/template.yml"
    }
  ],
  "upstreams": [
    {
      "name": "demo-uri-list",
      "source": "local",
      "from": "./data/demo-uri-list.txt",
      "type": "uri",
      "format": "raw",
      "refresh": 300,
      "retry": 3,
      "retryInterval": 3,
      "retryBackoff": 2
    }
  ]
}
```

Fields:

- `templates`: optional named output templates. `target` is `singbox` or `clash`
- `source`: `local` or `URI`
- `from`: local file path or remote subscription URL
- `type`: upstream semantic type, currently `uri` or `clash`
- `format`: `raw`, `json`, or `yaml`
- `encoding`: optional, only `base64`
- `refresh`: optional refresh interval in seconds
- `retry`: optional fetch retry count, defaults to `3`
- `retryInterval`: optional retry interval in seconds, defaults to `3`
- `retryBackoff`: optional retry interval multiplier, defaults to `2`
- `nodeTemplatePath`: optional local `node.template` file rendered before node normalization

`type: "uri"` scans raw input for proxy URIs, or reads JSON/YAML string arrays. `type: "clash"` reads Clash YAML/JSON objects with `proxies` and strips Clash-only fields like `udp` before outputting sing-box JSON.

DNS, inbounds, and other target-specific behavior are owned by the template.

## Rule sources and template data

`config.rules` is an optional ordered array of sources. Each source uses `name`,
`source` (`local` or `URI`), `from`, and `format` (`json` or `yaml`), with the same
optional encoding, refresh, and retry settings as upstreams. For example:

```json
"rules": [
  { "name": "overrides", "source": "local", "from": "./data/overrides.yaml", "format": "yaml" },
  { "name": "provider", "source": "URI", "from": "https://example.com/rules.yaml", "format": "yaml", "refresh": 3600 }
]
```

Output templates receive `$ = { upstreams: [...], rules: [...] }`.
Each slot contains one file's parsed payload, preserving all fields and internal
ordering. Rules are never extracted, flattened, normalized, deduplicated, or
automatically inserted into the output. The Rules page's up/down buttons change
only the source file index; template scripts decide how to use that order.
An unavailable file fails rendering instead of shifting subsequent file indices.

For a Clash template whose rule files contain a `rules` field, the script can
explicitly combine them:

```yaml
proxies:
  {{ toYaml($.upstreams.flatMap(source => source.proxies ?? [])) }}
rules:
  {{ toYaml($.rules.flatMap(source => source.rules ?? [])) }}
```

Migrate output template expressions such as `$.map(...)` to
`$.upstreams.map(...)`. Node templates still receive their individual upstream's
raw payload as `$`.

The Files editor also includes all local upstream and rule files. Saving a local
source reloads its resource immediately. Output preview uses file drafts without
saving them; the `$ 数据` panel shows the current loaded data. File drafts survive
configuration changes and rule reordering.

## Admin

The admin frontend is a React + TypeScript application built with Vite. It lives
in `frontend/`; `src/static/admin.*` has been replaced. Koa serves the built
assets from `dist/static` at `/admin` so production still runs one server.

See [frontend structure](frontend/README.md) for component, feature, hook, and
style ownership.

- Sidebar navigation for upstreams, rule sources, output templates, and files
- Choose, create or upload local sources and templates in the server-managed file library,
  without entering filesystem paths
- Edit local upstream, rule and template file contents directly inside their cards;
  collapsing an editor preserves its draft
- Drag or keyboard sorting for upstream and rule files, with up/down buttons as an alternative
- CodeMirror editors with YAML / JSON highlighting, line numbers, undo, and Ctrl / Cmd + S
- Find and replace with Ctrl / Cmd + F or H, including replace all, regular expressions,
  case sensitivity and whole-word matching
- File explorer, per-file draft state, and an optional output/data/config inspector
- Inline source status, search, loading states, and persistent error notifications
- Responsive layouts for smaller screens

The file library lives in `data/` beside the active configuration file. Move existing
local files there manually, or upload them through the settings dialog, then select
them from the library. Creating a file never overwrites an existing file, and removing a configuration reference
keeps the file for reuse. Back up `config.json` and `data/` together. The included
Docker Compose configuration mounts `./data` into `/app/data` for persistence.

For frontend development, run `npm run dev` for the Koa server on port 4000,
then `npm run dev:ui` in another terminal. Vite prints its frontend URL and
proxies `/api` and `/subscribe` to Koa. `npm run build` builds both parts.

Verification commands:

```bash
npm test
npx playwright install chromium
npm run test:ui
```

Browser tests use separate fixture files under `.cache/ui-e2e` and port 4179.
They do not load the user's `config.json`.

The admin page at `/admin` shows upstream sync status:

- ready state
- content length
- last successful fetch
- last fetch error
- failure count

It also lets you edit `config.json` and `template.json`. Template changes are watched and reloaded automatically; config changes rebuild the upstream resource pool.
When multiple templates are configured, the template editor can switch between named templates such as `singbox` and `clash`.

## Docker

Build and run:

```bash
docker compose up -d --build
```

The compose file mounts these files as writable so `/admin` can save edits:

- `./config.json` to `/app/config.json`
- `./template.json` to `/app/template.json`

For a first run with the demo config:

```bash
Copy-Item config.example.json config.json
docker compose up -d --build
```

## Release

GitHub Actions includes:

- `.github/workflows/ci.yml`: installs dependencies and runs `npm run build`
- `.github/workflows/release.yml`: on `v*` tags, builds and pushes a GHCR image and creates a GitHub Release
