# B Mindmap Renderer Mock Validation Plan

## Fixtures

- valid mindmap artifact.
- invalid Mermaid source artifact.
- mindmap artifact with nodeSourceMap.
- mindmap artifact without nodeSourceMap.
- node source fallback fixture.

## Pass Criteria

- Valid Mermaid artifact renders or enters controlled fallback.
- Invalid Mermaid source shows source fallback.
- Node source map can resolve paragraph/chunk excerpts.
- Missing source map does not crash UI.

## Fail Criteria

- Renderer claims visual success without render result.
- Renderer hides Mermaid source on failure.
- Renderer calls backend generation.
- Renderer changes artifact content.

## Current Evidence

Evidence file:

- `tests/evidence/render_failure_fallback.json`

Current validation command:

```bash
pnpm --dir apps/chrome-extension test
pnpm --dir apps/chrome-extension run typecheck
```

Current result:

```text
5 test files passed
26 tests passed
typecheck passed
```
