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
A-V1.1-* high-signal page perception, now historical
A-V1.2-* current high-quality page perception, structured page summary, jumpback evidence, Debug JSON, and 100-page evaluation
A-V1.12+ future video / live perception planning
```

## Inputs

- existing `PageContext` from Runtime / Integration.
- real HTML fixtures.
- real Chrome page context during Integration.

## Outputs

- `StructuredPageContext`
- `HighSignalPageContext`
- `PerceptionDigest`
- `SourceMap / SourceRef`
- `PagePerceptionQualityReport`
- `DebugEvidenceBundle` for A-V1.2 acceptance and Debug review
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
docs/navia_v1_project_docs/stage-gates/v1.2-a-v1.2-production-page-perception.md
docs/navia_v1_project_docs/design/a-v1.2-contract-freeze-readiness-audit.md
docs/navia_v1_project_docs/contracts/a_v1_2_page_perception.schema.json
services/local-runtime/navia_runtime/modules/page_reading/docs/public-api.md
services/local-runtime/navia_runtime/modules/page_reading/docs/architecture.md
services/local-runtime/navia_runtime/modules/page_reading/docs/implementation-plan.md
services/local-runtime/navia_runtime/modules/page_reading/docs/test-and-evidence-plan.md
services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-100-page-evaluation-plan.md
services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-0-contract-freeze-acceptance.md
services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-executable-development-spec.md
services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-extractor-dependency-audit.md
```

## Validation Evidence

- structured page JSON for article/docs/GitHub README style fixtures.
- paragraph IDs are stable within one captured page version.
- chunks trace back to paragraphs or heading path.
- invalid or missing page content returns `PAGE_CONTEXT_REQUIRED` through Integration; A does not create fake artifacts.
- A-V1.2 final acceptance requires at least 100 complex real webpages or reproducible snapshots across diverse categories.
- final counted A-V1.2 pages require `snapshotPath` and `goldStatus = reviewed` or `semi_auto_accepted`.
- every valid A-V1.2 page must produce structured, high-signal, source-map, perception-digest, quality-report, and debug-evidence JSON.
- `PagePerceptionQualityReport` must explain pass / degraded / fail with metric formulas, not hard-coded status.
- `PerceptionDigestItem` must have `sourceRefs`; DOM selector cannot be the only jumpback mechanism.
- OCR, video, and live recognition remain planning-only until governed Adapter contracts are approved.

Current A-V1.2 acceptance evidence:

```text
services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-1-acceptance-report.md
services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-2-8-final-acceptance-report.md
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-level-report.json
```

The accepted A-V1.2 baseline is `dom_baseline` plus A-owned schema normalization and real-snapshot corpus evidence. It does not claim third-party extractor ensemble, OCR, VLM, ASR, video, live perception, final answers, Mindmap, ArtifactRecord, SSE, EventStore, Trace, RAG, MCP, Skill, or external API execution by A.

Use `docs/navia_v1_project_docs/MODULE_HANDOFF_TEMPLATE.md` for handoff.
