# V1.16 MCP Server Implementation Spec

Version: V1.16-2 implementation spec

Legacy alias: V2.16

## 1. Goal

V1.16-2 replaces the Python-only MCP facade with a real local MCP server entrypoint.

The MCP server must expose the same evidence workflow as HTTP and CLI while calling the same shared evidence service functions.

## 2. Transport And Entrypoint

Preferred transport:

```text
stdio MCP server
```

Recommended entrypoint:

```text
python -m navia_runtime.v2.mcp_server
```

Recommended implementation area:

```text
services/local-runtime/navia_runtime/v2/mcp_server.py
services/local-runtime/tests/test_v2_16_mcp_server.py
```

The server must not start FastAPI internally. It should import shared service functions from the same implementation path used by HTTP and CLI.

## 3. Tools

| MCP tool | Purpose | Shared function |
|---|---|---|
| `navia_runtime_evidence` | run or deny controlled runtime evidence | runtime evidence service |
| `navia_snapshot_diff` | create snapshot diff and changed facts | incremental service |
| `navia_workbench` | build workbench payload / HTML / export | workbench service |
| `navia_artifact_get` | retrieve persisted artifact | artifact store |

## 4. Request Shape

Every MCP tool accepts:

```json
{
  "requestId": "req_xxx",
  "projectId": "navia-local",
  "payload": {}
}
```

Tool-specific payloads mirror the HTTP and CLI payloads.

## 5. Response Shape

Success:

```json
{
  "ok": true,
  "artifact": {},
  "requestId": "req_xxx"
}
```

Failure:

```json
{
  "ok": false,
  "artifact": null,
  "error": {
    "code": "SCHEMA_VALIDATION_FAILED",
    "message": "payload.command is required",
    "recoverable": true
  },
  "requestId": "req_xxx"
}
```

## 6. Parity Rules

For equivalent inputs, HTTP / CLI / MCP must produce equivalent:

- `artifactType`;
- `schemaVersion`;
- `projectId`;
- payload status;
- parent artifact refs;
- evidence refs;
- structured error codes.

`source` must differ by channel:

```text
http -> source=http
cli -> source=cli
mcp -> source=mcp
```

Artifact IDs may differ, but all returned artifacts must be persisted and retrievable.

## 7. No-Go

- MCP duplicates business logic already in shared services.
- MCP returns ad-hoc JSON different from HTTP / CLI envelope.
- MCP errors are plain strings.
- MCP writes artifacts without schema validation.
- MCP expands command allowlist.

## 8. Acceptance

V1.16-2 passes only when:

- MCP server can list all required tools;
- each tool has success and structured error tests;
- parity tests compare HTTP / CLI / MCP outputs;
- V1.13-V1.15 regression tests still pass.
