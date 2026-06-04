# A Page Reading Architecture

## Goal

A turns a captured web page into a dense `StructuredPageContext` that D and C can consume without re-parsing raw text.

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

## Ownership

A owns structure extraction and page-level distillation only. It does not own chat turn orchestration, final assistant answers, artifacts, SSE, or mindmap generation.

## Core Rules

- Do not pass only one large `cleanedText` block to D or C.
- Every paragraph must have a stable `paragraphId`.
- Every chunk must have a stable `chunkId`, `pageId`, `order`, and text.
- Paragraphs and chunks must be traceable both ways where possible.
- `contentHash` must change when the meaningful page text changes.
- Deterministic / rule-based annotation is acceptable for V1.2.

## Failure Behavior

- Empty readable content returns a structured error for D to map to `PAGE_CONTEXT_REQUIRED` or a tool failure.
- Missing optional DOM selector data must not fail extraction.
- Failed annotation must not discard paragraphs; use `role="unknown"` and low confidence.

