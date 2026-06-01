# Navia / 伴航

Navia is a Chrome companion-reading MVP with a local headless runtime. V1 focuses on a Chrome Side Panel chatbox that reads the current page, summarizes it, answers page-grounded questions, and generates Mermaid mindmaps with traceable runtime events.

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

## Project Layout

```text
services/local-runtime/       Python FastAPI local runtime and AgentCore baseline
apps/chrome-extension/        WXT + React Chrome MV3 extension
docs/navia_v1_project_docs/   PRD, architecture, contracts, stage gates, evidence
```

## V1 Scope Boundaries

V1 does not add RAG, long-term memory, MCP, Skills, multi-agent orchestration, browser automation, network search, local file access by default, voice, desktop pet, deep research, or PPT generation.

