# V2 data_service Adapter Spike Report

## Summary

```text
date: 2026-07-10
repository: /mnt/c/workspace/data_service
commit: fa8f8377b314510cc316640b625185d5f703841f
version: local-knowledge-governance-service 1.5.0
remote: https://github.com/ljx418/data_service.git
result: Conditional fit
adapter route: Route C Hybrid mock + spike; fall back to Route A mock-first if real adapter mapping fails
```

The candidate service is real and has relevant HTTP, CLI and MCP boundaries. It is not safe to use it as a direct V2 product dependency without an anti-corruption adapter because Navia still needs stricter user permission, status, idempotency, evidence and forget semantics.

## Evidence Inspected

- `README.md`
- `backend/README.md`
- `backend/pyproject.toml`
- FastAPI route introspection from `app.main:app`
- CLI help from `python3 -m data_service --help`
- Target HTTP tests under `backend/tests/test_target_http_*.py`

## Findings

| Requirement | Finding | Decision |
|---|---|---|
| Stable workspace id | data_service explicitly uses `workspace_id` as stable identity | Use through Adapter |
| HTTP boundary | `/api/workspaces/*` and `/api/v1/knowledge/*` are present | Prefer compatibility routes first |
| CLI boundary | `data-service` and `knowledge` entrypoints exist | Keep as fallback or diagnostics |
| MCP boundary | README exposes `python -m data_service.mcp_stdio` | Candidate only; not required for V2-1 |
| Source import | Present | Wrap with Navia idempotency |
| Build lifecycle | Present | Map into Navia canonical states |
| Query / graph / trace | Present | Requires evidence semantic validation |
| Remove source | Present | Not enough for full forget cascade |
| Auth | API key / dev bypass controls exist | Must surface auth_required / blocked separately |
| Console | `/knowledge` exists | No-Go as Navia UI |

## P0 Closure Decision

V2-0 can close the data_service discovery P0 with this report, but V2-1+ cannot use a data_service-first route. The approved route is:

```text
Route C: Hybrid mock + spike
```

Implementation consequence:

- V2-1 and V2-2 must start with `MockKnowledgeServiceAdapter` and deterministic fixtures.
- V2-3 may add the real data_service adapter only after mapping tests prove auth, version, source import, build, query, graph, trace and remove behavior.
- If real adapter mapping fails, V2 continues as Route A mock-first and does not claim data_service integration.

## No-Go

- Do not call data_service from B frontend.
- Do not read or write data_service internal workspace folders.
- Do not count `/sources/remove` as complete forget proof.
- Do not claim V2 implemented, V2 ready or RAG ready from this spike.
