from __future__ import annotations

from fastapi.testclient import TestClient

from navia_runtime.app import app, v2_artifact_store


def setup_function() -> None:
    v2_artifact_store.clear()


def test_v2_15_workbench_uses_persisted_artifacts_only() -> None:
    client = TestClient(app)
    denied = client.post(
        "/v2/runtime/evidence",
        json={"projectId": "navia-v2-test", "command": ["python3", "-c", "print('unsafe')"]},
    ).json()["data"]["artifact"]
    diff = client.post(
        "/v2/snapshots/diff",
        json={
            "projectId": "navia-v2-test",
            "previousSnapshot": {"snapshotId": "prev", "facts": [{"factId": "fact_1", "text": "old"}]},
            "currentSnapshot": {"snapshotId": "curr", "facts": [{"factId": "fact_1", "text": "new"}]},
        },
    ).json()["data"]["diff"]

    response = client.post(
        "/v2/workbench",
        json={"projectId": "navia-v2-test", "sourceArtifactIds": [denied["artifactId"], diff["artifactId"]]},
    )
    body = response.json()

    assert body["ok"] is True
    workbench = body["data"]["workbench"]
    payload = workbench["payload"]
    assert workbench["artifactType"] == "review_workbench"
    assert payload["sourceArtifactIds"] == [denied["artifactId"], diff["artifactId"]]
    assert payload["blockerBoard"][0]["artifactId"] == denied["artifactId"]
    assert denied["artifactId"] in payload["html"]
    assert diff["artifactId"] in payload["html"]
    assert payload["mermaidDiagrams"][0]["source"].startswith("flowchart TD")
    assert workbench["evidenceRefs"] == [
        {"artifactId": denied["artifactId"], "redacted": False},
        {"artifactId": diff["artifactId"], "redacted": False},
    ]


def test_v2_15_workbench_rejects_missing_source_artifacts() -> None:
    client = TestClient(app)

    response = client.post(
        "/v2/workbench",
        json={"projectId": "navia-v2-test", "sourceArtifactIds": ["v2art_missing"]},
    )
    body = response.json()

    assert response.status_code == 400
    assert body["ok"] is False
    assert body["error"]["code"] == "SCHEMA_VALIDATION_FAILED"
    assert body["error"]["details"]["path"] == "$.sourceArtifactIds"
