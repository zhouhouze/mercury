from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from navia_runtime.app import app, v2_artifact_store


ROOT = Path(__file__).resolve().parents[3]
FOCUSED_PYTEST = ["pytest", "-q", "services/local-runtime/tests/fixtures/test_v2_runtime_fixture.py"]


def setup_function() -> None:
    v2_artifact_store.clear()


def test_v2_13_15_real_repo_http_e2e_chain() -> None:
    client = TestClient(app)
    runtime = client.post(
        "/v2/runtime/evidence",
        json={"projectId": "navia-v2-e2e", "command": FOCUSED_PYTEST},
    ).json()["data"]["artifact"]

    diff_response = client.post(
        "/v2/snapshots/diff",
        json={
            "projectId": "navia-v2-e2e",
            "parentArtifactIds": [runtime["artifactId"]],
            "previousSnapshot": {
                "snapshotId": "snap_before_runtime",
                "facts": [{"factId": "runtime_evidence", "text": "not available"}],
            },
            "currentSnapshot": {
                "snapshotId": "snap_after_runtime",
                "facts": [{"factId": "runtime_evidence", "text": runtime["payload"]["status"]}],
            },
        },
    ).json()["data"]
    workbench = client.post(
        "/v2/workbench",
        json={
            "projectId": "navia-v2-e2e",
            "sourceArtifactIds": [runtime["artifactId"], diff_response["diff"]["artifactId"], diff_response["taskMemory"]["artifactId"]],
        },
    ).json()["data"]["workbench"]

    assert runtime["payload"]["status"] == "succeeded"
    assert "1 passed" in runtime["payload"]["stdoutPreview"]
    assert diff_response["diff"]["payload"]["changedFactIds"] == ["runtime_evidence"]
    assert workbench["artifactType"] == "review_workbench"
    assert set(workbench["payload"]["sourceArtifactIds"]) == {
        runtime["artifactId"],
        diff_response["diff"]["artifactId"],
        diff_response["taskMemory"]["artifactId"],
    }
    assert all(ref["artifactId"] in workbench["payload"]["html"] for ref in workbench["evidenceRefs"])


def test_v2_13_real_cli_subprocess_persists_runtime_evidence(tmp_path: Path) -> None:
    db_path = tmp_path / "navia-v2-cli.sqlite3"
    payload = {"projectId": "navia-v2-cli", "command": FOCUSED_PYTEST}
    env = {**os.environ, "PYTHONPATH": "services/local-runtime"}
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "navia_runtime.v2.cli",
            "runtime-evidence",
            "--db",
            str(db_path),
            "--payload",
            json.dumps(payload),
        ],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    result = json.loads(completed.stdout)
    artifact = result["artifact"]
    assert artifact["source"] == "cli"
    assert artifact["artifactType"] == "runtime_evidence"
    assert artifact["payload"]["status"] == "succeeded"
    assert "1 passed" in artifact["payload"]["stdoutPreview"]
