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

## A-V1.1 Build Order

| Stage | Build target | Acceptance |
|---|---|---|
| `A-V1.1-0a` | Decide public vs module-local contract | If D/C consume HighSignal / Digest / SourceMap / QualityReport, promote them into public contracts |
| `A-V1.1-0b` | Freeze schemas | Exact schemas exist for HighSignalPageContext, PerceptionDigest, PerceptionDigestItem, SourceMap, SourceRef, PagePerceptionQualityReport, CandidateExtractionResult |
| `A-V1.1-0c` | Freeze quality metric formulas | Every metric has numerator / denominator / method / threshold / passed |
| `A-V1.1-0d` | Freeze candidate extractor isolation | Third-party output maps into A-owned block graph and is never exposed as final Navia contract |
| `A-V1.1-0e` | Freeze fixture class gates | valid_content passes; no_signal fails/degrades; video_page_stub remains planning-only |
| `A-V1.1-1` | Add Hybrid Extraction candidate layer and deterministic noise filtering | main content enters high-signal output; nav/footer/aside/recommendation/ad-like/comment are filtered or downgraded |
| `A-V1.1-2` | Add sourceMap and jumpback references | every digest item has source reference; missing references block high-signal readiness |
| `A-V1.1-3` | Add deterministic perception digest | key facts, entities, claims, evidence, definitions, procedures, and open questions are shorter than raw context and grounded |
| `A-V1.1-4` | Add quality evaluator | quality report enforces source coverage, noise ratio, grounding completeness, and downstream readiness |
| `A-V1.1-5` | Add image/OCR contract enhancement | image metadata is grounded; OCR is mock/contract-only and does not call engines |
| `A-V1.1-6` | Add video/live planning records | media contracts are documented; no real video/live engine is executed |

## A-V1.2 Build Order

`A-V1.2` is documentation and contract planning until its stage gate is audited. It must not install extractor dependencies or implement production extraction before `A-V1.2-0` closes.

| Stage | Build target | Acceptance |
|---|---|---|
| `A-V1.2-0` | Freeze production-grade page perception scope, dependency policy, public contract changes, and 100-page corpus rules | Stage gate, drawio, fixture plan, and evidence plan align; no fatal or major audit issue remains |
| `A-V1.2-1` | Design 100-page evaluation corpus | At least 100 pages, at least 10 categories, page records include URL/snapshot, category, risks, gold status, and expected evidence |
| `A-V1.2-2` | Plan extractor candidate ensemble | `dom_baseline`, `trafilatura`, `readability_lxml`, and `readabilipy` are candidate-only; dependency and license review required before implementation |
| `A-V1.2-3` | Plan A-owned block graph merge | Third-party output maps into A-owned blocks before final public contracts; raw extractor fields cannot leak |
| `A-V1.2-4` | Plan digest quality upgrade | Digest quality is evaluated against gold key facts, claims, definitions, procedures, evidence, and source refs |
| `A-V1.2-5` | Plan quality evaluator upgrade | Corpus pass rate, category pass rate, extractor comparison, and failure reasons are measurable |
| `A-V1.2-6` | Plan Integration handoff and regression | D/C/B consume only quality-ready public contracts; regression reports are defined |

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

## A-V1.1 Implementation Sequence

Do not start `A-V1.1-1+` implementation until `A-V1.1-0a` through `A-V1.1-0e` pass audit.

`A-V1.1-0` sequence:

1. Decide whether HighSignal / Digest / SourceMap / QualityReport are public D/C contracts.
2. If public, update `docs/navia_v1_project_docs/contracts/v1_2_adapter_contracts.md` or equivalent contract docs.
3. Freeze exact schemas and add JSON Schema or Pydantic validation tests.
4. Freeze SourceRef minimum fields and fallback behavior.
5. Freeze quality metric formulas and thresholds.
6. Freeze CandidateExtractionResult isolation and DOM baseline fallback.
7. Freeze fixture class gates and evidence naming.
8. Run ChatGPT re-audit; continue only if no fatal or major issue remains.

`A-V1.1-1+` implementation sequence, after audit:

1. Add candidate extractor interface with `trafilatura` as preferred future baseline, Mozilla Readability / `readabilipy` as comparison, and `readability-lxml` as fallback.
2. Keep third-party extractor output isolated from final Navia contracts.
3. Implement block classifier and noise filter over DOM-derived blocks.
4. Generate source references for paragraphs, chunks, images, tables, lists, and code blocks.
5. Build deterministic `PerceptionDigest` from high-signal blocks.
6. Add quality evaluator and block D/C high-signal readiness when thresholds fail.
7. Add OCR mock contract and media planning fixtures without real engine calls.
8. Write evidence JSON for structured page, high-signal page, digest, source map, and quality report.

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
- `A-V1.2` may plan OCR / VLM / media adapter inputs only, but must not execute OCR, VLM, ASR, video, or live engines.
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
