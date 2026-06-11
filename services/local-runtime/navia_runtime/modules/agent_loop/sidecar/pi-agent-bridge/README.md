# Navia Pi Agent Bridge

Local-only Node bridge for Mercury. It wraps a pi RPC subprocess and exposes a small HTTP API for the Python Runtime.

## API

- `GET /health`
- `POST /sessions`
- `POST /sessions/:sessionId/prompt`
- `POST /sessions/:sessionId/abort`
- `POST /sessions/:sessionId/compact`
- `GET /sessions/:sessionId/events`
- `DELETE /sessions/:sessionId`

`GET /sessions/:sessionId/events` returns NDJSON and drains currently queued normalized events.

## Safety

The bridge binds to `127.0.0.1` by default. Chat Profile sessions keep local tools unavailable and route any unexpected tool request through the Runtime safety boundary.

## Run

```bash
pnpm install
pnpm build
pnpm test
NAVIA_PI_COMMAND=pi pnpm start
```
