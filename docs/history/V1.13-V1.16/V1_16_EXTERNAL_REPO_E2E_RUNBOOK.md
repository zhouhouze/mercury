# V1.16 External Repo E2E Runbook

Version: V1.16-3 implementation spec

Legacy alias: V2.16

## 1. Goal

V1.16-3 proves the evidence workflow on multiple repository classes or records accepted structured blockers.

URL-only evidence cannot count toward final acceptance.

## 2. Evidence Directory

Recommended output directory:

```text
docs/V1.16/stage-gates/evidence/v1.16/
```

Recommended files:

```text
external-repo-matrix.json
external-repo-matrix.md
structured-blockers.json
```

## 3. Repository Classes

| Class | Required local evidence | Accepted result |
|---|---|---|
| small Python service | local snapshot plus focused pytest | pass or blocker |
| TypeScript frontend | local snapshot plus approved build/test | pass or blocker |
| mixed repo / monorepo | local snapshot plus artifact scan and at least one validation | pass or blocker |
| large repo | local snapshot plus workbench or structured blocker | pass or accepted blocker |

Network clone is allowed only after explicit user approval.

## 4. Matrix Row Schema

Each counted row requires:

```json
{
  "rowId": "e2e_python_small",
  "repoClass": "small_python",
  "repoIdentity": "local fixture or approved repo",
  "snapshotPath": "path/to/reproducible/snapshot",
  "channel": "http|cli|mcp",
  "attemptedAction": "runtime evidence command or tool",
  "artifactIds": ["v2art_xxx"],
  "result": "pass|structured_blocker",
  "blockerId": null,
  "nextAction": "..."
}
```

Rules:

- `snapshotPath` is required unless the row is explicitly approved external network evidence.
- `artifactIds` is required for both pass and blocker rows.
- `result=structured_blocker` requires a blocker record.

## 5. Structured Blocker Schema

```json
{
  "blockerId": "blk_xxx",
  "repoIdentity": "repo or fixture",
  "attemptedCommandOrTool": "command / route / MCP tool",
  "failureCause": "exact failure",
  "artifactIds": ["v2art_xxx"],
  "stageLimitedReason": "why this is accepted as blocker",
  "nextAction": "what to do next",
  "reviewerDecision": "accepted|rejected"
}
```

## 6. Acceptance

V1.16-3 passes only when:

- all four repo classes have rows;
- every row has artifact IDs;
- all blockers satisfy the structured blocker schema;
- local reproducible evidence or user-approved network evidence exists;
- workbench can show external repo and MCP-origin evidence.

## 7. No-Go

- URL-only rows count as pass.
- a blocker has no artifact ID.
- a failed command is silently skipped.
- network access is used without approval record.
