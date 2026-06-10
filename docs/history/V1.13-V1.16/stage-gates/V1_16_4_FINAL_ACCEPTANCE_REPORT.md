# V1.16 Final Acceptance Report

Version: V1.16-4 final acceptance

Status: passed

## 1. Scope

V1.16 final acceptance verifies:

- executable schema validation.
- real stdio MCP server.
- HTTP / CLI / MCP parity.
- external repo E2E matrix.
- V1.13-V1.15 regression.
- drawio and documentation integrity.

## 2. Required Validation

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_16_schema_validation.py services/local-runtime/tests/test_v2_16_mcp_server.py services/local-runtime/tests/test_v2_16_external_repo_e2e.py
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_13_runtime_evidence.py services/local-runtime/tests/test_v2_14_incremental.py services/local-runtime/tests/test_v2_15_workbench.py services/local-runtime/tests/test_v2_13_15_e2e.py
xmllint --noout docs/V1.16/V1_16_GAP.drawio docs/V1.16/V1_13_15_TARGET_STATE.drawio
git diff --check
```

## 3. PRD Review

Passed.

V1.16 PRD outcomes are covered:

- HTTP / CLI / MCP can request equivalent evidence workflows.
- public evidence artifacts validate before persistence.
- real stdio MCP server exposes runtime evidence, snapshot diff, workbench, and artifact retrieval tools.
- external repository E2E matrix uses reproducible local snapshots and accepted structured blockers.
- Workbench evidence remains artifact-backed through persisted artifact IDs and evidence refs.

## 4. False-Green Audit

Passed with one execution note.

Controls verified:

- schema validation is called inside `V2ArtifactStore.insert()`, not only in tests.
- invalid artifacts do not create partial rows.
- MCP tests invoke the real subprocess entrypoint `python -m navia_runtime.v2.mcp_server`.
- external repo matrix rows use local snapshot paths; URL-only evidence is not counted.
- blocked repository classes produce runtime evidence artifacts and accepted structured blockers.
- command allowlist was not expanded.

Execution note:

- parallel test execution can interfere through the shared `.navia` SQLite store when suites clear global state concurrently. Final acceptance uses sequential execution for the V1.16 + V1.13-V1.15 suite.

## 5. Validation Results

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_16_schema_validation.py services/local-runtime/tests/test_v2_16_mcp_server.py services/local-runtime/tests/test_v2_16_external_repo_e2e.py services/local-runtime/tests/test_v2_13_runtime_evidence.py services/local-runtime/tests/test_v2_14_incremental.py services/local-runtime/tests/test_v2_15_workbench.py services/local-runtime/tests/test_v2_13_15_e2e.py
25 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests
48 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests services/local-runtime/navia_runtime/modules/mindmap/tests services/local-runtime/navia_runtime/modules/agent_loop/tests
44 passed

xmllint --noout docs/V1.16/V1_16_GAP.drawio docs/V1.16/V1_13_15_TARGET_STATE.drawio
passed

git diff --check
passed
```

## 6. Final Result

V1.16 acceptance passed.

No fatal or major specification gap remains for the current stage.
