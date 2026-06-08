from __future__ import annotations

import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from navia_runtime.contracts import new_id, utc_now
from navia_runtime.v2.artifacts import V2ArtifactStore


SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|token|secret|password)\s*=\s*[^\s]+"),
    re.compile(r"(?i)(api[_-]?key|token|secret|password)\s*:\s*[^\s]+"),
]


@dataclass(frozen=True)
class AllowlistDecision:
    allowed: bool
    rule_id: str
    reason: str
    normalized_command: list[str]


def decision_payload(decision: AllowlistDecision) -> dict[str, Any]:
    return {
        "allowed": decision.allowed,
        "ruleId": decision.rule_id,
        "reason": decision.reason,
        "normalizedCommand": decision.normalized_command,
    }


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def allowed_test_roots(root: Path) -> list[Path]:
    return [
        root / "services/local-runtime/tests",
        root / "services/local-runtime/navia_runtime/modules/page_reading/tests",
    ]


def decide_runtime_allowlist(command: Any, *, root: Path | None = None) -> AllowlistDecision:
    root = root or repo_root()
    if not isinstance(command, list) or not all(isinstance(part, str) and part for part in command):
        return AllowlistDecision(False, "none", "command must be a string array", [])
    if any(any(token in part for token in [";", "&&", "|", "`", "$("]) for part in command):
        return AllowlistDecision(False, "none", "shell operators are forbidden", command)

    normalized = list(command)
    if normalized[:2] == ["pytest", "-q"]:
        normalized = [sys.executable, "-m", "pytest", "-q", *normalized[2:]]
    elif normalized[:4] == [sys.executable, "-m", "pytest", "-q"]:
        normalized = list(normalized)
    elif len(normalized) >= 4 and Path(normalized[0]).name.startswith("python") and normalized[1:4] == ["-m", "pytest", "-q"]:
        normalized = [sys.executable, "-m", "pytest", "-q", *normalized[4:]]
    else:
        return AllowlistDecision(False, "none", "only focused pytest is allowlisted", command)

    targets = normalized[4:]
    if not targets:
        return AllowlistDecision(False, "focused_pytest", "focused pytest requires at least one target", normalized)
    if any(target.startswith("-") for target in targets):
        return AllowlistDecision(False, "focused_pytest", "additional pytest options are not allowlisted", normalized)
    for target in targets:
        target_path = (root / target).resolve()
        if not any(target_path.is_relative_to(allowed.resolve()) for allowed in allowed_test_roots(root)):
            return AllowlistDecision(False, "focused_pytest", f"target is outside allowed test roots: {target}", normalized)
    return AllowlistDecision(True, "focused_pytest", "focused pytest target is allowlisted", normalized)


def redact(value: str, *, max_chars: int = 4000) -> tuple[str, list[str]]:
    redacted = value[:max_chars]
    summary: list[str] = []
    if len(value) > max_chars:
        summary.append(f"truncated_to_{max_chars}_chars")
    for pattern in SECRET_PATTERNS:
        updated = pattern.sub(lambda match: f"{match.group(1)}=<redacted>", redacted)
        if updated != redacted:
            summary.append("secret_like_value_redacted")
        redacted = updated
    return redacted, sorted(set(summary))


def run_controlled_runtime_evidence(
    store: V2ArtifactStore,
    request: dict[str, Any],
    *,
    source: str = "http",
    root: Path | None = None,
) -> dict[str, Any]:
    root = root or repo_root()
    project_id = str(request.get("projectId") or request.get("project_id") or "navia-local")
    command = request.get("command")
    decision = decide_runtime_allowlist(command, root=root)
    command_id = new_id("cmd_")
    started_at = utc_now()
    completed_at = started_at

    if not decision.allowed:
        payload = {
            "commandId": command_id,
            "allowlistRuleId": decision.rule_id,
            "command": command if isinstance(command, list) else [],
            "cwdPolicy": "repo_root",
            "exitCode": None,
            "startedAt": started_at,
            "completedAt": completed_at,
            "stdoutPreview": "",
            "stderrPreview": decision.reason,
            "sanitized": True,
            "redactionSummary": [],
            "status": "denied",
        }
        _attach_snapshot_evidence(payload, request)
        artifact = store.make_artifact(
            artifact_type="runtime_evidence",
            project_id=project_id,
            payload=payload,
            schema_version="v2.13-runtime-evidence-2026-06-07",
            source=source,
            warnings=[decision.reason],
        )
        return {"ok": False, "artifact": store.insert(artifact), "decision": decision_payload(decision)}

    completed = subprocess.run(
        decision.normalized_command,
        cwd=root,
        text=True,
        capture_output=True,
        timeout=int(request.get("timeoutSeconds") or 30),
        env={**os.environ, "PYTHONPATH": "services/local-runtime"},
        check=False,
    )
    completed_at = utc_now()
    stdout_preview, stdout_redactions = redact(completed.stdout)
    stderr_preview, stderr_redactions = redact(completed.stderr)
    payload = {
        "commandId": command_id,
        "allowlistRuleId": decision.rule_id,
        "command": decision.normalized_command,
        "cwdPolicy": "repo_root",
        "exitCode": completed.returncode,
        "startedAt": started_at,
        "completedAt": completed_at,
        "stdoutPreview": stdout_preview,
        "stderrPreview": stderr_preview,
        "sanitized": True,
        "redactionSummary": sorted(set(stdout_redactions + stderr_redactions)),
        "status": "succeeded" if completed.returncode == 0 else "failed",
    }
    _attach_snapshot_evidence(payload, request)
    artifact = store.make_artifact(
        artifact_type="runtime_evidence",
        project_id=project_id,
        payload=payload,
        schema_version="v2.13-runtime-evidence-2026-06-07",
        source=source,
        warnings=[] if completed.returncode == 0 else ["command_exit_nonzero"],
    )
    return {"ok": completed.returncode == 0, "artifact": store.insert(artifact), "decision": decision_payload(decision)}


def _attach_snapshot_evidence(payload: dict[str, Any], request: dict[str, Any]) -> None:
    snapshot_path = request.get("snapshotPath")
    if isinstance(snapshot_path, str) and snapshot_path:
        payload["snapshotPath"] = snapshot_path
    snapshot_manifest = request.get("snapshotManifest")
    if isinstance(snapshot_manifest, dict):
        payload["snapshotManifest"] = snapshot_manifest
