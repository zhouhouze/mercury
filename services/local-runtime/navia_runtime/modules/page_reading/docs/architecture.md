# A Page Perception / AgentCore Eyes Architecture

## Goal

A turns a captured page into a dense `StructuredPageContext` that D and C can consume without re-parsing raw text. A is the perception layer for AgentCore: it recognizes facts, assigns source references, and leaves reasoning or action to D.

Companion gap map:

```text
docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.drawio
docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.md
```

## Current vs Target Gap

| Area | Current baseline | Target architecture |
|---|---|---|
| Page representation | `PageContext`, headings, `cleanedText`, optional chunks | `StructuredPageContext` with stable paragraphs, chunks, annotations, source refs, and density metadata |
| Text structure | Mostly raw or lightly cleaned text | Heading tree, paragraph blocks, chunk graph, region hints |
| Image-rich pages | No stable perception contract | DOM-readable image metadata only: alt, caption, title, aria-label, nearby text |
| OCR | Not implemented | Contract planning only in `A-V1.0-3`; execution must route through future governed D adapters |
| Tables / lists / code | Not guaranteed as first-class blocks | Planned first-class block recognition in `A-V1.0-4` |
| Video / live | Out of V1.2 implementation scope | `A-V2.0-*` planning records only |

## Runtime Flow

```text
captured PageContext / HTML fixture
-> normalize metadata
-> clean visible text
-> build heading tree
-> split paragraph blocks
-> create chunks
-> annotate paragraphs
-> produce optional StructuredSummaryDraft
-> return StructuredPageContext
```

Target internal components:

| Component | Responsibility |
|---|---|
| Input normalizer | Normalize URL/title/domain/session/page IDs and detect empty readable content |
| Text cleaner | Remove obvious boilerplate while preserving source order |
| Heading builder | Build heading tree and heading paths |
| Paragraph builder | Split stable paragraph blocks with `paragraphId`, `order`, text, and heading path |
| Chunk builder | Create semantic chunks with stable `chunkId`, page order, and paragraph references |
| Annotation engine | Add deterministic role, importance, density score, confidence, and warnings |
| Summary draft builder | Optional structured page-level draft for downstream D/C use; not a final answer |

Future perception routes are planned but not implemented in the current V1.2 code path:

```text
image / figure metadata
-> OCR planning boundary
-> table / list / code block recognition
-> video / live perception planning
```

## Inputs

- `pageId`, `sessionId`, `url`, `title`, `domain`, `capturedAt`.
- Existing V1 `PageContext` fields such as `headings`, `selectedText`, `visibleText`, `cleanedText`, `chunks`.
- Real HTML fixtures for module validation.

## Outputs

- `StructuredPageContext`.
- `ParagraphBlock[]`.
- `PageChunk[]`.
- `ParagraphAnnotation[]`.
- Optional `StructuredSummaryDraft`.
- Future planned `ImageBlock[]`, `OcrTextBlock[]`, `TableBlock[]`, and media timeline contracts after V1.2-0 review.

## Ownership

A owns structure extraction and page-level distillation only. It does not own chat turn orchestration, final assistant answers, artifacts, SSE, or mindmap generation.

A also owns perception contract planning for images, OCR, tables, code blocks, video, and live streams. A does not directly execute OCR engines, vision models, video stream analysis, live stream analysis, MCP, Skill, or external APIs.

## Module Relationships

```text
Chrome Extension PageContext
-> A build_structured_page_context(input)
-> StructuredPageContext
   |-> D CoreProvider + Adapter Layer consumes it for CoreTurnInput
   |-> C Mindmap consumes it for Mermaid source and source map
   `-> B only renders downstream SSE / artifacts and must not mutate A output
```

Integration Codex owns wiring A output into Runtime session state. A module development must stay inside `services/local-runtime/navia_runtime/modules/page_reading/`.

## Core Rules

- Do not pass only one large `cleanedText` block to D or C.
- Every paragraph must have a stable `paragraphId`.
- Every chunk must have a stable `chunkId`, `pageId`, `order`, and text.
- Paragraphs and chunks must be traceable both ways where possible.
- `contentHash` must change when the meaningful page text changes.
- Deterministic / rule-based annotation is acceptable for V1.2.
- Image content may only be described from DOM-readable metadata such as alt, caption, title, aria-label, nearby text, or approved OCR output.
- OCR, vision, video, and live engines must be future governed Adapter capabilities, not direct A calls.
- A must not create `ArtifactRecord`, emit SSE, write EventStore, call D/C/B, or call external tools.
- Public contract changes must return to V1.2-0 instead of being made locally inside A.

## Failure Behavior

- Empty readable content returns a structured error for D to map to `PAGE_CONTEXT_REQUIRED` or a tool failure.
- Missing optional DOM selector data must not fail extraction.
- Failed annotation must not discard paragraphs; use `role="unknown"` and low confidence.
- Image blocks without DOM-readable metadata or approved OCR input must remain unknown; A must not hallucinate image content.
