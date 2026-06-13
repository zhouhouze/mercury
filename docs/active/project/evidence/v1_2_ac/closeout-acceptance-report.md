# V1.2-AC Closeout Acceptance Report

日期：2026-06-12

## 1. 结论

V1.2-AC 当前可声明：

```text
Pass for automated backend/frontend contract regression,
Pass for Runtime A/C/D/B integration evidence,
Pass for direct extension page E2E evidence,
Pass for single-page visual screenshot acceptance.
```

不得声明：

```text
完整 V1.2 complete
完整 V1 complete
A-V1.2 100-page production gate newly completed
原生 Chrome Side Panel 窗口自动化完全解决
3 个不同真实 Chrome 页面截图验收完成
```

本轮已在用户授权后启动隔离 Chromium profile 执行可见截图验收。截图验收不读取用户个人 Chrome profile。

## 2. 本轮非 GUI 自动化验收

已执行：

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q \
  services/local-runtime/tests \
  services/local-runtime/navia_runtime/modules/page_reading/tests \
  services/local-runtime/navia_runtime/modules/mindmap/tests \
  services/local-runtime/navia_runtime/modules/agent_loop/tests \
  services/local-runtime/navia_runtime/modules/adapters/tests
```

结果：

```text
150 passed
```

已执行：

```bash
pnpm --dir apps/chrome-extension test
```

结果：

```text
8 test files passed
39 tests passed
```

已执行：

```bash
pnpm --dir apps/chrome-extension typecheck
```

结果：

```text
pass
```

已执行：

```bash
pnpm --dir apps/chrome-extension build
```

结果：

```text
pass
chrome-mv3-unpacked rebuilt
```

已执行：

```bash
git diff --check
```

结果：

```text
pass
```

已执行：

```bash
python3 - <<'PY'
from pathlib import Path
from xml.etree import ElementTree as ET
ET.parse(Path('docs/active/project/design/v1.2-ai-reading-automation-gap.drawio'))
print('drawio XML parse: pass')
PY
```

结果：

```text
drawio XML parse: pass
```

## 3. 上轮可见浏览器自动化结果

上一轮已执行：

```bash
pnpm --dir apps/chrome-extension e2e:chrome
```

结果：

```json
{
  "status": "passed",
  "browserMode": "chromium",
  "sidePanelMode": "direct_extension_page",
  "checks": [
    "online",
    "page context",
    "summary",
    "question",
    "mindmap",
    "refresh recovery"
  ]
}
```

本轮未重复执行该命令，因为它会启动可见浏览器，用户已明确要求不要抢屏。

## 3.1 本轮可见截图验收

已执行：

```bash
pnpm --dir apps/chrome-extension e2e:chrome:visual
```

结果：

```json
{
  "status": "passed",
  "browserMode": "chromium",
  "sidePanelMode": "direct_extension_page",
  "screenshots": [
    "01-fixture-page.png",
    "02-chat-initial.png",
    "03-debug-after-read.png",
    "04-debug-after-submit.png",
    "05-summary.png",
    "06-page-question.png",
    "07-mindmap.png",
    "08-refresh-recovery.png"
  ]
}
```

报告路径：

```text
docs/active/project/evidence/v1_2_ac/visual-chrome-cli/index.html
```

## 4. PRD 规格复检

已覆盖：

- A perception bundle 进入 Runtime 主链路。
- `/v1/page/context` 保持旧 activePage 兼容，同时返回 high-signal perception bundle。
- C 在 readiness pass 时优先消费 `PerceptionDigest.items`。
- C `nodeSourceMap` 支持 A `SourceRef`、`fallbackText` 和 jumpback 元数据。
- D 仍是 ToolResult / Artifact / Event / Trace 映射出口。
- B Debug / Mindmap presentation 可展示质量状态和 source fallback。
- 低信号 / fail readiness 不生成伪正常 high-signal mindmap。

未完成或不声明：

- 原生 Chrome Side Panel window automation。
- 3 个不同真实 Chrome 页面截图验收。
- 完整 V1.2 全模块完成。
- 完整 V1 插件产品体验完成。

## 5. False-green 复检

未发现 fatal false-green：

- A perception bundle 不只存在离线 evidence，已进入 Runtime 主链路。
- C digest-first 和 SourceRef-backed nodeSourceMap 有测试与 evidence。
- 页面阅读类 intent 不再携带 `coreProvider` 覆盖，避免绕过 A/C adapter。
- direct extension page E2E 使用真实 extension app、真实 Chrome extension API、真实 Runtime 和真实 fixture tab。

仍需保留的限制：

- direct extension page fallback 是稳定自动化验收路径，不等同于原生 Side Panel 窗口自动化。
- 本轮截图验收覆盖一个真实 fixture tab，后续若要满足 3-page gate，需要追加 2 个真实页面样本。

## 6. 阶段出门判断

V1.2-AC 自动化开发项可以收口。

下一阶段开始前必须重新开 stage gate，不得从本报告直接声明：

- V1.2 complete。
- V1 complete。
- A-V1.2 production corpus gate newly complete。
- 原生 Chrome Side Panel visual acceptance complete。
