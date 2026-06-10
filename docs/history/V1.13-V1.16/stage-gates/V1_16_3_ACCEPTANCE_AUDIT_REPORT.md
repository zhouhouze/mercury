# V1.16-3 External Repo E2E Matrix Acceptance Audit

Version: V1.16-3 implementation evidence

Status: passed

## 1. PRD Coverage

V1.16-3 covers the external repository E2E matrix requirement using reproducible local snapshots and accepted structured blockers.

## 2. Acceptance Criteria

- small Python service row passes with approved focused pytest evidence.
- TypeScript frontend, mixed monorepo, and large repo rows produce accepted structured blockers without allowlist expansion.
- evidence files contain four matrix rows and blocker records.
- every matrix row has artifact IDs.

## 3. False-Green Review

| Risk | Control |
|---|---|
| URL-only evidence counted as pass | all rows use local snapshot paths |
| failed command silently skipped | denied commands create runtime evidence artifacts |
| blocker lacks artifact evidence | blocker schema requires artifact IDs |
| allowlist expands silently | blocked rows remain structured blockers |

## 4. Final Result

Passed.

Validation executed:

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_16_external_repo_e2e.py
3 passed

PYTHONPATH=services/local-runtime python3 -m navia_runtime.v2.cli external-e2e --db .navia/navia.sqlite3 --payload '{"projectId":"navia-v1-16-external-evidence"}' --output-dir docs/V1.16/stage-gates/evidence/v1.16
```

Evidence files:

- `docs/V1.16/stage-gates/evidence/v1.16/external-repo-matrix.json`
- `docs/V1.16/stage-gates/evidence/v1.16/external-repo-matrix.md`
- `docs/V1.16/stage-gates/evidence/v1.16/structured-blockers.json`

PRD review: V1.16-3 satisfies the external repository E2E matrix requirement through reproducible local snapshots. The TypeScript frontend, mixed monorepo, and large repo rows are accepted structured blockers because command allowlist expansion is out of scope.

No major specification gap detected.
