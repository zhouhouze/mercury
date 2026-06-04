# Navia / 伴航 V1 开发计划大纲

版本：V1.0 Development Plan Baseline
日期：2026-05-31

---

## 1. 开发总原则

V1 开发必须坚持：

```text
先底座，后 PRD 页面内体验。
先可控，后智能。
先单 Session，后长期记忆。
先 Headless Runtime，后多端 UI。
先状态机和监督，后复杂任务执行。
```

V1 不允许在开发过程中临时扩大到：

- MCP。
- Skill。
- 长期记忆。
- 完整 RAG。
- 多 Agent。
- 浏览器自动操作。
- 本地文件默认搜索。
- 深度研究。
- PPT 生成。
- 桌面宠物。

V1 后续开发必须执行阶段门禁：

- 每个子阶段开始前，先基于总 PRD 制定单独开发计划和验收标准。
- 每个子阶段开始前，必须输出审计意见，并闭环所有致命或重大规格偏差和 false-green 风险。
- 每个子阶段完成后，必须使用真实数据完成端到端验收。
- 每个子阶段完成后，必须做 PRD 规格复检。
- 验收失败时不得进入下一阶段，必须打回开发计划阶段重新思考并执行。
- Codex 自动完成开发、验收、审计和文档同步；人类只处理高风险确认。

---

## 2. 阶段总览

```text
V1.0-0：Contracts & Runtime Skeleton
V1.0-A：AgentCore Baseline
V1.0-B：状态机与可观测
V1.0-C：Governance / Budget Supervisor
V1.0-D：Chrome 插件页面内交互壳与 PageContext
V1.0-E：网页内 AI 双轨面板与伴读工具
V1.0-F：PRD A-F 布局状态与 Resize
V1.0-G：Session 质量与恢复
V1.0-H：V1 Closure / Regression / Documentation
```

### 2.1 首轮规划落地范围

当前项目仍处于规划阶段，第一轮只要求落盘设计文档，不创建工程代码。

首轮底座实施计划锁定为 V1.0-0/A/B/C：

- V1.0-0：Contracts & Runtime Skeleton，冻结 API / Event / State / Tool / Budget / Error / ID 合同。
- V1.0-A：Contract-First Python Local Runtime + AgentCore 最小闭环。
- V1.0-B：完整状态机、事件流、Trace、Mermaid 状态图。
- V1.0-C：Budget / Permission / Context / File Query / Approval 的治理底座。

这不是 V1 complete 的范围。V1 complete 必须继续完成 V1.0-D/E/F/G，并交付一个可在 Chrome 浏览器安装的插件形态，让用户在普通网页内通过悬浮球展开 AI 双轨面板，基于当前网页进行基础文字对话。

首轮底座暂不进入 V1.0-D/E/F/G：

- 不创建 Chrome 插件工程，但记录 WXT + React + TypeScript + Content Script 注入式页面内交互为 V1 插件基线。
- 不接 FunASR；语音输入不阻塞 Chrome 文字对话主链路。
- 不接真实本地模型。
- 不实现 Mindmap 模型。
- 不做长期记忆、RAG、MCP、Skill、多 Agent、浏览器自动操作、桌宠或云化。

### 2.2 V1 complete 的用户可见目标

V1 结束时，用户必须能在自己的 Chrome 浏览器中完成：

```text
安装 Navia Chrome 插件
-> 打开任意网页
-> 页面边缘出现可移动悬浮球
-> hover 悬浮球出现小长条
-> 点击小长条展开网页内 AI 双轨面板
-> 插件连接 127.0.0.1 Local Runtime
-> Runtime 接收当前网页 PageContext
-> 用户输入自然语言问题
-> AgentCore 基于当前网页返回基础回答或摘要
-> 对话、工具调用、事件和结果可在 Session Trace 中追踪
```

V1 的最低可演示能力：

- Chrome 插件可通过 unpacked extension 方式安装。
- 页面内悬浮球默认态、hover 态、展开态、半屏态、覆盖态、收起态必须可验证。
- 网页内 AI 面板可展示 Runtime 连接状态。
- Runtime 未启动时，网页内 AI 面板必须给出明确提示。
- 用户可以进行文字对话，不依赖语音。
- 当前网页的 `title`、`url`、`domain`、`headings`、`cleanedText` 可进入 Runtime。
- 至少支持“总结这篇文章”和“基于当前页面回答问题”两类对话。
- 每次对话都产生 `session_id`、`turn_id`、AgentEvent、ToolCallRecord 和 Trace。
- 默认不读取本地文件，不联网搜索，不执行浏览器自动操作。

### 2.3 阶段门禁总流程

每个 V1 子阶段都必须产生独立 stage-gate 文档：

```text
docs/navia_v1_project_docs/stage-gates/v1.0-x-<stage-name>.md
```

阶段执行顺序固定为：

```text
PRD 规格检视
-> 单独制定开发计划和验收标准
-> 预审计
-> 闭环致命/重大审计意见
-> 实质开发
-> 真实数据端到端验收
-> PRD 规格复检
-> 阶段放行或打回
```

如果预审计或验收复检发现重大偏差、致命风险或虚假验收风险，必须停止进入下一阶段，并找人类确认或回到开发计划阶段修正。

---

## 3. V1.0-0：Contracts & Runtime Skeleton

### 3.1 目标

在写业务 loop 之前冻结 V1 最小合同，避免 V1.0-A 先写临时结构、V1.0-B/C 再返工。

### 3.2 范围

必须定义：

- API response envelope。
- ErrorCode enum。
- State enum。
- Transition table schema。
- AgentEvent envelope。
- Session / Turn / Message schema。
- ToolSpec / ToolCallRecord / ToolResult schema。
- BudgetLedger / BudgetCost / TurnBudget schema。
- ID 生成与关联规则。
- `/v1/chat/stream` SSE event protocol。
- EventStore 与 EventStream 接口边界。
- Store interface，包括 SessionStore、EventStore，可先有 InMemory 实现。

必须明确：

- 一个 user message 触发一个 turn。
- 每个 turn 必须有 `turn_id`、`trace_id`、`request_id`。
- 每个 tool call 必须关联 `session_id`、`turn_id`。
- 每个 artifact 必须关联 `turn_id` 和 `tool_call_id`，并有 `source_page_id` 或明确 `source=null`。
- 执行中事件必须关联 `turn_id`。
- `/v1/chat/stream` 在 V1 使用 SSE，返回 `text/event-stream`。
- `EventStore` 用于持久化 trace/replay，`EventStream` 用于实时推送 UI，二者不得合并成单一临时流。

暂不实现：

- 真实网页抽取。
- 真实模型调用。
- Chrome 插件。
- 完整审批 workflow。
- SQLite 复杂恢复。

### 3.3 交付物

- Contract definitions。
- 最小 Runtime skeleton。
- Schema validation tests。
- State transition table 的最小可生成 Mermaid 输出。
- API envelope / error / SSE 示例。

### 3.4 验收

- 所有 schema 有基础单测或 schema validation。
- 示例 AgentEvent 可通过 schema validation。
- 示例 ToolResult 可通过 schema validation。
- 示例 API success/error envelope 可通过 schema validation。
- Mermaid 状态图可由 transition table 生成空图或基础图。
- `/v1/chat/stream` 的 SSE 事件格式被文档和测试固定。

---

## 4. V1.0-A：Contract-First AgentCore Baseline

### 4.1 目标

建立 Local Runtime 和 AgentCore 最小闭环。

实现基线：

- Runtime 主栈为 Python。
- API Gateway 建议采用 FastAPI 风格实现。
- V1.0-A 先用 rule-based IntentRouter，保留 ModelAdapter 接口。
- 存储可先使用内存实现验证合同，但接口必须可替换为 SQLite / JSONL EventLog。
- AgentCore 一轮最小 loop 必须通过 `StateMachine.transition()` 执行，不允许在 `TurnRunner` 里手写临时状态字符串。
- ToolExecutor 从第一天就必须经过 `PreToolUse` / `PostToolUse` hook；A 阶段可用安全 mock tool 的 DefaultAllowPolicy 和高风险工具 DefaultDenyPolicy。
- `EventStore` 和 `EventStream` 必须同时有接口；A 阶段实现可先用 InMemory / JSONL。

### 4.2 范围

必须实现：

- Local Runtime 启动。
- `/v1/health`。
- `/v1/models/status`。
- `/v1/sessions`。
- `/v1/chat/stream` SSE。
- SessionStore 最小实现。
- MessageStore 最小实现。
- EventStore 最小实现。
- EventStream 最小实现。
- ToolRegistry 最小实现。
- StateMachine 主路径最小实现。
- PreToolUse / PostToolUse 空实现。
- IntentRouter mock / rule-based。
- AgentCore 一轮最小 loop。
- AgentEvent 最小输出。
- Mock `summarize_page` / `answer_from_page` 工具。

暂不实现：

- Chrome 插件。
- FunASR。
- 真正本地模型。
- Mindmap 模型。
- 长页面 chunk。
- 完整异常路径。
- 完整 BudgetSupervisor。

### 4.3 交付物

- `services/local-runtime` 可运行。
- `AgentRuntime`。
- `AgentLoop`。
- `SessionStore`。
- `EventStore`。
- `EventStream`。
- `EventBus`。
- 最小 `StateMachine`。
- 最小 governance hooks。
- 基础单元测试。

### 4.4 验收

- Runtime 可启动。
- 可创建 session。
- 可写入 user / assistant / tool / event message。
- 可执行一轮 `user -> intent -> tool -> response`。
- 可输出 AgentEvent 流。
- 一轮 chat 必须产生 `turn_id`。
- `/v1/chat/stream` 必须输出 `state.transition`、`intent.detected`、`tool.started`、`response.delta`、`response.done`。
- Trace API 能看到同一个 turn 的事件。
- ToolExecutor 不能绕过 PreToolUse。
- `read_local_file`、`shell`、`browser_automation` 等高风险工具在 A 阶段默认 deny。

---

## 5. V1.0-B：状态机与可观测

### 5.1 目标

Agent 状态机成为正式 runtime contract。

### 5.2 范围

必须实现：

- StateMachine。
- TransitionTable。
- Mermaid renderer。
- 非法 transition 拒绝。
- `INVALID_TRANSITION` error。
- `state.transition` event。
- AgentEvent schema validation。
- Trace export。
- Mermaid graph snapshot test。
- `/v1/agent/state`。
- `/v1/agent/state-machine/mermaid`。
- `/v1/sessions/{session_id}/trace`。

### 5.3 状态路径

主路径：

```text
idle -> observing_page -> waiting_user -> detecting_intent -> planning -> budget_checking -> running_tool -> validating_result -> streaming_response -> persisting_turn -> waiting_user
```

异常路径：

```text
intent_unknown -> fallback_reply -> persisting_turn
budget_exceeded -> budget_exhausted -> persisting_turn
tool_failed -> error -> waiting_user
result_invalid -> repairing_result -> streaming_response/error
```

### 5.4 交付物

- 状态机代码。
- Mermaid 状态图输出。
- Event schema。
- Trace API。
- 状态机测试。
- Event schema validation tests。
- Trace export tests。

### 5.5 验收

- Transition table 存在。
- 非法 transition 被拒绝。
- 每个 transition 产生 event。
- Mermaid 图由代码生成。
- 测试覆盖主路径和异常路径。
- 非法 transition 必须返回或抛出 `INVALID_TRANSITION`。
- Mermaid 图和 transition table 一致。
- Trace 可按 `turn_id` 过滤。

---

## 6. V1.0-C：Governance / Budget Supervisor

### 6.1 目标

先把 Agent 管住，防止工具、上下文、token 消耗失控。

### 6.2 范围

必须实现：

- BudgetSupervisor。
- ToolPermissionSupervisor。
- ContextSupervisor。
- FileQuerySupervisor 默认关闭。
- ApprovalGate 最小实现。
- PreToolUse hook。
- PostToolUse hook。
- BudgetLedger。
- Budget check 必须发生在 `tool.started` 前。
- Permission check 必须发生在 `tool.started` 前。
- `approval_required` 只产生事件和记录，不执行工具 side effect。

默认预算：

```text
maxModelCalls = 3
maxToolCalls = 5
maxInputTokens = 12000
maxOutputTokens = 3000
maxContextBytes = 256KB
maxRuntimeMs = 60000
maxRetries = 1
```

默认权限：

```text
allow: read_current_page, summarize_page, answer_from_page, explain_selection, generate_mindmap, asr_transcribe
deny: read_local_file, search_local_workspace, shell, browser_click, browser_automation, network_crawl
```

### 6.3 交付物

- Governance 模块。
- BudgetLedger 存储。
- Tool policy 配置。
- Approval event。
- 并发/幂等基础测试。

### 6.4 验收

- TurnBudget 生效。
- 超预算进入 `budget_exhausted`。
- `read_local_file` 默认禁用。
- 工具调用前经过 policy check。
- 工具调用后记录结果。
- high-risk 工具审批前不得执行 side effect。
- `maxToolCalls=1` 时第二个工具不得产生 `tool.started`。
- `maxRetries=1` 时不得出现第三次重试。
- `read_local_file` deny 时不得产生 side effect。
- high-risk tool 审批前 `ToolCallRecord.status` 必须是 `denied` 或 `waiting_approval`，不得进入 `running`。

---

## 7. V1.0-D：Chrome 插件页面内交互壳与 PageContext

### 7.1 目标

打通当前网页到 Local Runtime 的上下文链路，并交付符合 `PRD/窗口交互_PRD.md` 的页面内交互入口。

### 7.2 范围

必须实现：

- Chrome extension scaffold。
- Unpacked extension 安装说明。
- Background Worker 作为消息桥。
- Content Script 页面抽取。
- Content Script 注入页面内交互容器。
- Shadow DOM 或等价 CSS 隔离方案。
- 页面边缘悬浮球默认态。
- hover 高亮与伸出小长条。
- 点击小长条展开网页内 AI 面板。
- 默认窄距面板约 `440px`。
- PageContext 合同。
- `/v1/page/context`。
- Runtime 记录 activePage。
- Runtime detection：未启动、连接失败、Origin 被拒绝时 UI 可解释。

Chrome Side Panel 可作为调试入口保留，但不得作为 V1.0-D 交互验收通过条件。

### 7.3 PageContext 字段

必须包含：

- pageId。
- url。
- title。
- domain。
- capturedAt。
- contentHash。
- headings。
- selectedText optional。
- visibleText optional。
- cleanedText optional。

### 7.4 交付物

- Chrome 插件可加载。
- Chrome 插件可通过 unpacked extension 安装到开发者 Chrome。
- 普通网页内可出现悬浮球。
- 悬浮球 hover 后出现小长条。
- 点击小长条后可展开网页内 AI 面板。
- 当前网页信息可显示。
- PageContext 可提交 Runtime。
- Session activePage 可更新。
- Runtime 未启动时，网页内 AI 面板展示启动提示，不出现空白页。

### 7.5 验收

- 开发者可按 README 在 Chrome 中安装 unpacked extension。
- 打开普通网页后，页面边缘出现悬浮球。
- 悬浮球可上下拖动并贴边。
- hover 后出现高亮和小长条。
- 点击小长条展开网页内 AI 面板。
- 可显示当前 tab title / url / domain。
- Content Script 可抽取 headings / cleanedText。
- 切换页面后 PageContext 更新。
- Runtime 可记录 page.context.received event。
- Runtime 未启动时 UI 给出明确提示；Runtime 启动后可重新连接。

---

## 8. V1.0-E：网页内 AI 双轨面板与网页伴读工具

### 8.1 目标

实现 V1 用户可感知价值：在网页内 AI 双轨面板中完成摘要、问答、选区解释、Mindmap。

### 8.2 工具

必须实现：

```text
summarize_page
answer_from_page
explain_selection
generate_mindmap
```

### 8.3 摘要能力

支持：

- TL;DR。
- 结构化摘要。
- 要点式摘要。
- 项目启发摘要。

### 8.4 问答能力

要求：

- 优先基于当前 PageContext。
- 长页面按 chunk 检索相关上下文。
- 不知道就说明信息不足。
- 不默认联网搜索。
- 不默认读取本地文件。

### 8.5 Mindmap 能力

流程：

```text
PageContext -> Outline Extractor -> Mindmap Prompt Builder -> MindmapModelAdapter -> Mermaid Validator -> Repair Once -> Return
```

约束：

- 使用 Mermaid mindmap。
- 节点层级不超过 4。
- 节点数量默认不超过 40。
- 校验失败只修复一次。

### 8.6 交付物

- 网页内双轨面板。
- `/v1/chat/stream` SSE 消费。
- 伴读工具实现。
- Prompt 模板。
- Mermaid validator。
- ArtifactRecord。
- 前端预览。

### 8.7 验收

- “总结这篇文章”可用。
- 用户在网页内 AI 面板输入问题后可收到基于当前网页的回答。
- “解释选中内容”可用。
- “生成思维导图”可用。
- Mermaid 可预览。
- 每次 tool call 可在 trace 中看到。
- Artifact 可追踪到 sourcePageId。

---

## 9. V1.0-F：PRD A-F 布局状态与 Resize

### 9.1 目标

完成 `PRD/窗口交互_PRD.md` 中 A-F 状态的真实 Chrome 验收能力，补齐 resize、挤压、覆盖、收起恢复和响应式降级。

本阶段是 V1 complete 的前端体验硬门槛。

### 9.2 范围

必须实现：

- 状态 A：悬浮球默认态。
- 状态 B：悬浮球 hover 预展开态。
- 状态 C：窄距展开态，默认约 `440px`，挤压网页。
- 状态 D：半屏展开态，约 `50vw`，继续挤压网页。
- 状态 E：宽工作区覆盖态，超过 `52vw` 覆盖网页，最大 `80vw`。
- 状态 F：点击悬浮球或收起按钮后收起，网页恢复原始布局。
- 面板左边界 resize handle。
- 拖回 `<48vw` 后恢复挤压式。
- 记住最近吸附边和垂直位置。
- 视口 `<900px` 时禁用挤压式，降级为覆盖式或全屏侧栏。

暂不做：

- 划词菜单。
- 网页内右键菜单。
- 全局搜索框。
- 多窗口停靠。
- 站点级深度适配。

### 9.3 交付物

- 布局状态机。
- resize handle。
- 挤压/覆盖切换逻辑。
- 小视口降级逻辑。
- 真实 Chrome 交互验收脚本或手工验收记录。

### 9.4 验收

- 状态 A-F 全部可在真实 Chrome 普通网页复现。
- 窄距和半屏挤压不破坏网页主内容可读性。
- 覆盖态符合 `>52vw` 阈值，拖回 `<48vw` 后恢复挤压式。
- 收起后网页恢复原始布局。
- 面板拉伸或切换覆盖态时保持聊天滚动位置。
- 小视口 `<900px` 正确降级。

---

## 10. V1.0-G：Session 质量与恢复

### 10.1 目标

单 Session 历史做实，支撑后续 V2 Memory Plane。

### 10.2 范围

必须实现：

- SQLite 持久化。
- Message history。
- ToolCallRecord。
- ArtifactRecord。
- BudgetLedger。
- SessionCheckpoint。
- Session trace export。
- 网页内面板 refresh / reopen recovery。

### 10.3 交付物

- SQLite schema。
- Session restore API。
- Trace export。
- Checkpoint mechanism。
- Recovery tests。

### 10.4 验收

- 刷新网页或重新展开网页内面板后 Session 不丢。
- 对话、工具、Artifact、事件可追踪。
- 可导出 Session Trace。
- 长 Session 可 checkpoint。
- EventLog 可重建一次 turn。

---

## 11. V1.0-H：Closure / Regression / Documentation

### 11.1 目标

收口 V1，不扩大 ready 声明。

### 11.2 范围

必须完成：

- 全链路 smoke。
- 状态机测试。
- Governance 测试。
- Chrome 插件页面内交互验收。
- API 文档同步。
- README / 启动说明。
- Known limitations。

### 11.3 交付物

- Final V1 report。
- Acceptance evidence。
- Test results。
- Developer setup guide。
- User-facing limitations。

### 11.4 验收

只能声明：

```text
V1 complete: installable Chrome extension with PRD-aligned floating ball, embedded dual-track AI panel, push/overlay/resize interaction, and current-page companion reading through controlled single-session AgentCore is ready.
```

不能声明：

```text
personal knowledge base ready
long-term memory ready
RAG ready
deep research ready
PPT generation ready
browser automation ready
desktop pet ready
cloud sync ready
V2/V3/V4/V5 ready
```

---

## 12. V1.1：Frontend Fidelity / Figma Visual Alignment

### 12.1 目标

V1.1 是 V1.0 complete 之后的前端体验质量阶段。目标是在不重开 Runtime / AgentCore / API 合同的前提下，高保真还原 Figma Make 原型给出的“浏览器页面 + 浮动球 + 侧边插件面板 + 聊天区域”样式。

V1.1 成功后，后续开发者应能用真实 Chrome 和截图基线判断：当前页面内悬浮球与 AI 面板是否既满足 `PRD/窗口交互_PRD.md` A-F 交互状态，又在视觉上对齐 Figma 原型。

### 12.2 阶段拆分

```text
V1.1-A：Figma 视觉规格冻结
V1.1-B：前端结构与 visual token 重构
V1.1-C：高保真样式实现与状态补齐
V1.1-D：Playwright 截图基线与真实 Chrome 复验
V1.1-E：文档收口与出门评审
```

### 12.3 开发范围

必须完成：

- 将 Figma Make 资源清单中的 `MainLayout / MockPage / FloatingBall / Sidebar / ChatArea` 映射为真实注入面板的组件语义。
- 统一视觉 token：颜色、字体、轨道宽度、面板宽度、阴影、圆角、状态色、动画时间。
- 保留并高保真呈现 Runtime offline、PageContext missing、tool running、tool failure、Mermaid fallback、streaming response。
- 新增截图验收矩阵：默认态、hover 态、`440px` 展开态、`50vw` 半屏态、`>52vw` 覆盖态、小视口态。
- 更新 V1.1 stage-gate 与 gap drawio，记录当前架构、目标架构、差异、里程碑、验收门槛、出门条件。

明确不做：

- 不新增 Runtime API。
- 不改 AgentEvent / ToolResult / PageContext 合同。
- 不引入 MCP / Skill / RAG / 多 Agent / 浏览器自动操作。
- 不用 Chrome Side Panel 替代页面内悬浮球验收。
- 没有 Figma 截图或普通 Figma `/design` 节点时，不声明视觉高保真通过。

### 12.4 验收

V1.1 Go 条件：

- PRD A-F 状态在真实 Chrome 普通网页中仍全部通过。
- Playwright 截图基线覆盖关键状态并纳入验收记录。
- Figma 对照验收有截图或普通 Figma `/design` 节点作为基线。
- 页面内面板的 Runtime、PageContext、SSE、Mermaid、Session restore 链路不回退。
- drawio gap 文档完整反映目标架构、当前差异、开发计划、里程碑、验收门槛和出门条件。

V1.1 No-Go 条件：

- 只能 Side Panel 通过。
- 缺少视觉基线却声明高保真完成。
- 截图明显偏离 Figma 关键布局比例。
- 面板交互断裂，或网页布局无法恢复。
- Runtime / Trace / Session 链路因视觉重构断开。

---

## 13. V1.2：AI 伴读四模块架构深化

### 13.1 目标

V1.2 是 V1.1 前端体验对齐后的 AI 伴读架构深化阶段。目标是把当前“聊天”功能拆成四个清晰模块：

```text
网页数据抓取与结构化总结
基于网页内容的流式渲染
基于网页内容的思维导图生成
CoreProvider + Adapter Layer 实现可替换 Core 接入和 ChatBox turn 编排边界
```

V1.2 不改变 V1 外部 API 合同，不扩大到 V2 知识库、RAG、长期记忆、多 Agent、浏览器自动操作、联网搜索、语音、桌宠、深度研究或 PPT 生成。V1.2 允许轻量 MCP / Skill / API Adapter 合同，但所有 Adapter 必须通过 D 模块 Adapter Layer 和 governance hooks 接入。

### 13.2 阶段拆分

```text
V1.2-0：AI 伴读合同与工作区冻结
V1.2-A：网页信息提取、过滤、蒸馏与结构化总结
V1.2-B：结构化数据、流式文本和 Mindmap 前端实时渲染
V1.2-C：基于结构化网页 JSON 的 Mindmap 生成与反跳来源
V1.2-D：CoreProvider + Adapter Layer、piAgentProvider 合同与 MCP / Skill / API Adapter 编排
V1.2-E：Integration Codex wiring、真实网页端到端验收与文档收口
```

### 13.3 开发范围

必须完成：

- 新增并维护 `design/v1.2-ai-reading-modular-architecture.md`。
- 新增并维护 `design/v1.2-ai-reading-workspace-partition.md`。
- 新增并维护 `design/v1.2-module-local-design-package.md`。
- 新增并维护 `design/v1.2-automation-readiness-gap.md`。
- 新增并维护 `design/v1.2-prd-coverage-matrix.md`。
- 新增并维护 `design/v1.2-integration-contract-matrix.md`。
- 新增并维护 `design/v1.2-ai-reading-automation-gap.drawio` 与 companion markdown。
- 新增并维护 `contracts/v1_2_adapter_contracts.md`。
- 新增并维护 `stage-gates/v1.2-0-ai-reading-contract-and-workspace-freeze.md`。
- 明确四模块职责、输入输出、边界和 No-Go 条件。
- 明确每个模块的 `public-api.md`、`executable-contract.md`、`fixture-spec.md`、`test-and-evidence-plan.md`。
- 明确 A/C/D service 工作区、B app 工作区和禁止跨区修改规则。
- 明确 Integration Codex 的 wiring / E2E / 审计职责。
- 明确 D 模块以 CoreProvider + Adapter Layer 为主，不从零硬编码完整 AgenticLoop。
- 明确 piAgentProvider 是 V1.2 首选 CoreProvider，MockCoreProvider 是测试 fallback，FutureCoreProvider 是替换扩展点。
- 明确真实 piAgent 接入前必须锁定仓库、版本或 commit、license、运行时和工具调用模型。
- 保持 `/v1/page/context`、`/v1/chat/stream`、trace API 作为 V1 伴读主链路。
- 所有网页伴读工具必须消费真实 `session.activePage`。
- 所有工具必须返回 `ToolResult` envelope。
- 所有成功工具必须创建 `ArtifactRecord`。
- 每个 artifact 必须关联 `sourcePageId`、`turnId`、`toolCallId`。
- Mermaid validation / repair 详情必须写入 tool 或 artifact metadata，不新增 ad-hoc event。
- 前端只维护展示态，不拥有 AgentCore 状态。
- MCP / Skill / API Adapter 必须注册到 D 模块 AdapterRegistry，不得由前端或 B 模块直接调用。
- piAgent 或其他 CoreProvider 不得直接写 ArtifactRecord、SSE、EventStore 或 UI，必须经 D Adapter Layer 映射。
- A/C/D 功能代码必须分别落在 `services/local-runtime/navia_runtime/modules/page_reading/`、`services/local-runtime/navia_runtime/modules/mindmap/`、`services/local-runtime/navia_runtime/modules/agent_loop/` 和 `services/local-runtime/navia_runtime/modules/adapters/`。
- B 功能代码必须落在 `apps/chrome-extension/src/modules/*_renderer/`。
- 既有 `apps/` 与 `services/` 入口文件只由 Integration Codex 做 wiring，不作为 A/B/C/D 模块长期工作区。

建议完成：

- 在不改变外部行为的前提下，逐步把 `tools.py` 拆分为阅读工具、Mindmap 工具、ToolExecutor。
- 在不改变 public `TurnRunner` 入口的前提下，把 AgenticLoop 编排、SSE response 组织、artifact persistence 拆出内部边界。
- 把前端 Chat 渲染、Debug 面板、Artifact 渲染继续拆成独立模块。

明确不做：

- 不新增 V2 Memory Plane。
- 不新增 RAG 或知识库蒸馏。
- 不新增未受控 MCP / Skill 直连。
- 不新增多 Agent。
- 不新增浏览器自动点击、自动导航或联网搜索。
- 不把 Mindmap 视觉失败伪装成通过。

### 13.4 验收

V1.2 Go 条件：

- V1.2-0 自动化开发 readiness gate 已通过。
- 每个模块均有 public API、executable contract、fixture spec 和 evidence plan。
- PRD coverage matrix 中关键体验路径均有负责模块和证据路径。
- Integration contract matrix 已明确字段所有权和接线边界。
- V1.2 drawio gap 图谱可打开，且包含当前/目标架构差异、模块内部架构、公共 API、关键体验路径、开发验收、里程碑和出门条件。
- 真实网页可完成读取、总结、基于网页问答、Mindmap artifact 生成。
- `/v1/chat/stream` 可输出 state、intent、budget、tool、artifact、response、error 事件。
- trace 可按 `turn_id` 还原一次完整伴读 turn。
- 缺少 activePage 时返回 `PAGE_CONTEXT_REQUIRED`，且不产生 `tool.started` 或假 artifact。
- 前端未知 SSE event 不崩溃。
- Mermaid render failure 有 source fallback。
- Mindmap 节点 source map 可追溯到 A 模块的 paragraph/chunk。
- A/C/D service 工作区与 B app 工作区隔离规则已冻结。
- 四模块边界已在设计文档、开发计划和验收计划中同步。

V1.2 No-Go 条件：

- 任一模块缺少 public API、fixture spec 或 evidence plan。
- PRD coverage matrix 缺少主路径覆盖。
- Integration Codex 为了联调重写模块业务逻辑。
- 工具未消费真实 `session.activePage`。
- 前端绕过 Runtime 直接生成总结、回答或 Mindmap。
- 成功工具没有 artifact。
- artifact 缺少 `sourcePageId`、`turnId` 或 `toolCallId`。
- 只有实时事件，没有 EventStore trace。
- 新增事件类型但未更新合同和测试。
- MCP / Skill / API 绕过 D 模块。
- piAgent 或其他 CoreProvider 绕过 D Adapter Layer。
- piAgent 具体依赖未锁定就进入真实 provider 集成。
- 引入长期记忆、RAG、多 Agent、浏览器自动操作或其他 V1 禁止范围能力。

---

## 14. 推荐开发顺序

最小可行顺序：

```text
1. contract freeze: API envelope / ErrorCode / State / Event / Tool / Budget / ID / SSE
2. local-runtime health/session/event skeleton
3. minimal StateMachine main path
4. AgentCore loop through StateMachine.transition()
5. PreToolUse / PostToolUse hooks
6. EventStore + EventStream separation
7. governance: budget / permission / context / file deny
8. page context API
9. Chrome content script + injected floating ball
10. embedded dual-track AI panel + page context
11. summarize/ask tools
12. Chrome 网页内文字对话 E2E
13. PRD A-F layout states + resize
14. deterministic mindmap fallback, then model adapter
15. session restore + trace export
```

不要先做 UI 细节，也不要先做本地知识库。V1 成败取决于 AgentCore 是否稳，以及 Chrome 插件是否能完成最小可用的当前网页基础对话闭环。
