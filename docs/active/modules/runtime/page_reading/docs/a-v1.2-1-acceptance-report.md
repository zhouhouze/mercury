# A-V1.2-1 Acceptance Report

Date: 2026-06-09
Stage: `A-V1.2-1` 100-page evaluation corpus
Status: pass

## Scope

This substage validates corpus infrastructure only:

- `corpus-manifest.json`
- stored reproducible HTML snapshots
- category distribution
- reviewed or semi-auto-accepted gold status
- low-signal expected outcome
- corpus-level report generation

It does not claim final A-V1.2 extraction quality, final answers, Mindmap, ArtifactRecord, SSE, EventStore, Trace, RAG, OCR, VLM, ASR, video, or live perception.

## Evidence

```text
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-level-report.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/capture-report.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/snapshots/
```

## Corpus Result

```text
totalPages = 107
finalCountedPages = 107
categoryCount = 13
coreCategoryMinimum = pass
snapshotReproducibility = pass
goldReview = pass
lowSignalExpectedOutcome = pass
```

Category distribution:

```text
academic_or_report = 8
code_heavy_page = 8
ecommerce_product = 8
forum_thread = 8
github_readme = 8
image_rich_article = 11
localized_chinese_page = 8
longform_blog = 8
low_signal_or_paywall_like = 4
news_article = 8
product_docs = 8
table_heavy_page = 8
technical_docs = 12
```

## Commands

```bash
PYTHONPATH=services/local-runtime python3 services/local-runtime/navia_runtime/modules/page_reading/tests/capture_a_v1_2_corpus.py

PYTHONPATH=services/local-runtime python3 -m navia_runtime.modules.page_reading.eval_corpus \
  --manifest services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json \
  --output services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-level-report.json \
  --stage corpus

PYTHONPATH=services/local-runtime python3 -m pytest -q \
  services/local-runtime/navia_runtime/modules/page_reading/tests/test_a_v1_2_eval_corpus.py \
  services/local-runtime/navia_runtime/modules/page_reading/tests/test_a_v1_2_contract_freeze.py
```

## Audit

No fatal or major PRD deviation found for `A-V1.2-1`.

False-green checks:

- Pass claim is limited to corpus readiness, not extraction quality.
- URL-only records do not count; counted pages have stored snapshots.
- Low-signal pages are not expected to pass.
- Network instability is recorded in `capture-report.json`; previously captured real snapshots may be reused only when the snapshot file already exists.

## Next Stage Gate

Go for `A-V1.2-2` planning and pre-implementation audit.

`A-V1.2-2` must use this corpus to validate main content detection and must not claim A-V1.2 completion until `A-V1.2-8` exit report passes.
