# A Public API

## Module Entry

Recommended export:

```text
build_structured_page_context(input: PageReadingInput) -> PageReadingResult
```

Implementation files stay under `runtime/`. Integration Codex imports this entry and wires it to existing `/v1/page/context` or session update flow.

A module planning and implementation items use `A-V1.0-*` numbering from `docs/navia_v1_project_docs/MODULE_VERSIONING.md`.

## Input

`PageReadingInput`:

- `sessionId`
- `pageId?`
- `url`
- `title`
- `domain?`
- `capturedAt`
- `headings[]`
- `selectedText?`
- `visibleText?`
- `cleanedText?`
- `html?` for fixtures only
- future planned `images[]`, `tables[]`, `media[]`, and OCR-related inputs only after contract review

Input rules:

- `html` is accepted for module fixtures and local contract tests only.
- Real runtime integration must consume captured PageContext or session active page data.
- Missing optional selector or DOM range fields must produce warnings, not parser failure.
- Missing readable text must return `PAGE_CONTEXT_REQUIRED`, not fake summary or empty success.

## Output

`PageReadingResult`:

- `ok`
- `structuredPage?: StructuredPageContext`
- `error?: { code, message, recoverable }`
- `warnings[]`
- future planned perception arrays such as image, OCR, table, and media blocks only after V1.2-0 contract review

A-V1.1 module-local extension candidates:

- `highSignalPage?: HighSignalPageContext`
- `perceptionDigest?: PerceptionDigest`
- `qualityReport?: PagePerceptionQualityReport`
- `sourceMap?: SourceMap`

These fields must remain module-local until public contract review accepts them. Integration may display them in Debug evidence before promotion, but must not make D/C/B depend on their exact shape without contract freeze.

ChatGPT audit closure:

```text
If D/C consume HighSignalPageContext, PerceptionDigest, SourceMap, or PagePerceptionQualityReport, these schemas must be promoted into v1_2_adapter_contracts.md or an equivalent public contract.
Until then, they are evidence-only and exact shape dependency is forbidden.
```

A-V1.1-0 must freeze exact schemas for:

- `HighSignalPageContext`
- `HighSignalBlock`
- `FilteredBlockEvidence`
- `PerceptionDigest`
- `PerceptionDigestItem`
- `SourceMap`
- `SourceRef`
- `PagePerceptionQualityReport`
- `QualityMetric`
- `QualityIssue`
- `CandidateExtractionResult`
- `CandidateBlock`

`StructuredPageContext` minimum shape:

- `pageId`
- `sessionId`
- `url`
- `title`
- `domain`
- `capturedAt`
- `contentHash`
- `metadata`
- `imageMetadata[]` module-local A-V1.0-2 output for DOM-readable image metadata. Integration must not expose it as a public cross-module contract until V1.2-0 accepts the schema.
- `headings`
- `paragraphs`
- `chunks`
- `annotations`
- `warnings`

Minimum block rules:

- Every paragraph has `paragraphId`, `pageId`, `order`, `text`, and `headingPath`.
- Every paragraph may include `sourceBlockType` for deterministic parser evidence, including `paragraph`, `list_item`, `table_header`, `table_cell`, `code`, `quote`, and `image_metadata`.
- Every chunk has `chunkId`, `pageId`, `order`, `text`, and paragraph or heading reference where possible.
- Every annotation references an existing `paragraphId`.
- `densityScore`, `importance`, and `confidence` are numeric and clamped to `0..1`.

Planned but not V1.2 implemented by default:

- `ImageBlock`: DOM-readable metadata only unless approved OCR input exists. Current A module evidence uses module-local `imageMetadata[]`.
- `OcrTextBlock`: contract-only in `A-V1.0-3`.
- `TableBlock`, `ListBlock`, `CodeBlock`: planned for `A-V1.0-4`.
- `MediaTimelineBlock`: video / live planning only in `A-V2.0-*`.

## Error Rules

- Empty readable page returns `PAGE_CONTEXT_REQUIRED`.
- Parser failure returns recoverable module error and must not create artifact.
- Missing selector data is warning-only.
- Image content without DOM metadata or approved OCR input must return unknown metadata, not inferred content.

## Integration Rules

- A does not persist session state directly.
- A does not create `ArtifactRecord`.
- A does not emit SSE.
- A does not call C, D, B, MCP, Skill, or external API.
- A does not directly call OCR engines, vision models, video stream analysis, or live stream analysis.
- OCR / vision / media execution must be routed through future governed Adapter contracts.
- Any public schema change must be proposed through V1.2-0 contract review before implementation.

## A-V1.1 Quality Gate

Minimum quality report fields:

- `overallScore`
- `noiseRatio`
- `contentCoverage`
- `sourceCoverage`
- `factDensity`
- `digestCompressionRatio`
- `groundingCompleteness`
- `jumpbackCoverage`
- `downstreamReadiness`
- `warnings`
- `fatalIssues`

Each metric must include:

- `value`
- optional `numerator`
- optional `denominator`
- `method`
- optional `threshold`
- `passed`

Default pass thresholds:

- `overallScore >= 0.75`
- `sourceCoverage >= 0.95`
- `groundingCompleteness >= 0.95`
- `jumpbackCoverage >= 0.95`
- `noiseRatio <= 0.25`
- `downstreamReadiness = "pass"`

Formula freeze:

- `noiseRatio = filteredOrDowngradedNoiseBlocks / allDetectedBlocks`.
- `contentCoverage = highSignalContentChars / readableContentChars`.
- `sourceCoverage = highSignalBlocksWithSourceRef / highSignalBlocksTotal`.
- `groundingCompleteness = digestItemsWithSourceRefs / digestItemsTotal`.
- `jumpbackCoverage = sourceRefsWithTextQuoteOrFallbackText / sourceRefsTotal`.
- `digestCompressionRatio = digestTextTokenEstimate / structuredPageTextTokenEstimate`.
- `candidateFactDensity = digestCandidateFactItems / digestTokenEstimate`.
- `overallScore` is a frozen weighted deterministic score over passed metrics.

SourceRef minimum shape:

- `sourceRefId`
- `pageId`
- `contentHash`
- `blockId`
- `blockType`
- `order`
- optional `paragraphId`
- optional `chunkId`
- optional `headingPath`
- `textQuote`
- `textHash`
- optional `selector`
- optional `domPath`
- optional `startOffset`
- optional `endOffset`
- `fallbackText`
- `confidence`

Rules:

- Every `PerceptionDigestItem` must have `sourceRefs`.
- DOM selector is optional and must not be the only jumpback mechanism.
- Every `SourceRef` must include `textQuote` or `fallbackText`.
- Quality reports must not hard-code pass.

## A-V1.2 Public API Planning

A-V1.2 defaults to preserving A-V1.1 public contracts:

```text
HighSignalPageContext
SourceMap / SourceRef
PerceptionDigest
PagePerceptionQualityReport
CandidateExtractionResult
```

Potential A-V1.2 additions require `A-V1.2-0` contract freeze before D/C/B can depend on exact shape:

```text
CorpusPageRecord
ExtractorComparisonReport
ExtractorCandidateScore
GoldEvaluationRecord
```

Extractor rules:

- `dom_baseline`, `trafilatura`, `readability_lxml`, and `readabilipy` are candidate extractors only.
- Candidate extractor output must map into A-owned block graph before final output.
- Third-party raw fields must not appear in `HighSignalPageContext`, `SourceMap`, `PerceptionDigest`, or `PagePerceptionQualityReport`.
- `dom_baseline` remains the offline fallback.

100-page acceptance rules:

- final A-V1.2 acceptance must use at least 100 complex pages.
- pages must include category, risk tags, URL or snapshot path, and evidence outputs.
- low-signal / paywall-like pages must fail or degrade instead of passing.
- A must not execute OCR, VLM, ASR, video, live engines, MCP, Skill, D/C/B, Artifact, SSE, or EventStore.
