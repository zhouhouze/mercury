# Navia Runtime Modules

This directory contains service-layer modules for V1.2 AI reading.

Module ownership:

```text
page_reading/   A: page extraction, filtering, distillation, structured summary
mindmap/        C: mindmap generation from structured page JSON
agent_loop/     D: CoreProvider boundary, turn mapping, traceable event output
adapters/       D: MCP / Skill / External API adapter contracts and implementations
```

Rules:

- A/C/D module Codex terminals only edit their own service module folder and their own stage-gate document.
- Existing runtime entrypoints such as `app.py`, `agent.py`, and `tools.py` are wired by Integration Codex.
- Public contract changes must go back to the V1.2-0 documentation freeze.
- D is `CoreProvider + Adapter Layer`; piAgentProvider is the preferred provider target, but real piAgent integration requires dependency lock first.
- piAgent or any CoreProvider must not write ArtifactRecord, SSE, EventStore, Trace, or UI directly.

Each service workspace must contain module-local documentation before implementation:

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
contracts/README.md
fixtures/README.md
runtime/README.md
tests/README.md
```

A/C/D service modules may expose pure module functions or service helpers, but existing Runtime entrypoints remain Integration Codex wiring responsibility.

External agents should also read:

```text
AGENTS.md
docs/navia_v1_project_docs/AGENT_ONBOARDING.md
docs/navia_v1_project_docs/V1_2_AGENT_WORKPACKS.md
docs/navia_v1_project_docs/MODULE_HANDOFF_TEMPLATE.md
```
