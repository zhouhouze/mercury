# B Debug Renderer Module

Owner: B module Agent.

## Responsibility

Render diagnostics outside the primary Chat experience:

- Runtime online/offline state.
- PageContext diagnostics.
- trace diagnostics.
- unknown SSE/event diagnostics.

## Inputs

- Runtime status.
- debug signals from B renderers.
- recorded diagnostic fixtures.

## Outputs

- debug panel view model or renderer components.
- visible runtime and trace diagnostics.

## Allowed Files

```text
apps/chrome-extension/src/modules/debug_renderer/
docs/navia_v1_project_docs/stage-gates/v1.2-b-chat-renderer.md
```

## Forbidden Files

- Chat tab primary content ownership.
- Runtime state mutation.
- service modules.
- direct external API calls.

## Required Docs Before Coding

```text
docs/navia_v1_project_docs/V1_2_AGENT_WORKPACKS.md
docs/navia_v1_project_docs/design/v1.2-prd-coverage-matrix.md
docs/navia_v1_project_docs/stage-gates/v1.2-b-chat-renderer.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Hard Rules

- Keep debug-only content out of the primary Chat tab.
- Do not use debug state as AgentCore truth.
- Runtime offline must be visible.

## Validation Evidence

- runtime offline fixture.
- PageContext missing fixture.
- unknown event fixture.
- trace diagnostic fixture.

Use `docs/navia_v1_project_docs/MODULE_HANDOFF_TEMPLATE.md` for handoff.
