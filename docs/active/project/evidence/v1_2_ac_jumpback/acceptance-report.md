# V1.2-AC-Jumpback MVP Acceptance Report

## 结论

V1.2-AC-Jumpback MVP 自动化验收通过。

本阶段可声明：

- C Mindmap artifact metadata 已输出稳定 `nodeBindings`。
- B Mindmap artifact 已展示来源证据卡片。
- 用户点击来源证据卡片会向当前网页 content script 发送 `navia.jumpToSource` 请求。
- Content script 可按 `selector -> domPath -> textQuote` 尝试定位并高亮。
- 定位失败时返回 `fallback_shown`，不会伪装为 DOM 高亮成功。
- 真实 Chrome 原生 Side Panel 主路径仍可完成读取、Debug、提交上下文、总结、问答、Mindmap，并有截图证据。

不得声明：

- 完整 V1.2 complete。
- Monica 级精确反跳。
- OCR / 视频 / 直播 / PDF / iframe / shadow DOM 反跳。
- RAG、长期记忆、Web Research、浏览器自动操作、PPT、深度研究 ready。

## 验收结果

| 验收项 | 结果 | 证据 |
|---|---|---|
| C 输出 `metadata.nodeBindings` | Pass | `services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py` |
| C digest-first + SourceRef-backed source map | Pass | `test_pass_quality_uses_digest_items_and_source_refs_first` |
| B 生成来源证据卡片与 Jumpback request | Pass | `apps/chrome-extension/src/modules/chat_renderer/tests/chatPresentation.test.ts` |
| B 来源卡片点击调用当前 tab content script | Pass | `apps/chrome-extension/src/modules/chat_renderer/tests/ArtifactInlineCard.test.tsx` |
| Content script selector 定位 | Pass | `apps/chrome-extension/src/contentBridge.test.ts` |
| Content script textQuote 降级定位 | Pass | `apps/chrome-extension/src/contentBridge.test.ts` |
| Content script 失败返回 fallback | Pass | `apps/chrome-extension/src/contentBridge.test.ts` |
| 前端类型检查 | Pass | `npm run typecheck` |
| 前端全量测试 | Pass | 10 files / 56 tests |
| 后端 runtime + C 回归 | Pass | 115 tests |
| A/C 模块合同回归 | Pass | 43 tests |
| Chrome 原生 Side Panel 真实页面 UX | Pass | `docs/active/project/evidence/v1_2_ac/native-sidepanel-ux/report.json` |
| Chrome 原生 Side Panel HTML 报告 | Pass | `docs/active/project/evidence/v1_2_ac/native-sidepanel-ux/acceptance-report.html` |
| 生产构建无 E2E bridge 残留 | Pass | `npm run e2e:chrome:native-ux:report` |
| 空白/格式检查 | Pass | `git diff --check` |

## 命令记录

```text
PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py
npm test -- --run src/contentBridge.test.ts src/modules/chat_renderer/tests/chatPresentation.test.ts
npm run typecheck
npm test -- --run
PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest services/local-runtime/tests services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py
PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest services/local-runtime/navia_runtime/modules/page_reading/tests services/local-runtime/navia_runtime/modules/mindmap/tests
npm run build:e2e
npm run e2e:chrome:native-ux
npm run build
npm run e2e:chrome:native-ux:report
git diff --check
```

## 真实数据与截图证据

真实 Chrome native Side Panel 验收覆盖 5 个页面：

- `article`
- `docs`
- `github_readme`
- `zh-python-modules`，中文复杂页面
- `low-example-domain`，低信号 degraded 页面

报告路径：

```text
docs/active/project/evidence/v1_2_ac/native-sidepanel-ux/report.json
docs/active/project/evidence/v1_2_ac/native-sidepanel-ux/acceptance-report.html
docs/active/project/evidence/v1_2_ac/native-sidepanel-ux/screenshots/
```

该真实 Chrome 验收证明 Side Panel 主体验仍可用，并且 Mindmap 页面截图已进入真实原生 Side Panel 流程。Jumpback 的点击消息与 DOM 定位分别由组件测试和 content script 测试覆盖。

## False-Green 审计

| 风险 | 结论 |
|---|---|
| 只有 Mermaid source，没有来源证据 | 已防护：`sourceCards` 必须从 `nodeBindings/nodeSourceMap` 生成。 |
| 来源卡片点击没有调用 content script | 已防护：组件测试断言 `chrome.tabs.sendMessage`。 |
| DOM 未命中仍显示成功 | 已防护：content script 返回 `fallback_shown`，测试覆盖。 |
| 只在全屏 extension page 验收 | 已防护：真实 native Side Panel UX 报告通过，截图包含真实网页与右侧面板。 |
| 生产构建残留 E2E bridge | 已防护：先重跑生产构建，再跑 HTML 报告器，结果通过。 |

## 剩余风险

- 当前自动化未做真实 Chrome 中“点击 Mermaid SVG 节点后页面滚动高亮”的截图级断言；已用组件点击测试和 content script DOM 测试覆盖最小链路。
- Mermaid SVG 的内部 DOM 结构可能随 Mermaid 版本变化。为降低风险，UI 同时提供稳定的来源证据卡片入口。
- 精确 selector 的质量仍依赖 A SourceRef。selector 不可用时，本阶段按合同展示 fallback evidence。
