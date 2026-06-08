from __future__ import annotations

import html
from typing import Any

from navia_runtime.v2.artifacts import V2ArtifactStore
from navia_runtime.v2.schemas import SchemaValidationError


def build_workbench(store: V2ArtifactStore, request: dict[str, Any], *, source: str = "http") -> dict[str, Any]:
    project_id = str(request.get("projectId") or "navia-local")
    requested_ids = [str(value) for value in request.get("sourceArtifactIds", []) if isinstance(value, str)]
    artifacts: list[dict[str, Any]] = []
    missing_ids: list[str] = []
    if requested_ids:
        for artifact_id in requested_ids:
            artifact = store.get(artifact_id)
            if isinstance(artifact, dict):
                artifacts.append(artifact)
            else:
                missing_ids.append(artifact_id)
        if missing_ids:
            raise SchemaValidationError(f"unknown sourceArtifactIds: {', '.join(missing_ids)}", path="$.sourceArtifactIds")
    else:
        artifacts = store.list_by_project(project_id)
    if not artifacts:
        raise SchemaValidationError("workbench requires at least one persisted source artifact", path="$.sourceArtifactIds")
    source_ids = [artifact["artifactId"] for artifact in artifacts]
    risk_lanes = _risk_lanes(artifacts)
    blocker_board = _blockers(artifacts)
    mermaid = _mermaid(source_ids)
    context_export = {
        "projectId": project_id,
        "artifactIds": source_ids,
        "factSourceRule": "Every visible fact in this workbench is derived from persisted V2 artifacts.",
    }
    payload = {
        "workbenchId": f"wb_{project_id}",
        "sourceArtifactIds": source_ids,
        "riskLanes": risk_lanes,
        "blockerBoard": blocker_board,
        "mermaidDiagrams": [{"diagramId": "artifact_flow", "source": mermaid, "fallbackText": mermaid}],
        "contextExport": context_export,
        "html": _html(project_id, risk_lanes, blocker_board, mermaid, source_ids),
    }
    artifact = store.insert(
        store.make_artifact(
            artifact_type="review_workbench",
            project_id=project_id,
            parent_artifact_ids=source_ids,
            payload=payload,
            schema_version="v2.15-review-workbench-2026-06-07",
            source=source,
            evidence_refs=[{"artifactId": artifact_id, "redacted": False} for artifact_id in source_ids],
        )
    )
    return {"workbench": artifact}


def _risk_lanes(artifacts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    lanes = {"high": [], "medium": [], "low": []}
    for artifact in artifacts:
        artifact_type = artifact.get("artifactType")
        payload = artifact.get("payload", {})
        if artifact_type == "runtime_evidence" and payload.get("status") in {"failed", "denied"}:
            lanes["high"].append({"artifactId": artifact["artifactId"], "title": payload.get("stderrPreview") or payload.get("status")})
        elif artifact_type in {"snapshot_diff", "changed_facts"}:
            lanes["medium"].append({"artifactId": artifact["artifactId"], "title": artifact_type})
        else:
            lanes["low"].append({"artifactId": artifact["artifactId"], "title": str(artifact_type)})
    return [{"severity": severity, "items": items} for severity, items in lanes.items()]


def _blockers(artifacts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blockers: list[dict[str, Any]] = []
    for artifact in artifacts:
        payload = artifact.get("payload", {})
        if artifact.get("artifactType") == "runtime_evidence" and payload.get("status") in {"failed", "denied"}:
            status = str(payload.get("status") or "failed")
            blockers.append(
                {
                    "blockerId": f"blocker_{artifact['artifactId']}",
                    "artifactId": artifact["artifactId"],
                    "reason": payload.get("stderrPreview") or f"runtime command {status}",
                    "nextAction": "Review runtime evidence and keep it as a structured blocker unless an audit approves a retry.",
                }
            )
    return blockers


def _mermaid(source_ids: list[str]) -> str:
    lines = ["flowchart TD"]
    if not source_ids:
        return "flowchart TD\n  empty[No persisted artifacts]"
    for index, artifact_id in enumerate(source_ids):
        safe_id = f"a{index}"
        lines.append(f"  {safe_id}[{artifact_id}]")
        if index > 0:
            lines.append(f"  a{index - 1} --> {safe_id}")
    return "\n".join(lines)


def _html(project_id: str, risk_lanes: list[dict[str, Any]], blockers: list[dict[str, Any]], mermaid: str, source_ids: list[str]) -> str:
    lane_html = "".join(
        f"<section><h2>{html.escape(lane['severity'])}</h2><ul>"
        + "".join(f"<li>{html.escape(item['artifactId'])}: {html.escape(str(item['title']))}</li>" for item in lane["items"])
        + "</ul></section>"
        for lane in risk_lanes
    )
    blocker_html = "".join(
        f"<li>{html.escape(blocker['artifactId'])}: {html.escape(str(blocker['reason']))}</li>" for blocker in blockers
    )
    sources = "".join(f"<li>{html.escape(artifact_id)}</li>" for artifact_id in source_ids)
    return (
        "<!doctype html><html><head><meta charset='utf-8'><title>Navia V2 Workbench</title></head><body>"
        f"<h1>Navia V2 Workbench - {html.escape(project_id)}</h1>"
        f"<h2>Source Artifacts</h2><ul>{sources}</ul>"
        f"<h2>Risk Lanes</h2>{lane_html}"
        f"<h2>Blocker Board</h2><ul>{blocker_html}</ul>"
        f"<h2>Mermaid</h2><pre>{html.escape(mermaid)}</pre>"
        "</body></html>"
    )
