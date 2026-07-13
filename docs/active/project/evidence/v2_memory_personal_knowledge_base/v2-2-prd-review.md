# V2-2 PRD Review

## Scope Reviewed

V2-2 implements the first frontend bridge for V2 Memory:

- `ServiceStatusBanner`
- `DataServiceStatus` display inside the service banner
- `KnowledgeBuildStatus`
- `SaveToKnowledgeCard`
- typed frontend calls to `/v1/knowledge/status` and `/v1/knowledge/sources`

## PRD Coverage

- The Chat view keeps V1 current-page reading, chat, summary and Mindmap paths intact.
- The V2 save entry is visible only as a compact card near current page context.
- Save remains user-triggered; no automatic save is introduced.
- Runtime offline remains frontend-inferred. Adapter and data_service status are shown only when Runtime is online.
- Save button is disabled until the current page has been captured.
- Save sends an idempotent `MemoryCandidate` derived from the current captured page and source refs.
- The UI explicitly states that V2-2 uses the mock adapter and does not mean real data_service integration is complete.

## Validation

```text
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard
npm --prefix apps/chrome-extension run validate:v2-memory
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v1_0_0_runtime_skeleton.py services/local-runtime/tests/test_v2_memory_knowledge_api.py
```

Latest local result:

```text
typecheck passed
3 frontend test files passed, 41 tests passed
V2 machine gate passed
23 Runtime tests passed
```

## Review Judgment

V2-2 satisfies the documented frontend status and save-card baseline. It does not include the full Knowledge Workspace routes, Source Library, Ask with Sources, Graph Canvas, Permission Root Manager or Forget Source Dialog.

