# C Mindmap Service Module

Owner: C module Agent.

## Responsibility

Generate traceable Mermaid mindmaps from A module structured page facts:

- consume `StructuredPageContext`.
- consume `PerceptionDigest`, `SourceMap / SourceRef`, and `PagePerceptionQualityReport` when the AC stage Runtime main path provides them.
- choose bounded headings/chunks/paragraphs.
- prefer digest items and source refs when `downstreamReadiness = "pass"`.
- group pass-quality digest items under readable source-grounded themes.
- compress long digest sentences into card-friendly labels while preserving source evidence in `fallbackText`.
- generate Mermaid source.
- validate Mermaid.
- repair at most once.
- produce SourceRef-backed `MindmapNodeSourceMap`.

## Inputs

- `StructuredPageContext`
- `PerceptionDigest`
- `SourceMap / SourceRef`
- `PagePerceptionQualityReport`
- paragraph annotations.
- chunks and heading tree.

## Outputs

- mindmap artifact content.
- `metadata.format="mermaid"`.
- `metadata.nodeSourceMap` with `sourceRefIds`, `fallbackText`, and paragraph/chunk fallback.
- `sourcePageId`, `sourceChunkIds`, `paragraphIds`.

## Allowed Files

```text
services/local-runtime/navia_runtime/modules/mindmap/
docs/active/project/stage-gates/v1.2-c-mindmap.md
```

## Forbidden Files

- A page extraction logic.
- B renderer modules.
- D CoreProvider/adapters modules.
- existing Runtime entrypoints such as `tools.py`.
- public artifact schema unless V1.2-0 is reopened.

## Required Docs Before Coding

```text
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/design/v1.2-integration-contract-matrix.md
docs/active/project/stage-gates/v1.2-c-mindmap.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Validation Evidence

- Mermaid output from real page fixtures.
- validation result recorded in evidence.
- repair count is `0` or `1`.
- when quality readiness is `pass`, primary nodes are selected from `PerceptionDigest.items` before heading fallback.
- pass-quality digest mindmaps use readable theme grouping instead of a flat list of long digest sentences.
- primary nodes trace to A `SourceRef` IDs or explicit paragraph/chunk fallback.
- every jumpable node has `textQuote` or `fallbackText`.
- source fallback is possible even when DOM jump-back fails.
- degraded/fail pages do not produce fake high-signal mindmaps.

Use `docs/active/project/MODULE_HANDOFF_TEMPLATE.md` for handoff.
