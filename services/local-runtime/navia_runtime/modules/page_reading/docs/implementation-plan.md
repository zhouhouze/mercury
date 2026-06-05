# A Page Perception / AgentCore Eyes Implementation Plan

## Scope

This plan uses module-local numbering from `docs/navia_v1_project_docs/MODULE_VERSIONING.md`.

A module development is limited to `services/local-runtime/navia_runtime/modules/page_reading/`. Integration into `/v1/page/context`, session state, D, C, or B is owned by Integration Codex.

## A-V1.0 Build Order

| Stage | Build target | Acceptance |
|---|---|---|
| `A-V1.0-0` | Freeze `PageReadingInput`, `PageReadingResult`, `StructuredPageContext`, error rules, fixture list, evidence format | Public API, architecture, fixture, test plan, and drawio are aligned |
| `A-V1.0-1` | Implement text / DOM structure recognition: normalize input, clean text, heading tree, paragraphs, chunks, annotations | article/docs/github_readme fixtures produce stable paragraphs, chunks, annotations, and `contentHash` |
| `A-V1.0-2` | Add image-rich page DOM metadata recognition | images are represented only from alt/caption/title/aria/nearby text; unknown images are explicit |
| `A-V1.0-3` | Plan OCR contracts | OCR input/output, risk, governance, and false-green rules are documented; no OCR engine is called |
| `A-V1.0-4` | Add table / list / code block recognition | table/list/code fixture produces first-class blocks without breaking paragraph/chunk order |
| `A-V1.0-5` | Add page region and information density recognition | density, importance, confidence, and region hints are deterministic and auditable |

## Implementation Sequence

1. Define module-local parser interfaces in `runtime/`.
2. Add fixture loader and normalized input model.
3. Implement text cleanup and metadata extraction.
4. Implement heading tree builder.
5. Implement paragraph splitter.
6. Implement chunk builder.
7. Implement deterministic annotation and density rules.
8. Add image DOM metadata collector with unknown fallback.
9. Add table/list/code block collectors.
10. Implement optional `StructuredSummaryDraft` as downstream context only.
11. Add contract tests using real fixtures.

## Deterministic Annotation Rules

- `definition`: paragraph contains "is", "refers to", "means", or Chinese definition patterns.
- `procedure`: paragraph starts with numbered steps, bullets, or imperative verbs.
- `evidence`: paragraph includes numbers, citations, metrics, links, or quoted source material.
- `example`: paragraph contains "for example", "例如", or code-like samples.
- `summary`: short paragraph near beginning or end with broad terms.
- `unknown`: fallback.

`densityScore` is rule-based in V1.2:

- Start at `0.3`.
- Add for headings, numbers, definitions, entities, and low stop-word ratio.
- Clamp to `0..1`.

## Stable IDs

- `paragraphId`: `p_<pageId>_<order>`.
- `chunkId`: `ck_<pageId>_<order>`.
- `headingId`: `h_<pageId>_<order>`.

If `pageId` is absent in a fixture, derive it from `contentHash`.

## OCR / Video / Live Planning Boundary

- `A-V1.0-3` documents OCR contracts only; it must not install or call OCR libraries.
- `A-V2.0-1` and `A-V2.0-2` document video and live perception only; they are not V1.2 implementation deliverables.
- Future execution of OCR, vision, video, or live stream recognition must go through D Adapter Layer and governance hooks.
- A may accept approved future OCR or media perception results as structured inputs only after contract review.

## Integration Boundary

A exposes pure module functions only. Integration Codex wires them into existing Runtime entrypoints after module tests pass.

Do not modify:

- `services/local-runtime/navia_runtime/app.py`
- `services/local-runtime/navia_runtime/agent.py`
- `services/local-runtime/navia_runtime/tools.py`
- `apps/chrome-extension/src/pageContext.ts`
