# B Debug Renderer Implementation Plan

## Build Order

1. Define debug view model.
2. Implement runtime status panel.
3. Implement page context status panel.
4. Implement recent event list.
5. Implement unknown event display.
6. Implement compact error display.
7. Add fixture tests.

## Data Hygiene

- Show IDs and summaries.
- Avoid printing full page body by default.
- Truncate large payloads.
- Preserve request/trace IDs for user reports.

