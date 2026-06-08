from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, TextIO

from navia_runtime.v2.artifacts import V2ArtifactStore
from navia_runtime.v2.incremental import compute_snapshot_diff
from navia_runtime.v2.runtime_evidence import run_controlled_runtime_evidence
from navia_runtime.v2.schemas import SchemaValidationError
from navia_runtime.v2.workbench import build_workbench


TOOL_NAMES = [
    "navia_runtime_evidence",
    "navia_snapshot_diff",
    "navia_workbench",
    "navia_artifact_get",
]


def default_db_path() -> Path:
    configured = os.environ.get("NAVIA_MCP_DB_PATH") or os.environ.get("NAVIA_DB_PATH")
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[4] / ".navia/navia.sqlite3"


def serve(input_stream: TextIO = sys.stdin, output_stream: TextIO = sys.stdout, store: V2ArtifactStore | None = None) -> None:
    store = store or V2ArtifactStore(default_db_path())
    for line in input_stream:
        line = line.strip()
        if not line:
            continue
        response = handle_message(json.loads(line), store)
        if response is not None:
            output_stream.write(json.dumps(response, ensure_ascii=False, sort_keys=True) + "\n")
            output_stream.flush()


def handle_message(message: dict[str, Any], store: V2ArtifactStore) -> dict[str, Any] | None:
    method = message.get("method")
    request_id = message.get("id")
    if request_id is None:
        return None
    if method == "initialize":
        return _rpc_result(
            request_id,
            {
                "protocolVersion": "2024-11-05",
                "serverInfo": {"name": "navia-v2-evidence", "version": "v1.16"},
                "capabilities": {"tools": {}},
            },
        )
    if method == "tools/list":
        return _rpc_result(request_id, {"tools": _tools()})
    if method == "tools/call":
        params = message.get("params") if isinstance(message.get("params"), dict) else {}
        tool_name = params.get("name")
        arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
        return _rpc_result(request_id, _call_tool(str(tool_name), arguments, store))
    return _rpc_error(request_id, "METHOD_NOT_FOUND", f"Unsupported MCP method: {method}")


def _tools() -> list[dict[str, Any]]:
    schema = {
        "type": "object",
        "required": ["requestId", "projectId", "payload"],
        "properties": {
            "requestId": {"type": "string"},
            "projectId": {"type": "string"},
            "payload": {"type": "object"},
        },
    }
    return [
        {"name": "navia_runtime_evidence", "description": "Run or deny controlled runtime evidence.", "inputSchema": schema},
        {"name": "navia_snapshot_diff", "description": "Create snapshot diff and changed-facts evidence.", "inputSchema": schema},
        {"name": "navia_workbench", "description": "Build artifact-backed workbench evidence.", "inputSchema": schema},
        {
            "name": "navia_artifact_get",
            "description": "Retrieve a persisted V2 evidence artifact.",
            "inputSchema": {
                "type": "object",
                "required": ["requestId", "artifactId"],
                "properties": {
                    "requestId": {"type": "string"},
                    "artifactId": {"type": "string"},
                },
            },
        },
    ]


def _call_tool(tool_name: str, arguments: dict[str, Any], store: V2ArtifactStore) -> dict[str, Any]:
    request_id = str(arguments.get("requestId") or "req_mcp")
    try:
        if tool_name == "navia_runtime_evidence":
            result = run_controlled_runtime_evidence(store, _payload(arguments), source="mcp")
            response = {"ok": result["ok"], "artifact": result["artifact"], "decision": result.get("decision"), "requestId": request_id}
        elif tool_name == "navia_snapshot_diff":
            artifacts = compute_snapshot_diff(store, _payload(arguments), source="mcp")
            response = {"ok": True, "artifacts": artifacts, "requestId": request_id}
        elif tool_name == "navia_workbench":
            artifacts = build_workbench(store, _payload(arguments), source="mcp")
            response = {"ok": True, "artifacts": artifacts, "requestId": request_id}
        elif tool_name == "navia_artifact_get":
            artifact = store.get(str(arguments.get("artifactId") or ""))
            if not artifact:
                response = {
                    "ok": False,
                    "artifact": None,
                    "error": {
                        "code": "ARTIFACT_NOT_FOUND",
                        "message": "V2 artifact not found.",
                        "recoverable": True,
                    },
                    "requestId": request_id,
                }
            else:
                response = {"ok": True, "artifact": artifact, "requestId": request_id}
        else:
            response = {
                "ok": False,
                "artifact": None,
                "error": {
                    "code": "TOOL_NOT_FOUND",
                    "message": f"Unknown tool: {tool_name}",
                    "recoverable": True,
                },
                "requestId": request_id,
            }
    except SchemaValidationError as exc:
        response = {"ok": False, "artifact": None, "error": exc.to_error(request_id), "requestId": request_id}
    return {
        "content": [{"type": "text", "text": json.dumps(response, ensure_ascii=False, sort_keys=True)}],
        "isError": not response.get("ok", False),
    }


def _payload(arguments: dict[str, Any]) -> dict[str, Any]:
    payload = arguments.get("payload") if isinstance(arguments.get("payload"), dict) else {}
    project_id = arguments.get("projectId")
    if project_id and "projectId" not in payload:
        payload = {**payload, "projectId": project_id}
    return payload


def _rpc_result(request_id: Any, result: dict[str, Any]) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def _rpc_error(request_id: Any, code: str, message: str) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": code, "message": message},
    }


def main() -> None:
    serve()


if __name__ == "__main__":
    main()
