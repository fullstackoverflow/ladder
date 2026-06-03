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

The demo config uses `sample/demo-uri-list.txt`, so it works without a real subscription URL.

## Config

Example:

```json
{
  "template": "./template.json",
  "templates": [
    {
      "name": "singbox",
      "target": "singbox",
      "path": "./template.json"
    },
    {
      "name": "clash",
      "target": "clash",
      "path": "./templates/clash.yaml"
    }
  ],
  "upstreams": [
    {
      "name": "demo-uri-list",
      "source": "local",
      "from": "./sample/demo-uri-list.txt",
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

DNS, routing rules, inbounds, and other target-specific behavior are owned by the template. Upstream parsing only contributes proxy nodes.

## Admin

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
