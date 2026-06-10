# A Page Perception / AgentCore Eyes Implementation Plan

## Scope

This plan uses module-local numbering from `docs/active/project/MODULE_VERSIONING.md`.

A module development is limited to `services/local-runtime/navia_runtime/modules/page_reading/`. Integration into `/v1/page/context`, session state, D, C, or B is owned by Integration Codex.

## Historical A-V1.0 Baseline

| Stage | Build target | Acceptance |
|---|---|---|
| `A-V1.0-0` | Freeze `PageReadingInput`, `PageReadingResult`, `StructuredPageContext`, error rules, fixture list, evidence format | Public API, architecture, fixture, test plan, and drawio are aligned |
| `A-V1.0-1` | Implement text / DOM structure recognition: normalize input, clean text, heading tree, paragraphs, chunks, annotations | article/docs/github_readme fixtures produce stable paragraphs, chunks, annotations, and `contentHash` |
| `A-V1.0-2` | Add image-rich page DOM metadata recognition | images are represented only from alt/caption/title/aria/nearby text; unknown images are explicit |
| `A-V1.0-3` | Plan OCR contracts | OCR input/output, risk, governance, and false-green rules are documented; no OCR engine is called |
| `A-V1.0-4` | Add table / list / code block recognition | table/list/code fixture produces first-class blocks without breaking paragraph/chunk order |
| `A-V1.0-5` | Add page region and information density recognition | density, importance, confidence, and region hints are deterministic and auditable |

## Historical A-V1.1 High-Signal Baseline

A-V1.1 is no longer the active implementation stage. Its high-signal contracts, fixture gates, SourceRef rules, and quality gates are retained as A-V1.2 compatibility baselines.

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

## Current A-V1.2 Build Order

`A-V1.2` is documentation and contract planning until its stage gate is audited. It must not install extractor dependencies or implement production extraction before `A-V1.2-0` closes.

`A-V1.2` is scoped to:

```text
high-quality page perception
+ structured page summary
+ jumpback evidence
+ debug-verifiable JSON
```

It is not a learning artifact, RAG, Notebook, mindmap, or AgenticLoop stage.

The accepted implementation route for A-V1.2 is:

```text
DOM baseline
+ extractor ensemble
+ A-owned schema normalization
+ SourceMap / jumpback
+ Quality Evaluator
+ DebugEvidenceBundle
+ 100-page corpus gate
```

Implementation must keep `dom_baseline` as the offline baseline and fallback. Third-party extractors are optional candidates only after dependency audit approval; they must never define the public Navia output shape.

Implementation decisions for schemas, corpus manifest, gold rubric, extractor dependency audit, deterministic algorithms, and stage acceptance commands are frozen in:

```text
docs/a-v1.2-executable-development-spec.md
```

If that document conflicts with older module notes, the executable development spec wins for A-V1.2.

| Stage | Build target | Acceptance |
|---|---|---|
| `A-V1.2-0` | Freeze contracts and stage target | Stage gate, PRD, architecture, drawio, public API, fixture plan, evidence plan, and 100-page rules align |
| `A-V1.2-1` | Build 100-page evaluation corpus | At least 100 pages or snapshots, at least 10 categories, page records include URL/snapshot, category, risks, and expected evidence |
| `A-V1.2-2` | Improve main content detection | Body text, headings, paragraphs, lists, tables, code, and image DOM metadata enter A-owned block graph |
| `A-V1.2-3` | Add noise filtering and density ranking | nav/footer/sidebar/recommendation/ad/comment/share/cookie/banner are filtered or downgraded with evidence |
| `A-V1.2-4` | Add structured page summary | TLDR, key paragraphs, key facts, terms, entities, procedures, table facts, and code facts are grounded by sourceRefs |
| `A-V1.2-5` | Strengthen SourceMap and jumpback evidence | SourceRef has pageId, contentHash, blockId, blockType, order, textQuote, textHash, fallbackText, and confidence |
| `A-V1.2-6` | Upgrade quality evaluator | noiseRatio, contentCoverage, sourceCoverage, groundingCompleteness, jumpbackCoverage, digestCompressionRatio, and overallScore have formulas and thresholds |
| `A-V1.2-7` | Add DebugEvidenceBundle | raw signals, candidate extraction, filtered evidence, high-signal context, source map, and quality report are bundled for Debug UI |
| `A-V1.2-8` | Run 100-page exit validation | Corpus-level report passes; failures are mapped back to the responsible A-V1.2 substage |

## A-V1.2 Substage Handoff Rules

Each A-V1.2 substage must hand off:

- updated PRD / architecture / contract notes if the stage changes behavior.
- fixture or corpus evidence.
- quality and false-green review.
- exact tests or validation commands.
- explicit Go / No-Go conclusion.

The next substage cannot start if the previous substage leaves fatal or major issues open.

## Current A-V1.2 Implementation Sequence

1. `A-V1.2-0`: keep public schemas, quality formulas, corpus rules, gold review rules, extractor selection, and dependency audit frozen.
2. `A-V1.2-1`: build `corpus-manifest.json`, reproducible snapshots, gold review records, and category distribution report.
3. `A-V1.2-2`: implement or strengthen normalized page input, DOM baseline extraction, heading tree, paragraph blocks, list/table/code/image DOM metadata blocks, and A-owned block graph.
4. `A-V1.2-3`: implement deterministic main-content scoring, noise taxonomy, filtered evidence, and density ranking.
5. `A-V1.2-4`: implement deterministic, source-grounded `PerceptionDigest`; reject all ungrounded digest candidates.
6. `A-V1.2-5`: implement `SourceMap / SourceRef` with text fallback; DOM selector remains optional.
7. `A-V1.2-6`: implement `PagePerceptionQualityReport` with frozen formulas, denominator-zero behavior, thresholds, and readiness semantics.
8. `A-V1.2-7`: implement `DebugEvidenceBundle` with bounded raw signals, candidate comparison, filtered evidence, high-signal page, digest, source map, quality report, and audit trail.
9. `A-V1.2-8`: implement or run the corpus exit command below, generate corpus-level report, and map failures back to responsible substages.

```bash
PYTHONPATH=services/local-runtime python3 -m navia_runtime.modules.page_reading.eval_corpus \
  --manifest services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json \
  --output services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-level-report.json
```

The command must exit non-zero on category gate, source coverage, grounding, jumpback, low-signal, gold review, snapshot, or debug evidence failure.

Extractor implementation note:

- `dom_baseline` is required.
- third-party extractors remain disabled until dependency audit marks the package `decision=approved`.
- third-party raw output must never enter final Navia public contracts.

## Current A-V1.2 Acceptance Status

The scoped deterministic baseline has passed A-V1.2 exit validation:

```text
baseline = dom_baseline + A-owned schema normalization + reproducible real snapshots
finalCountedPages = 107
categoryCount = 13
exitGate = pass
debugEvidenceFiles = 107
qualityReportFiles = 107
```

Acceptance reports:

```text
docs/a-v1.2-1-acceptance-report.md
docs/a-v1.2-2-8-final-acceptance-report.md
```

Evidence:

```text
tests/evidence/a_v1_2/corpus-manifest.json
tests/evidence/a_v1_2/corpus-evidence-generation-report.json
tests/evidence/a_v1_2/corpus-level-report.json
```

This status does not enable or claim third-party extractor ensemble, OCR, VLM, ASR, video, live perception, final assistant answers, Mindmap, ArtifactRecord, SSE, EventStore, Trace, RAG, MCP, Skill, or external API execution by A.

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
- `A-V1.12+` documents video and live perception planning only; it is not an A-V1.2 implementation deliverable.
- Future execution of OCR, vision, video, or live stream recognition must go through D Adapter Layer and governance hooks.
- A may accept approved future OCR or media perception results as structured inputs only after contract review.

## Integration Boundary

A exposes pure module functions only. Integration Codex wires them into existing Runtime entrypoints after module tests pass.

Do not modify:

- `services/local-runtime/navia_runtime/app.py`
- `services/local-runtime/navia_runtime/agent.py`
- `services/local-runtime/navia_runtime/tools.py`
- `apps/chrome-extension/src/pageContext.ts`
