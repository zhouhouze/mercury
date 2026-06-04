# B Chat Renderer Implementation Plan

## Build Order

1. Define local presentation event adapter.
2. Define message view model.
3. Implement streaming delta accumulation.
4. Implement tool state row view model.
5. Implement `artifact.created` handoff.
6. Implement runtime offline and missing context presentation.
7. Add recorded SSE fixture tests.

## Presentation Model

Minimum view model:

- messages.
- activeAssistantMessageId.
- activeToolState.
- artifactRefs.
- visibleError.
- unknownEvents for debug handoff.

## Event Handling

- `response.delta`: append text.
- `response.done`: close active assistant message.
- `tool.started`: show running state.
- `tool.done`: close running state.
- `tool.failed` / `tool.denied`: show failure or denied state.
- `artifact.created`: pass artifact to Artifact Renderer.
- `error`: show visible error.
- unknown: send to Debug Renderer only.

