# V1.14 Incremental Intelligence Target Architecture

Legacy alias: V2.14

## 1. Flow

```text
previous snapshot artifacts
  + current snapshot artifacts
  -> SnapshotDiff
  -> ChangedFacts
  -> TaskMemory
  -> DriftTimeline
  -> Workbench inputs
```

## 2. Components

| Component | Responsibility |
|---|---|
| SnapshotResolver | locate comparable snapshots |
| DiffEngine | classify stable/new/changed/resolved facts |
| TaskMemoryBuilder | summarize task-scoped durable context |
| DriftTimelineBuilder | record change history |

## 3. Contract Rules

- Diff outputs must reference previous and current artifact IDs.
- Old artifacts are immutable.
- Task memory is task-scoped and artifact-derived.
