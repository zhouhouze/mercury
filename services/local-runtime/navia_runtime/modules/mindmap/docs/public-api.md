# C Public API

## Module Entry

Recommended export:

```text
generate_mindmap_payload(input: MindmapInput) -> MindmapResult
```

Integration Codex wraps this as a D internal adapter. C itself does not expose external HTTP API.

## Input

`MindmapInput`:

- `sessionId`
- `turnId`
- `toolCallId`
- `structuredPage: StructuredPageContext`
- `intentHint?`

## Output

`MindmapResult`:

- `ok`
- `mermaidSource?`
- `metadata?`
- `sourceChunkIds[]`
- `paragraphIds[]`
- `error?`
- `warnings[]`

`metadata` must include:

- `format = "mermaid"`
- `nodeSourceMap`
- `validation`
- `repairCount`

## Integration Rules

- C does not create `ArtifactRecord` directly.
- C does not emit SSE.
- C does not render Mermaid.
- C does not read Chrome DOM.

