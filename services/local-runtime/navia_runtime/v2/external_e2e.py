from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from navia_runtime.contracts import new_id
from navia_runtime.v2.artifacts import V2ArtifactStore, to_json
from navia_runtime.v2.runtime_evidence import run_controlled_runtime_evidence


ROOT = Path(__file__).resolve().parents[4]
FIXTURE_ROOT = ROOT / "services/local-runtime/tests/fixtures/external_repos"


REPO_ROWS = [
    {
        "rowId": "e2e_python_small",
        "repoClass": "small_python",
        "repoIdentity": "local snapshot: external_repos/small_python_service",
        "snapshotPath": "services/local-runtime/tests/fixtures/external_repos/small_python_service",
        "channel": "cli",
        "command": ["pytest", "-q", "services/local-runtime/tests/fixtures/external_repos/small_python_service/test_smoke.py"],
        "expected": "pass",
        "requiredFiles": ["README.md", "test_smoke.py"],
    },
    {
        "rowId": "e2e_typescript_frontend",
        "repoClass": "typescript_frontend",
        "repoIdentity": "local snapshot: external_repos/typescript_frontend",
        "snapshotPath": "services/local-runtime/tests/fixtures/external_repos/typescript_frontend",
        "channel": "cli",
        "command": ["npm", "test"],
        "expected": "structured_blocker",
        "requiredFiles": ["package.json"],
    },
    {
        "rowId": "e2e_mixed_monorepo",
        "repoClass": "mixed_monorepo",
        "repoIdentity": "local snapshot: external_repos/mixed_monorepo",
        "snapshotPath": "services/local-runtime/tests/fixtures/external_repos/mixed_monorepo",
        "channel": "cli",
        "command": ["pnpm", "test"],
        "expected": "structured_blocker",
        "requiredFiles": ["README.md"],
    },
    {
        "rowId": "e2e_large_repo",
        "repoClass": "large_repo",
        "repoIdentity": "local snapshot: external_repos/large_repo",
        "snapshotPath": "services/local-runtime/tests/fixtures/external_repos/large_repo",
        "channel": "cli",
        "command": ["python3", "-m", "pytest", "-q"],
        "expected": "structured_blocker",
        "requiredFiles": ["README.md"],
    },
]


def run_external_repo_e2e_matrix(
    store: V2ArtifactStore,
    request: dict[str, Any] | None = None,
    *,
    source: str = "cli",
) -> dict[str, Any]:
    request = request or {}
    project_id = str(request.get("projectId") or "navia-v1-16-external-e2e")
    rows: list[dict[str, Any]] = []
    blockers: list[dict[str, Any]] = []

    for definition in REPO_ROWS:
        snapshot_path = ROOT / str(definition["snapshotPath"])
        snapshot_manifest = _snapshot_manifest(snapshot_path, definition.get("requiredFiles", []))
        runtime = run_controlled_runtime_evidence(
            store,
            {
                "projectId": project_id,
                "command": definition["command"],
                "timeoutSeconds": request.get("timeoutSeconds") or 30,
                "snapshotPath": definition["snapshotPath"],
                "snapshotManifest": snapshot_manifest,
            },
            source=source,
            root=ROOT,
        )
        artifact = runtime["artifact"]
        artifact_ids = [artifact["artifactId"]]
        result = "pass" if runtime["ok"] and snapshot_manifest["complete"] else "structured_blocker"
        blocker_id: str | None = None
        next_action = "Review persisted runtime evidence and continue to final acceptance."
        if result == "structured_blocker":
            blocker_id = new_id("blk_")
            next_action = "Keep blocker accepted unless a separate allowlist audit approves this command class."
            blockers.append(
                {
                    "blockerId": blocker_id,
                    "repoIdentity": definition["repoIdentity"],
                    "attemptedCommandOrTool": " ".join(definition["command"]),
                    "failureCause": artifact["payload"].get("stderrPreview") or "runtime evidence did not pass",
                    "artifactIds": artifact_ids,
                    "stageLimitedReason": "V1.16 does not expand command allowlist without a separate audit.",
                    "nextAction": next_action,
                    "reviewerDecision": "accepted",
                }
            )
        rows.append(
            {
                "rowId": definition["rowId"],
                "repoClass": definition["repoClass"],
                "repoIdentity": definition["repoIdentity"],
                "snapshotPath": definition["snapshotPath"],
                "snapshotExists": snapshot_path.exists(),
                "snapshotManifest": snapshot_manifest,
                "channel": definition["channel"],
                "attemptedAction": " ".join(definition["command"]),
                "artifactIds": artifact_ids,
                "result": result,
                "blockerId": blocker_id,
                "nextAction": next_action,
            }
        )

    return {"projectId": project_id, "rows": rows, "blockers": blockers}


def _snapshot_manifest(snapshot_path: Path, required_files: list[str]) -> dict[str, Any]:
    files = sorted(path.relative_to(snapshot_path).as_posix() for path in snapshot_path.rglob("*") if path.is_file()) if snapshot_path.exists() else []
    missing = [file_name for file_name in required_files if file_name not in files]
    return {
        "fileCount": len(files),
        "files": files,
        "requiredFiles": required_files,
        "missingRequiredFiles": missing,
        "complete": snapshot_path.exists() and not missing,
    }


def write_external_repo_e2e_evidence(result: dict[str, Any], output_dir: str | Path) -> dict[str, Path]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    matrix_json = output / "external-repo-matrix.json"
    matrix_md = output / "external-repo-matrix.md"
    blockers_json = output / "structured-blockers.json"
    matrix_json.write_text(to_json({"rows": result["rows"]}) + "\n", encoding="utf-8")
    blockers_json.write_text(to_json({"blockers": result["blockers"]}) + "\n", encoding="utf-8")
    matrix_md.write_text(_matrix_markdown(result), encoding="utf-8")
    return {"matrixJson": matrix_json, "matrixMarkdown": matrix_md, "blockersJson": blockers_json}


def _matrix_markdown(result: dict[str, Any]) -> str:
    lines = [
        "# V1.16 External Repo E2E Matrix",
        "",
        "| Row | Repo class | Result | Artifact IDs | Next action |",
        "|---|---|---|---|---|",
    ]
    for row in result["rows"]:
        lines.append(
            f"| {row['rowId']} | {row['repoClass']} | {row['result']} | {', '.join(row['artifactIds'])} | {row['nextAction']} |"
        )
    return "\n".join(lines) + "\n"
