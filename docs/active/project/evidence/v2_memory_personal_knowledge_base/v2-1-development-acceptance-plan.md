# V2-1 Adapter / Governance Skeleton Development And Acceptance Plan

## Gate

V2-0 machine gate passed:

```text
npm --prefix apps/chrome-extension run validate:v2-memory
```

data_service candidate smoke tests passed:

```text
PYTHONPATH=/mnt/c/workspace/data_service/backend python3 -m pytest \
  /mnt/c/workspace/data_service/backend/tests/test_target_http_workspace.py \
  /mnt/c/workspace/data_service/backend/tests/test_target_http_source.py \
  /mnt/c/workspace/data_service/backend/tests/test_target_http_build.py \
  /mnt/c/workspace/data_service/backend/tests/test_target_http_graph_query.py \
  /mnt/c/workspace/data_service/backend/tests/test_target_http_source_trace.py -q
```

Result: 20 passed. Warnings are upstream deprecations and do not block Navia V2-1.

## Scope

V2-1 implements only the mock-first Runtime Adapter / Governance skeleton:

- Add `services/local-runtime/navia_runtime/modules/memory/`.
- Add deterministic `MockKnowledgeServiceAdapter`.
- Add `/v1/knowledge/*` Runtime routes matching the V2 OpenAPI draft.
- Keep B frontend, real data_service adapter and full Knowledge Workspace out of scope.

## Acceptance

- `/v1/knowledge/status` returns distinct Runtime / Adapter / data_service / source build fields.
- `/v1/knowledge/workspaces` returns a default workspace.
- `POST /v1/knowledge/sources` requires `Idempotency-Key`, creates a source and operation, and returns `202`.
- `GET /v1/knowledge/operations/{operationId}` returns the operation.
- Query, graph and trace endpoints return deterministic source-backed or degraded payloads.
- Permission grant / revoke and forget endpoints return deterministic governance operation results.
- Tests prove the routes do not use real data_service and do not claim V2 complete.

## No-Go

- No real data_service write.
- No default local file read.
- No B frontend direct data_service access.
- No V2 implemented / V2 ready / RAG ready claim.
