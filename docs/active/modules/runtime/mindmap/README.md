# C Mindmap Service Module

Owner: C module Agent.

## Responsibility

Generate traceable Mermaid mindmaps from A module structured page facts:

- consume `StructuredPageContext`.
- choose bounded headings/chunks/paragraphs.
- generate Mermaid source.
- validate Mermaid.
- repair at most once.
- produce `MindmapNodeSourceMap`.

## Inputs

- `StructuredPageContext`
- paragraph annotations.
- chunks and heading tree.

## Outputs

- mindmap artifact content.
- `metadata.format="mermaid"`.
- `metadata.nodeSourceMap`.
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
- primary nodes trace to paragraph/chunk IDs.
- source fallback is possible even when DOM jump-back fails.

Use `docs/active/project/MODULE_HANDOFF_TEMPLATE.md` for handoff.
