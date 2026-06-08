from __future__ import annotations

from typing import Any


PUBLIC_ARTIFACT_TYPES = {
    "runtime_evidence",
    "snapshot_diff",
    "changed_facts",
    "task_memory",
    "drift_timeline",
    "review_workbench",
}

PUBLIC_SOURCES = {"http", "cli", "mcp", "system"}


class SchemaValidationError(ValueError):
    def __init__(self, message: str, *, path: str = "$") -> None:
        super().__init__(message)
        self.path = path
        self.code = "SCHEMA_VALIDATION_FAILED"
        self.recoverable = True

    def to_error(self, request_id: str) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": str(self),
            "recoverable": self.recoverable,
            "requestId": request_id,
            "details": {"path": self.path},
        }


def validate_artifact_envelope(artifact: dict[str, Any]) -> None:
    _require_dict(artifact, "$")
    _require_str(artifact, "artifactId", "$.artifactId", prefix="v2art_")
    artifact_type = _require_str(artifact, "artifactType", "$.artifactType")
    if artifact_type not in PUBLIC_ARTIFACT_TYPES:
        raise SchemaValidationError(f"unknown artifactType: {artifact_type}", path="$.artifactType")
    _require_str(artifact, "schemaVersion", "$.schemaVersion")
    _require_str(artifact, "projectId", "$.projectId")
    if "snapshotId" in artifact and artifact["snapshotId"] is not None and not isinstance(artifact["snapshotId"], str):
        raise SchemaValidationError("snapshotId must be a string when present", path="$.snapshotId")
    _require_list(artifact, "parentArtifactIds", "$.parentArtifactIds", item_type=str)
    _require_str(artifact, "createdAt", "$.createdAt")
    source = _require_str(artifact, "source", "$.source")
    if source not in PUBLIC_SOURCES:
        raise SchemaValidationError(f"unknown source: {source}", path="$.source")
    payload = _require_dict(artifact.get("payload"), "$.payload")
    _require_list(artifact, "evidenceRefs", "$.evidenceRefs", item_type=dict)
    _require_list(artifact, "warnings", "$.warnings", item_type=str)
    validate_payload(artifact_type, payload, artifact)


def validate_payload(artifact_type: str, payload: dict[str, Any], artifact: dict[str, Any] | None = None) -> None:
    if artifact_type == "runtime_evidence":
        _validate_runtime_evidence(payload)
    elif artifact_type == "snapshot_diff":
        _validate_snapshot_diff(payload)
    elif artifact_type == "changed_facts":
        _validate_changed_facts(payload)
    elif artifact_type == "task_memory":
        _validate_task_memory(payload)
    elif artifact_type == "drift_timeline":
        _validate_drift_timeline(payload)
    elif artifact_type == "review_workbench":
        _validate_workbench(payload, artifact or {})
    else:
        raise SchemaValidationError(f"unknown artifactType: {artifact_type}", path="$.artifactType")


def _validate_runtime_evidence(payload: dict[str, Any]) -> None:
    _require_str(payload, "commandId", "$.payload.commandId")
    _require_str(payload, "allowlistRuleId", "$.payload.allowlistRuleId")
    _require_list(payload, "command", "$.payload.command", item_type=str)
    cwd_policy = _require_str(payload, "cwdPolicy", "$.payload.cwdPolicy")
    if cwd_policy not in {"repo_root", "fixture_root"}:
        raise SchemaValidationError("cwdPolicy must be repo_root or fixture_root", path="$.payload.cwdPolicy")
    if "exitCode" not in payload:
        raise SchemaValidationError("exitCode is required", path="$.payload.exitCode")
    if payload["exitCode"] is not None and not isinstance(payload["exitCode"], int):
        raise SchemaValidationError("exitCode must be an integer or null", path="$.payload.exitCode")
    _require_str(payload, "startedAt", "$.payload.startedAt")
    _require_str(payload, "completedAt", "$.payload.completedAt")
    _require_string(payload, "stdoutPreview", "$.payload.stdoutPreview")
    _require_string(payload, "stderrPreview", "$.payload.stderrPreview")
    if payload.get("sanitized") is not True:
        raise SchemaValidationError("sanitized=true is required", path="$.payload.sanitized")
    _require_list(payload, "redactionSummary", "$.payload.redactionSummary", item_type=str)


def _validate_snapshot_diff(payload: dict[str, Any]) -> None:
    previous = _require_str(payload, "previousSnapshotId", "$.payload.previousSnapshotId")
    current = _require_str(payload, "currentSnapshotId", "$.payload.currentSnapshotId")
    if previous == current:
        raise SchemaValidationError("previousSnapshotId and currentSnapshotId must differ", path="$.payload.currentSnapshotId")
    for key in ["stableFactIds", "newFactIds", "changedFactIds", "resolvedFactIds"]:
        _require_list(payload, key, f"$.payload.{key}", item_type=str)
    _require_str(payload, "driftTimelineId", "$.payload.driftTimelineId")


def _validate_changed_facts(payload: dict[str, Any]) -> None:
    changed_facts = _require_list(payload, "changedFacts", "$.payload.changedFacts", item_type=dict)
    for index, fact in enumerate(changed_facts):
        prefix = f"$.payload.changedFacts[{index}]"
        _require_str(fact, "factId", f"{prefix}.factId")
        change_type = _require_str(fact, "changeType", f"{prefix}.changeType")
        if change_type not in {"stable", "new", "changed", "resolved"}:
            raise SchemaValidationError("changeType is invalid", path=f"{prefix}.changeType")
        source_ids = _require_list(fact, "sourceArtifactIds", f"{prefix}.sourceArtifactIds", item_type=str)
        if not source_ids:
            raise SchemaValidationError("sourceArtifactIds must be non-empty", path=f"{prefix}.sourceArtifactIds")
        _require_str(fact, "summary", f"{prefix}.summary")


def _validate_task_memory(payload: dict[str, Any]) -> None:
    _require_str(payload, "memoryId", "$.payload.memoryId")
    source_ids = _require_list(payload, "sourceArtifactIds", "$.payload.sourceArtifactIds", item_type=str)
    if not source_ids:
        raise SchemaValidationError("sourceArtifactIds must be non-empty", path="$.payload.sourceArtifactIds")
    _require_str(payload, "summary", "$.payload.summary")
    _require_list(payload, "openRisks", "$.payload.openRisks", item_type=str)
    _require_list(payload, "nextActions", "$.payload.nextActions", item_type=str)


def _validate_drift_timeline(payload: dict[str, Any]) -> None:
    _require_str(payload, "timelineId", "$.payload.timelineId")
    events = _require_list(payload, "events", "$.payload.events", item_type=dict)
    for index, event in enumerate(events):
        prefix = f"$.payload.events[{index}]"
        _require_str(event, "eventId", f"{prefix}.eventId")
        _require_str(event, "snapshotId", f"{prefix}.snapshotId")
        artifact_ids = _require_list(event, "artifactIds", f"{prefix}.artifactIds", item_type=str)
        if not artifact_ids:
            raise SchemaValidationError("artifactIds must be non-empty", path=f"{prefix}.artifactIds")
        _require_str(event, "eventType", f"{prefix}.eventType")
        _require_str(event, "summary", f"{prefix}.summary")


def _validate_workbench(payload: dict[str, Any], artifact: dict[str, Any]) -> None:
    _require_str(payload, "workbenchId", "$.payload.workbenchId")
    source_ids = _require_list(payload, "sourceArtifactIds", "$.payload.sourceArtifactIds", item_type=str)
    if not source_ids:
        raise SchemaValidationError("sourceArtifactIds must be non-empty", path="$.payload.sourceArtifactIds")
    risk_lanes = _require_list(payload, "riskLanes", "$.payload.riskLanes", item_type=dict)
    blockers = _require_list(payload, "blockerBoard", "$.payload.blockerBoard", item_type=dict)
    _require_list(payload, "mermaidDiagrams", "$.payload.mermaidDiagrams", item_type=dict)
    _require_dict(payload.get("contextExport"), "$.payload.contextExport")
    source_id_set = set(source_ids)
    for lane_index, lane in enumerate(risk_lanes):
        for item_index, item in enumerate(lane.get("items", [])):
            artifact_id = item.get("artifactId")
            if artifact_id not in source_id_set:
                raise SchemaValidationError("risk lane item must reference a source artifact", path=f"$.payload.riskLanes[{lane_index}].items[{item_index}].artifactId")
    for index, blocker in enumerate(blockers):
        artifact_id = blocker.get("artifactId")
        if artifact_id not in source_id_set:
            raise SchemaValidationError("blocker must reference a source artifact", path=f"$.payload.blockerBoard[{index}].artifactId")
    for index, ref in enumerate(artifact.get("evidenceRefs", [])):
        ref_id = ref.get("artifactId") if isinstance(ref, dict) else None
        if ref_id not in source_id_set:
            raise SchemaValidationError("evidenceRef must reference a source artifact", path=f"$.evidenceRefs[{index}].artifactId")


def _require_dict(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise SchemaValidationError("must be an object", path=path)
    return value


def _require_str(obj: dict[str, Any], key: str, path: str, *, prefix: str | None = None) -> str:
    value = obj.get(key)
    if not isinstance(value, str) or not value:
        raise SchemaValidationError(f"{key} must be a non-empty string", path=path)
    if prefix is not None and not value.startswith(prefix):
        raise SchemaValidationError(f"{key} must start with {prefix}", path=path)
    return value


def _require_string(obj: dict[str, Any], key: str, path: str) -> str:
    value = obj.get(key)
    if not isinstance(value, str):
        raise SchemaValidationError(f"{key} must be a string", path=path)
    return value


def _require_list(obj: dict[str, Any], key: str, path: str, *, item_type: type | None = None) -> list[Any]:
    value = obj.get(key)
    if not isinstance(value, list):
        raise SchemaValidationError(f"{key} must be a list", path=path)
    if item_type is not None:
        for index, item in enumerate(value):
            if not isinstance(item, item_type):
                raise SchemaValidationError(f"{key}[{index}] has invalid type", path=f"{path}[{index}]")
    return value
