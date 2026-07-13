# V2-1 PRD Review

## Scope Reviewed

V2-1 implements the Runtime-side mock-first Knowledge Adapter skeleton only.

## PRD Coverage

- V2 status separation is represented by `/v1/knowledge/status` with Runtime, Adapter, data_service and source build fields.
- Explicit user-governed save path is represented by `POST /v1/knowledge/sources`.
- Idempotency is enforced by `Idempotency-Key`.
- Workspace, source, query, graph, trace, permission and forget routes exist as deterministic mock contracts.
- Forget verification returns auditable before/after style fields.

## Validation

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_memory_knowledge_api.py
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v1_0_0_runtime_skeleton.py services/local-runtime/tests/test_v2_memory_knowledge_api.py
```

Latest local result:

```text
23 passed, 19 warnings
```

Warnings are upstream dependency deprecations and do not change V2-1 behavior.

## Review Judgment

V2-1 matches the documented mock-first contract skeleton target. It does not complete real data_service integration or the full Knowledge Workspace.

