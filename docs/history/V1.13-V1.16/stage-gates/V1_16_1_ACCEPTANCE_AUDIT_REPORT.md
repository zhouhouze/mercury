# V1.16-1 Executable Schema Validation Acceptance Audit

Version: V1.16-1 implementation evidence

Status: passed

## 1. PRD Coverage

V1.16-1 covers the PRD requirement that persisted public evidence artifacts validate against executable schemas before persistence.

Covered public artifacts:

- `runtime_evidence`
- `snapshot_diff`
- `changed_facts`
- `task_memory`
- `drift_timeline`
- `review_workbench`

## 2. Implementation Summary

- `V2ArtifactStore.insert()` validates every public artifact envelope before writing SQLite rows.
- invalid artifacts raise `SCHEMA_VALIDATION_FAILED` and do not persist partial rows.
- HTTP V2 endpoints return structured schema errors instead of uncaught 500 responses.
- V1.14 incremental payloads now include schema-required `changedFacts`, `sourceArtifactIds`, `task_memory`, and `drift_timeline` event evidence fields while retaining legacy fields for compatibility.

## 3. Acceptance Criteria

- every public payload type has at least one valid schema test.
- every public payload type has at least one invalid rejection test.
- invalid artifact persistence does not create a row.
- HTTP invalid schema path returns structured error.
- V1.13-V1.15 regression tests still pass.

## 4. False-Green Review

Known false-green risks and controls:

| Risk | Control |
|---|---|
| schema exists but persistence bypasses it | validation is called inside `V2ArtifactStore.insert()` |
| invalid artifact partially persists | rejection test checks `get()` and project list after failure |
| V1.14 payload shape drifts from docs | incremental output now includes executable schema fields |
| HTTP hides schema failures as 500 | endpoint catches `SchemaValidationError` and returns structured error |

## 5. Validation Commands

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_16_schema_validation.py
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_13_runtime_evidence.py services/local-runtime/tests/test_v2_14_incremental.py services/local-runtime/tests/test_v2_15_workbench.py services/local-runtime/tests/test_v2_13_15_e2e.py
git diff --check
```

## 6. Final Result

Passed.

Validation executed:

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_16_schema_validation.py
9 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_13_runtime_evidence.py services/local-runtime/tests/test_v2_14_incremental.py services/local-runtime/tests/test_v2_15_workbench.py services/local-runtime/tests/test_v2_13_15_e2e.py
9 passed
```

PRD review: V1.16-1 satisfies the executable schema validation requirement and preserves V1.13-V1.15 regression behavior.

No major specification gap detected.
