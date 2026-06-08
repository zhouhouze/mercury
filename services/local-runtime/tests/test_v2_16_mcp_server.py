from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from navia_runtime.app import app, v2_artifact_store
from navia_runtime.v2.cli import runtime_evidence_cli


ROOT = Path(__file__).resolve().parents[3]
FOCUSED_PYTEST = ["pytest", "-q", "services/local-runtime/tests/fixtures/test_v2_runtime_fixture.py"]


def setup_function() -> None:
    v2_artifact_store.clear()


def _run_mcp(messages: list[dict], db_path: Path) -> list[dict]:
    completed = subprocess.run(
        [sys.executable, "-m", "navia_runtime.v2.mcp_server"],
        cwd=ROOT,
        env={**os.environ, "PYTHONPATH": "services/local-runtime", "NAVIA_MCP_DB_PATH": str(db_path)},
        input="\n".join(json.dumps(message) for message in messages) + "\n",
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    return [json.loads(line) for line in completed.stdout.splitlines() if line.strip()]


def _tool_text(response: dict) -> dict:
    text = response["result"]["content"][0]["text"]
    return json.loads(text)


def test_v2_16_mcp_server_lists_required_tools(tmp_path: Path) -> None:
    responses = _run_mcp(
        [
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
        ],
        tmp_path / "mcp.sqlite3",
    )

    assert responses[0]["result"]["serverInfo"]["name"] == "navia-v2-evidence"
    tools = {tool["name"] for tool in responses[1]["result"]["tools"]}
    assert tools == {"navia_runtime_evidence", "navia_snapshot_diff", "navia_workbench", "navia_artifact_get"}


def test_v2_16_mcp_runtime_evidence_persists_schema_valid_artifact(tmp_path: Path) -> None:
    db_path = tmp_path / "mcp.sqlite3"
    responses = _run_mcp(
        [
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "navia_runtime_evidence",
                    "arguments": {
                        "requestId": "req_mcp_runtime",
                        "projectId": "navia-v2-mcp",
                        "payload": {"command": FOCUSED_PYTEST},
                    },
                },
            }
        ],
        db_path,
    )

    body = _tool_text(responses[0])
    artifact = body["artifact"]
    assert body["ok"] is True
    assert artifact["source"] == "mcp"
    assert artifact["artifactType"] == "runtime_evidence"
    assert artifact["payload"]["status"] == "succeeded"
    assert "1 passed" in artifact["payload"]["stdoutPreview"]

    get_response = _run_mcp(
        [
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "navia_artifact_get",
                    "arguments": {"requestId": "req_mcp_get", "artifactId": artifact["artifactId"]},
                },
            }
        ],
        db_path,
    )
    restored = _tool_text(get_response[0])["artifact"]
    assert restored["artifactId"] == artifact["artifactId"]


def test_v2_16_mcp_structured_schema_error(tmp_path: Path) -> None:
    responses = _run_mcp(
        [
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "navia_snapshot_diff",
                    "arguments": {
                        "requestId": "req_mcp_schema",
                        "projectId": "navia-v2-mcp",
                        "payload": {
                            "previousSnapshot": {"snapshotId": "same", "facts": []},
                            "currentSnapshot": {"snapshotId": "same", "facts": []},
                        },
                    },
                },
            }
        ],
        tmp_path / "mcp.sqlite3",
    )

    body = _tool_text(responses[0])
    assert responses[0]["result"]["isError"] is True
    assert body["ok"] is False
    assert body["error"]["code"] == "SCHEMA_VALIDATION_FAILED"
    assert body["error"]["details"]["path"] == "$.payload.currentSnapshotId"


def test_v2_16_http_cli_mcp_runtime_parity_for_equivalent_inputs(tmp_path: Path) -> None:
    denied_payload = {"projectId": "navia-v2-parity", "command": ["python3", "-c", "print('unsafe')"]}
    client = TestClient(app)
    http_artifact = client.post("/v2/runtime/evidence", json=denied_payload).json()["data"]["artifact"]
    cli_artifact = runtime_evidence_cli(v2_artifact_store, denied_payload)["artifact"]
    mcp_artifact = _tool_text(
        _run_mcp(
            [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {
                        "name": "navia_runtime_evidence",
                        "arguments": {
                            "requestId": "req_mcp_parity",
                            "projectId": "navia-v2-parity",
                            "payload": {"command": denied_payload["command"]},
                        },
                    },
                }
            ],
            tmp_path / "mcp.sqlite3",
        )[0]
    )["artifact"]

    for artifact in [http_artifact, cli_artifact, mcp_artifact]:
        assert artifact["artifactType"] == "runtime_evidence"
        assert artifact["schemaVersion"] == "v2.13-runtime-evidence-2026-06-07"
        assert artifact["projectId"] == "navia-v2-parity"
        assert artifact["payload"]["status"] == "denied"
        assert artifact["payload"]["allowlistRuleId"] == "none"
        assert artifact["payload"]["sanitized"] is True

    assert http_artifact["source"] == "http"
    assert cli_artifact["source"] == "cli"
    assert mcp_artifact["source"] == "mcp"


def test_v2_16_http_artifact_get_uses_artifact_not_found_code() -> None:
    client = TestClient(app)

    response = client.get("/v2/artifacts/v2art_missing", headers={"x-request-id": "req_missing_artifact"})
    body = response.json()

    assert response.status_code == 404
    assert body["ok"] is False
    assert body["error"]["code"] == "ARTIFACT_NOT_FOUND"
    assert body["request_id"] == "req_missing_artifact"
