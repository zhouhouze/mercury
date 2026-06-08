from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from navia_runtime.v2.artifacts import V2ArtifactStore
from navia_runtime.v2.external_e2e import ROOT, run_external_repo_e2e_matrix, write_external_repo_e2e_evidence


def test_v2_16_external_repo_matrix_has_four_reproducible_rows(tmp_path: Path) -> None:
    store = V2ArtifactStore(tmp_path / "external.sqlite3")

    result = run_external_repo_e2e_matrix(store, {"projectId": "navia-v1-16-external"}, source="cli")

    assert len(result["rows"]) == 4
    assert {row["repoClass"] for row in result["rows"]} == {
        "small_python",
        "typescript_frontend",
        "mixed_monorepo",
        "large_repo",
    }
    for row in result["rows"]:
        assert row["snapshotPath"]
        assert (ROOT / row["snapshotPath"]).exists()
        assert row["snapshotExists"] is True
        assert row["snapshotManifest"]["complete"] is True
        assert row["snapshotManifest"]["fileCount"] > 0
        assert row["artifactIds"]
        assert row["result"] in {"pass", "structured_blocker"}
        for artifact_id in row["artifactIds"]:
            artifact = store.get(artifact_id)
            assert artifact is not None
            assert artifact["payload"]["snapshotPath"] == row["snapshotPath"]
            assert artifact["payload"]["snapshotManifest"]["complete"] is True

    small_python = next(row for row in result["rows"] if row["repoClass"] == "small_python")
    assert small_python["result"] == "pass"
    assert len(result["blockers"]) == 3
    for blocker in result["blockers"]:
        assert blocker["artifactIds"]
        assert blocker["failureCause"]
        assert blocker["nextAction"]
        assert blocker["reviewerDecision"] == "accepted"


def test_v2_16_external_repo_evidence_files_are_reproducible(tmp_path: Path) -> None:
    store = V2ArtifactStore(tmp_path / "external.sqlite3")
    result = run_external_repo_e2e_matrix(store, {"projectId": "navia-v1-16-external"}, source="cli")

    files = write_external_repo_e2e_evidence(result, tmp_path / "evidence")

    matrix = json.loads(files["matrixJson"].read_text(encoding="utf-8"))
    blockers = json.loads(files["blockersJson"].read_text(encoding="utf-8"))
    markdown = files["matrixMarkdown"].read_text(encoding="utf-8")
    assert len(matrix["rows"]) == 4
    assert len(blockers["blockers"]) == 3
    assert "V1.16 External Repo E2E Matrix" in markdown


def test_v2_16_external_repo_cli_generates_evidence_files(tmp_path: Path) -> None:
    db_path = tmp_path / "external-cli.sqlite3"
    output_dir = tmp_path / "evidence"
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "navia_runtime.v2.cli",
            "external-e2e",
            "--db",
            str(db_path),
            "--payload",
            json.dumps({"projectId": "navia-v1-16-external-cli"}),
            "--output-dir",
            str(output_dir),
        ],
        cwd=ROOT,
        env={**os.environ, "PYTHONPATH": "services/local-runtime"},
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    body = json.loads(completed.stdout)
    assert len(body["rows"]) == 4
    assert Path(body["evidenceFiles"]["matrixJson"]).exists()
    assert Path(body["evidenceFiles"]["blockersJson"]).exists()
