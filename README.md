# ladder

Merge upstream proxy subscriptions into a sing-box config built from `template.json`.

## Features

- Parses raw URI subscriptions
- Parses node-list subscriptions from YAML/JSON objects such as Clash `proxies`
- Supports AnyTLS and VLESS URI parsing
- Merges parsed nodes into the sing-box template selectors and urltest groups
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
      "type": "Node_list",
      "format": "raw",
      "refresh": 300
    }
  ]
}
```

Fields:

- `source`: `local` or `URI`
- `from`: local file path or remote subscription URL
- `type`: `Node_list`
- `format`: `raw`, `json`, or `yaml`
- `encoding`: optional, only `base64`
- `refresh`: optional refresh interval in seconds

## Docker

Build and run:

```bash
docker compose up -d --build
```

The compose file mounts:

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
