# Navia Local Runtime

Python FastAPI runtime for Navia V1.

Run locally:

```bash
uvicorn navia_runtime.app:app --host 127.0.0.1 --port 17861 --app-dir services/local-runtime
```

Implemented V1 endpoints:

- `GET /v1/health`
- `GET /v1/models/status`
- `POST /v1/sessions`
- `POST /v1/page/context`
- `POST /v1/chat/stream`
- `GET /v1/sessions/{session_id}/trace`
- `GET /v1/agent/state`
- `GET /v1/agent/state-machine/mermaid`

The runtime must only be bound to `127.0.0.1` in local development.

Run tests from the repository root:

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests
```
