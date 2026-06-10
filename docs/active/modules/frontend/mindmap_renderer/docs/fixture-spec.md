# B Mindmap Renderer Fixture Spec

## Required Fixture Files

```text
fixtures/valid-mindmap-artifact.json
fixtures/invalid-mermaid-artifact.json
fixtures/node-source-map-artifact.json
fixtures/no-node-source-map-artifact.json
```

## Expected Evidence Files

```text
tests/evidence/valid-mindmap.render.json
tests/evidence/invalid-mermaid.render.json
tests/evidence/node-source-map.render.json
tests/evidence/no-node-source-map.render.json
```

## Required Assertions

- invalid Mermaid source fallback contains source text.
- source map fixture resolves at least one node.
- missing source map fixture does not crash.

