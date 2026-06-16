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

## 8. A High-Signal Public Contracts Used By A-V1.2

A-V1.2 复用已经验证过的 high-signal 合同作为公共消费基线。历史 schemaVersion 仍保留 `a-v1.1-*`，这是兼容 wire shape，不代表当前开发阶段退回 A-V1.1。

原 A-V1.1 审计结论仍然有效：

```text
HighSignalPageContext / PerceptionDigest / SourceMap / PagePerceptionQualityReport
must be public contracts before D/C can consume them.
```

这些合同是 `StructuredPageContext` 的高信号视图和评估层，不替代 `StructuredPageContext`。A 必须继续保留完整结构化上下文；D/C 可在 `qualityReport.downstreamReadiness = "pass"` 时优先消费 high-signal 视图。A-V1.2 在此基础上新增 `DebugEvidenceBundle`、corpus、gold review 和 extractor comparison 合同。

### 8.1 HighSignalPageContext

```ts
type HighSignalPageContext = {
  schemaVersion: "a-v1.1-high-signal-2026-06-05"
  pageId: string
  sessionId: string
  contentHash: string
  sourceStructuredPageRef: {
    pageId: string
    contentHash: string
  }
  metadata: PageMetadata
  highSignalBlocks: HighSignalBlock[]
  filteredBlocks: FilteredBlockEvidence[]
  sourceMapRef: string
  digestRef?: string
  qualityReportRef: string
  status: "ready" | "degraded" | "failed"
  warnings: string[]
}
```

约束：

- `ready`：D/C 可作为高信号上下文消费。
- `degraded`：只能作为 fallback 或 Debug evidence，D/C 不得作为主上下文。
- `failed`：不得进入 D/C high-signal consumption。
- `HighSignalPageContext` 必须回指同一 `pageId` / `contentHash` 的 `StructuredPageContext`。

### 8.2 HighSignalBlock

```ts
type HighSignalBlock = {
  blockId: string
  pageId: string
  contentHash: string
  blockType:
    | "paragraph"
    | "chunk"
    | "heading"
    | "image"
    | "table"
    | "table_cell"
    | "code"
    | "list_item"
    | "quote"
  order: number
  text: string
  paragraphIds: string[]
  chunkIds: string[]
  sourceRefs: SourceRef[]
  regionType:
    | "main"
    | "article"
    | "section"
    | "metadata"
    | "aside"
    | "nav"
    | "footer"
    | "recommendation"
    | "comment"
    | "ad_like"
    | "unknown"
  contentDensityScore: number
  noiseScore: number
  importance: number
  confidence: number
  warnings: string[]
}
```

约束：

- `contentDensityScore`、`noiseScore`、`importance`、`confidence` 范围为 `0..1`。
- `highSignalBlocks` 不得只是 `cleanedText` 的复制。
- 任一 block 进入 high-signal 输出时必须至少有一个 `SourceRef`。

### 8.3 FilteredBlockEvidence

```ts
type FilteredBlockEvidence = {
  blockId: string
  pageId: string
  contentHash: string
  blockType: HighSignalBlock["blockType"]
  order: number
  textQuote: string
  textHash: string
  regionType: HighSignalBlock["regionType"]
  noiseScore: number
  reason:
    | "navigation"
    | "footer"
    | "aside"
    | "recommendation"
    | "comment"
    | "ad_like"
    | "duplicate"
    | "low_signal"
    | "unknown"
  sourceRefs: SourceRef[]
}
```

约束：

- 被过滤或降权内容必须留下 evidence，避免不可审计删除。
- `filteredBlocks` 只能用于 Debug / audit，不得作为 D/C 主输入。

### 8.4 SourceMap and SourceRef

```ts
type SourceMap = {
  sourceMapId: string
  pageId: string
  contentHash: string
  sourceRefs: SourceRef[]
}

type SourceRef = {
  sourceRefId: string
  pageId: string
  contentHash: string
  blockId: string
  blockType:
    | "paragraph"
    | "chunk"
    | "heading"
    | "image"
    | "table"
    | "table_cell"
    | "code"
    | "list_item"
    | "quote"
  order: number
  paragraphId?: string
  chunkId?: string
  headingPath?: string[]
  textQuote: string
  textHash: string
  selector?: string
  domPath?: string
  startOffset?: number
  endOffset?: number
  fallbackText: string
  confidence: number
}
```

约束：

- DOM selector / `domPath` 不得作为唯一反跳机制。
- 每个 `SourceRef` 必须有 `textQuote` 或 `fallbackText`。
- B 回跳失败时必须能展示 `fallbackText` / `textQuote` 证据卡片。
- `confidence` 范围为 `0..1`。

### 8.5 PerceptionDigest

```ts
type PerceptionDigest = {
  digestId: string
  pageId: string
  contentHash: string
  items: PerceptionDigestItem[]
  rejectedItems: Array<{
    itemId: string
    text: string
    reason: "missing_source_ref" | "low_confidence" | "duplicate" | "low_signal"
    warnings: string[]
  }>
  summary: {
    tldr: string
    keyTakeaways: string[]
  }
  stats: {
    itemCount: number
    sourceRefCount: number
    compressionRatio: number
  }
}

type PerceptionDigestItem = {
  itemId: string
  kind:
    | "key_fact"
    | "entity"
    | "claim"
    | "evidence"
    | "definition"
    | "procedure"
    | "open_question"
    | "table_fact"
    | "code_fact"
    | "image_metadata"
  text: string
  importance: number
  confidence: number
  sourceRefs: SourceRef[]
  relatedParagraphIds: string[]
  relatedChunkIds: string[]
  warnings: string[]
}
```

约束：

- 每个 `PerceptionDigestItem` 必须有 `sourceRefs`。
- 没有来源的候选条目只能进入 `rejectedItems`，不得进入 `items`。
- A 不得把 digest 当作最终 assistant answer。

### 8.6 PagePerceptionQualityReport

```ts
type PagePerceptionQualityReport = {
  reportId: string
  pageId: string
  contentHash: string
  overallScore: number
  metrics: {
    noiseRatio: QualityMetric
    contentCoverage: QualityMetric
    sourceCoverage: QualityMetric
    groundingCompleteness: QualityMetric
    jumpbackCoverage: QualityMetric
    digestCompressionRatio: QualityMetric
    candidateFactDensity: QualityMetric
  }
  downstreamReadiness: "pass" | "degraded" | "fail"
  fatalIssues: QualityIssue[]
  warnings: QualityIssue[]
}

type QualityMetric = {
  value: number
  numerator?: number
  denominator?: number
  method: string
  threshold?: number
  passed: boolean
}

type QualityIssue = {
  code: string
  message: string
  severity: "warning" | "major" | "fatal"
  relatedIds: string[]
}
```

Metric formulas:

| Metric | Formula |
|---|---|
| `noiseRatio` | `filteredOrDowngradedNoiseBlocks / allDetectedBlocks` |
| `contentCoverage` | `highSignalContentChars / readableContentChars` |
| `sourceCoverage` | `highSignalBlocksWithSourceRef / highSignalBlocksTotal` |
| `groundingCompleteness` | `digestItemsWithSourceRefs / digestItemsTotal` |
| `jumpbackCoverage` | `sourceRefsWithTextQuoteOrFallbackText / sourceRefsTotal` |
| `digestCompressionRatio` | `digestTextTokenEstimate / structuredPageTextTokenEstimate` |
| `candidateFactDensity` | `digestCandidateFactItems / digestTokenEstimate` |
| `compressionScore` | `1 - min(abs(digestCompressionRatio - 0.22) / 0.22, 1)` |
| `overallScore` | `0.20*sourceCoverage + 0.20*groundingCompleteness + 0.15*jumpbackCoverage + 0.15*(1-noiseRatio) + 0.10*contentCoverage + 0.10*compressionScore + 0.10*candidateFactDensity` |

Default thresholds:

```text
overallScore >= 0.75
sourceCoverage >= 0.95
groundingCompleteness >= 0.95
jumpbackCoverage >= 0.95
noiseRatio <= 0.25
downstreamReadiness = pass
```

约束：

- `QualityReport` 不得写死 pass。
- 每个参与 `overallScore` 的 metric 必须提供 `method`，并尽量提供 numerator / denominator。
- `candidateFactDensity` 是 deterministic proxy，不代表事实真伪验证。

### 8.7 CandidateExtractionResult

```ts
type CandidateExtractionResult = {
  extractorName: "trafilatura" | "readabilipy" | "readability_lxml" | "dom_baseline"
  version?: string
  title?: string
  text?: string
  metadata?: Record<string, unknown>
  blocks?: CandidateBlock[]
  confidence?: number
  warnings: string[]
}

type CandidateBlock = {
  candidateBlockId: string
  order: number
  text: string
  blockType?: string
  metadata?: Record<string, unknown>
}
```

约束：

- Candidate extractor 输出不得直接暴露给 D/C/B。
- Candidate extractor 输出不得直接写入 final `HighSignalPageContext`。
- A Pipeline 必须把 candidate output 映射回 A-owned block graph 和 `SourceMap`。
- 第三方库不可用时，A 必须 fallback 到 `dom_baseline`。

### 8.8 A-V1.2-0 Contract Freeze Closure

Public vs module-local decision:

```text
HighSignalPageContext
PerceptionDigest
SourceMap / SourceRef
PagePerceptionQualityReport
```

These are public A contracts. D/C/B may consume their exact shape only through this contract and only when `PagePerceptionQualityReport.downstreamReadiness = "pass"`. When readiness is `degraded`, D/C/B may use them only as fallback or Debug evidence. When readiness is `fail`, D/C/B must fall back to `StructuredPageContext` or return `PAGE_CONTEXT_REQUIRED`.

A-V1.2 adds public evidence contracts for stage acceptance:

```text
DebugEvidenceBundle
CorpusPageRecord
GoldEvaluationRecord
ExtractorComparisonReport
ExtractorCandidateScore
```

These are validated by:

```text
docs/active/project/contracts/a_v1_2_page_perception.schema.json
```

A-V1.2 final corpus rules:

- Final counted corpus pages must have `snapshotPath`; URL-only records are planning-only and cannot count toward A-V1.2 final acceptance.
- Final counted corpus pages must have `goldStatus = "reviewed"` or `goldStatus = "semi_auto_accepted"`.
- `planned` and `annotated` pages cannot count toward final pass rate.
- Low-signal pages must be `degraded` or `fail`; they cannot be marked `pass`.

Quality formula closure:

- `QualityMetric.numerator`, `denominator`, `method`, `threshold`, `passed`, and `denominatorZeroBehavior` are required.
- Denominator-zero behavior must be one of `pass_when_empty`, `fail_when_empty`, `degrade_when_empty`, or `not_applicable`.
- `overallScore` formula and weights are frozen in the A-V1.2 schema and must not be adjusted to pass a corpus.

Extractor selection closure:

- Candidate score formula is `0.35*sourceRefCoverage + 0.25*(1-estimatedNoiseRatio) + 0.20*headingCoverage + 0.20*mainTextCoverage`.
- `mainTextCoverage` is a normalized `Score`: `candidate.mainTextChars / max(mainTextChars among available candidates on the same page)`.
- If every available candidate has `mainTextChars = 0`, `mainTextCoverage = 0` for every candidate and low-main-text rejection / degraded-or-fail rules apply.
- `mainTextChars` remains the raw character count and is only used as a tie-breaker after score, `dom_baseline`, and `sourceRefCoverage`.
- Winner selection is highest score.
- Tie breaker is `highest_score_then_dom_baseline_then_sourceRefCoverage_then_mainTextChars`.
- Any unavailable, failed, unapproved, high-noise, low-source-coverage, or low-main-text candidate must be marked rejected.
- If all non-DOM candidates fail or are rejected, `dom_baseline` is the required fallback.

Dependency enforcement:

- `trafilatura`, `readability-lxml`, `readabilipy`, or equivalent extractor dependencies must not be installed until `docs/active/modules/runtime/page_reading/docs/a-v1.2-extractor-dependency-audit.md` exists and the relevant package has `decision=approved`.

## 9. AgenticLoopContext

```ts
type AgenticLoopContext = {
  sessionId: string
  turnId: string
  traceId: string
  requestId: string
  userMessage: string
  activePage?: StructuredPageContext
  highSignalPage?: HighSignalPageContext
  perceptionDigest?: PerceptionDigest
  sourceMap?: SourceMap
  qualityReport?: PagePerceptionQualityReport
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

## 10. AdapterSpec

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

## 11. AdapterInvocation

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

## 12. AdapterResult

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

## 13. Mindmap Node Source Map

```ts
type MindmapNodeSourceMap = Record<
  string,
  {
    nodeLabel: string
    digestItemIds?: string[]
    sourceRefIds?: string[]
    paragraphIds: string[]
    chunkIds: string[]
    excerpt: string
    textQuote?: string
    fallbackText: string
    jumpback:
      | {
          mode: "dom"
          selector?: string
          domPath?: string
          startOffset?: number
          endOffset?: number
        }
      | {
          mode: "fallback"
          reason:
            | "selector_missing"
            | "selector_failed"
            | "source_ref_missing"
            | "low_signal"
            | "unsupported"
        }
  }
>
```

约束：

- C 必须为 root 和主要 Mindmap 节点提供 source map。
- 当前 AC 阶段中，C 在 `qualityReport.downstreamReadiness = "pass"` 时必须优先使用 `PerceptionDigest.items` 与 A `SourceRef` 生成节点；`headingTree` / paragraph fallback 只能作为降级路径。
- `sourceRefIds` 优先指向 A `SourceMap.sourceRefs`；没有可用 SourceRef 时必须写明 fallback reason。
- `paragraphIds` / `chunkIds` 保留用于兼容旧 StructuredPageContext 和 DOM 回跳失败 fallback。
- B 点击节点时优先 DOM 回跳；失败时展示 `fallbackText` / `textQuote` 证据卡片。
- `fallbackText` 必填，DOM selector / domPath 不得作为唯一反跳机制。
- source map 写入 `ArtifactRecord.metadata.nodeSourceMap`。

### 13.1 V1.2-AC-Jumpback MVP 点击绑定合同

V1.2-AC-Jumpback MVP 复用 `ArtifactRecord.metadata.nodeSourceMap`，但需要额外冻结前端点击绑定和 content script 定位结果。除非回到 V1.2-0，不新增 top-level `ArtifactRecord` 字段。

```ts
type MindmapNodeBinding = {
  nodeId: string
  nodeSourceMapKey: string
  nodeLabel: string
  mermaidLineIndex: number
  sourceRefIds: string[]
  paragraphIds: string[]
  chunkIds: string[]
}

type MindmapJumpbackMetadata = {
  nodeSourceMap: MindmapNodeSourceMap
  nodeBindings: MindmapNodeBinding[]
}
```

约束：

- `nodeBindings[].nodeSourceMapKey` 必须存在于 `nodeSourceMap`。
- `nodeId` 必须稳定，建议使用 `root`、`node_1`、`node_2` 这类 deterministic id。
- `mermaidLineIndex` 从 `mermaidSource` 的非空行计算，`root` 为 `1`，第一个主节点为 `2`。
- B 的点击事件不得只靠节点文本匹配；必须优先使用 `nodeId` 或 `nodeSourceMapKey`。
- 如果 Mermaid renderer 无法暴露原生 node id，B 可以用 `nodeBindings` 的顺序与渲染节点顺序做受控 fallback，但验收报告必须记录该策略。

```ts
type SourceEvidenceCard = {
  nodeId: string
  nodeLabel: string
  sourceRefIds: string[]
  textQuote?: string
  fallbackText: string
  fallbackReason?: string
  jumpbackMode: "dom" | "fallback"
}

type JumpbackRequest = {
  requestId: string
  pageId: string
  contentHash?: string
  nodeId: string
  sourceRefIds: string[]
  selector?: string
  domPath?: string
  textQuote?: string
  fallbackText: string
  strategies: Array<"selector" | "domPath" | "textQuote">
}

type JumpbackResult = {
  requestId: string
  nodeId: string
  status: "highlighted" | "fallback_shown" | "blocked"
  attemptedStrategies: Array<"selector" | "domPath" | "textQuote">
  matchedStrategy?: "selector" | "domPath" | "textQuote"
  failureReason?:
    | "selector_not_found"
    | "dom_path_not_found"
    | "text_quote_not_found"
    | "page_changed"
    | "missing_permission"
    | "unsupported_page"
    | "runtime_error"
  highlightedText?: string
}
```

约束：

- `JumpbackRequest` 只能由用户点击 Mindmap 节点触发。
- content script 策略顺序必须是 `selector -> domPath -> textQuote`。
- DOM 定位失败不得静默失败；必须返回 `JumpbackResult.status = "fallback_shown"` 或 `"blocked"` 并带 `failureReason`。
- B 必须在 `highlighted`、`fallback_shown`、`blocked` 三种结果下都展示 `SourceEvidenceCard`。
- source fallback 文本展示不得被标记为 DOM 反跳成功。

---

## 14. 合同版本

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

## 15. Field Ownership

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
| `HighSignalPageContext` | A | D, C, Integration, B Debug | Public after A-V1.2-0 freeze; D/C consume only when quality readiness passes. |
| `PerceptionDigest` | A | D, C, B Debug | Every item must have source refs. |
| `SourceMap` / `SourceRef` | A | C, B, D | DOM selector is optional; text fallback is mandatory. |
| `PagePerceptionQualityReport` | A | D, Integration, B Debug | Must be computed, not hard-coded pass. |
| `CandidateExtractionResult` | A internal | A only | Must not be exposed as final Navia contract. |
| `ArtifactRecord` | D / Store | B, Trace | Successful artifact-producing tools only. |
| `AgentEvent` | D / Runtime | B, EventStore | Existing event types only unless V1.2-0 reopens. |

## 16. Module Public API Contract

V1.2 module implementation must follow the module-local public API documents:

```text
docs/active/modules/runtime/page_reading/docs/public-api.md
docs/active/modules/runtime/mindmap/docs/public-api.md
docs/active/modules/runtime/agent_loop/docs/public-api.md
docs/active/modules/runtime/adapters/docs/public-api.md
docs/active/modules/frontend/*_renderer/docs/public-api.md
```

Any implementation that changes these module entry contracts must update this contract document and return to V1.2-0 review before integration.

## 17. CoreProvider Contract

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

## 18. Integration Contract Matrix

Field-level wiring is governed by:

```text
docs/active/project/design/v1.2-integration-contract-matrix.md
```

Integration Codex may adapt old entrypoints to new module APIs, but must not rewrite A/B/C/D module business logic.
