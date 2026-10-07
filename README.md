# ladder

Render Clash configurations from upstreams, rules, and configured templates.

## Features

- Parses raw URI subscriptions
- Preserves complete YAML/JSON source objects such as Clash configurations
- Supports AnyTLS and VLESS URI parsing
- Uses template scripts to combine proxies, proxy groups, and ordered rules
- Keeps sync status for each upstream and retries failed fetches
- Includes `/admin` for status, config editing, and template editing
- Runs locally or in Docker

## Design Notes

- [Design document index](docs/README.md)
- [Multi-template and Clash output plan](docs/multi-template-targets.md)
- [Admin frontend systematization plan](docs/admin-frontend-plan.md)

## Local Run

Install dependencies:

```bash
npm ci
```

Initialize an empty workspace:

```bash
Copy-Item config.example.json config.json
npm run dev
```

Open:

```text
http://127.0.0.1:4000/subscribe/clash
```

Admin page:

```text
http://127.0.0.1:4000/admin
```

Open `/admin` and enter local upstream, rule and template contents. The server
creates `data/` automatically when saving. Configure a Clash template before using
`/subscribe/clash`. You can paste the contents of `templates/template.yml` as an
output template and `sample/demo-clash.yaml` as a source; the sample proxy is only
a placeholder for checking rendered output.

## Config

Example:

```json
{
  "templates": [],
  "upstreams": [],
  "rules": []
}
```

Fields:

- `templates`: output templates; `target` is always `clash`
- `source`: `local` or `URI`
- `from`: server-generated file reference for local sources, or a remote subscription URL
- `format`: `node-list`, `json`, or `yaml`
- `encoding`: remote sources only; optional `base64`
- `refresh`: remote sources only; optional refresh interval in seconds
- `retry`: remote sources only; optional fetch retry count, defaults to `3`
- `retryInterval`: remote sources only; retry interval in seconds, defaults to `3`
- `retryBackoff`: remote sources only; retry interval multiplier, defaults to `2`

JSON/YAML inputs retain their complete structure. The output template decides which
fields to use and owns DNS, listeners, proxy groups, and other Clash settings.

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
`$.upstreams.map(...)`. All scripts run in the output template; sources provide
parsed data without a separate transformation template.

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
- Enter local source and template contents directly; the server creates UUID files
  and their configuration references when saving
- Edit local upstream, rule and template file contents directly inside their cards;
  collapsing an editor preserves its draft
- Drag or keyboard sorting for upstream and rule files, with up/down buttons as an alternative
- CodeMirror editors with YAML / JSON highlighting, line numbers, undo, and Ctrl / Cmd + S
- Find and replace with Ctrl / Cmd + F or H, including replace all, regular expressions,
  case sensitivity and whole-word matching
- File explorer, per-file draft state, and an optional output/data/config inspector
- Inline source status, search, loading states, and persistent error notifications
- Responsive layouts for smaller screens

Managed files live in `data/` beside the active configuration file. Start with
`{ "templates": [], "upstreams": [], "rules": [] }`, then add local sources and a
Clash template by entering their contents in the admin dialogs. Saving generates
UUID filenames and stores their references automatically. There is no file upload,
filename entry, or library selection. Cancelling a new entry creates no file;
editing an existing entry's settings preserves its file reference. Back up
`config.json` and `data/` together. The included
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

It also lets you edit source configuration and the files selected by `templates[]`.
Subscription requests read the current template contents; config changes rebuild the source resource pools.
The output template editor manages the Clash template and its subscription address.

## Docker

Build and run:

```bash
docker compose up -d --build
```

The compose file mounts these files as writable so `/admin` can save edits:

- `./config.json` to `/app/config.json`
- `./data` to `/app/data`

For a first run with an empty workspace:

```bash
Copy-Item config.example.json config.json
docker compose up -d --build
```

## Release

GitHub Actions includes:

- `.github/workflows/ci.yml`: installs dependencies and runs `npm run build`
- `.github/workflows/release.yml`: on `v*` tags, builds and pushes a GHCR image and creates a GitHub Release
