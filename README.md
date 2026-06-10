# Navia / 伴航

Navia is a Chrome companion-reading MVP with a local headless runtime. V1 frontend interaction follows `docs/active/project/interaction-prd/窗口交互_PRD.md`: an in-page floating ball opens an embedded dual-track AI panel that can read the current page, summarize it, answer page-grounded questions, and generate Mermaid mindmaps with traceable runtime events.

V1.0 focuses on the functional loop and PRD-aligned in-page interaction skeleton. V1.1 is the frontend fidelity stage: it aligns the injected panel with the Figma Make prototype shape and visual-regression acceptance. V1.2 is currently a documentation-first architecture stage: it freezes the AI reading A/B/C/D module split, service/app workspace boundaries, and lightweight Adapter contracts before any parallel Codex implementation starts.

## External Agent Quick Start

If you are an external coding agent or a developer joining one module, start with:

```text
AGENTS.md
docs/active/project/AGENT_ONBOARDING.md
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/README.md
```

These documents define the V1.2 module workpacks, allowed edit directories, required contracts, evidence expectations, and Integration handoff rules.

Short version:

| Workpack | Directory |
|---|---|
| A Page Reading | `services/local-runtime/navia_runtime/modules/page_reading/` |
| B Renderer | `apps/chrome-extension/src/modules/*_renderer/` |
| C Mindmap | `services/local-runtime/navia_runtime/modules/mindmap/` |
| D CoreProvider / Adapter | `services/local-runtime/navia_runtime/modules/agent_loop/`, `services/local-runtime/navia_runtime/modules/adapters/` |
| Integration | existing entrypoints listed in `docs/active/project/stage-gates/v1.2-e-integration.md` |

Do not start implementation before reading your module documentation under `docs/active/modules/` and the matching stage gate.

## Requirements

- Python 3.11+
- Node.js 20+
- pnpm 10+
- Chrome with Extension Developer Mode enabled

## Install

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

cd apps/chrome-extension
pnpm install
cd ../..
```

## Run Local Runtime

```bash
uvicorn navia_runtime.app:app --host 127.0.0.1 --port 17861 --app-dir services/local-runtime
```

Runtime state is persisted locally in SQLite at `.navia/navia.sqlite3` by default. Use `NAVIA_DB_PATH=/path/to/navia.sqlite3` to override it.

Health check:

```bash
curl http://127.0.0.1:17861/v1/health
```

## Build Chrome Extension

```bash
cd apps/chrome-extension
pnpm build
cd ../..
```

Load this directory in `chrome://extensions`:

```text
apps/chrome-extension/chrome-mv3-unpacked
```

The build writes the unpacked extension to `apps/chrome-extension/chrome-mv3-unpacked`.

The content script mounts the in-page floating launcher and chat panel. Mermaid rendering still runs in the extension page `mermaid-renderer.html` through an iframe so Mermaid itself is not executed directly in the webpage context.

## Verify

Runtime tests:

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests
```

Chrome extension tests:

```bash
cd apps/chrome-extension
pnpm test
pnpm run typecheck
pnpm build
```

Chrome UI E2E automation:

```bash
cd apps/chrome-extension
pnpm run e2e:inpage
```

If browser automation cannot expose the extension service worker or content script, do not fake the result. Use the manual Chrome flow below and record it in the relevant stage gate.

## Minimal Manual Chrome Acceptance

1. Start Runtime:

```bash
uvicorn navia_runtime.app:app --host 127.0.0.1 --port 17861 --app-dir services/local-runtime
```

2. Load the unpacked extension:

```text
apps/chrome-extension/chrome-mv3-unpacked
```

3. Open a normal webpage, not `chrome://` or Chrome Web Store.
4. Confirm the Navia floating ball or hover strip appears.
5. Open the in-page panel and confirm Runtime is online.
6. Click `读取当前页面`.
7. Send a page-grounded question or click `总结`.
8. Click `Mindmap` and confirm Mermaid SVG renders, or that source fallback is visible.
9. Refresh or reopen the page and confirm the latest session, page title, messages, and artifact restore.
10. Collapse the panel and confirm the page layout is restored.

## Project Layout

```text
services/local-runtime/                       Python FastAPI local runtime and AgentCore baseline
services/local-runtime/navia_runtime/modules/ V1.2 service modules for A/C/D
apps/chrome-extension/                        WXT + React Chrome MV3 extension
apps/chrome-extension/src/modules/            V1.2 frontend renderer modules for B
docs/active/project/                          PRD, architecture, contracts, stage gates, evidence
docs/active/modules/runtime/                  A/C/D runtime module development documents
docs/active/modules/frontend/                 B frontend module development documents
docs/history/                                 inactive and superseded documents
.navia/                                       Local SQLite runtime state, ignored by Git
```

## Active Documentation

Current project documentation lives in:

- `docs/active/README.md`
- `docs/active/project/README.md`

The current active stage is A-V1.2 page perception. Its development and audit package lives in:

- `docs/active/project/design/v1.2-ai-reading-modular-architecture.md`
- `docs/active/project/design/v1.2-ai-reading-workspace-partition.md`
- `docs/active/project/contracts/v1_2_adapter_contracts.md`
- `docs/active/project/stage-gates/v1.2-0-ai-reading-contract-and-workspace-freeze.md`
- `docs/active/project/design/v1.2-a-page-perception-gap.drawio`
- `docs/active/project/stage-gates/v1.2-a-v1.2-production-page-perception.md`
- `docs/active/project/contracts/a_v1_2_page_perception.schema.json`

V1.2 allows lightweight MCP / Skill / External API Adapter contracts only through D Adapter Layer and governance hooks. It does not allow long-term memory, RAG, multi-agent orchestration, browser automation, or high-risk side effects by default.

Historical V1.0, V1.1, A-V1.1, and V1.13-V1.16 documents have been moved to `docs/history/`.

Additional external-agent onboarding docs:

- `AGENTS.md`
- `docs/active/project/AGENT_ONBOARDING.md`
- `docs/active/project/V1_2_AGENT_WORKPACKS.md`
- `docs/active/project/MODULE_HANDOFF_TEMPLATE.md`

Module-local development docs have been moved out of implementation directories and into:

- `docs/active/modules/runtime/`
- `docs/active/modules/frontend/`

## V1 Scope Boundaries

V1 does not add RAG, long-term memory, multi-agent orchestration, browser automation, network search, local file access by default, voice, desktop pet, deep research, or PPT generation. V1.2 may define MCP / Skill Adapter contracts for future controlled integration, but all such calls must be routed through D Adapter Layer and governance hooks.
