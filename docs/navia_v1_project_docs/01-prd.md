# Navia / 伴航 V1 PRD

版本：V1.0 PRD Baseline
日期：2026-05-31
产品名：Navia / 伴航
角色名建议：小航
阶段目标：Chrome 插件页面内交互优先的 Headless 伴随式 AI MVP

---

## 1. 产品背景

用户在浏览网页、阅读文章、查看技术文档、调研产品、整理资料时，经常需要即时理解当前页面内容，并进一步提问、总结、结构化整理、生成思维导图。传统 Chatbot 需要复制粘贴内容，缺乏当前页面上下文，也很难沉淀为后续个人知识库和个人 Agent 的底层能力。

Navia / 伴航的目标是构建一个伴随式 AI 系统：前端可以是 Chrome 插件、Web、App、未来桌面宠物，但核心能力必须是 Headless、可复用、可观测、可监督的本地 AI Runtime。

V1 的重点不是“大而全”，而是完成一个稳定闭环：

```text
当前网页上下文
  -> 单 Session AgentCore
  -> 本地意图识别
  -> 受控工具调用
  -> 摘要 / 问答 / Mermaid 思维导图
  -> Session 持久化与事件追踪
```

---

## 2. 一句话定位

Navia / 伴航是一个常驻在网页边缘的本地伴随式 AI 助手。V1 前端页面体验以仓库根目录 `PRD/窗口交互_PRD.md` 为准：页面边缘悬浮球作为入口，hover 后出现小长条，点击后在网页内展开 AI 双轨聊天面板，并支持窄距/半屏挤压网页、宽工作区覆盖网页和点击悬浮球收起。系统能够理解当前网页，提供伴读问答、摘要生成、Mermaid 思维导图，并以可观测、可监督的 Headless AgentCore 为后续个人知识库、观影观赛陪伴、个人秘书与多端产品化打基础。

---

## 3. 产品命名与品牌方向

### 3.1 英文名

Navia

语义方向：navigation、companion、AI、voyage。它代表在信息流、网页、知识和任务中陪用户一起航行。

### 3.2 中文名

伴航

语义方向：陪伴 + 导航。既适合 V1 网页伴读，也适合 V2 知识库、V3 观影观赛、V4 个人秘书和 V5 桌宠。

### 3.3 桌宠 / 角色名

小航

后续可以设计成一个小星舟、小导航精灵、小兽或小 AI 伙伴。

---

## 4. 总体产品路线

```text
V1：网页伴读 Companion + Headless Local AgentCore
V2：本地备忘 / 个人知识库 / 标签化总结 / 类 RAG 蒸馏
V3：伴随式观赛 / 观影 / 看直播体验
V4：个人秘书 / 深度研究 / PPT 生成 / Manus-like Agent 能力
V5：移动端迁移 / 云化部署 / 产品化改造 / 桌面宠物情绪价值
```

### 4.1 V1 定位

V1 是底座阶段：

- Chrome 插件的主前端体验是网页内悬浮球与双轨聊天面板；既有 Side Panel 只作为调试入口、兼容承载或过渡实现。
- Local Headless Runtime 是真正核心。
- AgentCore 是一个可控、可观测的单 Session 状态机。
- 本地模型是能力插件，不进入业务层。
- Session 质量优先于长期记忆。
- 监督机制优先于复杂智能。

---

## 5. V1 目标

V1 必须实现：

0. Contract-first Runtime Skeleton：API / Event / State / Tool / Budget / Error / ID / SSE 合同先于 AgentCore 实现。
1. 可在 Chrome 中安装的页面内 AI 助手插件。
2. 当前网页上下文识别与提取。
3. 基于当前网页的摘要生成。
4. 基于当前网页的问答。
5. Mermaid 思维导图生成与前端预览。
6. 本地小参数模型实现用户意图识别。
7. 网页内 AI 双轨面板支持基础文字对话，不依赖语音即可完成 V1 主流程。
8. 本地可微调模型用于思维导图生成。
9. AgentCore 采用可替换 CoreProvider 策略，V1.2 首选 `piAgentProvider`，并以 `MockCoreProvider` 支撑合同测试和 fallback。
10. 不直接接 MCP / Skill / 长期记忆管理；V1.2 只允许通过 D 模块定义轻量 Adapter 合同，不允许绕过 D Adapter Layer 和治理钩子。
11. 单 Session 聊天历史高质量持久化。
12. Agent 状态机可视化、可验证、可观测、可扩展。
13. Agent 具备预算、权限、上下文和本地文件访问监督机制。

V1 前端交互必须实现：

- 页面边缘可移动悬浮球。
- 悬浮球 hover 高亮与伸出小长条。
- 点击小长条后展开网页内 AI 双轨聊天面板。
- 窄距展开态默认约 `440px`，网页内容向左挤压。
- 半屏展开态约 `50vw`，网页继续被挤压。
- 超过 `52vw` 后进入覆盖式显示，最大覆盖宽度不超过 `80vw`。
- 拖回 `<48vw` 后恢复挤压式。
- 点击悬浮球或收起按钮后，面板收起，网页恢复原始布局。

V1.x 可选增强：

- 已部署 FunASR 后端语音识别接入。
- 语音 transcript 作为普通 user message 进入 AgentCore。

### 5.1 V1.1 前端体验高保真目标

V1.1 是 V1.0 之后的体验质量阶段，不改变 Runtime / AgentCore / API / Event / ToolResult / PageContext 合同。V1.1 的目标是把 V1.0 已打通的页面内悬浮球与 AI 双轨面板，从“功能闭环 + 交互骨架”升级为可对照 Figma 原型验收的高保真前端体验。

V1.1 必须实现的体验目标：

- 高保真还原 Figma Make 原型表达的“浏览器页面 + 浮动球 + 侧边插件面板 + 聊天区域”样式。
- 将当前工程型注入面板升级为设计系统化、组件语义清晰、可截图验收的前端界面。
- 保留 V1.0 已完成的 PageContext、Runtime 连接、SSE Chat、Mermaid Artifact、Session restore、push / overlay / resize / collapse recovery 行为。
- 引入视觉验收口径：Figma 对照、真实 Chrome、Playwright 截图基线、PRD A-F 状态截图。

V1.1 明确不做：

- 不新增 Runtime API。
- 不修改 AgentEvent / ToolResult / PageContext 合同。
- 不引入 MCP、Skill、RAG、多 Agent、浏览器自动操作。
- 不用 Chrome Side Panel 替代页面内悬浮球与网页内面板验收。
- 不在缺少 Figma 截图或普通 Figma `/design/` 节点基线时声明“视觉高保真通过”。

### 5.2 V1.2 AI 伴读架构分工目标

V1.2 仍处于文档开发阶段，目标是冻结“聊天”页签的 A/B/C/D 模块分工、工作区边界和 Adapter 合同，使后续多个 Codex 终端可以独立开发：

- A：网页信息提取、过滤、蒸馏与结构化总结。
- B：结构化数据、流式文本和 Mindmap 前端实时渲染。
- C：基于结构化网页 JSON 的 Mindmap 生成与反跳来源。
- D：CoreProvider + Adapter Layer，负责可替换 Agent Core 适配、MCP / Skill / API Adapter 编排、治理桥和 ToolResult / Artifact / Event / Trace 映射。

V1.2 允许：

- 定义轻量 MCP / Skill / API Adapter 合同。
- 单 Session 连续上下文和 checkpoint。
- 结构化网页 JSON、段落标注和 source map。
- Mindmap 节点反跳到源 paragraph/chunk。
- 使用 `MockCoreProvider` 做合同测试和自动化 fallback。
- 将 `piAgentProvider` 作为首选 Agent Core Provider，但真实接入前必须锁定 piAgent 仓库、版本或 commit、license、运行时和工具调用模型。

V1.2 明确不做：

- 真实高风险 MCP / Skill side effect 默认执行。
- 长期记忆。
- RAG。
- 多 Agent。
- 浏览器自动操作。
- 默认本地文件读取。
- 前端绕过 D 直接调用外部服务。
- piAgent 或其他 CoreProvider 直接写 `ArtifactRecord`、SSE、EventStore、Trace 或 UI。

---

## 6. V1 非目标

V1 明确不做：

- 完整个人知识库。
- 自动保存所有网页。
- 多网页 RAG。
- 长期记忆管理。
- MCP 直连；V1.2 仅允许通过 D 模块定义受控 Adapter 合同。
- Skills 直连；V1.2 仅允许通过 D 模块定义受控 Adapter 合同。
- 多 Agent 编排。
- 浏览器自动点击和自动操作。
- 深度研究。
- PPT 生成。
- 观赛 / 观影 / 直播实时理解。
- 桌面宠物。
- 云端账号系统。
- 移动端同步。
- 默认读取本地文件。
- 划词菜单、网页内右键菜单、全局搜索框、多窗口停靠等复杂入口。

---

## 7. 用户画像

### 7.1 研究型阅读用户

经常阅读文章、论文、技术博客、产品文档，希望快速理解并追问细节。

典型问题：

- 这篇文章讲了什么？
- 核心观点有哪些？
- 这段话什么意思？
- 能不能生成一张思维导图？
- 这篇文章对我的项目有什么启发？

### 7.2 开发者 / 产品经理

经常浏览技术文档、GitHub README、产品说明、竞品页面。

典型问题：

- 总结这个项目的架构。
- 这个 API 怎么用？
- 帮我把这篇文档整理成开发计划。
- 生成 Mermaid mindmap。

### 7.3 知识管理用户

希望将浏览内容逐步沉淀为个人知识资产。V1 先关注 Session 质量，V2 再做长期知识库。

典型需求：

- 保存这次阅读上下文。
- 下次打开还能看到这次 Session。
- 保留生成的摘要和思维导图。

---

## 8. 核心用户故事

### 8.1 网页伴读摘要

作为用户，我打开一篇文章后，希望通过网页边缘悬浮球展开 AI 面板并点击“总结”，AI 能基于当前网页生成结构化摘要，而不需要我复制粘贴正文。

验收：

- 能显示当前网页 title / url / domain。
- 能抽取正文或可用文本。
- 能生成 TL;DR / 结构化摘要 / 要点式摘要。
- 摘要 Artifact 写入 Session。

### 8.2 当前网页问答

作为用户，我希望直接问“这篇文章里的主要论点是什么”，系统能基于当前网页回答。

验收：

- 用户输入进入 AgentCore。
- IntentRouter 识别 `ask_page`。
- 调用 `answer_from_page` 工具。
- 回答能追踪到 pageRef / chunkRef。
- 当前网页没有足够信息时，应明确说明不足。

### 8.3 选区解释

作为用户，我希望选中网页中的一段内容并让 Navia 解释。

验收：

- Content Script 能读取 selectedText。
- IntentRouter 识别 `explain_selection`。
- 回答优先基于选区和附近上下文。

### 8.4 Mermaid 思维导图

作为用户，我希望一键把当前网页转成 Mermaid mindmap 并预览。

验收：

- 后端生成 Mermaid mindmap 源码。
- Mermaid 语法可渲染。
- 节点层级和数量受限。
- 校验失败自动修复一次。
- 修复失败返回可读错误。

### 8.5 语音输入

语音输入是 V1.x 增强能力，不阻塞 V1 complete 的 Chrome 文字对话验收。

作为用户，我希望点击麦克风，用语音提问当前网页。

验收：

- 浏览器采集音频。
- 后端调用 FunASR 返回 transcript。
- transcript 作为 user message 进入 Session。
- AgentCore 按普通文本输入处理。

### 8.6 可观测 Agent

作为开发者，我希望看到 Agent 当前状态、工具调用、预算消耗和事件流。

验收：

- 前端或调试面板能看到状态流。
- 每次状态迁移写 EventLog。
- `/v1/agent/state-machine/mermaid` 输出状态图。
- `/v1/sessions/{session_id}/trace` 输出本次 Session 追踪。

---

## 9. 功能需求

### 9.1 Chrome Extension

#### 页面内交互 Shell

前端页面体验必须完全对齐 `PRD/窗口交互_PRD.md`。

必须支持：

- 页面边缘 AI 悬浮球。
- 悬浮球上下拖动与贴边。
- hover 高亮和伸出小长条。
- 点击小长条展开网页内 AI 面板。
- 左轨悬浮球 / avatar。
- 右轨 Chatbox。
- 窄距 `440px` 挤压网页。
- 半屏 `50vw` 挤压网页。
- 超过 `52vw` 覆盖网页，最大 `80vw`。
- 拖回 `<48vw` 恢复挤压式。
- 面板左边界 resize handle。
- 点击悬浮球或收起按钮关闭面板并恢复网页布局。
- Chatbox。
- 当前页面信息。
- 摘要卡片。
- Mermaid mindmap 预览。
- 语音输入按钮。
- Agent 状态。
- 当前预算消耗。
- 错误与重试入口。

Chrome Side Panel 允许保留为内部调试或兼容入口，但不得替代 V1 页面内交互验收。

约束：

- UI 不直接调用模型。
- UI 不保存 Agent 核心状态。
- UI 只调用 Local Runtime API。
- 网页内面板通过 SSE 消费 `/v1/chat/stream`；Agent events 后续可复用 SSE 或扩展 WebSocket。

#### Content Script

必须支持：

- 读取 title / url / domain。
- 抽取 headings。
- 抽取 visibleText。
- 抽取 selectedText。
- 生成 cleanedText。
- 计算 contentHash。
- 发送 PageContext 到 Local Runtime。

V1 优先支持：

- 普通文章页。
- 博客页。
- 新闻页。
- 技术文档页。
- GitHub README 类页面。
- 产品介绍页。

暂不保证：

- PDF 完整解析。
- Canvas 渲染内容。
- 视频字幕。
- iframe-heavy 页面。
- 登录态复杂应用。

### 9.2 Local Headless Runtime

必须提供：

- HTTP API。
- `/v1/chat/stream` 使用 SSE；Agent events 可先用 SSE，ASR 保留 WebSocket 扩展点。
- SessionStore。
- EventLog。
- AgentCore。
- ToolRegistry。
- ModelAdapter。
- Governance Plane。
- Observability Plane。

基础 API：

```text
GET  /v1/health
GET  /v1/models/status
POST /v1/sessions
GET  /v1/sessions/{session_id}
POST /v1/page/context
POST /v1/chat/stream
POST /v1/page/summarize
POST /v1/page/mindmap
WS   /v1/asr/stream
WS   /v1/agent/events
GET  /v1/agent/state
GET  /v1/agent/state-machine/mermaid
GET  /v1/sessions/{session_id}/trace
```

运行约束：

- 默认只监听 localhost。
- 默认只绑定 `127.0.0.1`，不得监听 `0.0.0.0`。
- CORS / Origin allowlist 只允许 Chrome extension origin 和明确配置的 localhost dev origin。
- 普通日志不得打印完整网页正文、选区全文或 transcript 全文。
- 默认不暴露公网。
- 默认不读取本地文件。
- 默认不调用远程模型，除非显式配置。
- 所有工具调用必须通过 Governance Plane。

### 9.3 AgentCore

V1 AgentCore 采用可替换 CoreProvider 策略。V1.2 首选 `piAgentProvider`，但 piAgent 不得直接写 Navia 的 Artifact、SSE、EventStore、Trace 或 UI；所有 Core 输出必须经 D Adapter Layer 映射为 Navia 合同。真实接入前必须完成 piAgent 仓库、版本或 commit、license、运行时和工具调用模型锁定。

保留：

- Agentic Loop。
- Tool Registry。
- Message History。
- Event Stream。
- State Management。
- PreToolUse / PostToolUse Hook。
- Budget Control。
- Permission Gate。
- Trace。

不接入：

- MCP。
- Skills。
- 长期记忆。
- 多 Agent。
- Shell 执行。
- 自动文件系统搜索。
- 自动浏览器操作。

### 9.4 Intent Router

支持意图：

```text
summarize_page
ask_page
explain_selection
generate_mindmap
extract_key_points
voice_command
unknown
```

输出格式：

```json
{
  "intent": "summarize_page",
  "confidence": 0.91,
  "requires_page_context": true,
  "requires_selection": false,
  "tool": "summarize_page",
  "arguments": {
    "style": "structured"
  }
}
```

策略：

- V1 可先用 rule-based + local small model。
- JSON schema 校验必须存在。
- confidence 低时进入 fallback，不应盲目调用高成本工具。

### 9.5 工具清单

V1 默认允许：

```text
read_current_page
summarize_page
answer_from_page
explain_selection
generate_mindmap
asr_transcribe
```

V1 默认禁用：

```text
read_local_file
search_local_workspace
shell
browser_click
browser_automation
network_crawl
```

### 9.6 单 Session 管理

V1 不做长期记忆，但必须把单 Session 做实。

质量要求：

- 刷新网页或重新展开网页内面板后 Session 不丢。
- 每轮问答能追溯到 PageContext。
- 每次工具调用可追踪。
- 每个 Artifact 可追溯到来源网页。
- 长对话支持 checkpoint 压缩。
- 预算消耗进入 budget ledger。
- EventLog 可重建一次 turn。

---

## 10. 非功能需求

### 10.1 隐私

- 默认本地运行。
- 默认不读取本地文件。
- 默认不自动保存所有网页。
- 页面内容只在用户打开插件或触发操作时进入 Runtime。
- 外部模型调用必须明确配置。
- 用户可清空 Session。

### 10.2 性能目标

- 悬浮球首次注入时间 < 1s。
- 网页内 AI 面板展开时间 < 1s。
- 普通文章 PageContext 抽取 < 2s。
- Intent 检测 < 1s。
- 摘要首 token 延迟 < 5s。
- Mindmap 生成 < 20s。
- ASR 短语音转写 < 5s。

### 10.3 可用性

- Local Runtime 不可用时，插件提示启动本地服务。
- 模型不可用时，展示模型状态。
- FunASR 不可用时，禁用语音按钮。
- Mermaid 渲染失败时展示源码和错误。

### 10.4 可扩展性

- Chrome Extension、Web、App 共用 Runtime API。
- AgentCore 与模型解耦。
- AgentCore 与工具解耦。
- Session Plane 可升级为 V2 Memory Plane。
- Governance Plane 可升级为 V4 Approval / Task Safety Gate。

### 10.5 可测试性

- 状态机 transition table 可测试。
- Tool call 可 mock。
- Model adapter 可 mock。
- Session replay 可测试。
- Event schema 可测试。
- Budget exhaustion 可测试。
- Permission denial 可测试。

---

## 11. 成功指标

V1 成功不是功能数量，而是底座质量。

### 用户价值指标

- 用户可在当前网页内嵌 AI 面板完成摘要、问答、mindmap。
- 用户不需要复制粘贴正文。
- 用户能看到 Agent 正在做什么。
- 用户能控制是否继续高成本操作。

### 工程质量指标

- 状态机可视化。
- 事件流可追踪。
- 单 Session 可恢复。
- 工具调用有预算和权限监督。
- Runtime API 可被 Chrome/Web/App 复用。

---

## 12. V1 结论

V1 的核心原则：

```text
先做可控 Agent，再做聪明 Agent。
先做单 Session 质量，再做长期记忆。
先做 Headless Runtime，再做多端 UI。
先做状态机和监督，再做复杂任务执行。
```
