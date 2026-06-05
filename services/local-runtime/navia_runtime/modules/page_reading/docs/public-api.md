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

Default pass thresholds:

- `overallScore >= 0.75`
- `sourceCoverage >= 0.95`
- `groundingCompleteness >= 0.95`
- `noiseRatio <= 0.25`
- `downstreamReadiness = "pass"`
