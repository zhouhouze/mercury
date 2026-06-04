# Navia Runtime Modules

This directory contains service-layer modules for V1.2 AI reading.

Module ownership:

```text
page_reading/   A: page extraction, filtering, distillation, structured summary
mindmap/        C: mindmap generation from structured page JSON
agent_loop/     D: AgenticLoop ChatBox Core
adapters/       D: MCP / Skill / External API adapter contracts and implementations
```

Rules:

- A/C/D module Codex terminals only edit their own service module folder and their own stage-gate document.
- Existing runtime entrypoints such as `app.py`, `agent.py`, and `tools.py` are wired by Integration Codex.
- Public contract changes must go back to the V1.2-0 documentation freeze.
