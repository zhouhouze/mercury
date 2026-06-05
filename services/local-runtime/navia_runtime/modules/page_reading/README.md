# A Page Perception / AgentCore Eyes Service Module

Owner: A module Agent.

## Responsibility

Build the perception fact source for AgentCore. A is the eyes of Navia: it recognizes readable page and future media facts, then returns traceable structured context for D/C/B to consume.

- extract page title, URL, domain, headings, visible text, and cleaned text.
- produce paragraph blocks, heading tree, semantic chunks, paragraph annotations, and content hash.
- optionally produce `StructuredSummaryDraft`.
- plan image, OCR, table/list/code, page-region, video, and live perception contracts.

## Internal Numbering

A module tasks use `MODULE_VERSIONING.md`:

```text
A-V1.0-0 perception contract freeze
A-V1.0-1 text / DOM structure recognition
A-V1.0-2 image-rich web page recognition
A-V1.0-3 OCR recognition planning
A-V1.0-4 table / list / code block recognition
A-V1.0-5 page region and information density recognition
A-V2.0-1 video perception planning
A-V2.0-2 live perception planning
```

## Inputs

- existing `PageContext` from Runtime / Integration.
- real HTML fixtures.
- real Chrome page context during Integration.

## Outputs

- `StructuredPageContext`
- `ParagraphAnnotation[]`
- `PageChunk[]`
- optional `StructuredSummaryDraft`
- future planned perception outputs such as `ImageBlock[]`, `OcrTextBlock[]`, `TableBlock[]`, and media timeline records only after contract review.

## Allowed Files

```text
services/local-runtime/navia_runtime/modules/page_reading/
docs/navia_v1_project_docs/stage-gates/v1.2-a-page-reading.md
docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.drawio
docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.md
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
docs/navia_v1_project_docs/MODULE_VERSIONING.md
docs/navia_v1_project_docs/contracts/v1_2_adapter_contracts.md
docs/navia_v1_project_docs/design/v1.2-ai-reading-workspace-partition.md
docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.md
docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.drawio
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
- OCR, video, and live recognition remain planning-only until governed Adapter contracts are approved.

Use `docs/navia_v1_project_docs/MODULE_HANDOFF_TEMPLATE.md` for handoff.
