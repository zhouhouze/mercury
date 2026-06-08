from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from navia_runtime.app import app, v2_artifact_store


def setup_function() -> None:
    v2_artifact_store.clear()


def test_v2_14_snapshot_diff_changed_facts_task_memory_and_drift_timeline() -> None:
    client = TestClient(app)
    response = client.post(
        "/v2/snapshots/diff",
        json={
            "projectId": "navia-v2-test",
            "previousSnapshot": {
                "snapshotId": "snap_prev",
                "facts": [
                    {"factId": "fact_stable", "text": "stable"},
                    {"factId": "fact_changed", "text": "old"},
                    {"factId": "fact_resolved", "text": "gone"},
                ],
            },
            "currentSnapshot": {
                "snapshotId": "snap_current",
                "facts": [
                    {"factId": "fact_stable", "text": "stable"},
                    {"factId": "fact_changed", "text": "new"},
                    {"factId": "fact_new", "text": "new fact"},
                ],
            },
        },
    )
    body = response.json()

    assert body["ok"] is True
    diff = body["data"]["diff"]
    assert diff["artifactType"] == "snapshot_diff"
    assert diff["payload"]["stableFactIds"] == ["fact_stable"]
    assert diff["payload"]["changedFactIds"] == ["fact_changed"]
    assert diff["payload"]["newFactIds"] == ["fact_new"]
    assert diff["payload"]["resolvedFactIds"] == ["fact_resolved"]
    assert body["data"]["changedFacts"]["parentArtifactIds"] == [diff["artifactId"]]
    assert body["data"]["changedFacts"]["payload"]["changedFacts"][0]["sourceArtifactIds"] == [diff["artifactId"]]
    assert body["data"]["taskMemory"]["payload"]["artifactBacked"] is True
    assert body["data"]["taskMemory"]["payload"]["sourceArtifactIds"]
    assert body["data"]["driftTimeline"]["payload"]["events"]
    assert body["data"]["driftTimeline"]["payload"]["events"][0]["artifactIds"] == [diff["artifactId"]]


def test_v2_14_artifacts_are_immutable() -> None:
    artifact = v2_artifact_store.make_artifact(
        artifact_type="snapshot_diff",
        project_id="navia-v2-test",
        payload={
            "previousSnapshotId": "snap_prev",
            "currentSnapshotId": "snap_current",
            "stableFactIds": [],
            "newFactIds": [],
            "changedFactIds": [],
            "resolvedFactIds": [],
            "driftTimelineId": "drift_snap_prev_snap_current",
        },
        schema_version="v2.14-snapshot-diff-2026-06-07",
        artifact_id="v2art_fixed",
    )
    v2_artifact_store.insert(artifact)
    changed = {
        **artifact,
        "payload": {
            **artifact["payload"],
            "newFactIds": ["fact_new"],
        },
    }

    with pytest.raises(ValueError):
        v2_artifact_store.insert(changed)
