# V1.3-1 EvidenceCardViewModel Development and Acceptance

Date: 2026-06-23
Stage: V1.3-1
Result: Pass

---

## Development Plan

Goal:

```text
ArtifactRecord(type=mindmap) + metadata.nodeSourceMap
-> B-local EvidenceCardViewModel
-> schema-valid card tree input for Evidence Card Mindmap
```

Implementation scope:

- Keep `EvidenceCardViewModel` B-local.
- Validate the real ViewModel shape independently from the final acceptance report.
- Do not require C to output React / SVG / CSS structures.
- Do not change Runtime public contract.

---

## Audit Before Implementation

Audit opinion:

```text
No fatal issue.
No major issue.
Go for V1.3-1 validation and implementation closure.
```

Closed audit concern:

- The schema root validates `V13EvidenceCardAcceptanceReport`; V1.3-1 must also validate `$defs.EvidenceCardViewModel`.

Actions:

- Added `themes` and `displayPolicy` to `$defs.EvidenceCardViewModel`.
- Added `$defs.EvidenceCardTheme`.
- Added `$defs.EvidenceCardDisplayPolicy`.
- Added fixture: `apps/chrome-extension/src/modules/mindmap_renderer/tests/evidence/evidence_card_view_model.json`.
- Added validator support for `--view-model-fixture`.

---

## Acceptance Commands

```bash
python3 scripts/validate_v1_3_evidence_card_mindmap.py --view-model-fixture apps/chrome-extension/src/modules/mindmap_renderer/tests/evidence/evidence_card_view_model.json
npm --prefix apps/chrome-extension test -- mindmap_renderer
npm --prefix apps/chrome-extension run typecheck
```

Results:

- V1.3 report schema validation: pass.
- V1.3 report semantic validation: pass.
- EvidenceCardViewModel fixture validation: pass.
- Mindmap renderer tests: 1 file / 9 tests passed.
- Frontend typecheck: pass.

---

## PRD Review

Covered PRD requirements:

- B derives Evidence Card view model from Mindmap Artifact and metadata.
- Evidence Card nodes include title, source count, quality state, tags, selected-ready UI state, and fallback/source text.
- Missing source is represented as degraded / missing source instead of normal success.
- Mermaid remains fallback / debug, not the main V1.3 experience.

Not claimed:

- Full V1 complete.
- Final in-page floating ball / dual-track panel complete.
- Canvas Knowledge Map.
- RAG / Memory / Web Research / PPT / Deep Research.

---

## Decision

```text
V1.3-1 pass.
Go for V1.3-2 after V1.3-2 plan and audit are recorded.
```

