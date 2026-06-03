# Navia / 伴航 V1 待决策问题

本文件列出当前尚未完全确定、或已形成 V1 临时决策但需要在 V2 前复盘的问题。

---

## 1. AgentCore 语言栈

V1 决策：

```text
采用方案 A：Python Runtime + Python AgentCore
```

决策理由：

- FunASR、本地模型、后续类 RAG / 知识库能力更贴近 Python 生态。
- V1 目标是快速完成稳定 MVP 基础功能 Demo 验证。
- 后端部分需要在团队内分工实现，Python 模块化 Runtime 更利于先拆 API、AgentCore、Governance、Session、ModelAdapter 等边界。

V2 前复盘：

- 评估 Python Runtime 是否继续作为长期主栈。
- 评估是否需要引入 TypeScript Runtime、Python sidecar、或按模型 / ASR / AgentCore 拆分服务。
- 复盘依据包括 V1 Demo 稳定性、团队分工效率、模型接入成本、Chrome/Web/App 类型合同维护成本。

---

## 2. Chrome Extension 框架

V1 决策：

```text
采用 WXT + React + TypeScript
```

决策理由：

- V1 优先 Chrome Side Panel，但后续有 Web / App / 多端产品化诉求。
- WXT 更适合作为长期工程化插件基线。
- 插件只作为 Interface Plane，不承载 AgentCore 状态。

V1.0-0/A/B/C 处理方式：

- 不创建插件工程。
- 只保证 Runtime API / Event schema 可被 WXT 插件消费。
- 插件工程从 V1.0-D 开始规划和实现。

---

## 3. 本地意图识别模型

候选：

- Rule-based fallback。
- Qwen 0.5B / 1.5B 级别本地模型。
- Ollama / llama.cpp adapter。
- 远程 LLM optional。

建议：

- V1.0-0/A/B/C 先 rule-based。
- V1.0-E 前接本地小模型。
- 微调放到 V1.1/V1.2，不作为 V1.0 必需项。

---

## 4. Mindmap 本地模型

待决策：

- 用本地通用模型 prompt 生成。
- 训练 / 微调专用模型。
- 先生成 outline，再转换 Mermaid。

建议：

- V1.0 使用 prompt + validator + repair once。
- 样本积累后再微调。

---

## 5. 长页面抽取策略

待决策：

- Readability 类抽取。
- DOM heading tree。
- 自研清洗规则。

建议：

- V1 支持普通文章 / 文档页即可。
- 不追求所有网页完美抽取。
- 需要 content hash 和 chunk trace。

---

## 6. 事件流协议

V1.0-0/A/B/C 决策：

```text
/v1/chat/stream 固定使用 SSE；Agent events 可先用 SSE，ASR 保留 WebSocket 扩展点。
```

决策理由：

- V1.0-0/A/B/C 重点是事件 schema、状态机、trace 可验证，不需要过早同时维护两套实时协议。
- SSE 足够覆盖 chat stream 和调试阶段事件观察。
- FunASR 音频流和后续高频 Agent events 可在 V1.0-F 或插件阶段补 WebSocket。

---

## 7. 桌宠角色设计

建议命名：

```text
英文品牌：Navia
中文品牌：伴航
桌宠角色：小航
```

V1 不实现桌宠，只保留品牌延展。

---

## 8. 是否引入远程模型

建议：

- V1 默认本地优先。
- 远程模型只能 optional，并通过配置开启。
- UI 必须展示是否正在使用远程模型。

---

## 9. 文件访问监督

V1 默认关闭本地文件访问。

未来 V2/V4 需要本地知识库或个人秘书时，必须复用 FileQuerySupervisor：

- allowed roots。
- denied globs。
- max files。
- max bytes。
- approval required。

---

## 10. 不阻塞项

以下问题不应阻塞 V1.0-0/A/B/C：

- 最终品牌 logo。
- 角色形象。
- 本地模型微调。
- 云端同步。
- App 端。
- 桌面宠物。
- 完整知识库。
- PPT 生成。

---

## 11. Mercury 远端窗口交互 PRD 合并项

来源：

```text
https://github.com/zhouhouze/mercury
PRD/窗口交互_PRD.md
```

当前合并判定：

- 远端仓库当前没有 `docs/` 目录。
- 已将远端 README 与窗口交互 PRD 复制到 `remote-mercury/`。
- 远端 PRD 描述的是网页内悬浮球 + 站内嵌入面板体验，不覆盖当前 V1.0 Side Panel 基线。

当前决策：

```text
V1.1：前端体验高保真阶段
```

旧的“网页内悬浮球与站内嵌入面板体验”占位已升级为 V1.0 页面内交互主线；V1.1 不再解决“是否做悬浮球”的问题，而是解决“如何高保真还原 Figma 原型并建立视觉验收”的问题。

V1.1 仍待闭环的问题：

- Figma Make 链接当前通过 MCP 读取不稳定；是否能通过 Chrome CLI 捕获真实 live preview 截图，或补充普通 Figma `/design` 节点作为视觉基线。
- Chrome CLI 自动捕获已验证为 Figma WebGL unsupported error page，不能作为视觉基线；已登录 Chrome manual-auth 截图已获得一个真实 live preview 主窗口截图，但 `capture-matrix.md` 完整状态矩阵仍需补齐。
- `design/v1.1-figma-baseline/reviewed/` 是否已覆盖 `floating-default`、`floating-hover`、`panel-440-push`、`panel-50vw-push`、`panel-overlay`、`mobile-overlay`、`runtime-offline`、`artifact-mindmap`。
- Figma `MainLayout / MockPage / FloatingBall / Sidebar / ChatArea` 与真实注入面板 DOM 结构的最终映射。
- 视觉 token 是否先落在 Shadow DOM CSS，还是引入更明确的前端组件层。
- 强 CSP、iframe、`chrome://`、Chrome Web Store 页面如何展示高保真降级态。

已转为 V1.1 默认决策：

- 覆盖态下底层网页默认不可交互。
- 右侧 ToolDock 第一版只做 disabled / placeholder 占位。
- `⌘M` 只作为 hover 提示，不作为快捷键验收。

V1.1 文档入口：

```text
design/v1.1-frontend-fidelity-architecture.md
stage-gates/v1.1-frontend-fidelity.md
design/v1.1-frontend-fidelity-gap.drawio
```
