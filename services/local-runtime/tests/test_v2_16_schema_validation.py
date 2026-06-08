from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from navia_runtime.app import app, v2_artifact_store
from navia_runtime.v2.schemas import SchemaValidationError, validate_artifact_envelope


def setup_function() -> None:
    v2_artifact_store.clear()


def _artifact(artifact_type: str, payload: dict) -> dict:
    return v2_artifact_store.make_artifact(
        artifact_type=artifact_type,
        project_id="navia-v2-schema",
        payload=payload,
        schema_version=f"v2.16-test-{artifact_type}",
        evidence_refs=[{"artifactId": "v2art_parent", "redacted": False}] if artifact_type == "review_workbench" else [],
    )


def test_v2_16_valid_public_payload_schemas() -> None:
    valid_payloads = {
        "runtime_evidence": {
            "commandId": "cmd_1",
            "allowlistRuleId": "focused_pytest",
            "command": ["pytest", "-q", "services/local-runtime/tests/fixtures/test_v2_runtime_fixture.py"],
            "cwdPolicy": "repo_root",
            "exitCode": 0,
            "startedAt": "2026-06-08T00:00:00Z",
            "completedAt": "2026-06-08T00:00:01Z",
            "stdoutPreview": "1 passed",
            "stderrPreview": "",
            "sanitized": True,
            "redactionSummary": [],
        },
        "snapshot_diff": {
            "previousSnapshotId": "snap_prev",
            "currentSnapshotId": "snap_current",
            "stableFactIds": [],
            "newFactIds": ["fact_new"],
            "changedFactIds": [],
            "resolvedFactIds": [],
            "driftTimelineId": "drift_snap_prev_snap_current",
        },
        "changed_facts": {
            "changedFacts": [
                {
                    "factId": "fact_new",
                    "changeType": "new",
                    "sourceArtifactIds": ["v2art_source"],
                    "summary": "fact_new is new.",
                }
            ],
        },
        "task_memory": {
            "memoryId": "mem_snap_prev_snap_current",
            "sourceArtifactIds": ["v2art_source"],
            "summary": "1 new fact.",
            "openRisks": [],
            "nextActions": ["Review the new fact."],
        },
        "drift_timeline": {
            "timelineId": "drift_snap_prev_snap_current",
            "events": [
                {
                    "eventId": "drift_evt_1",
                    "snapshotId": "snap_current",
                    "artifactIds": ["v2art_source"],
                    "eventType": "new",
                    "summary": "fact_new is new.",
                }
            ],
        },
        "review_workbench": {
            "workbenchId": "wb_navia",
            "sourceArtifactIds": ["v2art_parent"],
            "riskLanes": [{"severity": "low", "items": [{"artifactId": "v2art_parent", "title": "source"}]}],
            "blockerBoard": [],
            "mermaidDiagrams": [{"diagramId": "artifact_flow", "source": "flowchart TD", "fallbackText": "flowchart TD"}],
            "contextExport": {"projectId": "navia-v2-schema", "artifactIds": ["v2art_parent"]},
        },
    }

    for artifact_type, payload in valid_payloads.items():
        validate_artifact_envelope(_artifact(artifact_type, payload))


@pytest.mark.parametrize(
    ("artifact_type", "payload", "expected_path"),
    [
        ("runtime_evidence", {"sanitized": False}, "$.payload.commandId"),
        ("snapshot_diff", {"previousSnapshotId": "same", "currentSnapshotId": "same", "stableFactIds": [], "newFactIds": [], "changedFactIds": [], "resolvedFactIds": [], "driftTimelineId": "drift_same"}, "$.payload.currentSnapshotId"),
        ("changed_facts", {"changedFacts": [{"factId": "fact_1", "changeType": "new", "sourceArtifactIds": [], "summary": "missing source"}]}, "$.payload.changedFacts[0].sourceArtifactIds"),
        ("task_memory", {"memoryId": "mem_1", "sourceArtifactIds": [], "summary": "missing source", "openRisks": [], "nextActions": []}, "$.payload.sourceArtifactIds"),
        ("drift_timeline", {"timelineId": "drift_1", "events": [{"eventId": "evt_1", "snapshotId": "snap_1", "artifactIds": [], "eventType": "new", "summary": "missing source"}]}, "$.payload.events[0].artifactIds"),
        ("review_workbench", {"workbenchId": "wb_1", "sourceArtifactIds": [], "riskLanes": [{"severity": "low", "items": [{"artifactId": "v2art_missing"}]}], "blockerBoard": [], "mermaidDiagrams": [], "contextExport": {}}, "$.payload.sourceArtifactIds"),
    ],
)
def test_v2_16_invalid_public_payload_schemas_reject(artifact_type: str, payload: dict, expected_path: str) -> None:
    with pytest.raises(SchemaValidationError) as exc_info:
        validate_artifact_envelope(_artifact(artifact_type, payload))

    assert exc_info.value.path == expected_path


def test_v2_16_invalid_artifact_does_not_persist() -> None:
    artifact = v2_artifact_store.make_artifact(
        artifact_type="runtime_evidence",
        project_id="navia-v2-schema",
        payload={"commandId": "cmd_1"},
        schema_version="v2.16-invalid-runtime",
        artifact_id="v2art_invalid_runtime",
    )

    with pytest.raises(SchemaValidationError):
        v2_artifact_store.insert(artifact)

    assert v2_artifact_store.get("v2art_invalid_runtime") is None


def test_v2_16_http_returns_structured_schema_error_before_persistence() -> None:
    client = TestClient(app)

    response = client.post(
        "/v2/snapshots/diff",
        json={
            "projectId": "navia-v2-schema",
            "previousSnapshot": {"snapshotId": "same", "facts": []},
            "currentSnapshot": {"snapshotId": "same", "facts": []},
        },
        headers={"x-request-id": "req_schema_http"},
    )

    body = response.json()
    assert response.status_code == 400
    assert body["ok"] is False
    assert body["error"]["code"] == "SCHEMA_VALIDATION_FAILED"
    assert body["error"]["details"]["path"] == "$.payload.currentSnapshotId"
    assert v2_artifact_store.list_by_project("navia-v2-schema") == []
