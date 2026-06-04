# B Artifact Renderer Mock Validation Plan

## Fixtures

- summary artifact.
- answer artifact.
- mindmap artifact with Mermaid source.
- artifact missing optional source excerpt.
- malformed artifact.

## Pass Criteria

- Summary and answer artifacts render readable content.
- Mindmap artifact is routed to Mindmap Renderer.
- Source metadata is visible or fallback is visible.
- Malformed artifact does not crash UI.

## Fail Criteria

- Renderer claims artifact success when required fields are absent.
- Renderer modifies artifact truth state.
- Renderer directly calls backend generation.

