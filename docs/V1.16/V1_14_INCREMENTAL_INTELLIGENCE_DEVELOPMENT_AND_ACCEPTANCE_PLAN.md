# V1.14 Incremental Intelligence Development And Acceptance Plan

Legacy alias: V2.14

## 1. Development Steps

1. Add snapshot pairing and artifact lookup.
2. Implement deterministic diff classification.
3. Generate changed facts with evidence refs.
4. Generate task memory.
5. Generate drift timeline.
6. Validate parity and acceptance audit.

## 2. Acceptance

- two snapshots produce stable/new/changed/resolved groups.
- changed fact records reference both snapshots when relevant.
- historical artifacts are unchanged after diff.
- drift timeline can be rendered by V1.15 workbench.

## 3. No-Go

- old artifact payload changes after V1.14 run.
- changed fact has no artifact reference.
- task memory includes unsupported facts.
