# B Debug Renderer Module

Owner: B module Agent.

## Responsibility

Render diagnostics outside the primary Chat experience:

- Runtime online/offline state.
- PageContext diagnostics.
- A high-signal perception JSON diagnostics.
- A quality report and pass / degraded / fail reasons.
- C mindmap node source map diagnostics.
- trace diagnostics.
- unknown SSE/event diagnostics.

## Inputs

- Runtime status.
- debug signals from B renderers.
- `StructuredPageContext`.
- `HighSignalPageContext`.
- `PerceptionDigest`.
- `SourceMap / SourceRef`.
- `PagePerceptionQualityReport`.
- `MindmapNodeSourceMap`.
- recorded diagnostic fixtures.

## Outputs

- debug panel view model or renderer components.
- visible runtime and trace diagnostics.
- collapsible JSON views for A perception bundle.
- readable quality metric table with numerator / denominator / threshold / pass state.
- source fallback card for SourceRef or Mindmap node jumpback failure.

## Allowed Files

```text
apps/chrome-extension/src/modules/debug_renderer/
docs/active/project/stage-gates/v1.2-b-chat-renderer.md
```

## Forbidden Files

- Chat tab primary content ownership.
- Runtime state mutation.
- service modules.
- direct external API calls.

## Required Docs Before Coding

```text
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/design/v1.2-prd-coverage-matrix.md
docs/active/project/stage-gates/v1.2-b-chat-renderer.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Hard Rules

- Keep debug-only content out of the primary Chat tab.
- Do not use debug state as AgentCore truth.
- Do not call A/C/D services directly; render only data delivered by Runtime / D / Integration.
- Unknown or new diagnostic fields must not crash the UI.
- Runtime offline must be visible.

## Validation Evidence

- runtime offline fixture.
- PageContext missing fixture.
- high-signal JSON fixture.
- quality degraded/fail fixture.
- SourceRef fallback fixture.
- mindmap node source map fixture.
- unknown event fixture.
- trace diagnostic fixture.

Use `docs/active/project/MODULE_HANDOFF_TEMPLATE.md` for handoff.
