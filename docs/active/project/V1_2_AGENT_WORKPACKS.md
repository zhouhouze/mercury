# V1.2 Agent Workpacks

This document gives copyable module briefs for independent V1.2 implementation agents.

## A Workpack: Page Reading

Goal:

- Convert the current page into `StructuredPageContext`.
- Produce paragraphs, chunks, annotations, heading tree, content hash, and optional summary draft.

Allowed directory:

```text
services/local-runtime/navia_runtime/modules/page_reading/
docs/active/project/stage-gates/v1.2-a-page-reading.md
```

Inputs:

- existing `PageContext`.
- real HTML fixture or real Chrome page context.

Outputs:

- `StructuredPageContext`.
- `ParagraphAnnotation[]`.
- `PageChunk[]`.
- optional `StructuredSummaryDraft`.

No-Go:

- Do not call MCP, Skill, External API, CoreProvider, or frontend modules.
- Do not create final assistant response or artifact directly.
- Do not change public contracts without V1.2-0.

Evidence:

- `tests/evidence/*.structured-page.json`.
- fixture coverage for article, docs, and GitHub README style pages.

## B Workpack: Renderer

Goal:

- Render Runtime SSE, structured summary, tool state, artifacts, debug diagnostics, and mindmap source fallback.

Allowed directories:

```text
apps/chrome-extension/src/modules/chat_renderer/
apps/chrome-extension/src/modules/artifact_renderer/
apps/chrome-extension/src/modules/debug_renderer/
apps/chrome-extension/src/modules/mindmap_renderer/
docs/active/project/stage-gates/v1.2-b-chat-renderer.md
```

Inputs:

- `AgentEvent` SSE.
- `ArtifactRecord`.
- renderer fixtures.

Outputs:

- UI view models or renderer components.
- visible offline, missing context, tool failure, Mermaid failure states.

No-Go:

- Do not call A/C/D, MCP, Skill, or External API directly.
- Do not own AgentCore state.
- Do not generate summary, answer, or mindmap.

Evidence:

- recorded SSE fixture replay.
- renderer evidence for `response.delta`, `artifact.created`, unknown event, failure states.

## C Workpack: Mindmap

Goal:

- Generate Mermaid mindmap source from `StructuredPageContext`.
- Validate Mermaid, repair at most once, and produce `MindmapNodeSourceMap`.

Allowed directory:

```text
services/local-runtime/navia_runtime/modules/mindmap/
docs/active/project/stage-gates/v1.2-c-mindmap.md
```

Inputs:

- A output: `StructuredPageContext`.

Outputs:

- mindmap artifact content.
- `metadata.format="mermaid"`.
- `metadata.nodeSourceMap`.
- `sourcePageId`, `sourceChunkIds`, `paragraphIds`.

No-Go:

- Do not extract page text yourself.
- Do not write frontend UI.
- Do not add ad-hoc event types.
- Do not change ArtifactRecord shape without V1.2-0.

Evidence:

- `tests/evidence/*.mindmap.json`.
- Mermaid validation result.
- source map coverage for primary nodes.

## D Workpack: CoreProvider / Adapter Layer

Goal:

- Define the stable boundary between Navia Runtime and replaceable Agent Core providers.
- Implement mock-first CoreProvider behavior and adapter governance/mapping contracts.

Allowed directories:

```text
services/local-runtime/navia_runtime/modules/agent_loop/
services/local-runtime/navia_runtime/modules/adapters/
docs/active/project/stage-gates/v1.2-d-agentic-loop.md
```

Inputs:

- user message.
- active structured page.
- recent messages.
- adapter specs.
- budget and governance config.

Outputs:

- `CoreTurnInput`.
- `CoreTurnResult`.
- `ToolResult`.
- `ToolCallRecord`.
- `ArtifactRecord`.
- `AgentEvent`.
- traceable turn evidence.

Required strategy:

- Implement `MockCoreProvider` first for deterministic tests.
- Define `piAgentProvider` adapter contract.
- Do not implement real piAgent integration until repo, version or commit, license, runtime, and tool invocation model are locked.

No-Go:

- Do not let CoreProvider write ArtifactRecord, SSE, EventStore, Trace, or UI directly.
- Do not bypass governance before adapter/tool execution.
- Do not introduce RAG, long-term memory, multi-agent, browser automation, or default file access.

Evidence:

- fake adapter turn evidence.
- denied adapter evidence with no `tool.started`.
- trace by `turn_id` with state, budget, tool, artifact, response, and error coverage.

## Integration Workpack

Goal:

- Wire A/B/C/D into existing entrypoints and prove real end-to-end behavior.

Allowed areas:

- files listed in `docs/active/project/stage-gates/v1.2-e-integration.md`.

Responsibilities:

- Connect `pageContext` to A.
- Store A output as active page context.
- Connect D adapter registry to C.
- Connect D SSE/artifacts to B renderers.
- Run real Chrome E2E and PRD review.

No-Go:

- Do not rewrite A/B/C/D business logic for wiring convenience.
- Do not pass mock-only evidence as real E2E.
- Do not ignore missing trace or artifact source chain.

Evidence:

- real page read.
- summary stream.
- follow-up QA.
- mindmap artifact and renderer fallback.
- trace by `turn_id`.
- updated PRD coverage matrix evidence paths.

