# D Adapters Service Module

Owner: D module Codex.

Responsibility:

- MCP adapter contracts.
- Skill adapter contracts.
- External API adapter contracts.
- Internal tool adapter normalization.
- Safe placeholder adapters.

Internal structure:

```text
docs/
contracts/
runtime/
tests/
fixtures/
```

Rules:

- All adapters must be registered through D AgenticLoop.
- All adapter calls must pass governance hooks.
- All adapter results must map to ToolResult.
- High-risk side effects are denied by default.
