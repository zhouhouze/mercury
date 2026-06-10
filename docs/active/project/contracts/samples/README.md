# Contract Samples

These samples close the V1.0-0 pre-development contract risk:

- `api-success.json` and `api-error.json` validate API response envelope.
- `page-context-article.json` validates PageContext derived from a real article fixture.
- `agent-event-state-transition.json` validates AgentEvent envelope.
- `tool-result-summary.json` validates ToolResult envelope.
- `chat-stream.sse` validates the SSE rule: `event:` equals AgentEvent `type`, and `data:` is the full AgentEvent JSON.
- `eventstore-event.json` validates that EventStore uses the same AgentEvent envelope as EventStream.
