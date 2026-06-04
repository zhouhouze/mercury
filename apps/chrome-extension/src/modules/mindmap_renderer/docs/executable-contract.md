# B Mindmap Renderer Executable Contract

## Required Assertions

- valid Mermaid source produces render success or controlled fallback.
- invalid Mermaid source shows source fallback.
- node source lookup resolves paragraph/chunk IDs or excerpt.
- missing `nodeSourceMap` shows source unavailable state.
- renderer never claims backend generation success.

## Test Command Placeholder

```bash
pnpm --dir apps/chrome-extension test -- mindmap_renderer
```

