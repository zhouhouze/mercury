# C Mindmap Architecture

## Goal

C turns `StructuredPageContext` into a traceable Mermaid mindmap artifact payload.

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

## Ownership

C owns generation and validation of mindmap source. B owns visual rendering. D owns orchestration, ToolResult mapping, ArtifactRecord creation, and trace emission.

## Core Rules

- Do not read Chrome DOM directly.
- Do not create final SSE events directly.
- Do not bypass D governance.
- Every major node should map to at least one paragraph or chunk when possible.
- Source fallback is mandatory when DOM jump-back cannot be performed.

