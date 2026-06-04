# A Page Reading Service Module

Owner: A module Codex.

Responsibility:

- Web page extraction.
- Text cleanup.
- Heading tree.
- Paragraph blocks.
- Semantic chunks.
- Paragraph annotations.
- Structured summary draft.

Internal structure:

```text
docs/
contracts/
runtime/
tests/
fixtures/
```

Output contract:

- `StructuredPageContext`
- `ParagraphAnnotation[]`
- `PageChunk[]`
- `StructuredSummaryDraft`

Do not edit existing runtime or extension entrypoints directly. Integration Codex owns wiring into `app.py`, `pageContext.ts`, and related entrypoints.
