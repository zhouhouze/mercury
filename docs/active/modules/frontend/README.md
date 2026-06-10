# Navia Chrome Extension Modules

This directory contains frontend modules for V1.2 AI reading.

Module ownership:

```text
chat_renderer/      B: streaming chat and structured data rendering
artifact_renderer/  B: artifact card and source fallback rendering
debug_renderer/     B: debug-only runtime and trace diagnostics
mindmap_renderer/   B: Mermaid visual rendering and node source fallback
```

Each renderer workspace must contain module-local documentation before implementation:

```text
docs/architecture.md
docs/implementation-plan.md
docs/mock-validation-plan.md
docs/prd-coverage.md
docs/integration-boundary.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
fixtures/README.md
tests/README.md
```

Frontend modules consume Runtime events and artifacts only. They do not own AgentCore state and must not directly call A/C service modules, MCP, Skill, or external API adapters.

Rules:

- B module Codex only edits this module tree and its own stage-gate document.
- Existing entrypoints such as `injectedPanel.ts`, `sse.ts`, `runtimeClient.ts`, and E2E scripts are wired by Integration Codex.
- B must not call A/C/D service modules, MCP, Skill, or External API directly.
- B must use recorded SSE/artifact fixtures for module validation before Integration.
- B must keep debug-only content out of the primary Chat tab.

External agents should also read:

```text
AGENTS.md
docs/active/project/AGENT_ONBOARDING.md
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/MODULE_HANDOFF_TEMPLATE.md
```
