# V1 交互 PRD 权威口径与修订后开发验收计划

版本：V1 Interaction PRD Alignment
日期：2026-06-02
权威来源：`docs/active/project/interaction-prd/窗口交互_PRD.md`

---

## 1. 口径结论

从本版本起，所有与前端页面体验、插件入口、页面内面板、悬浮球、面板展开/收起、页面挤压、覆盖态和 resize 相关的 PRD 描述，全部以当前 active 文档 `docs/active/project/interaction-prd/窗口交互_PRD.md` 为准。

`docs/active/project` 中此前关于 Chrome Side Panel 作为 V1 主前端形态的描述全部降级为：

```text
工程调试入口 / 兼容承载 / 过渡实现，不再作为 V1 前端体验验收口径。
```

V1 前端体验必须对齐：

```text
页面边缘可移动悬浮球
-> hover 高亮与伸出小长条
-> 点击展开网页内 AI 双轨聊天面板
-> 窄距状态挤压网页
-> 半屏状态继续挤压网页
-> 超过阈值后切换覆盖式显示
-> 点击悬浮球收起并恢复网页布局
```

---

## 2. PRD 优先级

| 优先级 | 文档 | 适用范围 |
|---|---|---|
| P0 | `docs/active/project/interaction-prd/窗口交互_PRD.md` | 所有前端页面交互、插件入口、悬浮球、网页内面板、挤压/覆盖/resize 体验 |
| P0 | `docs/active/project/06-api-contract.md` | Runtime API、SSE、事件、错误、工具合同 |
| P0 | `docs/active/project/07-data-models.md` | Session、Turn、PageContext、Artifact、ToolCall、Event 数据模型 |
| P1 | `docs/active/project/01-prd.md` | 产品路线、V1 能力范围、非目标 |
| P1 | `docs/active/project/02-architecture.md` | 技术架构与模块边界 |
| P1 | `docs/active/project/03-development-plan.md` | 分阶段开发计划 |
| P1 | `docs/active/project/04-acceptance-plan.md` | 验收计划 |

如果文档之间出现冲突：

- 前端页面体验以 `docs/active/project/interaction-prd/窗口交互_PRD.md` 为准。
- Runtime / AgentCore / API / Event / Governance 以 `06-api-contract.md`、`07-data-models.md` 和合同冻结文档为准。
- 不允许用 Chrome Side Panel 验收替代 `docs/active/project/interaction-prd/窗口交互_PRD.md` 中的页面内交互验收。

---

## 3. V1 前端体验目标

V1 必须交付一个可在 Chrome 中通过 unpacked extension 安装的插件，并在普通网页内呈现以下状态：

| 状态 | 名称 | V1 要求 |
|---|---|---|
| A | 悬浮球默认态 | 页面边缘出现 AI 悬浮球，默认贴边，不遮挡主要内容，可上下拖动 |
| B | 悬浮球 hover 预展开态 | hover 后悬浮球高亮，并向页面内侧伸出小长条，显示快捷键提示 |
| C | 窄距展开态 | 点击小长条后展开 AI 面板，默认宽度约 `440px`，网页内容向左挤压 |
| D | 半屏展开态 | 用户拖拽到约 `50vw`，网页继续被挤压，面板布局保持可用 |
| E | 宽工作区覆盖态 | 面板超过 `52vw` 后切换为覆盖式，最大宽度不超过 `80vw` |
| F | 点击悬浮球收起 | 展开状态下点击悬浮球或收起按钮，面板关闭，网页恢复原始布局 |

V1 还必须支持：

- 左轨常驻悬浮球 / avatar。
- 右侧 AI 面板双轨结构。
- 面板左边界 resize handle。
- 聊天区独立滚动。
- 面板切换宽度时保持当前聊天滚动位置。
- 小视口 `< 900px` 时禁用挤压式，改为覆盖式或全屏侧栏。
- Runtime offline、PageContext missing、tool failure、Mermaid render failure 均必须可见。

---

## 4. 修订后的 V1 开发计划大纲

### V1.0-0：Contracts & Runtime Skeleton

目标不变。冻结 API / Event / State / Tool / Budget / Error / ID / SSE 合同。

验收重点：

- 所有 schema validation 通过。
- `/v1/chat/stream` 固定为 SSE。
- ToolResult envelope、ErrorCode、EventStore/EventStream 分离完成。

### V1.0-A：AgentCore Baseline

目标不变。实现 contract-first Runtime 与最小 AgentCore 主路径。

验收重点：

- 一轮 chat 产生 `session_id` / `turn_id`。
- 工具调用必须经过 governance hooks。
- Trace 可还原主路径。

### V1.0-B：StateMachine & Observability

目标不变。补齐状态机、非法迁移、Trace、状态图。

验收重点：

- 每次 state transition 写 EventStore。
- 非法迁移返回 `INVALID_TRANSITION`。
- Trace 可按 `turn_id` 过滤。

### V1.0-C：Governance / Budget Supervisor

目标不变。预算、权限、上下文、本地文件访问与审批治理生效。

验收重点：

- Budget / Permission 必须在 `tool.started` 前阻断。
- `read_local_file` 默认 deny。
- 不引入浏览器自动操作。

### V1.0-D：Chrome 插件页面内交互壳与 PageContext

替代原 Side Panel 主线。目标是实现 `docs/active/project/interaction-prd/窗口交互_PRD.md` 的页面内交互入口，并打通 PageContext。

开发范围：

- WXT + React + TypeScript 插件工程保留。
- Content Script 注入页面内交互容器。
- Shadow DOM 或等价 CSS 隔离策略。
- 悬浮球默认态。
- hover 预展开小长条。
- 点击展开网页内 AI 面板。
- 窄距 `440px` 默认面板。
- PageContext 抽取与 `/v1/page/context` 提交。
- Runtime detection 与 offline 状态展示。

验收重点：

- Chrome `Load unpacked` 后，普通网页边缘出现悬浮球。
- 悬浮球可上下拖动并保持贴边。
- hover 后出现高亮和小长条。
- 点击小长条展开网页内面板。
- 当前网页 title/url/domain/headings/cleanedText 可进入 Runtime。
- Runtime 未启动时，网页内面板显示可理解错误，不空白。

### V1.0-E：网页内 AI 双轨面板与 SSE Chat

目标是把网页内面板升级为真实 Chatbox，不能再以 Side Panel 作为主验收对象。

开发范围：

- 左轨：悬浮球 / avatar、收起入口、必要状态入口。
- 右轨：Chatbox、消息列表、输入框、摘要、问答、Mermaid mindmap 展示。
- `/v1/chat/stream` SSE 消费。
- Unknown SSE event 容错。
- Runtime offline / PageContext missing / tool failure / Mermaid render failure 可见。
- 前端不持有 AgentCore 状态。

验收重点：

- 用户在网页内 AI 面板输入“总结这篇文章”并看到响应。
- 用户基于当前网页提问并收到回答。
- Mermaid mindmap 可渲染，失败时显示 source fallback。
- Trace 可看到 state、intent、budget、tool、artifact、response 事件。

### V1.0-F：PRD A-F 布局状态与 Resize

新增为 V1 前端体验硬门槛。

开发范围：

- 窄距展开态：`440px`，挤压网页。
- 半屏展开态：约 `50vw`，继续挤压网页。
- 覆盖态：超过 `52vw` 进入覆盖，最大 `80vw`。
- 回退态：拖回 `<48vw` 恢复挤压式。
- resize handle。
- 点击悬浮球收起。
- 面板收起后恢复网页原始布局。
- 记住最近吸附边和垂直位置。

验收重点：

- 状态 A-F 全部可在真实 Chrome 普通网页复现。
- 挤压态不会破坏页面主滚动和基本点击。
- 覆盖态符合阈值。
- 收起后页面布局恢复。
- 小视口 `<900px` 正确降级。

### V1.0-G：Session 质量与恢复

目标不变，但恢复对象从 Side Panel 改为网页内面板。

开发范围：

- SQLite 持久化。
- Message / ToolCall / Artifact / BudgetLedger。
- Session restore API。
- 网页内面板刷新/重开后恢复最近 Session。
- EventLog 可导出 Trace。

验收重点：

- 刷新网页或重新展开面板后，最近 Session 可恢复。
- 对话、工具、Artifact、事件可追踪。
- 前端只缓存 `session_id`，AgentCore 状态仍由 Runtime 持有。

### V1.0-H：真实 Chrome UI 最终验收与文档收口

目标是用真实 Chrome 验收 V1 前端体验和 Runtime 伴读链路。

验收重点：

- Chrome 插件可安装。
- PRD A-F 状态全部通过。
- 网页内面板可完成摘要、问答、Mermaid mindmap。
- Runtime / AgentCore / Trace / Governance 均可审计。
- 不能用 Side Panel、普通 extension page 或 mock 页面替代通过。

---

## 5. 修订后的 V1 Go / No-Go

### Go 条件

全部满足才可声明 V1 complete：

- Chrome 插件可通过 `Load unpacked` 安装。
- 普通网页边缘出现悬浮球。
- 悬浮球默认态、hover 态、展开态、半屏态、覆盖态、收起态全部通过。
- 网页内 AI 双轨面板可完成文字对话。
- 当前页面上下文可进入 Runtime。
- 用户可基于当前网页完成摘要、问答、Mermaid mindmap。
- Mermaid 可渲染，失败时有 source fallback。
- Runtime offline、PageContext missing、tool failure 可见。
- AgentCore 状态不由前端持有。
- 每个 turn / tool / artifact / event 可追踪。
- Budget / Permission / Context supervision 生效。
- 默认不读取本地文件，不联网搜索，不做浏览器自动操作。

### No-Go 条件

任一出现即不能声明 V1 complete：

- 只能打开 Chrome Side Panel，不能在网页内呈现悬浮球和嵌入面板。
- 状态 A-F 任一缺失。
- 用普通网页或 extension page 替代真实页面内注入 UI 验收。
- 面板展开后页面无法恢复原始布局。
- resize 阈值无法验证。
- 当前网页上下文没有进入 Runtime。
- 缺少 `turn_id`、ToolResult、ArtifactRecord 或 EventStore trace。
- 前端保存 AgentCore 核心状态。
- 工具调用绕过 Governance。

---

## 6. 审计意见

结论：

```text
Go for revised planning. No implementation until V1.0-D/E/F stage-gates are rewritten against docs/active/project/interaction-prd/窗口交互_PRD.md.
```

致命风险：无。

重大风险与闭环要求：

| 风险 | 等级 | 闭环要求 |
|---|---|---|
| 既有 Side Panel 实现可能被误判为 V1 complete | 重大 | 所有验收文档必须声明 Side Panel 不能替代网页内交互验收 |
| 页面挤压实现可能破坏真实网页布局 | 重大 | D/F 阶段必须使用真实文章页、技术文档页、GitHub README 类页面验收 |
| Shadow DOM / CSS 隔离方案未冻结 | 重大 | D 阶段开发前必须在 stage-gate 中决策并审计 |
| 覆盖态下底层网页是否可点击仍是 PRD 待确认项 | 重大 | F 阶段开始前必须列为高风险问题，如无 Figma/人类确认则采用不可交互背景并记录 |
| Figma 原型未到位时视觉细节可能偏离 | 重大 | 可先实现交互骨架，不声明最终视觉通过；Figma 到位后做视觉规格复检 |

当前允许的下一步：

```text
只允许进入 V1.0-D/E/F 修订版 stage-gate 文档制定与审计。
在这些 stage-gate 闭环前，不进入新的前端实质开发。
```
