# D AgenticLoop Mock Validation Plan

## Fixtures

- Fake `StructuredPageContext`.
- Fake recent messages.
- Safe internal adapter.
- Approval-required adapter.
- Deny-by-default adapter.
- Failing adapter.

## Required Scenarios

- Page summary turn.
- Page question turn.
- Mindmap turn through C adapter stub.
- Missing activePage.
- Budget exceeded before execution.
- Adapter denied before side effect.
- Unknown intent fallback.

## Pass Criteria

- Every turn has `sessionId`, `turnId`, `traceId`, and `requestId`.
- Every tool call has `toolCallId`.
- Tool calls pass governance before execution.
- Successful tools map to `ToolResult(status="succeeded")`.
- Successful artifact-producing tools create `ArtifactRecord`.
- Trace can reconstruct the turn main path.

## Fail Criteria

- Direct adapter execution without governance.
- Creating artifact on denied or failed execution.
- Missing activePage still producing fake answer.
- D stores cross-session long-term memory.

## Current Evidence

Evidence files:

- `tests/evidence/summary_turn.events.json`
- `tests/evidence/qa_turn.events.json`
- `tests/evidence/mindmap_turn.events.json`
- `tests/evidence/denied_adapter.events.json`
- `tests/evidence/missing_active_page.events.json`
- `tests/evidence/budget_exceeded.events.json`
- `tests/evidence/adapter_failure.events.json`

Current validation command:

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/agent_loop/tests services/local-runtime/navia_runtime/modules/adapters/tests
```

Current result:

```text
8 passed
```
