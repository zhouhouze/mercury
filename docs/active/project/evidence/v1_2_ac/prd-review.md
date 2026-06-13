# V1.2-AC PRD Review

结论：Pass for staged AC automated contract evidence, extension UI E2E, and visual screenshot acceptance through direct extension page fallback.

本证据包只覆盖 V1.2-AC：A high-signal 主链路、C digest-first Mindmap、D Artifact/Event/Trace 映射、B Debug 数据模型。

不得声明：完整 V1.2 complete、A-V1.2 100-page production gate complete、完整聊天体验 ready、原生 Chrome Side Panel 窗口自动化完全解决。

已覆盖：

- /v1/page/context 返回 structuredPage/highSignalPage/perceptionDigest/sourceMap/qualityReport。
- /v1/chat/stream 可生成 mindmap artifact。
- digest-first mindmap 使用 A perceptionDigest/sourceMap/qualityReport。
- low-signal/fail readiness 不生成伪正常 mindmap。
- 12 个 A-V1.2 corpus snapshot 样本被登记为 AC 回归输入。
- `pnpm --dir apps/chrome-extension e2e:chrome` 已通过 direct extension page fallback，覆盖读取页面、提交 Runtime、总结、页面问答、Mindmap 和刷新恢复。
- `pnpm --dir apps/chrome-extension e2e:chrome:visual` 已通过，并生成 8 张关键路径截图与 HTML 报告。

未声明完成：

- 原生 Chrome Side Panel 窗口自动化：`chrome.sidePanel.open` 依赖浏览器 user gesture 和 target 暴露，当前只声明 direct extension page fallback 自动化覆盖。
- 3 个不同真实 Chrome 页面人工体验验收：本轮只覆盖一个真实 fixture tab 的完整可见截图路径。

截图报告：

```text
docs/active/project/evidence/v1_2_ac/visual-chrome-cli/index.html
```
