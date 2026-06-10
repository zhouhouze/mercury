# D PRD Coverage

## Covered PRD Goals

- ChatBox can keep a continuous page-grounded conversation.
- User can summarize, ask questions, explain selection, and request mindmap through one chat interface.
- Tool execution is auditable and governed.
- Runtime remains the source of truth.

## Not Covered By D

- DOM extraction.
- Visual UI implementation.
- Mermaid visual rendering.
- Long-term knowledge base.
- Multi-agent orchestration.

## False-Green Risks

- A direct if/else AgentLoop that bypasses state and governance.
- Free-text tool outputs that cannot be traced.
- Passing mocked responses without active page grounding.
- Treating checkpoint as long-term memory.

