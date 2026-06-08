from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from navia_runtime.v2.artifacts import V2ArtifactStore
from navia_runtime.v2.external_e2e import run_external_repo_e2e_matrix, write_external_repo_e2e_evidence
from navia_runtime.v2.incremental import compute_snapshot_diff
from navia_runtime.v2.runtime_evidence import run_controlled_runtime_evidence
from navia_runtime.v2.schemas import SchemaValidationError
from navia_runtime.v2.workbench import build_workbench


def runtime_evidence_cli(store: V2ArtifactStore, payload: dict[str, Any]) -> dict[str, Any]:
    return run_controlled_runtime_evidence(store, payload, source="cli")


def snapshot_diff_cli(store: V2ArtifactStore, payload: dict[str, Any]) -> dict[str, Any]:
    return compute_snapshot_diff(store, payload, source="cli")


def workbench_cli(store: V2ArtifactStore, payload: dict[str, Any]) -> dict[str, Any]:
    return build_workbench(store, payload, source="cli")


def artifact_get_cli(store: V2ArtifactStore, artifact_id: str, request_id: str | None = None) -> dict[str, Any]:
    artifact = store.get(artifact_id)
    if not artifact:
        return {
            "ok": False,
            "artifact": None,
            "error": {
                "code": "ARTIFACT_NOT_FOUND",
                "message": "V2 artifact not found.",
                "recoverable": True,
            },
            "requestId": request_id or "req_cli_artifact_get",
        }
    return {"ok": True, "artifact": artifact, "requestId": request_id or "req_cli_artifact_get"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Navia V2 local CLI facade")
    parser.add_argument("operation", choices=["runtime-evidence", "snapshot-diff", "workbench", "artifact-get", "external-e2e"])
    parser.add_argument("--db", required=True)
    parser.add_argument("--payload")
    parser.add_argument("--artifact-id")
    parser.add_argument("--output-dir")
    args = parser.parse_args()
    store = V2ArtifactStore(Path(args.db))
    try:
        payload = json.loads(args.payload) if args.payload else {}
        if args.operation == "runtime-evidence":
            result = runtime_evidence_cli(store, payload)
        elif args.operation == "snapshot-diff":
            result = snapshot_diff_cli(store, payload)
        elif args.operation == "workbench":
            result = workbench_cli(store, payload)
        elif args.operation == "external-e2e":
            result = run_external_repo_e2e_matrix(store, payload, source="cli")
            if args.output_dir:
                result = {**result, "evidenceFiles": {key: str(value) for key, value in write_external_repo_e2e_evidence(result, args.output_dir).items()}}
        else:
            if not args.artifact_id:
                raise ValueError("--artifact-id is required for artifact-get")
            result = artifact_get_cli(store, args.artifact_id, payload.get("requestId") if isinstance(payload, dict) else None)
    except SchemaValidationError as exc:
        result = {
            "ok": False,
            "artifact": None,
            "error": exc.to_error("req_cli_schema"),
            "requestId": "req_cli_schema",
        }
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        sys.exit(1)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
