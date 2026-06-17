# B Mindmap Renderer Test And Evidence Plan

## Unit Tests

- view model extraction.
- Evidence Card view model schema validation.
- Mermaid render wrapper.
- render error fallback.
- node source resolution.
- source unavailable state.
- duplicate label disambiguation.
- long label wrapping / truncation contract.
- source panel state derivation.
- DOM success vs fallback vs blocked state derivation.

## Evidence

Evidence should include render status, fallback status, and source resolution output.

V1.3 evidence must include:

```text
docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json
docs/active/project/evidence/v1_3_evidence_card_mindmap/acceptance-report.html
docs/active/project/evidence/v1_3_evidence_card_mindmap/prd-review.md
docs/active/project/evidence/v1_3_evidence_card_mindmap/false-green-audit.md
docs/active/project/evidence/v1_3_evidence_card_mindmap/screenshots/
```

`report.json` must conform to:

```text
docs/active/project/contracts/v1_3_evidence_card_mindmap.schema.json
```

## Module Exit Criteria

- mindmap visual and fallback paths are both covered.
- renderer does not call backend generation.
- Evidence Card Mindmap is proven as the primary view.
- at least 8 real webpages or reproducible snapshots are included in the acceptance matrix.
- at least 3 real Chrome native Side Panel screenshot-level samples are included.
- HTML report, JSON report, screenshots, and PRD review agree.
- false-green audit has no fatal or major issue.
