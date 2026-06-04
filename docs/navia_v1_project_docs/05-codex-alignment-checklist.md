# Navia / 伴航 Codex 对齐清单

本文件用于每次让 Codex 开工前、PR 前、验收前逐项确认。目标是防止 scope creep，并确保实现和 PRD/架构/验收文档一致。

---

## 1. 开工前必读文件

Codex 应先读取：

```text
README.md
PRD/窗口交互_PRD.md
01-prd.md
02-architecture.md
03-development-plan.md
04-acceptance-plan.md
05-codex-alignment-checklist.md
06-api-contract.md
07-data-models.md
10-v1-stage-gate-execution-protocol.md
```

如果当前阶段已有 stage-gate 文档，还必须读取：

```text
stage-gates/v1.0-x-<stage-name>.md
```

V1.1 前端高保真阶段还必须读取：

```text
PRD/窗口交互_PRD.md
12-interaction-prd-authority-and-revised-plan.md
stage-gates/v1.1-frontend-fidelity.md
design/v1.1-frontend-fidelity-implementation-spec.md
design/v1.1-figma-baseline/README.md
design/v1.1-figma-baseline/capture-matrix.md
design/v1.1-figma-baseline/capture-manifest.json
design/v1.1-figma-baseline/manual-capture-runbook.md
```

---

## 2. V1 硬边界确认

实现前必须确认。V1.2 例外：文档阶段允许定义轻量 MCP / Skill / API Adapter 合同，但真实服务调用、side effect、联网搜索、本地文件读取或绕过 D 模块 governance 的实现仍然禁止。

- [ ] 本阶段不直连 MCP；如为 V1.2 Adapter 合同，必须只通过 D 模块。
- [ ] 本阶段不直连 Skill 系统；如为 V1.2 Adapter 合同，必须只通过 D 模块。
- [ ] 本阶段不做长期记忆。
- [ ] 本阶段不做完整知识库。
- [ ] 本阶段不做 RAG。
- [ ] 本阶段不做多 Agent。
- [ ] 本阶段不做浏览器自动点击。
- [ ] 本阶段不做 Shell 执行。
- [ ] 本阶段不默认读取本地文件。
- [ ] 本阶段不做深度研究。
- [ ] 本阶段不做 PPT 生成。
- [ ] 本阶段不做桌面宠物。

任何 PR 如果引入上述能力，必须标记为 scope creep，除非有明确新阶段文档。

---

## 3. 每个 PR 必须回答的问题

每个 PR 描述里应回答：

```text
1. 本 PR 属于 V1.0-0/A/B/C/D/E/F/G/H 哪个阶段？
2. 改动是否触碰 V1 非目标？
3. 是否新增 API？如果是，是否更新 06-api-contract.md？
4. 是否新增数据模型？如果是，是否更新 07-data-models.md？
5. 是否新增 AgentEvent？如果是，是否更新 event schema？
6. 是否新增工具？如果是，是否经过 Governance Plane？
7. 是否新增模型调用？如果是，是否记录 budget ledger？
8. 是否新增本地文件访问？如果是，默认是否 deny？
9. 是否有测试覆盖主路径和失败路径？
10. 是否更新验收证据？
11. 是否所有 chat turn 都有 turn_id？
12. 是否所有工具结果都使用 ToolResult envelope？
13. 是否所有错误都来自 ErrorCode enum？
14. 是否 EventStore 和 EventStream 保持分离？
15. 是否已有本阶段 stage-gate 文档？
16. 是否完成本阶段 PRD 规格检视？
17. 是否闭环所有致命或重大审计意见？
18. 是否使用真实数据完成端到端验收？
19. 如果验收失败，是否已打回开发计划阶段而不是继续推进？
20. 如果涉及前端页面体验，是否逐项对齐 `PRD/窗口交互_PRD.md`？
```

---

## 3.0 阶段门禁对齐

每个 V1 子阶段进入实质开发前必须确认：

- [ ] 已基于 `01-prd.md` 完成本阶段 PRD 规格检视。
- [ ] 已生成 `stage-gates/v1.0-x-<stage-name>.md`。
- [ ] stage-gate 文档包含开发计划。
- [ ] stage-gate 文档包含验收标准。
- [ ] stage-gate 文档包含真实数据验收方案。
- [ ] stage-gate 文档包含预审计意见。
- [ ] 没有未闭环的致命审计意见。
- [ ] 没有未闭环的重大审计意见。
- [ ] 已明确哪些情况需要人类确认。

V1.1 进入实质前端实现前还必须确认：

- [ ] 已执行 `node scripts/validate_v1_1_doc_readiness.mjs`。
- [ ] 校验输出 `canStartV11B=true`。
- [ ] `floating-default` 已登记用户提供 Image #2。
- [ ] `floating-hover` 已登记用户提供 Image #1。
- [ ] 3-6 状态已登记为 PRD 硬约束，不要求实际截图。
- [ ] `runtime-offline` 已登记为独立设计验收。
- [ ] `artifact-mindmap` 已登记为后续专项，不阻塞 V1.1-B/C。
- [ ] 不把 `accepted_partial` 主窗口截图当作完整视觉基线。
- [ ] `capture-manifest.json` 已登记截图状态、来源和审计结论。
- [ ] 历史 `DEVELOPMENT_PLAN.md` 未被作为实现依据。
- [ ] 仍以 `PRD/窗口交互_PRD.md` 为交互权威。
- [ ] 未新增 Runtime API、AgentEvent、ToolResult 或 PageContext 合同变更。
- [ ] V1.1-A stage-gate 已经 Go，才允许进入 V1.1-B。

每个 V1 子阶段完成后必须确认：

- [ ] 已执行本阶段端到端验收。
- [ ] 验收使用真实数据或真实浏览器链路。
- [ ] 验收报告已写回 stage-gate 文档。
- [ ] 已完成 PRD 规格复检。
- [ ] 已复核 false-green 风险。
- [ ] 如果验收失败，已打回开发计划阶段重新思考并执行。
- [ ] 只有阶段验收通过后才进入下一阶段。

必须停止并找人类确认：

- [ ] 需要扩大 V1 范围。
- [ ] 需要开放本地文件读取、shell、浏览器自动操作。
- [ ] 需要接入 MCP / Skill / RAG / 多 Agent。
- [ ] 需要外部账号、付费服务、云端部署或敏感 token。
- [ ] 需要放宽 Runtime 安全约束。
- [ ] 真实数据验收无法完成，需要降级为 mock 或跳过。
- [ ] 审计出现未闭环的致命或重大风险。

---

## 3.1 Contract-first 对齐

V1.0-0 必须确认：

- [ ] API response envelope 存在。
- [ ] ErrorCode enum 存在。
- [ ] State enum 存在。
- [ ] Transition table schema 存在。
- [ ] AgentEvent envelope 存在。
- [ ] Session / Turn / Message schema 存在。
- [ ] ToolSpec / ToolCallRecord / ToolResult schema 存在。
- [ ] Budget schema 存在。
- [ ] ID 生成和关联规则存在。
- [ ] `/v1/chat/stream` SSE event format 存在。
- [ ] EventStore 与 EventStream 接口分离。
- [ ] schema validation tests 存在。

禁止：

- [ ] ad-hoc AgentLoop。
- [ ] ad-hoc event dict。
- [ ] 工具直接返回自由文本。
- [ ] 无 `turn_id` 的 chat turn。
- [ ] 只有实时事件、没有持久化事件。

---

## 4. AgentCore 实现对齐

AgentCore 必须满足：

- [ ] 有 AgentRuntime。
- [ ] 有 AgentLoop 或 TurnRunner。
- [ ] 有 ToolRegistry。
- [ ] 有 IntentRouter。
- [ ] 有 StateMachine。
- [ ] 有 EventBus。
- [ ] 有 EventStore。
- [ ] 有 EventStream。
- [ ] 有 SessionStore。
- [ ] 有 BudgetSupervisor。
- [ ] 有 PermissionSupervisor。
- [ ] 有 ContextSupervisor。
- [ ] 有 FileQuerySupervisor。
- [ ] 有 ResultValidator。
- [ ] 有 ResponseStreamer 或等价机制。

AgentCore 不得：

- [ ] 直接读本地文件。
- [ ] 绕过 ToolRegistry 调工具。
- [ ] 绕过 Governance 调工具。
- [ ] 绕过 PreToolUse / PostToolUse。
- [ ] 在 TurnRunner 里手写临时状态字符串。
- [ ] 把模型实现写死在业务层。
- [ ] 把状态只存在前端。
- [ ] 把状态只存在 Chrome background worker。

---

## 5. 状态机对齐

必须确认：

- [ ] Transition table 是唯一真实来源。
- [ ] Mermaid 图由代码生成。
- [ ] 非法 transition 被拒绝。
- [ ] 非法 transition 返回或抛出 `INVALID_TRANSITION`。
- [ ] 每次 transition 产出 `state.transition`。
- [ ] 每次 `state.transition` 写入 EventStore。
- [ ] 主路径测试存在。
- [ ] intent_unknown 测试存在。
- [ ] budget_exceeded 测试存在。
- [ ] tool_failed 测试存在。
- [ ] repair_failed 测试存在。

---

## 6. Governance 对齐

必须确认：

- [ ] 每轮有 TurnBudget。
- [ ] maxModelCalls 生效。
- [ ] maxToolCalls 生效。
- [ ] maxContextBytes 生效。
- [ ] maxRuntimeMs 生效。
- [ ] maxRetries 生效。
- [ ] 超预算不继续执行。
- [ ] maxToolCalls=1 时第二个工具不得产生 `tool.started`。
- [ ] read_local_file deny 时不得产生 `tool.started`。
- [ ] 工具调用前经过 PreToolUse。
- [ ] 工具调用后经过 PostToolUse。
- [ ] 本地文件访问默认 deny。
- [ ] 高风险工具审批前无 side effect。
- [ ] side-effect marker 有 CAS / lock 防并发重复。

---

## 7. Session 对齐

必须确认：

- [ ] 每个 user message 创建 AgentTurn。
- [ ] 每个 turn 有 `turn_id`、`trace_id`、`request_id`。
- [ ] user message 持久化。
- [ ] assistant message 持久化。
- [ ] tool message 持久化。
- [ ] event reference 持久化。
- [ ] activePage 持久化。
- [ ] ToolCallRecord 持久化。
- [ ] ToolCallRecord 关联 `session_id` 和 `turn_id`。
- [ ] ArtifactRecord 持久化。
- [ ] ArtifactRecord 关联 `turn_id`、`tool_call_id` 和 `sourcePageId` 或明确 `source=null`。
- [ ] BudgetLedger 持久化。
- [ ] 刷新前端后 session 不丢。
- [ ] 可导出 trace。

---

## 8. Chrome Extension 对齐

必须确认：

- [ ] 普通网页边缘可出现 AI 悬浮球。
- [ ] 悬浮球可上下拖动并贴边。
- [ ] hover 后出现高亮和小长条。
- [ ] 点击小长条后展开网页内 AI 双轨面板。
- [ ] 窄距展开态约 `440px` 并挤压网页。
- [ ] 半屏展开态约 `50vw` 并继续挤压网页。
- [ ] 超过 `52vw` 后进入覆盖态。
- [ ] 拖回 `<48vw` 后恢复挤压式。
- [ ] 点击悬浮球或收起按钮后面板收起，网页恢复原始布局。
- [ ] Chrome Side Panel 仅可作为调试或兼容入口，不得替代 V1 前端体验验收。
- [ ] Runtime 不可用时 UI 有提示。
- [ ] title/url/domain 可展示。
- [ ] headings/cleanedText 可提取。
- [ ] selectedText 可提取。
- [ ] PageContext 可提交 Runtime。
- [ ] Chatbox 可提交 message。
- [ ] Chatbox 通过 SSE 消费 `/v1/chat/stream`。
- [ ] AgentEvent 可展示。
- [ ] Mermaid 可预览。
- [ ] 语音按钮在 FunASR 不可用时禁用或提示。

---

## 9. 工具对齐

V1 允许工具：

- [ ] read_current_page。
- [ ] summarize_page。
- [ ] answer_from_page。
- [ ] explain_selection。
- [ ] generate_mindmap。
- [ ] asr_transcribe。

V1 禁止默认启用：

- [ ] read_local_file。
- [ ] search_local_workspace。
- [ ] shell。
- [ ] browser_click。
- [ ] browser_automation。
- [ ] network_crawl。

工具实现必须确认：

- [ ] 每个工具返回 ToolResult envelope。
- [ ] ToolResult 包含 `tool_call_id`、`tool_name`、`status`、`content`、`artifact_ids`、`budget_cost`、`warnings`。
- [ ] budget check 在 `tool.started` 前完成。
- [ ] permission check 在 `tool.started` 前完成。

---

## 9.1 Runtime 安全对齐

必须确认：

- [ ] Runtime 默认只绑定 `127.0.0.1`。
- [ ] Runtime 不监听 `0.0.0.0`。
- [ ] CORS / Origin allowlist 只允许 Chrome extension origin 和明确配置的 localhost dev origin。
- [ ] 高风险 API 不允许任意网页调用。
- [ ] 普通日志不打印完整网页正文、选区全文或 transcript 全文。

---

## 9.2 V1.1 前端高保真对齐

V1.1 开工前必须额外读取：

- [ ] `design/v1.1-frontend-fidelity-architecture.md`。
- [ ] `design/v1.1-frontend-fidelity-implementation-spec.md`。
- [ ] `stage-gates/v1.1-frontend-fidelity.md`。
- [ ] `design/v1.1-frontend-fidelity-gap.drawio`。
- [ ] 用户提供 Image #1/#2、PRD 硬约束、design-only、deferred scope 均已登记；若只有 Figma Make 资源清单，不得声明最终视觉通过。

V1.1 实现前必须确认：

- [ ] 不新增 Runtime API。
- [ ] 不修改 AgentEvent / ToolResult / PageContext 合同。
- [ ] 不把 Chrome Side Panel 作为高保真验收对象。
- [ ] 保留 PageContext、SSE Chat、Mermaid、Session restore、push / overlay / resize / collapse recovery。
- [ ] 视觉 token 已集中定义：颜色、字体、圆角、阴影、间距、轨道宽度、动画时长。
- [ ] Figma `MainLayout / MockPage / FloatingBall / Sidebar / ChatArea` 已映射到真实注入面板语义。
- [ ] Playwright 截图验收覆盖默认态、hover 态、窄距、半屏、覆盖、小视口。
- [ ] Runtime offline、PageContext missing、tool failure 有明确视觉状态；Mermaid / mindmap 后续专项。

V1.1 false-green 防线：

- [ ] 没有视觉基线不得声明高保真通过。
- [ ] manifest 中仍有 blocking state 不得进入 V1.1 实质实现。
- [ ] 只通过 DOM 测试不得声明高保真通过。
- [ ] 只通过 Side Panel 不得声明高保真通过。
- [ ] 截图偏离关键布局比例不得声明通过。
- [ ] Runtime / Trace / Session 断链不得声明通过。

---

## 10. 最终验收命令建议

Codex 应尽量补充项目实际命令，例如：

```bash
# Runtime tests
pytest services/local-runtime/tests

# Frontend tests
pnpm test

# Lint/typecheck
pnpm lint
pnpm typecheck

# Build extension
pnpm --filter chrome-extension build

# API smoke
curl http://127.0.0.1:17861/v1/health
curl http://127.0.0.1:17861/v1/models/status
```

如果当前仓库没有这些命令，Codex 应在 README 或 package scripts 中补齐对应脚本，而不是只手动验证。
