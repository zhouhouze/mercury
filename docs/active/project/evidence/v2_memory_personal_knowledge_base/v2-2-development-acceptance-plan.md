# V2-2 SaveToKnowledgeCard / ServiceStatusBanner Development And Acceptance Plan

## Gate

V2-1 Runtime skeleton tests passed:

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_memory_knowledge_api.py
```

V2-2 may add frontend client and compact UI only. Full Knowledge Workspace remains V2-4.

## Scope

- Add typed frontend calls for `/v1/knowledge/status` and `/v1/knowledge/sources`.
- Add `ServiceStatusBanner`, `KnowledgeBuildStatus` and `SaveToKnowledgeCard`.
- Render the cards near the current page context card in Chat view.
- Save only the current captured page after explicit user click.

## Acceptance

- Runtime offline is still inferred from existing `runtimeStatus` and never treated as Runtime-returned status.
- When Runtime is online, ServiceStatusBanner can show Adapter and data_service state from `/v1/knowledge/status`.
- Save button is disabled until a page is captured.
- Save uses `Idempotency-Key` and sends a `MemoryCandidate` with at least one evidence ref.
- Save result shows `sourceId`, `operationId` and build/trace state.
- UI copy explicitly says V2-2 uses mock adapter, not real data_service.

## No-Go

- No automatic save.
- No default local file read.
- No B frontend direct data_service call.
- No claim that V2 is implemented or RAG ready.
