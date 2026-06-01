# Navia / 伴航项目上手总览图谱

版本：V1.0 项目上手图谱基线  
日期：2026-05-31  
配套图谱：[`09-project-onboarding-map.drawio`](09-project-onboarding-map.drawio)

---

## 1. 文档目标

本文档面向新加入 Navia / 伴航项目的开发者，用一份 Markdown 说明和一份 Draw.io 多页图谱快速解释：

- 项目为什么存在。
- V1 的目标架构是什么。
- V1.0-A 到 V1.0-H 如何分阶段开发。
- V1 complete 的验收标准是什么。
- V1-V5 的产品里程碑如何演进。

当前项目仍处于规划阶段。本文件不代表已有代码实现完成，所有状态以 `01-prd.md`、`02-architecture.md`、`03-development-plan.md`、`04-acceptance-plan.md` 为准。

---

## 2. 一句话定位

Navia / 伴航是一个 Chrome 插件优先的本地伴随式 AI 助手：前端是 Side Panel Chatbox，核心是可复用、可观测、可监督的 Local Headless Runtime。V1 先打穿当前网页伴读闭环，V2-V5 再演进到个人知识库、观赛观影陪伴、个人秘书、多端云化和桌宠情绪价值。

---

## 3. Draw.io 图谱结构

`09-project-onboarding-map.drawio` 包含 4 个中文页面：

| 页面 | 用途 | 适合回答的问题 |
|---|---|---|
| `01 目标架构` | V1 目标架构总览 | 系统由哪些平面组成？前端、Runtime、AgentCore、模型和治理如何交互？ |
| `02 V1开发计划大纲` | V1.0-0 到 V1.0-H 阶段路线 | 当前先做什么？每一阶段交付什么？哪些范围暂不进入首轮？ |
| `03 V1验收计划` | V1 Go / No-Go / E2E / 回归验收 | 什么条件下可以声明 V1 complete？哪些情况必须 No-Go？ |
| `04 V1-V5里程碑` | 全项目周期里程碑 | 从网页伴读到个人秘书、移动端、云化和桌宠如何演进？ |

Draw.io MCP 已注册为 `drawio`：

```text
codex mcp add drawio -- npx -y @drawio/mcp
```

当前会话的工具列表不会热更新，因此本次使用标准 diagrams.net XML 方式落盘 `.drawio` 文件。新开 Codex 会话后可通过 `codex mcp list` 确认 `drawio` MCP 已启用。

---

## 4. 目标架构速读

V1 架构不是“插件 + 模型调用”，而是一个受控的本地 AI Runtime：

- Interface Plane：Chrome Side Panel / Web / App Shell，只作为交互壳。
- Context Plane：当前网页、选区和可选语音 transcript，负责把浏览上下文变成结构化输入。
- Session Plane：单 Session 历史、Artifact、ToolCall、BudgetLedger、Trace。
- Agent Runtime Plane：单 Agent、单 Session、状态机驱动的 AgentCore。
- Model Plane：Intent、Mindmap、LLM 和可选 FunASR 都通过 Adapter 接入。
- Governance Plane：预算、权限、上下文、本地文件访问、审批统一监督。
- Observability Plane：AgentEvent、状态迁移、Trace、Mermaid 状态图、预算指标。

V1 当前已锁定：

- Local Runtime 主栈使用 Python，建议 FastAPI 风格 API Gateway。
- Chrome 插件采用 WXT + React + TypeScript。
- 首轮底座实施只覆盖 V1.0-0/A/B/C，不创建 Chrome 插件工程，不接 FunASR，不接真实本地模型。
- V1 complete 必须继续完成 Chrome 插件安装、Side Panel Chatbox 和当前网页基础文字对话。
- 审计后采用 `Go, but contract-first`：先冻结 API/Event/State/Tool/Budget/Error/ID/SSE 合同，再写 AgentCore。
- 后续每个子阶段必须先生成 stage-gate 文档，完成 PRD 规格检视、开发计划、验收标准和预审计；闭环所有致命或重大风险后才允许实质开发。

---

## 5. V1 开发计划大纲

V1 分为 8 个阶段：

| 阶段 | 目标 | 核心交付物 | 验收重点 |
|---|---|---|
| V1.0-0 | 合同冻结与 Runtime Skeleton | API envelope、ErrorCode、State/Event/Tool/Budget schema、ID 规则、SSE 协议、EventStore/EventStream 接口 | schema validation 通过，SSE 与 ToolResult 合同固定 |
| V1.0-A | AgentCore Baseline | Python Runtime、SessionStore、ToolRegistry、EventBus、rule-based IntentRouter | 能完成一轮 `user -> intent -> tool -> response` |
| V1.0-B | 状态机与可观测 | Transition Table、Trace API、Mermaid 状态图、非法迁移拒绝 | 状态迁移由代码生成和验证，Trace 可追踪 |
| V1.0-C | Governance / Budget Supervisor | Budget、Permission、Context、FileQuery、Approval Gate | 工具调用前后受监督，本地文件默认拒绝 |
| V1.0-D | Chrome 插件与 PageContext | WXT Side Panel、Background、Content Script、PageContext API | 当前网页 title/url/domain/headings/cleanedText 可进入 Runtime |
| V1.0-E | 网页伴读工具 | 摘要、问答、选区解释、Mermaid mindmap、ArtifactRecord | 三个核心伴读工具可用，Artifact 可追踪来源 |
| V1.0-F | 语音输入增强，可选 | 录音按钮、ASR stream、FunASRAdapter、Transcript Artifact | 语音转写后按普通 user message 进入 AgentCore，不阻塞文字对话主链路 |
| V1.0-G | Session 质量与恢复 | SQLite schema、Message/ToolCall/Artifact/BudgetLedger、Checkpoint | 侧边栏刷新后 Session 不丢，Trace 可导出 |
| V1.0-H | Closure / Regression / Documentation | 全链路 smoke、状态机/治理/插件验收、限制说明、Final V1 report | 只能声明 V1 当前网页伴读 MVP ready |

首轮底座只做 V1.0-0/A/B/C。不要提前实现 V2 知识库、RAG、MCP、Skill、多 Agent、浏览器自动操作、深度研究、PPT、桌宠或云化。

注意：首轮底座不等于 V1 complete。V1 结束时必须能在 Chrome 中安装插件并完成当前网页基础对话。

每个阶段都必须执行阶段门禁：

```text
PRD 规格检视
-> 单独开发计划与验收标准
-> 预审计
-> 闭环致命/重大风险
-> 实质开发
-> 真实数据 E2E 验收
-> PRD 规格复检
-> 放行或打回
```

---

## 6. V1 验收计划

V1 complete 必须能跑通：

```text
当前网页 -> PageContext -> AgentCore -> Intent -> Tool -> Response/Artifact -> Session/Trace
```

Go 条件摘要：

- V1.0-0 合同冻结通过。
- Chrome 插件可通过 `Load unpacked` 安装。
- Chrome Side Panel 可打开。
- Side Panel Chatbox 可完成文字对话。
- 当前网页上下文可进入 Runtime。
- AgentCore 能完成单 Session 对话。
- 用户可以基于当前网页提问并收到回答。
- 摘要、问答、Mindmap 三个核心工具可用。
- 状态机、EventLog、Trace、Budget、Permission 都可观察和可验证。
- 默认不读取本地文件。
- Session 刷新不丢。
- API / 数据模型 / 文档同步。
- 每个 chat turn 有 `turn_id`。
- 每个 tool call 经过 PreToolUse / PostToolUse。
- 每个工具返回 ToolResult envelope。
- EventStore 与 EventStream 分离。
- 每个阶段有 stage-gate 文档、真实数据验收报告和 PRD 规格复检结论。

核心模块验收：

| 模块 | 必须通过 |
|---|---|
| Local Runtime | `/v1/health`、`/v1/models/status`、session 创建与读取 |
| 合同 | API envelope、ErrorCode、State/Event/Tool/Budget schema、ID 规则、SSE 协议 |
| Session Plane | user / assistant / tool / event message 可持久化，可导出 trace |
| State Machine | Transition Table 存在，非法迁移拒绝，Mermaid 图由代码生成 |
| Observability | state、trace、event stream、tool/model/artifact event 可观察 |
| Governance | TurnBudget 生效，权限默认拒绝高风险工具，本地文件默认 deny |
| Chrome Extension | Side Panel 可打开，Runtime 不可用时提示，状态与预算可展示 |
| PageContext | title/url/domain/headings/selectedText/cleanedText/contentHash 可提交 |
| 伴读工具 | 摘要、问答、选区解释、Mindmap 可用且可追踪来源 |
| 语音输入，可选 | 如果启用，语音可转写为 transcript 并进入 Session；未启用不阻塞 V1 complete |

No-Go 条件摘要：

- Agent 状态只存在前端或 extension background worker。
- 工具调用绕过 Governance。
- 本地文件读取默认开启。
- 超预算后继续自动执行。
- Mermaid 失败后无限重试。
- Session 无法恢复。
- 状态机非法迁移不报错。
- PR 把 MCP / Skill / 长期记忆 / 多 Agent 作为 V1 必需项引入。
- 只有实时事件、没有持久化 EventStore。
- 工具直接返回自由文本而非 ToolResult envelope。
- `/v1/chat/stream` 未固定为 SSE。

E2E 验收场景：

1. 网页摘要：打开文章后点击总结，前端展示 SummaryArtifact，Trace 可见完整事件流。
2. 网页问答：用户基于当前网页提问，回答引用当前 PageContext，不联网、不读本地文件。
3. 思维导图：生成 Mermaid mindmap，渲染成功；失败时最多 repair once。
4. 插件基础对话：Chrome 安装插件，打开 Side Panel，基于当前网页文字对话并收到回答。
5. 语音提问，可选：FunASR 返回 transcript，后续流程与 typed message 一致。
5. 预算限制：超出工具调用预算后进入 `budget_exhausted`，不继续执行。
6. 本地文件访问拒绝：`read_local_file` 默认 deny，并记录拒绝事件。

---

## 7. 全项目周期 V1-V5 里程碑总结

| 版本 | 项目目标 | 关键产物 |
|---|---|---|
| V1 | 网页伴读 Companion + Headless Local AgentCore | 可安装 Chrome Side Panel、Local Runtime、单 Session AgentCore、基础文字对话、摘要/问答/Mindmap |
| V2 | 本地备忘 / 个人知识库 / 标签化总结 / 类 RAG 蒸馏 | Memory Plane、Knowledge Store、Tagging、蒸馏与可视化管理 |
| V3 | 伴随式观赛 / 观影 / 看直播体验 | 视频/直播上下文、字幕/事件理解、伴随式交互 |
| V4 | 个人秘书 / 深度研究 / PPT 生成 / Manus-like Agent 能力 | Task Agent、Research Workflow、PPT Artifact、审批与任务安全门 |
| V5 | 移动端迁移 / 云化部署 / 产品化改造 / 桌面宠物情绪价值 | Mobile/App、Cloud Sync、产品化账号体系、桌宠角色体验 |

演进原则：

- V1 先验证可控 AgentCore 和当前网页伴读闭环。
- V2 才把 Session 资产升级为长期知识资产。
- V3 在已有上下文和知识能力上扩展到视频 / 直播场景。
- V4 在 Governance 和 Memory 基础上扩展到任务执行、研究和 PPT Artifact。
- V5 再做移动端、云化、多端同步和桌宠产品化体验。

---

## 8. 新开发者推荐阅读路径

1. 先读 [`README.md`](README.md)：了解项目命名、边界、当前规划决策。
2. 再读 [`01-prd.md`](01-prd.md)：理解产品目标、用户故事、V1-V5 路线。
3. 再读 [`02-architecture.md`](02-architecture.md)：理解七个设计平面和 AgentCore 边界。
4. 再读 [`03-development-plan.md`](03-development-plan.md)：确认阶段拆分和首轮 V1.0-0/A/B/C 范围。
5. 再读 [`04-acceptance-plan.md`](04-acceptance-plan.md)：明确 Go / No-Go gate 和 E2E 验收。
6. 最后读 [`06-api-contract.md`](06-api-contract.md) 与 [`07-data-models.md`](07-data-models.md)：对齐 API、事件和数据结构。
