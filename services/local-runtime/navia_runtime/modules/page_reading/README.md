# A Page Reading Service Module

Owner: A module Agent.

## Responsibility

Build the structured page fact source for V1.2:

- extract page title, URL, domain, headings, visible text, and cleaned text.
- produce paragraph blocks, heading tree, semantic chunks, paragraph annotations, and content hash.
- optionally produce `StructuredSummaryDraft`.

## Inputs

- existing `PageContext` from Runtime / Integration.
- real HTML fixtures.
- real Chrome page context during Integration.

## Outputs

- `StructuredPageContext`
- `ParagraphAnnotation[]`
- `PageChunk[]`
- optional `StructuredSummaryDraft`

## Allowed Files

```text
services/local-runtime/navia_runtime/modules/page_reading/
docs/navia_v1_project_docs/stage-gates/v1.2-a-page-reading.md
```

## Forbidden Files

- B renderer modules.
- C mindmap module.
- D agent_loop/adapters modules.
- existing Runtime entrypoints such as `app.py`, `agent.py`, and `tools.py`.
- public contracts unless V1.2-0 is reopened.

## Required Docs Before Coding

```text
docs/navia_v1_project_docs/V1_2_AGENT_WORKPACKS.md
docs/navia_v1_project_docs/contracts/v1_2_adapter_contracts.md
docs/navia_v1_project_docs/design/v1.2-ai-reading-workspace-partition.md
docs/navia_v1_project_docs/stage-gates/v1.2-a-page-reading.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Validation Evidence

- structured page JSON for article/docs/GitHub README style fixtures.
- paragraph IDs are stable within one captured page version.
- chunks trace back to paragraphs or heading path.
- invalid or missing page content returns `PAGE_CONTEXT_REQUIRED` through Integration; A does not create fake artifacts.

Use `docs/navia_v1_project_docs/MODULE_HANDOFF_TEMPLATE.md` for handoff.
