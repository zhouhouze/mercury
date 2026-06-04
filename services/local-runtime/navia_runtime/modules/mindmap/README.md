# C Mindmap Service Module

Owner: C module Codex.

Responsibility:

- Generate Mermaid mindmap from `StructuredPageContext`.
- Validate Mermaid.
- Repair once at most.
- Produce `MindmapNodeSourceMap`.
- Create traceable mindmap artifact content and metadata.

Internal structure:

```text
docs/
contracts/
runtime/
tests/
fixtures/
```

Output contract:

- `ArtifactRecord(type="mindmap", metadata.format="mermaid")`
- `metadata.nodeSourceMap`
- `sourceChunkIds`
- `paragraphIds`

Do not edit `services/local-runtime/navia_runtime/tools.py` directly. Integration Codex owns wiring into existing runtime entrypoints.
