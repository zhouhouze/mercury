# B Mindmap Renderer Architecture

## Goal

Mindmap Renderer displays Mermaid mindmap artifacts and provides source fallback when rendering or jump-back fails.

## Render Flow

```text
ArtifactRecord(type="mindmap")
-> read content as Mermaid source
-> render Mermaid visual
-> bind nodeSourceMap
-> support source highlight or excerpt fallback
-> show source fallback on render error
```

## Inputs

- Mindmap `ArtifactRecord`.
- `metadata.format="mermaid"`.
- `metadata.nodeSourceMap`.
- Mermaid source from artifact content.

## Outputs

- Mermaid visual when render succeeds.
- Mermaid source fallback when render fails.
- Source paragraph/chunk highlight request or excerpt fallback.

## Ownership

Mindmap Renderer owns visual rendering only. C owns Mermaid source generation. D owns artifact truth and trace.

## Core Rules

- Rendering failure must be visible.
- Source fallback must be available when DOM jump-back is unavailable.
- Renderer must not mutate artifact content.
- Renderer must not call C directly.

