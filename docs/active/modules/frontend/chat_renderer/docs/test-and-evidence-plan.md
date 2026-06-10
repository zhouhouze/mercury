# B Chat Renderer Test And Evidence Plan

## Unit Tests

- event reducer.
- streaming delta accumulation.
- tool state transitions.
- error presentation.
- unknown event safety.

## Evidence

Evidence should include:

- replayed fixture name.
- final view model.
- debug handoff records.
- visible error state.

## Module Exit Criteria

- all required SSE fixtures replay.
- renderer has no direct backend/tool calls.
- Runtime-owned state is not mutated.

