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
- high-signal JSON output for A-V1.1.
- perception digest JSON for A-V1.1.
- quality report JSON for A-V1.1.
- source map JSON for A-V1.1.
- assertion log.
- fixture source path.
- PRD coverage note.
- false-green review note.

## A-V1.1 Required Fixtures

- `article_noise.html`
- `news_with_sidebar.html`
- `product_doc.html`
- `image_rich_article.html`
- `table_heavy_report.html`
- `code_doc.html`
- `video_page_stub.html`
- `empty_or_low_signal.html`

## A-V1.1 Quality Gates

- `overallScore >= 0.75`.
- `sourceCoverage >= 0.95`.
- `groundingCompleteness >= 0.95`.
- `noiseRatio <= 0.25`.
- `downstreamReadiness = pass`.
- Every digest item has a source reference.
- Filtered blocks keep debug evidence.

## Module Exit Criteria

- all required fixtures pass.
- empty fixture fails with expected error.
- no artifact, SSE, or D/C/B dependency is introduced.
- OCR, video, and live recognition remain planning-only unless a future governed Adapter stage gate is approved.
- Integration Codex can consume A output without asking A implementers to make additional contract decisions.

## Required Command

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
```
