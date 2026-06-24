# Navia Cross-Machine Recovery Handoff

Date: 2026-06-22

This document preserves the project state and Codex working context needed to continue Navia development on another machine. It intentionally does not include local credentials, Codex account state, Figma tokens, GitHub tokens, local browser profiles, or private runtime databases.

## Repository Source

```text
Primary remote: https://github.com/zhouhouze/mercury
Branch: main
Local project path on old machine: /Users/Zhuanz/Desktop/workspace/navia
```

After cloning on the new machine, run `git log -1 --oneline` and compare it with the latest pushed commit from the old machine.

## Current Project State

Navia is a Chrome companion-reading MVP with:

- Python local Runtime under `services/local-runtime/`.
- WXT / React Chrome extension under `apps/chrome-extension/`.
- Active documentation under `docs/active/`.
- Historical or inactive documentation under `docs/history/`.

Current active stage:

```text
V1.3 Evidence Card Mindmap experience baseline.
```

Current implementation state:

- A Page Reading: structured page extraction, high-signal perception contracts, quality evidence, source references, and debug-visible JSON have active implementation and evidence.
- C Mindmap: Mermaid mindmap generation and source map support exist; current short-term work is improving semantic label compression, theme grouping, and readable two-level structure.
- B Renderer: current Side Panel renderer has Evidence Card Mindmap baseline, two-level display, theme collapse, density hints, source evidence panel, selected / hover / neighbor highlight, and jumpback/fallback evidence surfaces.
- D CoreProvider / Adapter: `services/local-runtime/navia_runtime/modules/agent_loop/` is the CoreProvider / piAgent-oriented core area; D remains the only Artifact / Event / Trace mapping boundary.
- Integration: current primary user path is Chrome native Side Panel. This is not yet the final V1 in-page floating-ball / dual-track panel experience.

Current completion boundary:

```text
Allowed claim: V1.3 Evidence Card Mindmap experience baseline is implemented and documented.
Not allowed: full V1 complete, full V1.2 complete, final in-page Monica-like UX complete, RAG / Memory / Web Research / PPT / Deep Research ready.
```

## Important Active Documents

Read these first on the new machine:

```text
AGENTS.md
docs/active/project/README.md
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/design/v1.3-evidence-card-mindmap-gap.md
docs/active/project/design/v1.3-evidence-card-mindmap-gap.drawio
docs/active/project/stage-gates/v1.3-evidence-card-mindmap.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/contracts/v1_3_evidence_card_mindmap.schema.json
docs/active/modules/frontend/mindmap_renderer/README.md
docs/active/modules/runtime/mindmap/README.md
docs/active/modules/runtime/page_reading/README.md
docs/active/modules/runtime/agent_loop/README.md
```

Use `docs/active/` as the current source of truth. Do not treat `docs/history/` as active unless the user explicitly asks to reactivate a historical stage.

## Minimal Recovery Steps

On the new machine:

```bash
git clone https://github.com/zhouhouze/mercury.git navia
cd navia
```

Python Runtime setup:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Chrome extension setup:

```bash
cd apps/chrome-extension
pnpm install
pnpm build
cd ../..
```

Start Runtime:

```bash
uvicorn navia_runtime.app:app --host 127.0.0.1 --port 17861 --app-dir services/local-runtime
```

Load extension:

```text
1. Open Chrome: chrome://extensions
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select: apps/chrome-extension/chrome-mv3-unpacked
5. Open a normal webpage.
6. Click the Navia extension icon to open the native Chrome Side Panel.
```

Minimal user verification:

```text
1. Runtime status is online in the Side Panel.
2. Click read current page.
3. Confirm Debug tab shows active page / structured JSON / quality or fallback information.
4. Ask for a summary or page question.
5. Generate or view Mindmap.
6. Click a source or node and verify either DOM highlight or fallback evidence is visible.
```

## Minimal Engineering Verification

Run from repository root:

```bash
curl http://127.0.0.1:17861/v1/health
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- mindmap_renderer chat_renderer debug_renderer
PYTHONPATH=services/local-runtime python3 -m pytest services/local-runtime/tests/test_v1_0_0_runtime_skeleton.py services/local-runtime/tests/test_v1_0_e_reading_tools_e2e.py services/local-runtime/tests/test_v1_2_ac_quality_evidence.py services/local-runtime/tests/test_agentic_turn_runner_mock.py
npm --prefix apps/chrome-extension run build
```

Expected notes:

- Build output is generated in `apps/chrome-extension/chrome-mv3-unpacked/`.
- WXT may warn about large chunks; this is a known warning, not a failed build by itself.
- ASR status may be unavailable; ASR is not a V1.3 readiness requirement.
- On Ubuntu / WSL, `python3 -m venv .venv` requires the matching `python3.x-venv` package. If `ensurepip` is missing, install the system venv package or temporarily run verification with `PYTHONPATH=<repo>/.tmp/python-deps:services/local-runtime` after `pip install --target .tmp/python-deps -r requirements.txt`.
- Chrome Side Panel E2E requires a launchable Linux Chrome / Chromium for Playwright. If Playwright reports missing libraries such as `libnspr4.so`, run `npx playwright install-deps chromium` with sufficient system privileges before treating native Side Panel E2E as failed.
- In sandboxed Codex environments, Runtime health checks may need the Runtime process to be started outside the sandbox network namespace; otherwise `uvicorn` can report started while `127.0.0.1:17861` is unreachable from Chrome or a separate shell.

## Local State Not Uploaded

The following are intentionally not uploaded and must be recreated or reconfigured locally:

```text
~/.codex/config.toml
Codex login/session state
Figma login/token state
GitHub login/token state
Chrome user profile and cookies
.venv/
node_modules/
.navia/navia.sqlite3 or any local runtime database
local .env secrets
```

If GitHub push/pull is needed on the new machine, run:

```bash
gh auth login
git remote -v
```

If Figma or other MCP services are needed, configure them on the new machine rather than copying tokens through the repository.

## Development Rules To Preserve

- A and C are Runtime service modules and must not call piAgent/CoreProvider directly.
- B frontend renderer must not call A/C/D services, MCP, Skill, or external APIs directly.
- D is the CoreProvider + Adapter boundary and remains the only Artifact / Event / Trace mapping layer.
- Do not introduce RAG, long-term memory, multi-agent orchestration, browser automation, default local file access, network search, voice, desktop pet, deep research, or PPT generation in current V1.x work unless a new stage gate explicitly approves it.
- Any public contract change requires returning to the relevant stage gate.
- Before implementation, close PRD / acceptance / audit gates for the active stage.

## Prompt For The New Codex Terminal

Paste this into the new Codex terminal after cloning the repository:

```text
你现在接手 Navia 项目。请先阅读 AGENTS.md 和 docs/active/project/HANDOFF_2026-06-22_CROSS_MACHINE_RECOVERY.md，然后只以 docs/active 为当前有效文档，忽略 docs/history，除非我明确要求历史追溯。

当前仓库远端是 https://github.com/zhouhouze/mercury，分支 main。当前阶段是 V1.3 Evidence Card Mindmap 体验基线已实现并有文档与证据，但不能声明完整 V1 complete；当前主体验是 Chrome 原生 Side Panel，不是最终网页内悬浮球 / 双轨面板。

请先执行环境恢复和验证：安装 Python 与前端依赖，启动 Runtime，构建 Chrome 扩展，用最小步骤确认 Side Panel 能读取当前页、显示 Debug JSON、总结/问答、生成 Mindmap，并能展示 source fallback 或 DOM highlight 证据。

后续优先关注 C 模块语义标签压缩、主题归并质量、Mindmap 可读性和 V1 网页内最终交互体验补齐。不要引入 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、浏览器自动操作、语音、桌宠或默认本地文件读取。任何实质开发前，先按 docs/active/project/stage-gates/ 下的当前阶段门禁完成 PRD/验收计划/审计闭环。
```

## Latest Known Local Verification Before Handoff

The old machine last verified:

```text
npm --prefix apps/chrome-extension run typecheck: passed
npm --prefix apps/chrome-extension test -- mindmap_renderer chat_renderer debug_renderer: passed
PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest selected runtime tests: passed
npm --prefix apps/chrome-extension run build: passed
Runtime health on 127.0.0.1:17861: passed when Runtime was running
```

Re-run these on the new machine; do not assume the old machine's runtime process or browser state migrates.
