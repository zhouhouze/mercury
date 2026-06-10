# B Mindmap Renderer Executable Contract

## Required Assertions

- valid Mermaid source produces render success or controlled fallback.
- invalid Mermaid source shows a short error message without source fallback.
- node source lookup resolves paragraph/chunk IDs or excerpt.
- missing `nodeSourceMap` does not block the render surface.
- renderer never claims backend generation success.

## Test Command Placeholder

```bash
pnpm --dir apps/chrome-extension test -- mindmap_renderer
```
