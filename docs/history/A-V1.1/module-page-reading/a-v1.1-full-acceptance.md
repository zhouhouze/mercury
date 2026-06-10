# A-V1.1 Full Acceptance

## Stage Result

`A-V1.1` is accepted for the A module implementation scope after local validation.

This stage implements deterministic DOM-baseline high-signal page perception. It does not install or execute third-party extractors, OCR, VLM, ASR, video, live engines, MCP, Skill, D/C/B services, Artifact creation, SSE, EventStore, or Trace writes.

## Substage Acceptance

| Stage | Result | Evidence |
|---|---|---|
| `A-V1.1-1` Hybrid extraction and noise filtering | Accepted | `article_noise`, `news_with_sidebar`, and `product_doc` produce high-signal blocks while noisy sidebar/recommendation/ad-like content is filtered. |
| `A-V1.1-2` SourceMap and jumpback | Accepted | Every high-signal block and digest item has `SourceRef`; `textQuote` / `fallbackText` supports jumpback without relying only on DOM selector. |
| `A-V1.1-3` Deterministic digest | Accepted | `PerceptionDigest` is generated from high-signal blocks and remains grounded; ungrounded items are rejected. |
| `A-V1.1-4` Quality evaluator | Accepted | Quality metrics include numerator, denominator, method, threshold, and passed; readiness is derived from metrics. |
| `A-V1.1-5` Image metadata and OCR contract | Accepted | DOM-readable image metadata is represented; unknown images are not inferred; OCR remains contract-only. |
| `A-V1.1-6` Video/live planning records | Accepted | `video_page_stub` is planning-only and cannot become real perception ready. |

## Evidence Files

`tests/evidence/` contains generated outputs for module fixtures:

```text
<fixture>.structured-page.json
<fixture>.candidate-extraction.json
<fixture>.high-signal-page.json
<fixture>.source-map.json
<fixture>.perception-digest.json
<fixture>.quality-report.json
```

Low-signal fixtures may produce `*.error.json` instead of high-signal outputs.

## PRD Spec Review

The implementation matches the A module PRD role as AgentCore's perception layer:

- It improves information density by filtering noisy page regions.
- It produces structured, source-linked evidence for downstream D/C consumption.
- It adds machine quality assessment to reduce manual judgment.
- It supports reverse jumpback through fallback evidence.
- It handles image pages only through DOM-readable metadata.
- It keeps video/live as future planning and does not claim real media perception.

No fatal or major PRD deviation is identified.

## False-Green Review

The following false-green risks are covered by tests:

- no-signal pages cannot pass.
- planning-only video pages cannot become ready.
- digest items without source references are rejected.
- candidate extractor fields cannot leak into final public outputs.
- quality reports cannot omit method/numerator/denominator/threshold/passed.
- A runtime has no forbidden coupling to Artifact, SSE, EventStore, CoreProvider, MCP, Skill, OCR, VLM, ASR, video, or live engines.

## Acceptance Commands

```bash
python3 -m json.tool docs/navia_v1_project_docs/contracts/a_v1_1_high_signal.schema.json
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests services/local-runtime/navia_runtime/modules/page_reading/tests
git diff --check
```

Observed result:

```text
A module: 22 passed
Runtime + A module: 44 passed
```

## Integration Handoff

Integration may call `build_high_signal_page_perception(input)` from `navia_runtime.modules.page_reading.runtime`.

The returned A-V1.1 fields are:

```text
candidateExtraction
highSignalPage
sourceMap
perceptionDigest
qualityReport
```

Integration must still own Runtime API wiring, session persistence, Artifact creation, SSE/EventStore/Trace events, and frontend rendering.
