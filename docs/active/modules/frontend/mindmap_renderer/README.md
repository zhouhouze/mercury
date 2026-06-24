# B Mindmap Renderer Module

Owner: B module Agent.

## Responsibility

Render Runtime mindmap artifacts as the V1.3 Evidence Card Mindmap primary view:

- derive a B-local `EvidenceCardViewModel` from `ArtifactRecord(type="mindmap")`.
- render two-level Evidence Card themes, child nodes, density hints, and source counts.
- display selected / neighbor / dimmed state and a readable source evidence panel.
- keep Mermaid visual/source as fallback and debug evidence.
- use `nodeSourceMap` and `nodeBindings` to request source jumpback or show excerpt fallback.

## Inputs

- `ArtifactRecord(type="mindmap")`.
- Mermaid source.
- `metadata.nodeSourceMap`.
- `metadata.nodeBindings`.
- source excerpts, sourceRef IDs, chunk IDs, or paragraph IDs.

## Outputs

- Evidence Card Mindmap render result.
- Mermaid visual/source fallback result.
- source evidence panel state.
- node source selection event for local UI only.

## Allowed Files

```text
apps/chrome-extension/src/modules/mindmap_renderer/
docs/active/project/stage-gates/v1.2-b-chat-renderer.md
```

## Forbidden Files

- C mindmap generation.
- Runtime artifact creation.
- D adapter or CoreProvider logic.
- direct service/API calls.

## Required Docs Before Coding

```text
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/design/v1.2-prd-coverage-matrix.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Hard Rules

- This module does not generate mindmaps.
- Runtime/C module owns Mermaid source and source map.
- Evidence Card is the primary V1.3 view; Mermaid remains fallback/debug.
- Render failure must show source fallback and must not hide source evidence.
- Node click must not mutate Runtime AgentCore state.
- DOM highlight success and fallback shown must remain visibly distinct.

## Validation Evidence

- Evidence Card view model fixture for normal, duplicate label, long label, missing source, and dense mindmap cases.
- Mermaid render failure fixture.
- `nodeSourceMap` / `nodeBindings` source fallback fixture.
- DOM jumpback request fixture and fallback state fixture.

Use `docs/active/project/MODULE_HANDOFF_TEMPLATE.md` for handoff.
