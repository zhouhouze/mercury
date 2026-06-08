# V1.13-V1.15 Final Acceptance Report

Legacy alias: V2.13-V2.15

Status: Accepted

Date: 2026-06-07

## 1. Implementation Summary

V1.13-V1.15 is implemented as a local backend evidence layer under `services/local-runtime/navia_runtime/v2/`.

Implemented:

- evidence artifact envelope and immutable SQLite persistence.
- V1.13 controlled runtime evidence with default-deny allowlist.
- V1.13 focused pytest execution and sanitized runtime evidence.
- V1.13 HTTP / CLI / MCP facade parity.
- V1.14 snapshot diff, changed facts, task memory, and drift timeline.
- V1.14 immutable artifact history guard.
- V1.15 review workbench payload, static HTML, Mermaid source/fallback, risk lanes, blocker board, and context export.
- V1.13-V1.15 HTTP E2E chain over the local Navia repository.
- Real CLI subprocess execution against the local Navia repository.

## 2. PRD Review

| Stage | PRD requirement | Result |
|---|---|---|
| V1.13 | allowlist runtime evidence, default deny, sanitized logs, persisted artifact | Covered |
| V1.14 | snapshot diff, changed facts, task memory, drift timeline, no history rewrite | Covered |
| V1.15 | artifact-backed workbench, HTML, Mermaid, risk lanes, blocker board, context export | Covered |

## 3. Validation Results

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_13_runtime_evidence.py
4 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_14_incremental.py
2 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_15_workbench.py
1 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests/test_v2_13_15_e2e.py
2 passed

PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests services/local-runtime/navia_runtime/modules/page_reading/tests
64 passed

xmllint --noout docs/V1.16/V1_13_15_TARGET_STATE.drawio
pass

git diff --check
pass
```

## 4. False-Green Audit

- Non-allowlisted commands are denied and do not execute.
- Focused pytest is the only approved runtime execution path.
- Runtime evidence is persisted and retrievable by artifact ID.
- CLI and MCP facade call the same implementation as HTTP.
- Snapshot diff creates new artifacts and does not rewrite previous artifacts.
- Workbench visible facts are derived from persisted artifact IDs.
- A full V1.13 -> V1.14 -> V1.15 HTTP chain runs on the local Navia repository.
- The CLI facade is verified through a real subprocess, not only direct Python function calls.

## 5. Remaining Risks

- MCP parity is currently a local Python facade, not a standalone MCP server.
- Real repository E2E is represented by the local Navia repository and focused pytest. Broader external-repo coverage should be scheduled after user approval for network or external repo access.
- Runtime allowlist intentionally remains narrow. Expanding it is a high-risk flow and requires explicit review.
