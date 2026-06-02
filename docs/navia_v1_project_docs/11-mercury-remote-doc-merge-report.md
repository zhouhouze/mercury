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

本地 Navia V1 当前基线是：

```text
Chrome Extension Side Panel
-> PageContext
-> Local Runtime
-> /v1/chat/stream
-> 摘要 / 问答 / Mermaid mindmap
```

两者不是冲突关系，而是前端形态层级不同：

- 本地 V1.0-D/E 已优先交付 Chrome Side Panel 主链路。
- 远端 Mercury PRD 更接近 V1.x / V2 前端体验增强，尤其是“网页贴边悬浮球”和“Monica-like 站内嵌入面板”。
- 远端 PRD 不应覆盖 V1.0-E 的验收基线，否则会导致 scope creep 和 false green。

---

## 4. 合并决策

### 4.1 纳入本地 PRD 的内容

已将远端交互方案纳入本地 PRD 的 V1.x 体验增强方向：

- 网页贴边悬浮球。
- hover 预展开小长条。
- 网页内双轨聊天面板。
- 窄距 / 半屏挤压网页。
- 宽工作区覆盖网页。
- 面板左边界 resize。
- 聊天区独立滚动。

### 4.2 暂不进入 V1.0-E 的内容

以下能力不进入当前 V1.0-E：

- 网页内悬浮球默认态。
- 挤压网页布局。
- 覆盖式宽工作区。
- 双轨面板功能区。
- 面板 resize handle。
- 快捷键 `⌘M`。
- 网页内容可交互背景策略。

原因：

- V1.0-E 正在收口 Chrome Side Panel + Runtime 主链路。
- 站内注入 UI 会增加 CSS 隔离、页面布局兼容、权限、安全和真实网页验收成本。
- 当前阶段若强行并入，会显著提高 false-green 风险。

### 4.3 推荐后续阶段

建议将远端 Mercury PRD 拆为一个独立阶段：

```text
V1.1：网页内悬浮球与站内嵌入面板体验
```

前置条件：

- V1.0 Side Panel 主链路通过真实 Chrome 验收。
- Runtime API / SSE / Artifact / Trace 已稳定。
- 前端已有足够 Chatbox 状态管理和错误展示能力。

---

## 5. 需要后续审计的问题

远端 PRD 中仍有以下待确认项，需要在 V1.1 开始前单独 stage-gate 审计：

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
远端交互方案已被归档为 V1.x / V1.1 前端体验增强方向。
当前 V1.0-E Side Panel 主线不被覆盖，不新增站内悬浮球为验收目标。
```

