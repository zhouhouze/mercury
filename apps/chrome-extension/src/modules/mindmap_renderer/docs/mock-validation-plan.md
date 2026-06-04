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

