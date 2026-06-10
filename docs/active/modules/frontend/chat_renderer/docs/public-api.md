# B Chat Renderer Public API

## Module Entries

Recommended exports:

```text
createChatPresentationState() -> ChatPresentationState
applyChatEvent(state: ChatPresentationState, event: AgentEvent) -> ChatPresentationState
selectChatViewModel(state: ChatPresentationState) -> ChatViewModel
```

Integration Codex wires these entries into the existing injected panel.

## Input

- existing `AgentEvent` SSE events.
- runtime status supplied by integration.
- user message presentation metadata.

## Output

- chat message view model.
- active streaming assistant message.
- tool state presentation.
- artifact handoff records.
- debug handoff for unknown events.

## Integration Rules

- Chat Renderer does not call Runtime tools.
- Chat Renderer does not persist AgentCore state.
- Chat Renderer does not create ArtifactRecord truth.

