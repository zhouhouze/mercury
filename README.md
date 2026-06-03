# Navia / 伴航

Navia is a Chrome companion-reading MVP with a local headless runtime. V1 frontend interaction follows `PRD/窗口交互_PRD.md`: an in-page floating ball opens an embedded dual-track AI panel that can read the current page, summarize it, answer page-grounded questions, and generate Mermaid mindmaps with traceable runtime events.

V1.0 focuses on the functional loop and PRD-aligned in-page interaction skeleton. V1.1 is the frontend fidelity stage: it will align the injected panel with the Figma Make prototype shape, add visual-regression acceptance, and close the architecture gap between the current Shadow DOM implementation and the target `MainLayout / MockPage / FloatingBall / Sidebar / ChatArea` design model.

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

If the unpacked directory is stale, rebuild and sync it:

```bash
cd apps/chrome-extension
pnpm build
cp -R .output/chrome-mv3/. chrome-mv3-unpacked/
```

The content script is intentionally small. Mermaid is rendered by the extension page `mermaid-renderer.html` through an iframe so the in-page content script does not bundle Mermaid directly.

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
services/local-runtime/       Python FastAPI local runtime and AgentCore baseline
apps/chrome-extension/        WXT + React Chrome MV3 extension
docs/navia_v1_project_docs/   PRD, architecture, contracts, stage gates, evidence
.navia/                       Local SQLite runtime state, ignored by Git
```

## V1.1 Documentation

The V1.1 frontend fidelity plan lives in:

- `docs/navia_v1_project_docs/design/v1.1-frontend-fidelity-architecture.md`
- `docs/navia_v1_project_docs/stage-gates/v1.1-frontend-fidelity.md`
- `docs/navia_v1_project_docs/design/v1.1-frontend-fidelity-gap.drawio`

V1.1 does not reopen Runtime, AgentEvent, ToolResult, or PageContext contracts. It is a high-fidelity frontend experience stage that requires a Figma screenshot or normal Figma `/design/` node before final visual acceptance can be claimed.

## V1 Scope Boundaries

V1 does not add RAG, long-term memory, MCP, Skills, multi-agent orchestration, browser automation, network search, local file access by default, voice, desktop pet, deep research, or PPT generation.
