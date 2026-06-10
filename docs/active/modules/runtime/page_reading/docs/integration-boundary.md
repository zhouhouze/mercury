# A Integration Boundary

## Consumed By

- D AgenticLoop for active page context.
- C Mindmap for structured page source.
- B only indirectly through D events and artifacts.

## Public Module Output

```text
StructuredPageContext
ParagraphBlock[]
PageChunk[]
ParagraphAnnotation[]
StructuredSummaryDraft optional
```

## Required For Integration

- Pure function or service entry that accepts existing V1 PageContext-like input.
- No direct dependency on Chrome extension globals.
- No direct dependency on FastAPI request objects.
- No artifact creation.

## Stop Conditions

Stop and return to V1.2-0 contract review if A needs:

- New external API endpoint.
- Changes to `ArtifactRecord`.
- Changes to existing SSE event types.
- Browser automation.
- Network search.

