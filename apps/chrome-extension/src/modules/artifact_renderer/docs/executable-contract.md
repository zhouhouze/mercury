# B Artifact Renderer Executable Contract

## Required Assertions

- summary artifact renders readable content.
- answer artifact renders readable content.
- mindmap artifact with `metadata.format="mermaid"` is handed to Mindmap Renderer.
- missing source refs show source unavailable state.
- malformed artifact shows safe fallback.

## Test Command Placeholder

```bash
pnpm --dir apps/chrome-extension test -- artifact_renderer
```

