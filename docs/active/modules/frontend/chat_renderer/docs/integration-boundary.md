# B Chat Renderer Integration Boundary

## Consumes

- Parsed SSE events from integration.
- Runtime status from integration.
- Artifact records passed to Artifact Renderer.

## Produces

- Chat presentation state.
- Artifact handoff events.
- Debug handoff for unknown events.

## Stop Conditions

Stop and return to V1.2-0 or Integration review if Chat Renderer needs:

- direct Runtime tool calls.
- new SSE event types.
- changes to `ArtifactRecord`.
- changes to AgentCore state model.

