# Navia / 伴航 V1 数据模型文档

版本：V1.0 Data Model Baseline
审计后策略：Contract-first，先冻结 Session / Turn / Event / Tool / Budget / Error 合同，再实现 AgentCore。

---

## 1. ID 与关联规则

```ts
type RuntimeIds = {
  requestId: string
  traceId: string
  sessionId: string
  turnId: string
  messageId: string
  pageId?: string
  chunkId?: string
  toolCallId?: string
  artifactId?: string
  eventId?: string
}
```

规则：

- 一个 user message 触发一个 `turnId`。
- 一个 turn 可包含多个 tool call。
- 每个执行中 AgentEvent 必须至少关联 `sessionId` 和 `turnId`。
- 每个 ToolCallRecord 必须关联 `sessionId` 和 `turnId`。
- 每个 ArtifactRecord 必须关联 `turnId` 和 `toolCallId`，并有 `sourcePageId` 或明确 `source=null`。
- ArtifactRecord 不设置顶层 `format` 字段；格式统一写入 `metadata.format`。
- 选区解释不新增 artifact type，使用 `type="answer"` 且 `source="selection"`。
- `requestId` 表示一次 API 请求，`traceId` 表示一次可追踪执行链。

---

## 2. AgentSession

```ts
type AgentSession = {
  sessionId: string
  createdAt: string
  updatedAt: string
  activePage?: PageContextRef
  turns: AgentTurn[]
  messages: SessionMessage[]
  toolCalls: ToolCallRecord[]
  artifacts: ArtifactRecord[]
  checkpoints: SessionCheckpoint[]
  budgetLedger: BudgetLedger[]
}
```

约束：

- V1 是单 Session 高质量，不是长期记忆。
- activePage 表示当前网页上下文。
- turns、messages、toolCalls、artifacts、budgetLedger 必须可追踪同一个 turn。

---

## 3. AgentTurn

```ts
type AgentTurn = {
  turnId: string
  sessionId: string
  requestId: string
  traceId: string
  parentTurnId?: string
  userMessageId: string
  status:
    | "created"
    | "running"
    | "succeeded"
    | "failed"
    | "budget_exhausted"
    | "cancelled"
  startedAt: string
  endedAt?: string
  activePageId?: string
  metadata?: Record<string, unknown>
}
```

---

## 4. SessionMessage

```ts
type SessionMessage = {
  id: string
  sessionId: string
  turnId: string
  requestId?: string
  traceId?: string
  role: "system" | "user" | "assistant" | "tool" | "event"
  content: string
  createdAt: string
  source?: "typed" | "voice" | "page_selection" | "agent" | "tool"
  pageRef?: string
  tokenEstimate?: number
  metadata?: Record<string, unknown>
}
```

---

## 5. PageContext

```ts
type PageContext = {
  pageId: string
  sessionId: string
  tabId?: number
  url: string
  title: string
  domain: string
  capturedAt: string
  contentHash: string
  headings: Array<{ level: number; text: string }>
  selectedText?: string
  visibleText?: string
  cleanedText?: string
  chunks?: PageChunk[]
  metadata?: Record<string, unknown>
}
```

模块归属：

- PageContext 属于“网页数据抓取与结构化总结”模块。
- PageContext 是 V1 AI 伴读工具的页面事实源。
- `summarize_page`、`answer_from_page`、`explain_selection`、`generate_mindmap` 不得使用前端自由文本替代 `session.activePage`。
- 缺少 PageContext 时必须返回 `PAGE_CONTEXT_REQUIRED`，不得创建假 artifact。
- V1.2 扩展阶段，A 模块应将 PageContext 升级为 `StructuredPageContext`，补充 paragraphs、paragraph annotations、heading tree 和 chunk/source 关联。

---

## 6. PageChunk

```ts
type PageChunk = {
  chunkId: string
  pageId: string
  headingPath?: string[]
  text: string
  tokenEstimate: number
  order: number
}
```

约束：

- 长页面必须 chunk。
- chunk 应保留 headingPath。
- 问答应尽量引用 relevant chunk，不应无脑使用全文。

---

## 7. PageContextRef

```ts
type PageContextRef = {
  pageId: string
  url: string
  title: string
  domain: string
  contentHash: string
  capturedAt: string
}
```

---

## 7.1 V1.2 StructuredPageContext

详细合同见 `contracts/v1_2_adapter_contracts.md`。核心类型：

```ts
type StructuredPageContext = {
  pageId: string
  sessionId: string
  url: string
  title: string
  domain: string
  capturedAt: string
  contentHash: string
  metadata: Record<string, unknown>
  headingTree: HeadingNode[]
  paragraphs: ParagraphBlock[]
  chunks: PageChunk[]
  annotations: ParagraphAnnotation[]
  summaryDraft?: Record<string, unknown>
}
```

约束：

- `StructuredPageContext` 是 A 输出给 C/D 的事实源。
- `paragraphs` 与 `chunks` 必须可追溯。
- Mindmap source map 必须能回指 paragraph 或 chunk。
- B 不直接生成或修改 `StructuredPageContext`。
- A 拥有 `paragraphId`、`chunkId`、`headingId` 和 `contentHash` 的生成规则。
- Integration Codex 只能把 A 输出写入 `session.activePage`，不得重写结构化内容。

---

## 7.2 A-V1.2 High-Signal Page Models

详细合同见 `contracts/v1_2_adapter_contracts.md` 和 `contracts/a_v1_2_page_perception.schema.json`。A-V1.2 在 `StructuredPageContext` 之上增加高信号视图、结构化页面摘要、反跳来源和质量评估。历史 `a-v1.1-*` schemaVersion 是兼容 wire shape，不代表当前开发阶段退回 A-V1.1。

```ts
type HighSignalPageContext = {
  schemaVersion: string
  pageId: string
  sessionId: string
  contentHash: string
  sourceStructuredPageRef: { pageId: string; contentHash: string }
  highSignalBlocks: unknown[]
  filteredBlocks: unknown[]
  sourceMapRef: string
  digestRef?: string
  qualityReportRef: string
  status: "ready" | "degraded" | "failed"
  warnings: string[]
}

type PerceptionDigest = {
  digestId: string
  pageId: string
  contentHash: string
  items: unknown[]
  rejectedItems: unknown[]
  summary: { tldr: string; keyTakeaways: string[] }
}

type SourceRef = {
  sourceRefId: string
  pageId: string
  contentHash: string
  blockId: string
  blockType: string
  order: number
  textQuote: string
  textHash: string
  fallbackText: string
  confidence: number
}

type PagePerceptionQualityReport = {
  reportId: string
  pageId: string
  contentHash: string
  overallScore: number
  downstreamReadiness: "pass" | "degraded" | "fail"
}
```

约束：

- A-V1.2 high-signal 模型只能通过公共合同被 D/C 依赖 exact shape。
- `SourceRef.selector` / `domPath` 可选，不能作为唯一反跳机制。
- `PerceptionDigest.items[]` 中每个 item 必须有 source refs。
- `PagePerceptionQualityReport` 必须按冻结公式计算，不能写死通过。
- 第三方 `CandidateExtractionResult` 只能是 A 内部候选输入，不得暴露给 D/C/B。

---

## 8. IntentResult

```ts
type IntentResult = {
  intent:
    | "summarize_page"
    | "ask_page"
    | "explain_selection"
    | "generate_mindmap"
    | "extract_key_points"
    | "voice_command"
    | "unknown"
  confidence: number
  requiresPageContext: boolean
  requiresSelection: boolean
  tool?: string
  arguments: Record<string, unknown>
  raw?: unknown
}
```

---

## 9. ToolCallRecord

```ts
type ToolCallRecord = {
  toolCallId: string
  sessionId: string
  turnId: string
  traceId?: string
  toolName: string
  arguments: Record<string, unknown>
  status:
    | "requested"
    | "approved"
    | "denied"
    | "waiting_approval"
    | "running"
    | "succeeded"
    | "failed"
    | "budget_exceeded"
  startedAt?: string
  endedAt?: string
  error?: string
  budgetCost?: BudgetCost
  approvalId?: string
  metadata?: Record<string, unknown>
}
```

---

## 10. ToolResult

所有工具必须返回统一 envelope，不允许直接返回自由文本。

```ts
type ToolResult = {
  toolCallId: string
  toolName: string
  status: "succeeded" | "failed" | "denied" | "waiting_approval" | "budget_exceeded"
  content: Record<string, unknown>
  artifactIds: string[]
  budgetCost: BudgetCost
  warnings: string[]
  error?: RuntimeError
}
```

约束：

- `tool.started` 只能在 budget 和 permission 检查通过后产生。
- `read_local_file` deny 时不得产生 `tool.started`。
- high-risk tool 审批前不得进入 `running`。

---

## 11. ArtifactRecord

```ts
type ArtifactRecord = {
  artifactId: string
  sessionId: string
  turnId: string
  toolCallId: string
  type: "summary" | "mindmap" | "transcript" | "answer"
  sourcePageId?: string
  sourceChunkIds?: string[]
  source?: "page" | "selection" | "voice" | "agent" | null
  content: string
  metadata: Record<string, unknown>
  createdAt: string
}
```

约束：

- `format` 不作为顶层字段出现。
- 文本摘要和回答默认 `metadata.format = "markdown"`。
- Mermaid mindmap 使用 `metadata.format = "mermaid"`，`content` 存 Mermaid source。
- `explain_selection` 产生 `type = "answer"`、`source = "selection"` 的 ArtifactRecord。
- 成功 D / Integration 工具必须创建 ArtifactRecord；失败、denied 或 budget_exceeded 不得创建假 artifact。
- A 页面感知模块不创建 ArtifactRecord，只输出 page perception contracts 与 evidence files。
- V1 AI 伴读中，summary / answer / mindmap artifact 必须能追溯到 `sourcePageId`、`turnId`、`toolCallId`。
- Mindmap 视觉渲染状态不写入 ArtifactRecord 顶层字段；Runtime 只存 Mermaid source 和 validation metadata，Frontend 单独处理 renderer failure 与 source fallback。
- V1.2 Mindmap artifact 必须在 metadata 中记录 `nodeSourceMap`，用于节点反跳或 source excerpt fallback。

---

## 12. Artifact Metadata

```ts
type SummaryArtifactMetadata = {
  format: "markdown"
  title: string
  sourceUrl: string
  style: "tldr" | "structured" | "bullets" | "project_insight"
  model?: string
  chunkRefs?: string[]
}

type MindmapArtifactMetadata = {
  format: "mermaid"
  title: string
  sourceUrl: string
  rootTopic: string
  nodesCount: number
  warnings: string[]
  model?: string
  repaired: boolean
  validation: {
    status: "passed" | "failed"
    errorCode?: "MERMAID_VALIDATION_FAILED"
    repairAttempts: number
  }
}
```

Mindmap `content` 字段存 Mermaid 源码。

V1.2 Mindmap metadata 扩展：

```ts
type MindmapNodeSourceMap = Record<
  string,
  {
    nodeLabel: string
    paragraphIds: string[]
    chunkIds: string[]
    excerpt: string
  }
>
```

约束：

- `nodeSourceMap` 由 C 模块生成并写入 `ArtifactRecord.metadata.nodeSourceMap`。
- B 只读取 `nodeSourceMap` 做视觉反跳或 excerpt fallback，不修改 ArtifactRecord。
- Integration Codex 只负责把 C 输出映射进 D 创建的 ArtifactRecord。

---

## 13. BudgetLedger / BudgetCost / TurnBudget

```ts
type BudgetLedger = {
  sessionId: string
  turnId: string
  traceId?: string
  modelCalls: number
  toolCalls: number
  inputTokens: number
  outputTokens: number
  contextBytes: number
  runtimeMs: number
  retries: number
  createdAt: string
}

type BudgetCost = {
  modelCalls?: number
  toolCalls?: number
  inputTokens?: number
  outputTokens?: number
  contextBytes?: number
  runtimeMs?: number
  retries?: number
}

type TurnBudget = {
  maxModelCalls: number
  maxToolCalls: number
  maxInputTokens: number
  maxOutputTokens: number
  maxContextBytes: number
  maxRuntimeMs: number
  maxRetries: number
}
```

默认：

```text
maxModelCalls = 3
maxToolCalls = 5
maxInputTokens = 12000
maxOutputTokens = 3000
maxContextBytes = 256KB
maxRuntimeMs = 60000
maxRetries = 1
```

---

## 14. FileQueryPolicy

```ts
type FileQueryPolicy = {
  enabled: boolean
  allowedRoots: string[]
  deniedGlobs: string[]
  maxFilesPerTurn: number
  maxBytesPerFile: number
  maxTotalBytesPerTurn: number
  requireUserApproval: boolean
}
```

V1 默认：

```text
enabled = false
allowedRoots = []
maxFilesPerTurn = 0
requireUserApproval = true
```

---

## 15. ApprovalRecord

```ts
type ApprovalRecord = {
  approvalId: string
  sessionId: string
  turnId: string
  toolCallId?: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  reason: string
  requestedAt: string
  respondedAt?: string
  responseBy?: string
  sideEffectStatus?: "pending" | "applying" | "applied" | "failed"
  metadata?: Record<string, unknown>
}
```

约束：

- 审批前不得执行 side effect。
- repeated approval 必须幂等。
- sideEffectStatus 更新必须 CAS / lock。
- cancel 后 late approval 不得改变 decision 并继续执行。

---

## 16. AgentEvent

```ts
type AgentEvent = {
  eventId: string
  sessionId: string
  turnId?: string
  traceId?: string
  requestId?: string
  type:
    | "state.transition"
    | "page.context.received"
    | "intent.detected"
    | "budget.checked"
    | "budget.exhausted"
    | "approval.required"
    | "approval.approved"
    | "approval.rejected"
    | "tool.requested"
    | "tool.denied"
    | "tool.started"
    | "tool.done"
    | "tool.failed"
    | "model.started"
    | "model.done"
    | "response.delta"
    | "response.done"
    | "artifact.created"
    | "error"
  timestamp: string
  data: Record<string, unknown>
}
```

约束：

- 所有 AgentEvent 必须持久化到 EventStore。
- EventStream 只负责实时推送，不替代 EventStore。
- `state.transition` 事件必须由 StateMachine 产生。
- 执行中事件必须包含 `turnId`。
- V1 AI 伴读不得新增 ad-hoc event string。新增事件类型必须同步更新本文件、`06-api-contract.md`、AgentEvent schema 和测试。
- Mermaid validation / repair 信息写入 `tool.done.data`、`artifact.created.data.metadata` 或 ArtifactRecord metadata。
- 前端流式渲染模块必须安全忽略未知事件，不能把未知事件解释为 AgentCore 状态事实。

---

## 17. APIResponse / RuntimeError

```ts
type APIResponse<T> = {
  ok: boolean
  data: T | null
  error: RuntimeError | null
  requestId: string
}

type RuntimeError = {
  code:
    | "RUNTIME_NOT_READY"
    | "SESSION_NOT_FOUND"
    | "PAGE_CONTEXT_REQUIRED"
    | "REQUEST_INVALID"
    | "TURN_NOT_FOUND"
    | "INTENT_UNKNOWN"
    | "TOOL_NOT_FOUND"
    | "TOOL_PERMISSION_DENIED"
    | "BUDGET_EXCEEDED"
    | "BUDGET_EXHAUSTED"
    | "CONTEXT_TOO_LARGE"
    | "APPROVAL_REQUIRED"
    | "APPROVAL_INACTIVE"
    | "APPROVAL_REJECTED"
    | "MODEL_NOT_READY"
    | "MODEL_UNAVAILABLE"
    | "FUNASR_NOT_READY"
    | "MERMAID_VALIDATION_FAILED"
    | "INVALID_TRANSITION"
    | "RUNTIME_INTERNAL_ERROR"
    | "INTERNAL_ERROR"
  message: string
  recoverable: boolean
  details?: Record<string, unknown>
}
```

---

## 18. 存储建议

### SQLite 表建议

```text
sessions
turns
messages
page_contexts
page_chunks
tool_calls
artifacts
budget_ledger
approvals
checkpoints
```

### JSONL EventLog

```text
events/{session_id}.jsonl
```

每行一个 AgentEvent。

### EventStore / EventStream

```text
EventStore: 持久化 JSONL / SQLite event table，用于 trace、replay、审计和 V2 异步处理。
EventStream: SSE / WS 推送，用于 UI 实时展示。
```

约束：

- 不允许只有 EventStream 而没有 EventStore。
- Trace API 必须从 EventStore 读取。
- V1.0-A 可先使用 InMemoryEventStore，但接口必须可替换为 JSONL / SQLite。

### Cache

```text
cache/pages/{content_hash}.json
cache/mindmaps/{artifact_id}.json
```

---

## 19. 数据保留与删除

V1 应提供：

- 清空当前 Session。
- 删除某个 Artifact。
- 删除 PageContext。
- 清空 EventLog。

默认不自动上传。
