# Navia Chrome Extension Modules

This directory contains frontend modules for V1.2 AI reading.

Module ownership:

```text
chat_renderer/      B: streaming chat and structured data rendering
artifact_renderer/  B: artifact card and source fallback rendering
debug_renderer/     B: debug-only runtime and trace diagnostics
mindmap_renderer/   B: Mermaid visual rendering and node source fallback
```

Rules:

- B module Codex only edits this module tree and its own stage-gate document.
- Existing entrypoints such as `injectedPanel.ts`, `sse.ts`, `runtimeClient.ts`, and E2E scripts are wired by Integration Codex.
- B must not call A/C/D service modules, MCP, Skill, or External API directly.
