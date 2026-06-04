# A Public API

## Module Entry

Recommended export:

```text
build_structured_page_context(input: PageReadingInput) -> PageReadingResult
```

Implementation files stay under `runtime/`. Integration Codex imports this entry and wires it to existing `/v1/page/context` or session update flow.

## Input

`PageReadingInput`:

- `sessionId`
- `pageId?`
- `url`
- `title`
- `domain?`
- `capturedAt`
- `headings[]`
- `selectedText?`
- `visibleText?`
- `cleanedText?`
- `html?` for fixtures only

## Output

`PageReadingResult`:

- `ok`
- `structuredPage?: StructuredPageContext`
- `error?: { code, message, recoverable }`
- `warnings[]`

## Error Rules

- Empty readable page returns `PAGE_CONTEXT_REQUIRED`.
- Parser failure returns recoverable module error and must not create artifact.
- Missing selector data is warning-only.

## Integration Rules

- A does not persist session state directly.
- A does not create `ArtifactRecord`.
- A does not emit SSE.
- A does not call C, D, B, MCP, Skill, or external API.

