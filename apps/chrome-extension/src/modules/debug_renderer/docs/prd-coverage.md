# B Debug Renderer PRD Coverage

## Covered PRD Goals

- Runtime offline state is visible.
- PageContext and tool failures can be diagnosed.
- Developers can validate trace/event behavior during local acceptance.

## Not Covered By Debug Renderer

- Primary chat UX.
- Artifact visual design.
- Runtime retry semantics.

## False-Green Risks

- Hiding operational failures.
- Showing debug information as user-facing answer.
- Logging sensitive full page text.

