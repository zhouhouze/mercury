# A Fixture Spec

## Required Fixture Files

```text
fixtures/article.html
fixtures/docs.html
fixtures/github_readme.html
fixtures/image_rich.html
fixtures/tables_lists_code.html
fixtures/empty.html
```

Fixtures may be copied from `docs/navia_v1_project_docs/fixtures/real_pages/`.

## Expected Evidence Files

```text
tests/evidence/article.structured-page.json
tests/evidence/docs.structured-page.json
tests/evidence/github_readme.structured-page.json
tests/evidence/image_rich.structured-page.json
tests/evidence/tables_lists_code.structured-page.json
tests/evidence/empty.error.json
```

## Required Assertions

- article produces paragraphs, chunks, annotations, and summary draft.
- docs preserves nested heading paths.
- github README preserves list/code-like sections as meaningful paragraphs or chunks.
- image-rich fixture preserves only DOM-readable image metadata and emits unknown metadata warnings when required.
- table/list/code fixture preserves source block type and source order.
- empty returns `PAGE_CONTEXT_REQUIRED`.

## Disallowed Fixture Behavior

- live network dependency.
- manually fabricated text unrelated to fixture body.
- one giant `cleanedText` block as only useful output.

## A-V1.1 Fixture Classes

Additional A-V1.1 fixtures:

```text
fixtures/article_noise.html
fixtures/news_with_sidebar.html
fixtures/product_doc.html
fixtures/image_rich_article.html
fixtures/table_heavy_report.html
fixtures/code_doc.html
fixtures/video_page_stub.html
fixtures/empty_or_low_signal.html
```

Fixture class gates:

| Class | Fixtures | Expected result |
|---|---|---|
| `valid_content` | `article_noise.html`, `news_with_sidebar.html`, `product_doc.html`, `table_heavy_report.html`, `code_doc.html` | `downstreamReadiness = pass` |
| `degraded_content` | `image_rich_article.html` regions with missing image metadata | `downstreamReadiness = degraded` allowed with explicit warnings |
| `no_signal` | `empty_or_low_signal.html` | `downstreamReadiness = fail` or `PAGE_CONTEXT_REQUIRED`; never pass |
| `planning_only` | `video_page_stub.html` | contract fields only; never real perception ready |

Expected A-V1.1 evidence files:

```text
tests/evidence/<fixture>.candidate-extraction.json
tests/evidence/<fixture>.high-signal-page.json
tests/evidence/<fixture>.source-map.json
tests/evidence/<fixture>.perception-digest.json
tests/evidence/<fixture>.quality-report.json
```

Disallowed A-V1.1 fixture behavior:

- `empty_or_low_signal.html` passing quality gates.
- `video_page_stub.html` producing real video perception readiness.
- image content described without DOM-readable metadata or future approved OCR input.
- third-party extractor output used as final high-signal output without A-owned mapping.

## A-V1.2 100-Page Corpus Spec

A-V1.2 final acceptance must use at least `100` complex real webpages or reproducible HTML snapshots.

Each corpus item must have:

```text
pageKey
url
snapshotPath?
category
language
complexityTags[]
expectedRisks[]
goldStatus
sourceLicenseNote?
```

Required category distribution:

| Category | Minimum pages |
|---|---:|
| `news_article` | 8 |
| `longform_blog` | 8 |
| `technical_docs` | 8 |
| `github_readme` | 8 |
| `product_docs` | 8 |
| `ecommerce_product` | 8 |
| `search_result` | 8 |
| `forum_thread` | 8 |
| `academic_or_report` | 8 |
| `table_heavy_page` | 8 |
| `code_heavy_page` | 8 |
| `image_rich_article` | 8 |
| `multi_column_media_page` | 4 |
| `localized_chinese_page` | 4 |
| `low_signal_or_paywall_like` | 4 |

Expected A-V1.2 evidence files:

```text
tests/evidence/a_v1_2/<pageKey>.structured-page.json
tests/evidence/a_v1_2/<pageKey>.candidate-extraction.json
tests/evidence/a_v1_2/<pageKey>.high-signal-page.json
tests/evidence/a_v1_2/<pageKey>.source-map.json
tests/evidence/a_v1_2/<pageKey>.perception-digest.json
tests/evidence/a_v1_2/<pageKey>.quality-report.json
tests/evidence/a_v1_2/<pageKey>.comparison-report.json
```

Disallowed A-V1.2 corpus behavior:

- fewer than 100 pages used for final acceptance.
- one category dominates the corpus.
- low-signal or paywall-like pages pass as valid content.
- generated toy HTML replaces complex real webpages.
- third-party extractor raw output leaks into public A contracts.
