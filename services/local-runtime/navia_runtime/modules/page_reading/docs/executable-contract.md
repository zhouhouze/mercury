# A Executable Contract

## Contract Source

Public shape must conform to:

- `docs/navia_v1_project_docs/contracts/v1_2_adapter_contracts.md`
- `docs/navia_v1_project_docs/07-data-models.md`

## Required Assertions

`StructuredPageContext`:

- `pageId`, `sessionId`, `url`, `title`, `domain`, `capturedAt`, `contentHash` are present.
- `metadata.wordCount`, `paragraphCount`, `headingCount` are numeric.
- `paragraphs` preserve page order.
- `chunks` preserve page order.
- `annotations` reference existing paragraph IDs.
- `densityScore` and `confidence` are within `0..1`.

`A-V1.2` high-signal compatibility public contracts:

- `HighSignalPageContext` validates against `docs/navia_v1_project_docs/contracts/a_v1_1_high_signal.schema.json` for compatibility and against A-V1.2 public schema where applicable.
- `HighSignalPageContext.sourceStructuredPageRef` matches the source `StructuredPageContext` `pageId` and `contentHash`.
- Every `HighSignalBlock` has at least one `SourceRef`.
- `PerceptionDigest.items[]` contains only items with non-empty `sourceRefs`.
- Candidate digest items without source refs go to `rejectedItems`.
- Every `SourceRef` has `pageId`, `contentHash`, `blockId`, `blockType`, `order`, `textQuote`, `textHash`, `fallbackText`, and `confidence`.
- `selector` and `domPath` are optional and cannot be the only jumpback mechanism.
- `PagePerceptionQualityReport.metrics.*.method` is non-empty.
- `PagePerceptionQualityReport.downstreamReadiness` follows fixture class gates.
- `CandidateExtractionResult` is not exposed as final D/C/B contract.

## Ownership Assertions

- A creates `paragraphId`, `chunkId`, `headingId`, `contentHash`.
- D may store `StructuredPageContext` as active page.
- C may consume it.
- B must not mutate it.
- A owns `HighSignalPageContext`, `PerceptionDigest`, `SourceMap`, `SourceRef`, and `PagePerceptionQualityReport`.
- D/C may consume A-V1.2 high-signal contracts only when public schema validation passes and quality readiness passes.
- B may render A-V1.2 contracts in Debug, but must not mutate them.

## A-V1.2 False-Green Assertions

- `no_signal` fixtures must fail or return `PAGE_CONTEXT_REQUIRED`.
- `planning_only` fixtures must not produce `status = "ready"`.
- Quality reports must not hard-code pass.
- Third-party extractor output must be mapped through A-owned block graph before final output.
- A must not create ArtifactRecord, emit SSE, write EventStore, call D/C/B, or execute OCR/VLM/ASR/video/live engines.

## Test Command Placeholder

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
```
