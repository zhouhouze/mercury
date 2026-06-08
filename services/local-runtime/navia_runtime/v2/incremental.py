from __future__ import annotations

from typing import Any

from navia_runtime.contracts import new_id
from navia_runtime.v2.artifacts import V2ArtifactStore


def _facts(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    facts: dict[str, dict[str, Any]] = {}
    for item in snapshot.get("facts", []):
        if isinstance(item, dict) and isinstance(item.get("factId"), str):
            facts[item["factId"]] = item
    return facts


def compute_snapshot_diff(store: V2ArtifactStore, request: dict[str, Any], *, source: str = "http") -> dict[str, Any]:
    project_id = str(request.get("projectId") or "navia-local")
    previous = request.get("previousSnapshot") if isinstance(request.get("previousSnapshot"), dict) else {}
    current = request.get("currentSnapshot") if isinstance(request.get("currentSnapshot"), dict) else {}
    previous_id = str(previous.get("snapshotId") or "snapshot_previous")
    current_id = str(current.get("snapshotId") or "snapshot_current")
    previous_facts = _facts(previous)
    current_facts = _facts(current)

    stable: list[str] = []
    changed: list[str] = []
    for fact_id, fact in current_facts.items():
        if fact_id in previous_facts:
            if fact == previous_facts[fact_id]:
                stable.append(fact_id)
            else:
                changed.append(fact_id)
    new = [fact_id for fact_id in current_facts if fact_id not in previous_facts]
    resolved = [fact_id for fact_id in previous_facts if fact_id not in current_facts]

    parent_ids = [str(value) for value in request.get("parentArtifactIds", []) if isinstance(value, str)]
    diff_payload = {
        "previousSnapshotId": previous_id,
        "currentSnapshotId": current_id,
        "stableFactIds": stable,
        "newFactIds": new,
        "changedFactIds": changed,
        "resolvedFactIds": resolved,
        "driftTimelineId": f"drift_{previous_id}_{current_id}",
    }
    diff = store.insert(
        store.make_artifact(
            artifact_type="snapshot_diff",
            project_id=project_id,
            snapshot_id=current_id,
            parent_artifact_ids=parent_ids,
            payload=diff_payload,
            schema_version="v2.14-snapshot-diff-2026-06-07",
            source=source,
        )
    )
    changed_facts = store.insert(
        store.make_artifact(
            artifact_type="changed_facts",
            project_id=project_id,
            snapshot_id=current_id,
            parent_artifact_ids=[diff["artifactId"]],
            payload={
                "previousSnapshotId": previous_id,
                "currentSnapshotId": current_id,
                "changedFacts": [
                    {
                        "factId": fact_id,
                        "changeType": "changed" if fact_id in changed else "new",
                        "sourceArtifactIds": [diff["artifactId"]],
                        "summary": f"{fact_id} is {'changed' if fact_id in changed else 'new'} in {current_id}.",
                        "previous": previous_facts.get(fact_id),
                        "current": current_facts.get(fact_id),
                    }
                    for fact_id in changed + new
                ],
                "facts": [
                    {"factId": fact_id, "previous": previous_facts.get(fact_id), "current": current_facts.get(fact_id)}
                    for fact_id in changed + new
                ],
            },
            schema_version="v2.14-changed-facts-2026-06-07",
            source=source,
        )
    )
    task_memory = store.insert(
        store.make_artifact(
            artifact_type="task_memory",
            project_id=project_id,
            snapshot_id=current_id,
            parent_artifact_ids=[diff["artifactId"], changed_facts["artifactId"]],
            payload={
                "memoryId": f"mem_{previous_id}_{current_id}",
                "sourceArtifactIds": [diff["artifactId"], changed_facts["artifactId"]],
                "summary": f"{len(new)} new, {len(changed)} changed, {len(resolved)} resolved, {len(stable)} stable facts.",
                "openRisks": [],
                "nextActions": ["Review changed facts and blockers before accepting the snapshot."],
                "artifactBacked": True,
            },
            schema_version="v2.14-task-memory-2026-06-07",
            source=source,
        )
    )
    drift = store.insert(
        store.make_artifact(
            artifact_type="drift_timeline",
            project_id=project_id,
            snapshot_id=current_id,
            parent_artifact_ids=[diff["artifactId"]],
            payload={
                "timelineId": diff_payload["driftTimelineId"],
                "events": [
                    {
                        "eventId": new_id("drift_evt_"),
                        "snapshotId": current_id,
                        "artifactIds": [diff["artifactId"]],
                        "eventType": "new",
                        "summary": f"{fact_id} is new in {current_id}.",
                        "kind": "new",
                        "factId": fact_id,
                    }
                    for fact_id in new
                ]
                + [
                    {
                        "eventId": new_id("drift_evt_"),
                        "snapshotId": current_id,
                        "artifactIds": [diff["artifactId"]],
                        "eventType": "changed",
                        "summary": f"{fact_id} changed in {current_id}.",
                        "kind": "changed",
                        "factId": fact_id,
                    }
                    for fact_id in changed
                ]
                + [
                    {
                        "eventId": new_id("drift_evt_"),
                        "snapshotId": current_id,
                        "artifactIds": [diff["artifactId"]],
                        "eventType": "resolved",
                        "summary": f"{fact_id} is resolved in {current_id}.",
                        "kind": "resolved",
                        "factId": fact_id,
                    }
                    for fact_id in resolved
                ],
            },
            schema_version="v2.14-drift-timeline-2026-06-07",
            source=source,
        )
    )
    return {"diff": diff, "changedFacts": changed_facts, "taskMemory": task_memory, "driftTimeline": drift}
