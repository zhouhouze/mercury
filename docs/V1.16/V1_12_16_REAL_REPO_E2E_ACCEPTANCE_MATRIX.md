# V1.12-V1.16 Real Repo E2E Acceptance Matrix

Version: V1.16 numbering refresh

## 1. Repository Classes

| Class | Minimum evidence |
|---|---|
| Small Python service | focused pytest runtime evidence |
| TypeScript frontend | package/build or structured blocker |
| Mixed monorepo | artifact scan plus blocker/risk lanes |
| Large existing project | structured blocker accepted only with reproducible cause |

## 2. Stage Matrix

| Stage | Required real repo validation |
|---|---|
| V1.13 | at least one focused pytest or approved equivalent command |
| V1.14 | two snapshots from same repo with changed facts |
| V1.15 | workbench HTML generated from persisted artifacts |

Current local acceptance evidence:

```text
services/local-runtime/tests/test_v2_13_15_e2e.py
```

This test uses the local Navia repository as the real repository target, runs focused pytest through controlled runtime evidence, computes a snapshot diff from the runtime result, and generates a workbench from persisted artifacts.

## 3. V1.16 External Repo Matrix

| Repo class | V1.16 requirement | Acceptance |
|---|---|---|
| Small Python service | controlled focused pytest | pass or structured blocker |
| TypeScript frontend | approved build/test command after allowlist audit | pass or structured blocker |
| Mixed repo / monorepo | artifact scan plus at least one approved validation | pass or structured blocker |
| Large existing project | workbench plus structured blocker if validation cannot run | pass or accepted blocker |

## 4. Structured Blocker Standard

A blocker may replace large repo E2E only when it includes:

- repo or fixture identity.
- command / route attempted.
- exact failure.
- artifact IDs.
- why the blocker is external or stage-limited.
- next action.
