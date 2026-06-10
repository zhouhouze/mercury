# V1.16-2 Real MCP Server Acceptance Audit

Version: V1.16-2 implementation evidence

Status: passed

## 1. PRD Coverage

V1.16-2 covers the PRD requirement that the same evidence workflow is callable through a real local MCP server.

## 2. Acceptance Criteria

- MCP server responds to `initialize`.
- MCP server lists `navia_runtime_evidence`, `navia_snapshot_diff`, `navia_workbench`, and `navia_artifact_get`.
- MCP tool calls route through shared V2 evidence services.
- MCP-created artifacts use `source="mcp"`.
- MCP errors are structured.
- HTTP / CLI / MCP parity tests pass.

## 3. False-Green Review

| Risk | Control |
|---|---|
| MCP remains facade-only | subprocess test calls the stdio server entrypoint |
| MCP duplicates business logic | tool handler imports shared V2 service functions |
| MCP skips schema validation | all persistence goes through `V2ArtifactStore.insert()` |
| MCP error is plain text | schema error test asserts structured error code |

## 4. Final Result

Passed.

Validation executed:

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_16_mcp_server.py
4 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_16_schema_validation.py
9 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_13_runtime_evidence.py services/local-runtime/tests/test_v2_14_incremental.py services/local-runtime/tests/test_v2_15_workbench.py services/local-runtime/tests/test_v2_13_15_e2e.py
9 passed
```

PRD review: V1.16-2 satisfies the real local MCP server requirement using the stdio entrypoint `python -m navia_runtime.v2.mcp_server`.

No major specification gap detected.
