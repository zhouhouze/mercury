# B Mindmap Renderer Architecture

## Goal

Mindmap Renderer displays mindmap artifacts and provides source fallback when rendering or jump-back fails.

V1.3 adds Evidence Card Mindmap as the primary rendering experience. Mermaid remains the fallback / debug representation.

## Render Flow

```text
ArtifactRecord(type="mindmap")
-> read content as Mermaid source
-> read metadata.nodeSourceMap / nodeBindings
-> derive EvidenceCardViewModel
-> render Evidence Card Mindmap
-> support selected / hover / neighbor highlight
-> open source evidence panel
-> support source highlight or excerpt fallback
-> show Mermaid source fallback on render error or missing metadata
```

## Inputs

- Mindmap `ArtifactRecord`.
- `metadata.format="mermaid"`.
- `metadata.nodeSourceMap`.
- Mermaid source from artifact content.
- Optional sourceRefIds / textQuote / fallbackText / quality metadata already carried by artifact metadata.

## Outputs

- Evidence Card Mindmap when metadata is sufficient.
- Mermaid visual or source fallback when Evidence Card metadata is insufficient.
- Mermaid source fallback when render fails.
- Source paragraph/chunk highlight request or excerpt fallback.

## Ownership

Mindmap Renderer owns visual rendering and local UI state only. C owns Mermaid source generation and node source mapping. D owns artifact truth and trace.

## Core Rules

- Rendering failure must be visible.
- Source fallback must be available when DOM jump-back is unavailable.
- Renderer must not mutate artifact content.
- Renderer must not call C directly.
- Renderer must not generate facts, summaries, mindmap structure, ArtifactRecord, EventStore entries, or Trace.
- Evidence Card view model must be derived from ArtifactRecord + metadata only.
- Missing source evidence must be visible as degraded state, not hidden.

## V1.3 Evidence Card Model

The frontend may derive a local view model:

```text
EvidenceCardNode {
  nodeId
  label
  note?
  depth
  parentNodeId?
  childNodeIds[]
  sourceRefIds[]
  sourceCount
  confidence?
  qualityState = ready | degraded | missing_source
  tags[]
  textQuote?
  fallbackText?
}
```

This is a B-local rendering model. It is not a new public Runtime contract unless promoted through V1.3-0 audit.

## Interaction States

Required visible states:

- default
- hover
- focus
- selected
- neighbor-highlighted
- dimmed
- locating
- located
- fallback-shown
- blocked
