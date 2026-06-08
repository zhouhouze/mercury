# A-V1.2 100-Page Evaluation Plan

## Goal

A-V1.2 must prove that high-quality page perception works on complex real webpages, not only on hand-written module fixtures.

The evaluation target is:

```text
high-quality page perception
+ structured page summary
+ jumpback evidence
+ debug-verifiable JSON
```

The evaluation must not be used to claim final answers, mindmaps, flashcards, quizzes, podcasts, notebooks, RAG, or AgenticLoop completion.

The evaluation corpus must include at least `100` complex webpages across diverse categories. Each page must be reproducible through either a URL with capture metadata or a stored HTML snapshot.

Executable schema, corpus manifest path, gold rubric, deterministic algorithm rules, extractor dependency audit, and exact stage commands are defined in:

```text
docs/a-v1.2-executable-development-spec.md
```

## Corpus Record

Each page must have a `CorpusPageRecord`:

```text
pageKey
url
snapshotPath
category
language
complexityTags[]
expectedRisks[]
goldStatus: reviewed | semi_auto_accepted
allowedNetworkAtCapture: true | false
capturedAt?
sourceLicenseNote?
```

URL-only records may exist during planning, but they cannot count toward final A-V1.2 acceptance. Final counted pages must have stored reproducible HTML evidence through `snapshotPath`.

Complexity tags:

```text
multi_column
sidebar
recommendation
ads
comments
paywall_like
longform
table_heavy
code_heavy
image_rich
mixed_language
spa_like
low_signal
```

## Required Categories

| Category | Minimum pages | Pass expectation |
|---|---:|---|
| `news_article` | 8 | pass |
| `longform_blog` | 8 | pass |
| `technical_docs` | 8 | pass |
| `github_readme` | 8 | pass |
| `product_docs` | 8 | pass |
| `ecommerce_product` | 8 | pass or degraded with explained review/comment noise |
| `forum_thread` | 8 | pass or degraded depending on thread quality |
| `academic_or_report` | 8 | pass |
| `table_heavy_page` | 8 | pass |
| `code_heavy_page` | 8 | pass |
| `image_rich_article` | 8 | pass/degraded; unknown images must not be inferred |
| `localized_chinese_page` | 8 | pass |
| `low_signal_or_paywall_like` | 4 | fail or degraded; never pass as valid content |

The total must be at least 100 pages. Extra pages should be added to weak categories during regression.

Optional exploratory pages may include search result pages and multi-column media pages, but they cannot count toward final A-V1.2 required category distribution unless the public schema is reopened and audited. Search result pages may be represented as `PageMetadata.contentType = "search_result"` inside an allowed corpus category only when the page still has a schema-valid `CorpusCategory`. Multi-column media pages remain page-text-only boundary evidence and must not be used to claim video or media understanding.

## Evidence Files

Each page run must produce:

```text
<pageKey>.structured-page.json
<pageKey>.high-signal-page.json
<pageKey>.source-map.json
<pageKey>.perception-digest.json
<pageKey>.quality-report.json
<pageKey>.debug-evidence.json
```

`low_signal_or_paywall_like` pages may produce an error evidence file if the correct outcome is `PAGE_CONTEXT_REQUIRED`.

Candidate extraction and comparison evidence may be added after `A-V1.2-2` when candidate extractors are selected and audited:

```text
<pageKey>.candidate-extraction.json
<pageKey>.comparison-report.json
```

## Extractor Candidate Comparison

A-V1.2 may compare:

```text
dom_baseline
trafilatura
readability_lxml
readabilipy
```

Rules:

- Third-party outputs are `CandidateExtractionResult` only.
- Candidate output must map into A-owned block graph before public output.
- No third-party raw field may leak into `HighSignalPageContext`, `SourceMap`, `PerceptionDigest`, or `PagePerceptionQualityReport`.
- `dom_baseline` must remain available as offline fallback.

`comparison-report.json` must include:

```text
pageKey
candidates[]
winner
fallbackUsed
mainTextOverlap
blockCoverage
noiseEstimate
warnings[]
```

## Gold Evaluation

A-V1.2 must define gold records before claiming quality improvement:

```text
goldMainContentBlocks[]
goldRejectedNoiseBlocks[]
goldDigestItems[]
goldSourceRefs[]
reviewNotes[]
```

Gold records may be human-reviewed or semi-automatic, but they must be reproducible and stored as evidence.

## Quality Gates

Corpus-level gates:

```text
valid_content pass rate >= 85%
core category pass rate >= 70%
sourceCoverage >= 0.95 for passed pages
groundingCompleteness >= 0.95 for passed pages
jumpbackCoverage >= 0.90 for passed pages
no_signal / low_signal pages never pass
```

Quality report must not hard-code pass. Every score must include:

```text
value
numerator
denominator
method
threshold
passed
```

## False-Green Checks

No-Go if:

- fewer than 100 pages are used for final A-V1.2 acceptance.
- one category dominates the corpus.
- generated pages replace real complex pages.
- low-signal pages pass quality gates.
- extractor raw output becomes public contract output.
- screenshots, OCR, video, or live perception are claimed without approved adapter contracts.
- A calls D/C/B, Artifact, SSE, EventStore, MCP, Skill, or external APIs directly.
- A claims final answer, mindmap, flashcard, quiz, podcast, notebook, RAG, or AgenticLoop completion.

## A-V1.2 Exit Report

The final report must summarize:

```text
total pages
category distribution
per-category pass rate
overall valid pass rate
failure reasons
extractor winner distribution if candidate extractors were used
fallback frequency if candidate extractors were used
quality metric distribution
debug evidence coverage
PRD coverage
remaining production risks
```
