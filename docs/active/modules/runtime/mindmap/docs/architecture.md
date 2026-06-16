# C Mindmap Architecture

## Goal

C turns `StructuredPageContext` into a traceable Mermaid mindmap artifact payload.

For V1.3, C continues to own structure and source mapping only. Evidence Card Mindmap is a B renderer responsibility derived from C/D artifact metadata.

## Runtime Flow

```text
StructuredPageContext
-> select source headings / paragraphs / chunks
-> build mindmap tree
-> generate Mermaid source
-> validate Mermaid
-> repair at most once
-> produce nodeSourceMap
-> return artifact-ready content and metadata
```

## Inputs

- `StructuredPageContext`.
- `ParagraphAnnotation[]`.
- `PageChunk[]`.
- Optional intent hint from D.

## Outputs

- Mermaid source string.
- `metadata.format = "mermaid"`.
- `metadata.nodeSourceMap`.
- `sourceChunkIds`.
- `paragraphIds`.
- Stable node ids and node bindings sufficient for B to derive Evidence Card nodes.

## Ownership

C owns generation and validation of mindmap source. B owns visual rendering. D owns orchestration, ToolResult mapping, ArtifactRecord creation, and trace emission.

## Core Rules

- Do not read Chrome DOM directly.
- Do not create final SSE events directly.
- Do not bypass D governance.
- Every major node should map to at least one paragraph or chunk when possible.
- Source fallback is mandatory when DOM jump-back cannot be performed.
- C must not output React, SVG, CSS, or frontend-only component structures for V1.3.
- C should preserve stable node ids so B can bind Evidence Card interactions to `nodeSourceMap`.
