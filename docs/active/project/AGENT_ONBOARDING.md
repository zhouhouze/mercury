# External Agent Onboarding

This guide is for a developer or coding agent that receives the Navia repository and needs to contribute to one V1.2 module without rediscovering the whole project.

## 1. Thirty-Minute Path

1. Read the root `README.md` for install, runtime, build, and manual Chrome acceptance.
2. Read root `AGENTS.md` to choose your workpack.
3. Read `01-prd.md` and `docs/active/project/interaction-prd/窗口交互_PRD.md` for product and interaction authority.
4. Read `design/v1.2-ai-reading-workspace-partition.md` for module boundaries.
5. Read `contracts/v1_2_adapter_contracts.md` and `design/v1.2-integration-contract-matrix.md` for cross-module contracts.
6. Read your module README and module-local docs.
7. Read your stage gate before editing.

## 2. Environment Quick Start

Install Python dependencies:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Install extension dependencies:

```bash
cd apps/chrome-extension
pnpm install
cd ../..
```

Start Runtime:

```bash
uvicorn navia_runtime.app:app --host 127.0.0.1 --port 17861 --app-dir services/local-runtime
```

Build extension:

```bash
cd apps/chrome-extension
pnpm build
cd ../..
```

Load `apps/chrome-extension/chrome-mv3-unpacked` in `chrome://extensions`.

## 3. Pick the Correct Module

| If your task says... | You are probably... | Work only in... |
|---|---|---|
| extract page, paragraphs, chunks, annotations, structured summary | A | `services/local-runtime/navia_runtime/modules/page_reading/` |
| render stream, artifact, debug, mindmap, fallback UI | B | `apps/chrome-extension/src/modules/*_renderer/` |
| generate Mermaid, validate, repair, source map | C | `services/local-runtime/navia_runtime/modules/mindmap/` |
| CoreProvider, MockCoreProvider, piAgent adapter, ToolResult/Event mapping, governance | D | `services/local-runtime/navia_runtime/modules/agent_loop/`, `services/local-runtime/navia_runtime/modules/adapters/` |
| connect old entrypoints, run full Chrome E2E, fill PRD coverage evidence | Integration | V1.2-E allowed entrypoints only |

## 4. Stop Conditions

Stop and return to V1.2-0 planning if:

- your module needs a new public API or SSE event type.
- your module needs to modify another module's directory.
- a field owner is unclear.
- B would need to call A/C/D/MCP/Skill/API directly.
- A or C would need to call CoreProvider.
- D would need to execute high-risk side effects by default.
- piAgent dependency details are not locked but real piAgent implementation is requested.

## 5. Evidence Requirements

Each module must produce module-local evidence before Integration:

- A: structured page JSON from real HTML fixtures and at least one real Chrome page when applicable.
- B: renderer output evidence from recorded SSE/artifact fixtures.
- C: Mermaid artifact evidence with validation result and `nodeSourceMap`.
- D: turn event evidence with `turnId`, `toolCallId`, governance-before-tool, ToolResult, Artifact, and Trace.
- Integration: real Chrome flow covering page read, summary, follow-up QA, mindmap, source fallback, and trace.

Record handoff using `MODULE_HANDOFF_TEMPLATE.md`.

## 6. Commands

Runtime tests:

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests
```

Extension checks:

```bash
cd apps/chrome-extension
pnpm test
pnpm run typecheck
pnpm build
```

Chrome E2E:

```bash
cd apps/chrome-extension
pnpm run e2e:inpage
```

Do not claim E2E pass if the browser automation cannot observe the extension behavior.
