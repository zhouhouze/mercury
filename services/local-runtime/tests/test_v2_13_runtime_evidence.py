from __future__ import annotations

from fastapi.testclient import TestClient

from navia_runtime.app import app, v2_artifact_store
from navia_runtime.v2.cli import runtime_evidence_cli
from navia_runtime.v2.mcp_tools import runtime_evidence_tool
from navia_runtime.v2.runtime_evidence import redact


FOCUSED_PYTEST = ["pytest", "-q", "services/local-runtime/tests/fixtures/test_v2_runtime_fixture.py"]


def setup_function() -> None:
    v2_artifact_store.clear()


def test_v2_13_denies_non_allowlisted_command_and_persists_evidence() -> None:
    client = TestClient(app)
    response = client.post(
        "/v2/runtime/evidence",
        json={"projectId": "navia-v2-test", "command": ["python3", "-c", "print('unsafe')"]},
    )
    body = response.json()

    assert body["ok"] is True
    artifact = body["data"]["artifact"]
    assert body["data"]["status"] == "denied_or_failed"
    assert artifact["artifactType"] == "runtime_evidence"
    assert artifact["payload"]["status"] == "denied"
    assert artifact["payload"]["exitCode"] is None
    assert artifact["payload"]["allowlistRuleId"] == "none"

    restored = client.get(f"/v2/artifacts/{artifact['artifactId']}").json()
    assert restored["data"]["artifact"]["artifactId"] == artifact["artifactId"]


def test_v2_13_runs_real_focused_pytest_and_sanitizes_runtime_evidence() -> None:
    client = TestClient(app)
    response = client.post(
        "/v2/runtime/evidence",
        json={"projectId": "navia-v2-test", "command": FOCUSED_PYTEST},
    )
    body = response.json()

    assert body["ok"] is True
    artifact = body["data"]["artifact"]
    assert body["data"]["status"] == "accepted"
    assert artifact["payload"]["status"] == "succeeded"
    assert artifact["payload"]["exitCode"] == 0
    assert artifact["payload"]["sanitized"] is True
    assert "1 passed" in artifact["payload"]["stdoutPreview"]
    assert artifact["payload"]["allowlistRuleId"] == "focused_pytest"


def test_v2_13_http_cli_mcp_facades_share_runtime_evidence_contract() -> None:
    client = TestClient(app)
    http_artifact = client.post(
        "/v2/runtime/evidence",
        json={"projectId": "navia-v2-test", "command": FOCUSED_PYTEST},
    ).json()["data"]["artifact"]
    cli_artifact = runtime_evidence_cli(
        v2_artifact_store,
        {"projectId": "navia-v2-test", "command": FOCUSED_PYTEST},
    )["artifact"]
    mcp_artifact = runtime_evidence_tool(
        v2_artifact_store,
        {"projectId": "navia-v2-test", "command": FOCUSED_PYTEST},
    )["artifact"]

    for artifact in [http_artifact, cli_artifact, mcp_artifact]:
        assert artifact["artifactType"] == "runtime_evidence"
        assert artifact["schemaVersion"] == "v2.13-runtime-evidence-2026-06-07"
        assert artifact["payload"]["allowlistRuleId"] == "focused_pytest"
        assert artifact["payload"]["sanitized"] is True

    assert http_artifact["source"] == "http"
    assert cli_artifact["source"] == "cli"
    assert mcp_artifact["source"] == "mcp"


def test_v2_13_redacts_secret_like_runtime_output() -> None:
    value, summary = redact("token=abc123\napi_key:shhh\nnormal line")

    assert "abc123" not in value
    assert "shhh" not in value
    assert "token=<redacted>" in value
    assert "api_key=<redacted>" in value
    assert "secret_like_value_redacted" in summary
