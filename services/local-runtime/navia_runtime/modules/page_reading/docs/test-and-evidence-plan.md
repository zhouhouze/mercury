# A Test And Evidence Plan

## Unit Tests

- ID stability.
- content hash stability.
- paragraph splitting.
- chunk generation.
- annotation fallback.
- image metadata fallback.
- table/list/code block extraction once `A-V1.0-4` begins.

## Contract Tests

- validate `StructuredPageContext` required fields.
- validate annotations reference existing paragraphs.
- validate chunks reference existing page and heading path.
- validate `densityScore`, `importance`, and `confidence` are within `0..1`.
- validate empty readable content returns `PAGE_CONTEXT_REQUIRED`.
- validate A does not create artifact, SSE, EventStore, or D/C/B dependency.

## Evidence

Each validation run writes:

- structured JSON output.
- high-signal JSON output for A-V1.2 baseline.
- perception digest JSON for A-V1.2 baseline.
- quality report JSON for A-V1.2 baseline.
- source map JSON for A-V1.2 baseline.
- assertion log.
- fixture source path.
- PRD coverage note.
- false-green review note.

## A-V1.2 High-Signal Baseline Fixtures

这些 fixture 来自历史 A-V1.1 high-signal 阶段，但仍作为 A-V1.2 的基线回归集。A-V1.2 可以增加 100-page corpus，但不能降低这些 fixture 的高信号、source map、digest 和 quality gate 要求。

- `article_noise.html`
- `news_with_sidebar.html`
- `product_doc.html`
- `image_rich_article.html`
- `table_heavy_report.html`
- `code_doc.html`
- `video_page_stub.html`
- `empty_or_low_signal.html`

## A-V1.2 High-Signal Baseline Quality Gates

- `overallScore >= 0.75`.
- `sourceCoverage >= 0.95`.
- `groundingCompleteness >= 0.95`.
- `jumpbackCoverage >= 0.95`.
- `noiseRatio <= 0.25`.
- `downstreamReadiness = pass`.
- Every digest item has a source reference.
- Filtered blocks keep debug evidence.

## A-V1.2 High-Signal Baseline Fixture Class Gates

| Class | Fixtures | Expected result |
|---|---|---|
| `valid_content` | `article_noise.html`, `news_with_sidebar.html`, `product_doc.html`, `table_heavy_report.html`, `code_doc.html` | Must pass thresholds and set `downstreamReadiness = pass` |
| `degraded_content` | `image_rich_article.html` regions without DOM-readable image metadata | May degrade, but must explain why |
| `no_signal` | `empty_or_low_signal.html` | Must fail or return `PAGE_CONTEXT_REQUIRED`; must not pass |
| `planning_only` | `video_page_stub.html` | Must validate planning contract only; must not mark real perception ready |

## A-V1.2 High-Signal Compatibility Contract Tests

Before any A-V1.2-1+ implementation:

- Schema validation passes for HighSignalPageContext.
- Schema validation passes for PerceptionDigest and PerceptionDigestItem.
- Schema validation passes for SourceMap and SourceRef.
- Schema validation passes for PagePerceptionQualityReport.
- SourceRef test proves selector/domPath is optional and fallbackText/textQuote exists.
- QualityReport test proves metrics are computed from numerator/denominator/method and not hard-coded pass.
- CandidateExtractionResult test proves third-party output is not exposed as final Navia contract.
- Fixture class gate test proves no_signal and planning_only fixtures cannot pass as valid content.

## Module Exit Criteria

- all required fixtures pass.
- empty fixture fails with expected error.
- no artifact, SSE, or D/C/B dependency is introduced.
- OCR, video, and live recognition remain planning-only unless a future governed Adapter stage gate is approved.
- Integration Codex can consume A output without asking A implementers to make additional contract decisions.

## A-V1.2 100-Page Acceptance Plan

A-V1.2 cannot claim high-quality page perception until it validates at least `100` complex webpages or reproducible snapshots.

A-V1.2 validates the full accepted route:

```text
DOM baseline
+ extractor ensemble
+ A-owned schema normalization
+ SourceMap / jumpback
+ Quality Evaluator
+ DebugEvidenceBundle
+ 100-page corpus gate
```

If extractor ensemble is not enabled in an implementation substage, the evidence must explicitly say `dom_baseline_only` and must not claim extractor ensemble quality improvement.

Corpus-level gates:

- total pages `>= 100`.
- category count `>= 10`.
- valid-content pass rate `>= 85%`.
- each core category pass rate `>= 70%`.
- passed pages have `sourceCoverage >= 0.95`.
- passed pages have `groundingCompleteness >= 0.95`.
- passed pages have `jumpbackCoverage >= 0.90`.
- low-signal / paywall-like pages fail or degrade, never pass.

Each page must write:

- structured page evidence.
- high-signal page evidence.
- source map evidence.
- perception digest evidence.
- quality report evidence.
- debug evidence bundle.

Candidate extraction evidence and extractor comparison reports are required only after `A-V1.2-2` selects or implements candidate extractors.

A-V1.2 false-green checks:

- third-party extractor raw fields do not appear in final public contracts.
- `debug-evidence` explains pass, degraded, or fail reason.
- quality report metrics include numerator, denominator, method, threshold, and passed.
- category-level failures are visible and cannot be hidden by aggregate pass rate.
- OCR / VLM / ASR / video / live are not executed by A.
- A does not generate final answers, mindmaps, artifacts, notebooks, flashcards, quizzes, podcasts, RAG outputs, SSE, EventStore entries, or Trace entries.

Substage evidence gates:

| Stage | Required evidence |
|---|---|
| `A-V1.2-1` | corpus manifest, snapshot availability, category distribution, goldStatus report |
| `A-V1.2-2` | main content block graph evidence and missed-main-content audit |
| `A-V1.2-3` | filteredEvidence with reason, noise taxonomy distribution, low-signal fail/degrade evidence |
| `A-V1.2-4` | perceptionDigest with sourceRefs for every item |
| `A-V1.2-5` | sourceMap with textQuote/fallbackText and optional selector/domPath |
| `A-V1.2-6` | qualityReport metrics with numerator, denominator, method, threshold, passed |
| `A-V1.2-7` | DebugEvidenceBundle explaining pass/degraded/fail |
| `A-V1.2-8` | corpus-level report with category pass rate and failure remap |

## Required Command

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
```

## A-V1.2-8 Corpus Exit Command

```bash
PYTHONPATH=services/local-runtime python3 -m navia_runtime.modules.page_reading.eval_corpus \
  --manifest services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json \
  --output services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-level-report.json
```

The command must read `corpus-manifest.json`, write `corpus-level-report.json`, and exit non-zero on:

- category gate or core category minimum failure.
- fewer than 100 final counted pages.
- missing `snapshotPath` / reproducible HTML evidence.
- missing reviewed or semi-auto-accepted gold review status.
- source coverage, grounding completeness, jumpback coverage, or threshold failure.
- low-signal page incorrectly marked `pass`.
- missing DebugEvidenceBundle or unexplained pass/degraded/fail status.
