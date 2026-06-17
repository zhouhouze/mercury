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
-> derive two-level density display plan
-> render collapsible Evidence Card Mindmap
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

EvidenceCardDisplayPolicy {
  maxDepth = 2
  density = low | medium | high
  maxVisibleThemes
  maxVisibleChildrenPerTheme
  hiddenNodeCount
}

EvidenceCardTheme {
  themeId
  nodeId
  label
  visibleChildNodeIds[]
  hiddenChildCount
  score
}
```

This is a B-local rendering model. It is not a new public Runtime contract unless promoted through V1.3-0 audit.

V1.3 Scheme A rendering rule:

- The visible mindmap surface shows only two label levels: theme nodes and direct child labels.
- Theme groups must be collapsible in the Side Panel.
- Dense pages must reduce visible theme/child count by `EvidenceCardDisplayPolicy` and expose the hidden count instead of flooding the panel.
- The original Mermaid source and source evidence remain available through fallback/debug and source panel paths.
- Theme selection is a frontend presentation concern; it must not rewrite C output or artifact truth.

Executable schema:

```text
docs/active/project/contracts/v1_3_evidence_card_mindmap.schema.json
```

Schema ownership:

- B owns `EvidenceCardViewModel` derivation and rendering.
- A/C/D must not depend on the exact `EvidenceCardViewModel` shape.
- C must continue to output mindmap tree / Mermaid / node source metadata, not React, SVG, or Evidence Card component structures.
- D remains the Artifact / Event / Trace owner.

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

State semantics:

- `ready`: node has source evidence and can show a source panel.
- `degraded`: node can render but has partial source evidence or fallback-only evidence.
- `missing_source`: node may render but must visibly explain why source evidence is unavailable.
- `located`: DOM highlight succeeded.
- `fallback-shown`: DOM highlight failed or was unavailable and excerpt fallback is shown.
- `blocked`: user action could not be completed; the UI must show a reason.
