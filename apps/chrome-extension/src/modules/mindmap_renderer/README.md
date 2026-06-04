# B Mindmap Renderer Module

Owner: B module Agent.

## Responsibility

Render Mermaid mindmap artifacts produced by Runtime:

- render Mermaid artifact content.
- display source fallback on render failure.
- use `nodeSourceMap` to highlight source paragraph or show excerpt fallback.

## Inputs

- `ArtifactRecord(type="mindmap")`.
- Mermaid source.
- `metadata.nodeSourceMap`.
- source excerpts or paragraph IDs.

## Outputs

- Mermaid visual render result.
- source fallback result.
- node source selection event for local UI only.

## Allowed Files

```text
apps/chrome-extension/src/modules/mindmap_renderer/
docs/navia_v1_project_docs/stage-gates/v1.2-b-chat-renderer.md
```

## Forbidden Files

- C mindmap generation.
- Runtime artifact creation.
- D adapter or CoreProvider logic.
- direct service/API calls.

## Required Docs Before Coding

```text
docs/navia_v1_project_docs/V1_2_AGENT_WORKPACKS.md
docs/navia_v1_project_docs/contracts/v1_2_adapter_contracts.md
docs/navia_v1_project_docs/design/v1.2-prd-coverage-matrix.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Hard Rules

- This module does not generate mindmaps.
- Runtime/C module owns Mermaid source and source map.
- Render failure must show source fallback.
- Node click must not mutate Runtime AgentCore state.

## Validation Evidence

- successful Mermaid render fixture.
- Mermaid render failure fixture.
- `nodeSourceMap` source fallback fixture.

Use `docs/navia_v1_project_docs/MODULE_HANDOFF_TEMPLATE.md` for handoff.
