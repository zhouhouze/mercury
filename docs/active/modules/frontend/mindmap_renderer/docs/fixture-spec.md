# B Mindmap Renderer Fixture Spec

## Required Fixture Files

```text
fixtures/valid-mindmap-artifact.json
fixtures/invalid-mermaid-artifact.json
fixtures/node-source-map-artifact.json
fixtures/no-node-source-map-artifact.json
fixtures/v1_3_evidence_card_normal.json
fixtures/v1_3_evidence_card_missing_source.json
fixtures/v1_3_evidence_card_duplicate_labels.json
fixtures/v1_3_evidence_card_long_text.json
fixtures/v1_3_evidence_card_low_signal.json
fixtures/v1_3_evidence_card_render_failure.json
fixtures/v1_3_evidence_card_jumpback_fallback.json
```

## Expected Evidence Files

```text
tests/evidence/valid-mindmap.render.json
tests/evidence/invalid-mermaid.render.json
tests/evidence/node-source-map.render.json
tests/evidence/no-node-source-map.render.json
tests/evidence/v1_3_evidence_card_normal.render.json
tests/evidence/v1_3_evidence_card_missing_source.render.json
tests/evidence/v1_3_evidence_card_duplicate_labels.render.json
tests/evidence/v1_3_evidence_card_long_text.render.json
tests/evidence/v1_3_evidence_card_low_signal.render.json
tests/evidence/v1_3_evidence_card_render_failure.render.json
tests/evidence/v1_3_evidence_card_jumpback_fallback.render.json
```

## Required Assertions

- invalid Mermaid source fallback contains source text.
- source map fixture resolves at least one node.
- missing source map fixture does not crash.
- normal fixture renders Evidence Card as primary view.
- missing source fixture marks affected cards as `missing_source` or `degraded`, never normal.
- duplicate label fixture preserves separate `nodeId`, `sourceRefIds`, and selected state.
- long text fixture does not overflow the Side Panel width.
- low signal fixture shows degraded or source unavailable state.
- render failure fixture keeps Mermaid source fallback visible.
- jumpback fallback fixture marks fallback as fallback, not DOM success.
