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

- `source`: `local` or `URI`
- `from`: local file path or remote subscription URL
- `type`: upstream semantic type, currently `uri` or `clash`
- `format`: `raw`, `json`, or `yaml`
- `encoding`: optional, only `base64`
- `refresh`: optional refresh interval in seconds
- `retry`: optional fetch retry count, defaults to `3`
- `retryInterval`: optional retry interval in seconds, defaults to `3`
- `retryBackoff`: optional retry interval multiplier, defaults to `2`

`type: "uri"` scans raw input for proxy URIs, or reads JSON/YAML string arrays. `type: "clash"` reads Clash YAML/JSON objects with `proxies` and strips Clash-only fields like `udp` before outputting sing-box JSON.

## Admin

The admin page at `/admin` shows upstream sync status:

- ready state
- content length
- last successful fetch
- last fetch error
- failure count

It also lets you edit `config.json` and `template.json`. Template changes are watched and reloaded automatically; config changes rebuild the upstream resource pool.

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
