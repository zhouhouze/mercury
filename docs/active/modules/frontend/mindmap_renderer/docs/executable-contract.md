# B Mindmap Renderer Executable Contract

## V1.3 Schema

V1.3 uses the project-level executable schema:

```text
docs/active/project/contracts/v1_3_evidence_card_mindmap.schema.json
```

`EvidenceCardViewModel` is B-local. It must be derived from `ArtifactRecord(type="mindmap")` and artifact metadata only.

## Required Assertions

- valid Mermaid source produces render success or controlled fallback.
- invalid Mermaid source shows a short error message without source fallback.
- node source lookup resolves paragraph/chunk IDs or excerpt.
- missing `nodeSourceMap` does not block the render surface.
- renderer never claims backend generation success.
- Evidence Card Mindmap is the primary view when metadata is sufficient.
- Mermaid visual/source is fallback or debug only.
- every major Evidence Card node has either source evidence or a visible degraded reason.
- source panel displays `textQuote` or `fallbackText`.
- duplicate labels keep distinct `nodeId` and source bindings.
- long node labels are truncated or wrapped without overflowing Side Panel width.
- Evidence Card visible surface is capped to two label levels by `displayPolicy.maxDepth=2`.
- theme groups can be collapsed and expanded without losing node/source selection state.
- high-density artifacts expose hidden node counts instead of rendering every node into the narrow Side Panel.
- DOM success, fallback shown, and blocked states are distinct in the UI model.
- renderer never calls A/C/D services directly.
- renderer never generates facts, ArtifactRecord, EventStore entries, Trace entries, summary, answer, or mindmap structure.

## Required V1.3 Report Assertions

- `report.json` conforms to `V13EvidenceCardAcceptanceReport`.
- `summary.pagesTotal >= 8`.
- `summary.nativeSidePanelSamples >= 3`.
- every screenshot evidence item has `isNativeSidePanel=true`, `containsWebPageBody=true`, `containsNaviaPanel=true`, and `containsEvidenceCardMindmap=true`.
- fallback samples are never labeled as DOM success.
- the only allowed completion claim is `V1.3 Evidence Card Mindmap experience complete`.

## Test Command Placeholder

```bash
pnpm --dir apps/chrome-extension test -- mindmap_renderer
```
