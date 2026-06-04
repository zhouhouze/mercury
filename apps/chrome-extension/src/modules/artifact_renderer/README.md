# B Artifact Renderer Module

Owner: B module Agent.

## Responsibility

Render Runtime artifacts without creating facts:

- render `ArtifactRecord` cards.
- render summary / answer / mindmap artifacts.
- render source excerpts.
- show fallback content when visual rendering fails.

## Inputs

- `ArtifactRecord`.
- artifact fixtures.
- source metadata from artifact fields.

## Outputs

- artifact card view model or renderer components.
- source excerpt fallback UI.

## Allowed Files

```text
apps/chrome-extension/src/modules/artifact_renderer/
docs/navia_v1_project_docs/stage-gates/v1.2-b-chat-renderer.md
```

## Forbidden Files

- Runtime artifact generation.
- C mindmap generation.
- D ToolResult / Artifact mapping.
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

- Artifact facts come from Runtime only.
- Renderer fallback must be visible but must not mutate Runtime state.
- Missing source metadata must be visible as a renderer limitation, not silently hidden.

## Validation Evidence

- summary artifact fixture.
- answer artifact fixture.
- mindmap artifact fixture.
- missing source fallback fixture.

Use `docs/navia_v1_project_docs/MODULE_HANDOFF_TEMPLATE.md` for handoff.
