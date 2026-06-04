# V1.2 AI 伴读 Adapter 与结构化上下文合同

版本：V1.2 Adapter Contract Draft
日期：2026-06-04
适用范围：A/B/C/D 模块与轻量 MCP / Skill / API Adapter 接入

---

## 1. 合同原则

V1.2 扩展允许定义轻量 Adapter 合同，但所有 Adapter 必须接入 D 模块，由 D 统一执行 governance、budget、trace 和 ToolResult 转换。

禁止：

- Adapter 绕过 D 直接向前端输出。
- Adapter 返回自由文本。
- Adapter 绕过 PreToolUse / PostToolUse。
- 高风险 MCP / Skill / API side effect 默认执行。
- 用 Adapter 合同提前实现 V2 长期记忆、RAG 或多 Agent。

---

## 2. StructuredPageContext

```ts
type StructuredPageContext = {
  pageId: string
  sessionId: string
  url: string
  title: string
  domain: string
  capturedAt: string
  contentHash: string
  metadata: PageMetadata
  headingTree: HeadingNode[]
  paragraphs: ParagraphBlock[]
  chunks: PageChunk[]
  annotations: ParagraphAnnotation[]
  summaryDraft?: StructuredSummaryDraft
}
```

约束：

- `StructuredPageContext` 是 A 输出给 D/C 的核心事实源。
- `contentHash` 代表当前网页内容版本。
- `paragraphs` 与 `chunks` 必须可互相追溯。
- 不允许只传整段 `cleanedText` 后让 D/C 自行猜测结构。

---

## 3. PageMetadata

```ts
type PageMetadata = {
  language?: string
  contentType?: "article" | "documentation" | "readme" | "search_result" | "unknown"
  author?: string
  publishedAt?: string
  siteName?: string
  canonicalUrl?: string
  wordCount: number
  paragraphCount: number
  headingCount: number
}
```

---

## 4. HeadingNode

```ts
type HeadingNode = {
  headingId: string
  level: number
  text: string
  order: number
  parentHeadingId?: string
  paragraphIds: string[]
}
```

---

## 5. ParagraphBlock

```ts
type ParagraphBlock = {
  paragraphId: string
  pageId: string
  order: number
  text: string
  headingPath: string[]
  sourceRange?: {
    selector?: string
    startOffset?: number
    endOffset?: number
  }
  chunkId?: string
}
```

约束：

- `paragraphId` 是 Mindmap 反跳和 source excerpt fallback 的基础。
- `sourceRange.selector` 可选，不能作为唯一验收条件。
- 无法回跳 DOM 时，B 必须能用 paragraph text 展示 fallback。

---

## 6. ParagraphAnnotation

```ts
type ParagraphAnnotation = {
  paragraphId: string
  chunkId?: string
  labels: string[]
  importance: "low" | "medium" | "high"
  densityScore: number
  role:
    | "definition"
    | "argument"
    | "evidence"
    | "example"
    | "procedure"
    | "summary"
    | "metadata"
    | "unknown"
  confidence: number
}
```

约束：

- `densityScore` 范围为 `0..1`。
- `confidence` 范围为 `0..1`。
- V1.2 可以先用 deterministic / rule-based 标注。

---

## 7. StructuredSummaryDraft

```ts
type StructuredSummaryDraft = {
  format: "markdown" | "json"
  title: string
  tldr: string
  keyPoints: string[]
  structure: Array<{
    headingPath: string[]
    paragraphIds: string[]
    summary: string
  }>
  suggestedQuestions: string[]
}
```

说明：

- A 可输出 summary draft。
- 最终 assistant response 仍由 D 通过 turn 编排输出。
- B 不得直接把 draft 当成 AgentCore 最终回答。

---

## 8. AgenticLoopContext

```ts
type AgenticLoopContext = {
  sessionId: string
  turnId: string
  traceId: string
  requestId: string
  userMessage: string
  activePage?: StructuredPageContext
  recentMessages: Array<{
    messageId: string
    role: "user" | "assistant" | "tool" | "system"
    content: string
    turnId: string
  }>
  checkpoint?: {
    checkpointId: string
    summary: string
    sourceTurnId: string
  }
  adapters: AdapterSpec[]
  budget: TurnBudget
}
```

约束：

- 只支持单 Session 连续上下文。
- `recentMessages` 需要有长度和 token 预算上限。
- `checkpoint` 是上下文压缩，不是长期记忆。

---

## 9. AdapterSpec

```ts
type AdapterSpec = {
  adapterId: string
  name: string
  kind: "internal_tool" | "mcp" | "skill" | "external_api"
  capability:
    | "page_reading"
    | "summarization"
    | "question_answering"
    | "mindmap_generation"
    | "render_hint"
    | "utility"
  requiredContext: Array<"activePage" | "structuredPage" | "selection" | "recentMessages">
  riskLevel: "safe" | "approval_required" | "deny_by_default"
  inputSchemaRef?: string
  outputSchemaRef?: string
  budgetHint: BudgetCost
}
```

约束：

- MCP / Skill / External API 必须注册为 `AdapterSpec`。
- `riskLevel` 决定 governance 策略。
- `deny_by_default` 不得产生 `tool.started`。

---

## 10. AdapterInvocation

```ts
type AdapterInvocation = {
  adapterId: string
  sessionId: string
  turnId: string
  traceId: string
  requestId: string
  toolCallId: string
  input: Record<string, unknown>
  contextRefs: {
    pageId?: string
    chunkIds?: string[]
    paragraphIds?: string[]
    messageIds?: string[]
  }
}
```

---

## 11. AdapterResult

```ts
type AdapterResult = {
  adapterId: string
  toolCallId: string
  status: "succeeded" | "failed" | "denied" | "waiting_approval" | "budget_exceeded"
  content: Record<string, unknown>
  artifacts?: ArtifactRecord[]
  budgetCost: BudgetCost
  warnings: string[]
  error?: RuntimeError
}
```

AdapterResult 必须转换为既有 ToolResult envelope：

```text
AdapterResult
-> ToolResult
-> ToolCallRecord
-> ArtifactRecord optional
-> AgentEvent
```

---

## 12. Mindmap Node Source Map

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

- C 必须为主要 Mindmap 节点提供 source map。
- B 点击节点时优先 DOM 回跳；失败时展示 excerpt fallback。
- source map 写入 `ArtifactRecord.metadata.nodeSourceMap`。

---

## 13. 合同版本

V1.2 Adapter 合同版本：

```text
v1.2-adapter-contract-2026-06-04
```

任一模块修改本文件后，必须同步更新：

```text
stage-gates/v1.2-0-ai-reading-contract-and-workspace-freeze.md
06-api-contract.md 如果影响外部 API
07-data-models.md 如果影响数据模型
contracts/*.schema.json 如果进入机器校验阶段
```

---

## 14. Field Ownership

| Field | Owner | Consumers | Rule |
|---|---|---|---|
| `pageId` | A / Integration input | D, C, B via artifact metadata | Stable per captured page version. |
| `contentHash` | A | D, Integration | Changes when meaningful page content changes. |
| `headingId` | A | C | Stable within one `StructuredPageContext`. |
| `paragraphId` | A | C, B via `nodeSourceMap` | Source fallback and jump-back key. |
| `chunkId` | A | D, C, B via artifacts | Source trace key. |
| `turnId` | D | Adapter, B, Trace, Artifact | One user message creates one turn. |
| `toolCallId` | D | Adapter, Artifact, Trace | One adapter/tool call creates one ID. |
| `nodeSourceMap` | C | B | Stored under `ArtifactRecord.metadata.nodeSourceMap`. |
| `ArtifactRecord` | D / Store | B, Trace | Successful artifact-producing tools only. |
| `AgentEvent` | D / Runtime | B, EventStore | Existing event types only unless V1.2-0 reopens. |

## 15. Module Public API Contract

V1.2 module implementation must follow the module-local public API documents:

```text
services/local-runtime/navia_runtime/modules/page_reading/docs/public-api.md
services/local-runtime/navia_runtime/modules/mindmap/docs/public-api.md
services/local-runtime/navia_runtime/modules/agent_loop/docs/public-api.md
services/local-runtime/navia_runtime/modules/adapters/docs/public-api.md
apps/chrome-extension/src/modules/*_renderer/docs/public-api.md
```

Any implementation that changes these module entry contracts must update this contract document and return to V1.2-0 review before integration.

## 16. CoreProvider Contract

V1.2 D 模块采用可替换 CoreProvider 抽象：

```text
CoreProvider.run_turn(CoreTurnInput) -> CoreTurnResult
```

默认 provider 策略：

```text
mock      用于本地测试和 fallback
piagent   V1.2 首选实现目标
custom    后续扩展点
```

约束：

- piAgentProvider 必须实现 CoreProvider，不得绕过 D Adapter Layer。
- CoreProvider 输出不得直接写 ArtifactRecord、SSE、EventStore 或 UI。
- CoreProvider 请求工具时必须转换为 `AdapterInvocation`，并经过 D governance。
- A/C/B 不直接依赖 piAgent 或其他 CoreProvider。

## 17. Integration Contract Matrix

Field-level wiring is governed by:

```text
docs/navia_v1_project_docs/design/v1.2-integration-contract-matrix.md
```

Integration Codex may adapt old entrypoints to new module APIs, but must not rewrite A/B/C/D module business logic.
