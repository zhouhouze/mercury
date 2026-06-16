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
- stable node ids suitable for frontend Evidence Card binding when available

## Integration Rules

- C does not create `ArtifactRecord` directly.
- C does not emit SSE.
- C does not render Mermaid.
- C does not read Chrome DOM.
- C does not return frontend component structures. V1.3 Evidence Card rendering is B-local and derived from artifact metadata.
