# V2 data_service API Snapshot

## Status

V2-0 spike input captured from the local candidate repository on 2026-07-10.

```text
repository: /mnt/c/workspace/data_service
remote: https://github.com/ljx418/data_service.git
commit: fa8f8377b314510cc316640b625185d5f703841f
package: local-knowledge-governance-service
version: 1.5.0
runtime: uvicorn app.main:app --reload
auth: DATA_SERVICE_REQUIRE_API_KEY defaults true; API_KEY or local dev bypass required for HTTP
```

The candidate service exposes two relevant HTTP surfaces:

1. Target HTTP routes under `/api/workspaces/*`.
2. Compatibility routes under `/api/v1/knowledge/*`.

Navia V2 should prefer the compatibility `/api/v1/knowledge/*` surface for an anti-corruption adapter because its command names map more directly to the V2 Memory contracts. Target HTTP routes can be used when compatibility routes do not expose enough evidence detail.

## Relevant Compatibility Routes

| Method | Route | Navia V2 use |
|---|---|---|
| `POST` | `/api/v1/knowledge/workspaces/create` | Create workspace through adapter only |
| `POST` | `/api/v1/knowledge/workspaces/list` | List available workspaces |
| `POST` | `/api/v1/knowledge/workspaces/describe` | Read workspace metadata |
| `POST` | `/api/v1/knowledge/sources/import` | Import user-authorized source |
| `POST` | `/api/v1/knowledge/sources/list` | Source library read model |
| `POST` | `/api/v1/knowledge/sources/remove` | Candidate forget / remove operation |
| `POST` | `/api/v1/knowledge/build/start` | Start source / workspace build |
| `POST` | `/api/v1/knowledge/build/status` | Poll build operation |
| `POST` | `/api/v1/knowledge/build/cancel` | Cancel build operation |
| `POST` | `/api/v1/knowledge/query` | Ask with Sources candidate |
| `POST` | `/api/v1/knowledge/graph` | Knowledge Graph candidate |
| `POST` | `/api/v1/knowledge/source/trace` | Source Trace candidate |
| `POST` | `/api/v1/knowledge/quality/feedback` | Future quality feedback; not required for V2-0 |
| `POST` | `/api/v1/knowledge/directories/scan` | No-Go by default in Navia; requires explicit permission |
| `POST` | `/api/v1/knowledge/reset` | No-Go for Navia product UI unless a separate admin gate exists |

## Relevant Target HTTP Routes

| Method | Route | Navia V2 use |
|---|---|---|
| `POST` | `/api/workspaces` | Workspace create |
| `GET` | `/api/workspaces` | Workspace list |
| `GET` | `/api/workspaces/{workspace_id}` | Workspace detail |
| `GET` | `/api/workspaces/{workspace_id}/capabilities` | Capability negotiation |
| `POST` | `/api/workspaces/{workspace_id}/sources` | Source import |
| `GET` | `/api/workspaces/{workspace_id}/sources` | Source list |
| `GET` | `/api/workspaces/{workspace_id}/sources/{source_id}` | Source detail |
| `GET` | `/api/workspaces/{workspace_id}/sources/{source_id}/preview` | Source preview |
| `GET` | `/api/workspaces/{workspace_id}/sources/{source_id}/units` | Unit list |
| `GET` | `/api/workspaces/{workspace_id}/sources/{source_id}/units/{unit_id}` | Unit detail |
| `GET` | `/api/workspaces/{workspace_id}/sources/{source_id}/units/{unit_id}/evidence/{evidence_id}` | Evidence span |
| `POST` | `/api/workspaces/{workspace_id}/sources/{source_id}/remove` | Source remove |
| `POST` | `/api/workspaces/{workspace_id}/build/start` | Build start |
| `GET` | `/api/workspaces/{workspace_id}/build/operations/{operation_id}` | Build status |
| `POST` | `/api/workspaces/{workspace_id}/build/operations/{operation_id}/cancel` | Build cancel |
| `GET` | `/api/workspaces/{workspace_id}/graph/neighbors` | Graph neighbors |
| `GET` | `/api/workspaces/{workspace_id}/graph/community` | Graph communities |
| `GET` | `/api/workspaces/{workspace_id}/graph/query` | Graph query |
| `POST` | `/api/workspaces/{workspace_id}/query` | Workspace query |
| `GET` | `/api/workspaces/{workspace_id}/sources/{source_id}/trace` | Source trace |

## Guardrails

- Navia must not call data_service directly from B frontend.
- Navia must not read or write data_service internal workspace files.
- Navia must not expose raw `root_path`, internal artifact paths, stack traces or credentials.
- Navia must not use `/api/v1/knowledge/directories/scan` unless the user explicitly grants a permission root.
- Navia must not treat the data_service console at `/knowledge` as a Navia UI.
