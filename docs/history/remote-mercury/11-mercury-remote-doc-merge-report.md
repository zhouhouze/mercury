# Mercury 远端文档合并报告

日期：2026-06-01
远端仓库：https://github.com/zhouhouze/mercury
远端提交：`a0c8be2004149d92130ec7cf050f936c0c9ab230`

---

## 1. 拉取结果

已从远端 `main` 分支下载仓库压缩包并检查文档结构。

远端实际文件：

```text
README.md
PRD/窗口交互_PRD.md
```

检查结论：

```text
远端当前没有 docs/ 目录。
因此本次无法执行 docs/ 对 docs/ 的直接目录合并。
已改为将远端 README 与 PRD 作为 Mercury 来源文档并入本地 Navia 文档包。
```

---

## 2. 已并入的远端原始文档

远端原文已复制到：

```text
docs/navia_v1_project_docs/remote-mercury/README.md
docs/navia_v1_project_docs/remote-mercury/PRD/window-interaction-prd.md
```

说明：

- 保留远端 README，用于记录仓库初始化和协作约束。
- 保留远端窗口交互 PRD，用于后续前端体验增强设计。
- 文件名从中文路径规范化为英文路径，便于跨平台和自动化脚本处理。

---

## 3. 与本地文档的关系判定

远端 `窗口交互_PRD.md` 描述的是：

```text
网页内贴边悬浮球
-> hover 小长条
-> 点击展开网页内 AI 双轨聊天面板
-> 窄距/半屏挤压网页
-> 宽工作区覆盖网页
-> 点击悬浮球收起
```

本地 Navia V1 技术基线是：

```text
Chrome Extension
-> PageContext
-> Local Runtime
-> /v1/chat/stream
-> 摘要 / 问答 / Mermaid mindmap
```

经 2026-06-02 用户确认，二者关系调整为：

- `PRD/窗口交互_PRD.md` 升级为 V1 前端页面体验的 P0 权威来源。
- 本地 Navia Runtime / AgentCore / API / Event / Governance 仍作为 V1 技术底座。
- Chrome Side Panel 只保留为工程调试入口、兼容承载或过渡实现，不再作为 V1 前端体验验收口径。
- V1 complete 必须覆盖 `PRD/窗口交互_PRD.md` 的悬浮球、hover、小长条、网页内双轨面板、挤压/覆盖/resize 和收起恢复。

---

## 4. 合并决策

### 4.1 纳入本地 V1 PRD 的内容

已将远端交互方案纳入本地 V1 前端体验主线：

- 网页贴边悬浮球。
- hover 预展开小长条。
- 网页内双轨聊天面板。
- 窄距 / 半屏挤压网页。
- 宽工作区覆盖网页。
- 面板左边界 resize。
- 聊天区独立滚动。

### 4.2 Side Panel 的新定位

以下能力不得再作为 V1 前端体验通过条件：

- Chrome Side Panel 可打开。
- Side Panel Chatbox 可对话。
- 普通 extension page 可对话。
- Debug page 可对话。

这些能力可以作为调试或兼容入口存在，但不能替代真实网页内交互验收。

### 4.3 推荐后续阶段

建议将后续 V1 阶段调整为：

```text
V1.0-D：Chrome 插件页面内交互壳与 PageContext
V1.0-E：网页内 AI 双轨面板与伴读工具
V1.0-F：PRD A-F 布局状态与 Resize
V1.0-G：Session 质量与恢复
V1.0-H：真实 Chrome UI 最终验收与文档收口
```

前置条件：

- Runtime API / SSE / Artifact / Trace 已稳定。
- `docs/navia_v1_project_docs/12-interaction-prd-authority-and-revised-plan.md` 已被纳入阶段门禁读取清单。
- V1.0-D/E/F stage-gate 必须重新按 `PRD/窗口交互_PRD.md` 制定开发计划、验收标准和预审计意见。

---

## 5. 需要后续审计的问题

远端 PRD 中仍有以下待确认项，需要在 V1.0-D/E/F stage-gate 中单独审计：

1. 右侧功能区第一版只做入口占位，还是至少实现聊天 / 历史 / 新建会话？
2. 悬浮球默认贴右侧，是否允许用户切换到左侧？
3. 窄距宽度是否最终定为 `440px`？
4. 宽覆盖态下，底层网页是否允许点击，还是只作为不可交互背景？
5. 是否需要支持快捷键 `⌘M` 展开 / 收起？
6. 站内注入 UI 是否使用 Shadow DOM 隔离？
7. 挤压网页是否通过 `body` padding / transform / wrapper injection 实现？
8. 对强 CSP、iframe、Chrome Web Store、`chrome://` 页面如何降级？

---

## 6. 合并结论

```text
远端 Mercury 当前没有 docs/ 目录。
已将远端 README 与窗口交互 PRD 作为来源文档并入本地 Navia 文档包。
远端交互方案已升级为 V1 前端体验权威口径。
当前 V1.0 后续开发不得再以 Side Panel 主线声明前端体验通过。
V1 complete 必须以 PRD A-F 状态和网页内 AI 双轨面板为验收标准。
```
