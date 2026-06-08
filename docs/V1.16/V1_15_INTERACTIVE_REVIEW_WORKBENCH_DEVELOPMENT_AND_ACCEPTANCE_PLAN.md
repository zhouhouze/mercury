# V1.15 Interactive Review Workbench Development And Acceptance Plan

Legacy alias: V2.15

## 1. Development Steps

1. Define workbench payload builder.
2. Build risk lanes from risk artifacts.
3. Build blocker board from blocker artifacts.
4. Build Mermaid diagrams from artifact relationships.
5. Build context export.
6. Render static HTML workbench.
7. Validate all visible facts reference artifacts.

## 2. Acceptance

- payload validates against public contract.
- HTML renders without needing live runtime state.
- risk lanes and blocker board show artifact references.
- Mermaid renders or falls back to source text.
- context export includes artifact IDs and evidence refs.

## 3. No-Go

- visible fact lacks artifact reference.
- HTML requires transient runtime logs.
- blocker board hides structured blockers.
