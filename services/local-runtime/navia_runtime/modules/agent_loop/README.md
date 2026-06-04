# D AgenticLoop Service Module

Owner: D module Codex.

Responsibility:

- AgenticLoop orchestration.
- Single-session continuous context.
- AdapterRegistry.
- Governance hook enforcement.
- ToolResult mapping.
- Traceable AgentEvent output.

Internal structure:

```text
docs/
contracts/
runtime/
tests/
fixtures/
```

Output contract:

- `ToolResult`
- `ToolCallRecord`
- `ArtifactRecord`
- `AgentEvent` SSE

Do not edit `services/local-runtime/navia_runtime/agent.py` or `tools.py` directly. Integration Codex owns wiring into existing runtime entrypoints.
