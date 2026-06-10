# D AgenticLoop Executable Contract

## Required Assertions

- every turn has `sessionId`, `turnId`, `traceId`, `requestId`.
- every adapter/tool call has `toolCallId`.
- permission and budget checks happen before `tool.started`.
- denied adapters do not emit `tool.started`.
- missing active page for page-grounded tools returns `PAGE_CONTEXT_REQUIRED`.
- successful artifact-producing tools emit `artifact.created`.
- trace can reconstruct state, intent, budget, tool, artifact, response, and error.

## Disallowed Behavior

- direct adapter execution without governance.
- free-text adapter output bypassing `ToolResult`.
- long-term memory or RAG.
- browser automation.

## Test Command Placeholder

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/agent_loop/tests
```

