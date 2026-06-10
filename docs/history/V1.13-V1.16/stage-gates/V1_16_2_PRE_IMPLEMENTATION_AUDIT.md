# V1.16-2 Real MCP Server Pre-Implementation Audit

Version: V1.16-2 implementation gate

Status: ready for implementation

## 1. PRD Scope

V1.16-2 implements a real local stdio MCP server for the evidence workflow.

Required tools:

- `navia_runtime_evidence`
- `navia_snapshot_diff`
- `navia_workbench`
- `navia_artifact_get`

## 2. Development Plan

- implement `python -m navia_runtime.v2.mcp_server`.
- support JSON-RPC `initialize`, `tools/list`, and `tools/call`.
- route every tool through the existing V2 shared evidence service or artifact store.
- return structured tool payloads with `ok`, `artifact` / `artifacts`, `error`, and `requestId`.
- preserve `source="mcp"` for MCP-created artifacts.

## 3. Acceptance Criteria

- MCP server lists all required tools.
- MCP runtime evidence creates schema-valid persisted artifacts.
- MCP snapshot diff and workbench use the same shared service behavior as HTTP / CLI.
- MCP artifact get retrieves persisted artifacts.
- MCP schema errors return structured `SCHEMA_VALIDATION_FAILED` payloads.
- HTTP / CLI / MCP parity holds at envelope and structured error level.

## 4. Audit Opinion

Go for implementation.

No fatal or major specification gap is open for V1.16-2, because V1.16-1 already enforces schema validation at the shared artifact store.

No-Go conditions:

- MCP duplicates business logic instead of calling shared services.
- MCP writes artifacts without schema validation.
- MCP returns plain-string errors.
- MCP expands runtime command allowlist.
