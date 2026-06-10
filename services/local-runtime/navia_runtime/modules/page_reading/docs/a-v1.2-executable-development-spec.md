# A-V1.2 Executable Development Spec

版本：A-V1.2 Executable Spec Draft
日期：2026-06-05
范围：A Page Perception / AgentCore Eyes

## 1. Stage Target

A-V1.2 only implements:

```text
high-quality page perception
+ structured page summary
+ jumpback evidence
+ debug-verifiable JSON
```

A must not generate final answers, Mindmap, Flashcards, Quiz, Podcast, Notebook, RAG output, AgenticLoop behavior, `ArtifactRecord`, SSE, EventStore, Trace, or D/C/B side effects.

Accepted route:

```text
DOM baseline
+ extractor ensemble
+ A-owned schema normalization
+ SourceMap / jumpback
+ Quality Evaluator
+ DebugEvidenceBundle
+ 100-page corpus gate
```

Implementation default:

- `dom_baseline` is always implemented and available.
- `extractor ensemble` is a candidate layer and must be disabled until dependency audit is approved.
- final public outputs come only from A-owned normalization and schema validation.
- SourceMap and QualityReport are mandatory for pass readiness.
- DebugEvidenceBundle is mandatory for human and automated acceptance.
- 100-page corpus exit is mandatory before claiming A-V1.2 completion.

## 2. Public / Evidence Schemas

A-V1.2 public decision:

```text
HighSignalPageContext
PerceptionDigest
SourceMap / SourceRef
PagePerceptionQualityReport
```

These are public D/C/B-consumable contracts when `PagePerceptionQualityReport.downstreamReadiness = "pass"`. D/C/B may use `degraded` outputs only as fallback or Debug evidence and must not use `fail` outputs as primary context.

A-V1.2 adds the following public evidence contracts for acceptance and Debug review:

```text
DebugEvidenceBundle
CorpusPageRecord
GoldEvaluationRecord
ExtractorComparisonReport
ExtractorCandidateScore
```

Machine validation schema:

```text
docs/navia_v1_project_docs/contracts/a_v1_2_page_perception.schema.json
```

### 2.1 DebugEvidenceBundle

```ts
type DebugEvidenceBundle = {
  schemaVersion: "a-v1.2-debug-evidence-2026-06-05";
  pageId: string;
  contentHash: string;
  status: "pass" | "degraded" | "fail";
  statusReason: string;
  rawSignals: RawPageSignals;
  candidateExtraction: ExtractorComparisonReport;
  filteredEvidence: FilteredBlockEvidence[];
  highSignalPage: HighSignalPageContext;
  sourceMap: SourceMap;
  perceptionDigest: PerceptionDigest;
  qualityReport: PagePerceptionQualityReport;
  auditTrail: DebugAuditStep[];
  warnings: string[];
};
```

Required rules:

- `status` must equal `qualityReport.downstreamReadiness`.
- `statusReason` must explain the dominant pass / degraded / fail reason.
- `auditTrail` must include at least extraction, filtering, digest, source map, and quality steps.
- Debug evidence must not include full unbounded page text; large text fields must use bounded quotes or hashes.

### 2.2 RawPageSignals

```ts
type RawPageSignals = {
  url: string;
  title: string;
  domain?: string;
  capturedAt: string;
  htmlAvailable: boolean;
  visibleTextLength: number;
  cleanedTextLength: number;
  headingCount: number;
  imageCount: number;
  tableCount: number;
  codeBlockCount: number;
  linkCount: number;
  languageHint?: string;
};
```

### 2.3 ExtractorComparisonReport

```ts
type ExtractorComparisonReport = {
  schemaVersion: "a-v1.2-extractor-comparison-2026-06-05";
  pageKey: string;
  pageId: string;
  contentHash: string;
  selectionFormula: "0.35*sourceRefCoverage + 0.25*(1-estimatedNoiseRatio) + 0.20*headingCoverage + 0.20*mainTextCoverage";
  winner: ExtractorName;
  fallbackUsed: boolean;
  fallbackReason:
    | "none"
    | "winner_failed"
    | "dependency_not_approved"
    | "tie_to_dom_baseline"
    | "all_candidates_rejected";
  tieBreaker: "highest_score_then_dom_baseline_then_sourceRefCoverage_then_mainTextChars";
  candidates: ExtractorCandidateScore[];
  warnings: string[];
};

type ExtractorName =
  | "dom_baseline"
  | "trafilatura"
  | "readability_lxml"
  | "readabilipy";

type ExtractorCandidateScore = {
  extractorName: ExtractorName;
  status: "available" | "unavailable" | "skipped" | "failed" | "rejected";
  blockCount: number;
  mainTextChars: number;
  mainTextCoverage: number;
  estimatedNoiseRatio: number;
  headingCoverage: number;
  sourceRefCoverage: number;
  score: number;
  rejectionReason:
    | "none"
    | "unavailable"
    | "failed"
    | "low_source_ref_coverage"
    | "high_noise"
    | "low_main_text"
    | "dependency_not_approved";
  warnings: string[];
};
```

Third-party extractors are candidate-only. Their raw output must not appear in `HighSignalPageContext`, `PerceptionDigest`, `SourceMap`, `PagePerceptionQualityReport`, or final A outputs.

### 2.4 CorpusPageRecord

```ts
type CorpusPageRecord = {
  pageKey: string;
  url: string;
  snapshotPath: string;
  category: CorpusCategory;
  language: "en" | "zh" | "mixed" | "unknown";
  complexityTags: ComplexityTag[];
  expectedRisks: string[];
  goldStatus: "reviewed" | "semi_auto_accepted";
  allowedNetworkAtCapture: boolean;
  capturedAt?: string;
  sourceLicenseNote?: string;
  expectedOutcome: "pass" | "degraded" | "fail";
};
```

### 2.5 GoldEvaluationRecord

```ts
type GoldEvaluationRecord = {
  schemaVersion: "a-v1.2-gold-evaluation-2026-06-05";
  pageKey: string;
  reviewedBy: "human" | "semi_auto_accepted";
  reviewedAt: string;
  goldMainContentBlocks: GoldBlock[];
  goldRejectedNoiseBlocks: GoldBlock[];
  goldDigestItems: GoldDigestItem[];
  goldSourceRefs: GoldSourceRef[];
  reviewNotes: string[];
};
```

Gold records must be reproducible and stored next to corpus evidence. A page cannot count toward final A-V1.2 pass rate unless `goldStatus = "reviewed"` or the stage audit explicitly accepts semi-automatic gold review.

## 3. 100-Page Corpus Manifest

Manifest path:

```text
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json
```

Required gates:

- `totalPages >= 100`.
- `categoryCount >= 10`.
- every core category has at least 8 pages, except explicitly smaller boundary categories.
- every final counted record has `url` and `snapshotPath`.
- low-signal pages must set `expectedOutcome` to `degraded` or `fail`.

Final counted corpus pages:

- must have `snapshotPath`; URL-only records are planning-only and cannot count toward final A-V1.2 acceptance.
- must have `goldStatus = "reviewed"` or `goldStatus = "semi_auto_accepted"`.
- must not use `planned` or `annotated` gold status in final pass-rate calculation.

Final evidence path pattern:

```text
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/<pageKey>.structured-page.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/<pageKey>.high-signal-page.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/<pageKey>.source-map.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/<pageKey>.perception-digest.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/<pageKey>.quality-report.json
services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/<pageKey>.debug-evidence.json
```

Optional after extractor audit:

```text
<pageKey>.candidate-extraction.json
<pageKey>.comparison-report.json
```

## 4. Gold Rubric

### 4.1 Main Content

A block is main content if it contains page-specific factual material that a user would expect to be summarized from the current page.

Main content includes:

- title and primary headings.
- article or document body paragraphs.
- meaningful list items.
- table headers and cells with page-specific data.
- code blocks or commands in technical content.
- image metadata only when DOM-readable alt, caption, title, aria-label, or nearby text exists.

Main content excludes:

- global nav.
- footer.
- cookie banners.
- login banners.
- subscription forms.
- share bars.
- related articles.
- ads.
- generic recommendations.
- boilerplate author bio unless page-specific.
- repeated link lists.

### 4.2 Structured Summary

`PerceptionDigest` must include only grounded items. Each item must have at least one `SourceRef`.

Allowed item kinds:

```text
key_fact
entity
claim
evidence
definition
procedure
table_fact
code_fact
image_metadata
open_question
```

Digest item rejection rules:

- no `sourceRefs`.
- text is generic boilerplate.
- text is a final answer rather than page fact.
- text is inferred from image/video content without approved OCR/VLM input.
- text duplicates another digest item with the same source.

### 4.3 SourceRef

Every source ref must include:

```text
pageId
contentHash
blockId
blockType
order
textQuote
textHash
fallbackText
confidence
```

Optional selector fields:

```text
selector
domPath
startOffset
endOffset
```

DOM selector cannot be the only jumpback mechanism. `textQuote` or `fallbackText` must be enough for B to display an evidence card if DOM jumpback fails.

## 5. Deterministic Algorithm Rules

### 5.1 Main Content Detection

Score each block from `0..1`:

```text
base = 0.30
+0.20 if under article/main/section semantic container
+0.15 if near primary heading path
+0.15 if text length >= 80 chars
+0.10 if contains numbers, citations, code, table data, or named entities
+0.10 if low link density
+0.10 if not repeated across page regions
-0.20 if in nav/footer/aside/header
-0.20 if link density > 0.6
-0.15 if contains cookie/login/subscription/share boilerplate
-0.10 if duplicated text hash appears > 1 time
```

Blocks with score `>= 0.55` are main candidates. Blocks below `0.35` are noise candidates. Others are neutral and may be downgraded or included only if needed for heading continuity.

### 5.2 Noise Filtering

Noise taxonomy:

```text
nav
footer
sidebar
recommendation
ad
comment
share
cookie_banner
login_wall
subscription
duplicate
low_density
```

Filtered blocks must be recorded in `filteredEvidence` with:

```text
blockId
reason
originalScore
finalDecision: "filtered" | "downgraded"
textHash
boundedTextQuote
```

### 5.3 Structured Page Summary

Summary generation is deterministic and source-grounded:

- TLDR uses the first 2-4 highest-importance main blocks.
- key facts come from evidence/definition/procedure/table/code blocks with high density.
- entities are extracted by deterministic patterns and heading context, not external lookup.
- procedures come from ordered lists, imperative headings, or step-like paragraphs.
- table facts come from header-cell pairs.
- code facts come from nearby heading + code block language/command pattern.

No digest item may be emitted without source refs.

### 5.4 Quality Metrics

Metrics must use numerator / denominator / method / threshold / passed.

```text
noiseRatio =
  filteredOrDowngradedNoiseBlocks / allDetectedBlocks

contentCoverage =
  highSignalContentChars / readableContentChars

sourceCoverage =
  highSignalBlocksWithSourceRef / highSignalBlocksTotal

groundingCompleteness =
  digestItemsWithSourceRefs / digestItemsTotal

jumpbackCoverage =
  sourceRefsWithTextQuoteOrFallbackText / sourceRefsTotal

digestCompressionRatio =
  digestTextTokenEstimate / structuredPageTextTokenEstimate

overallScore =
  weighted deterministic score from passed metric values
```

Pass thresholds:

```text
sourceCoverage >= 0.95
groundingCompleteness >= 0.95
jumpbackCoverage >= 0.90
noiseRatio <= 0.25 or degraded with explicit reason
overallScore >= 0.75
```

`compressionScore` maps digest compression quality:

```text
compressionScore = 1 - min(abs(digestCompressionRatio - 0.22) / 0.22, 1)
```

Denominator-zero behavior:

- `sourceCoverage`: `fail_when_empty`.
- `groundingCompleteness`: `fail_when_empty`.
- `jumpbackCoverage`: `fail_when_empty`.
- `noiseRatio`: `pass_when_empty` only when no readable content is detected and page is marked `fail`.
- `contentCoverage`: `degrade_when_empty`.
- `digestCompressionRatio`: `degrade_when_empty`.
- `candidateFactDensity`: `degrade_when_empty`.

## 6. Extractor Dependency Audit

Before adding `trafilatura`, `readability-lxml`, or `readabilipy`, produce:

```text
services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-extractor-dependency-audit.md
```

Audit fields:

```text
package
version
license
transitive dependency risk
install size
runtime import cost
runtime extraction latency on 20-page smoke set
offline availability
failure fallback behavior
security/privacy notes
decision: approved | rejected | deferred
```

No extractor may become required for baseline operation. `dom_baseline` remains the fallback.

Extractor candidate score formula:

```text
mainTextCoverage =
  candidate.mainTextChars / max(mainTextChars among available candidates on the same page)

If the denominator is 0, mainTextCoverage is 0 for every candidate and low-main-text
rejection rules decide whether only degraded/fail output is allowed.

score =
  0.35 * sourceRefCoverage
  + 0.25 * (1 - estimatedNoiseRatio)
  + 0.20 * headingCoverage
  + 0.20 * mainTextCoverage
```

Selection rules:

- reject unavailable, failed, unapproved, high-noise, low-source-coverage, or low-main-text candidates.
- choose highest score among non-rejected candidates.
- tie breaker is `highest_score_then_dom_baseline_then_sourceRefCoverage_then_mainTextChars`.
- if every non-DOM candidate is rejected, use `dom_baseline`.
- third-party candidates cannot win unless their dependency audit has `decision=approved`.

## 7. Stage Acceptance Commands

Required command after every A-V1.2 implementation substage:

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
```

Additional required checks after A-V1.2-8:

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests -k a_v1_2

PYTHONPATH=services/local-runtime python3 -m navia_runtime.modules.page_reading.eval_corpus \
  --manifest services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json \
  --output services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-level-report.json
```

Required evidence review after A-V1.2-8:

```text
corpus-manifest.json exists
>=100 page evidence bundles exist
corpus-level quality report exists
low-signal pages fail/degrade
debug-evidence.json explains every fail/degrade page
```

`eval_corpus` must exit non-zero when any of these checks fail:

- final counted pages are fewer than 100.
- category gate or core category minimum is not met.
- any final counted page lacks `snapshotPath` or stored reproducible HTML evidence.
- any final counted page lacks `goldStatus = reviewed` or `goldStatus = semi_auto_accepted`.
- source coverage, grounding completeness, jumpback coverage, or required quality thresholds fail.
- low-signal pages are marked `pass`.
- required DebugEvidenceBundle files are missing or do not explain pass/degraded/fail status.
- evidence files required by A-V1.2-1 through A-V1.2-7 are missing.

## 8. Implementation Handoff Rules

Each A-V1.2 substage handoff must include:

- changed files.
- contract changes or explicit `none`.
- test commands and results.
- evidence files created.
- PRD coverage.
- false-green risks.
- whether next stage is Go or No-Go.

If any acceptance fails, the stage returns to planning and audit before implementation continues.
