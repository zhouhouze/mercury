# A-V1.1 Evidence Spec

## Goal

A-V1.1 evidence must prove that high-signal page perception is grounded, measurable, and safe for D/C consumption. Evidence files are not optional screenshots or debug dumps; they are machine-checkable contract artifacts.

## Required Evidence Files

Each A-V1.1 fixture run must write these files under `tests/evidence/`:

```text
<fixture>.structured-page.json
<fixture>.candidate-extraction.json
<fixture>.high-signal-page.json
<fixture>.source-map.json
<fixture>.perception-digest.json
<fixture>.quality-report.json
```

`empty_or_low_signal` may write `*.error.json` instead of high-signal outputs if it returns `PAGE_CONTEXT_REQUIRED`.

## Evidence Envelope

Every evidence file must include:

```text
schemaVersion
fixtureName
fixtureClass
sourceFixturePath
pageId
contentHash
generatedAt
contractName
contractVersion
validation
payload
```

`validation` must include:

```text
schemaValid: boolean
assertions: string[]
warnings: string[]
fatalIssues: string[]
```

## Fixture Classes

| Class | Expected readiness |
|---|---|
| `valid_content` | `downstreamReadiness = pass` |
| `degraded_content` | `downstreamReadiness = degraded` is allowed with warnings |
| `no_signal` | `downstreamReadiness = fail` or `PAGE_CONTEXT_REQUIRED` |
| `planning_only` | contract fields only; never real perception ready |

## False-Green Checks

- `PerceptionDigest.items[]` cannot include items without `sourceRefs`.
- `SourceRef` cannot rely only on selector or domPath.
- `PagePerceptionQualityReport` cannot pass without metric methods.
- `CandidateExtractionResult` cannot be copied into final high-signal payloads.
- `video_page_stub` cannot produce `status = ready`.
