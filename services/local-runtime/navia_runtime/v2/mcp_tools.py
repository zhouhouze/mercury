from __future__ import annotations

from typing import Any

from navia_runtime.v2.artifacts import V2ArtifactStore
from navia_runtime.v2.incremental import compute_snapshot_diff
from navia_runtime.v2.runtime_evidence import run_controlled_runtime_evidence
from navia_runtime.v2.workbench import build_workbench


def runtime_evidence_tool(store: V2ArtifactStore, payload: dict[str, Any]) -> dict[str, Any]:
    return run_controlled_runtime_evidence(store, payload, source="mcp")


def snapshot_diff_tool(store: V2ArtifactStore, payload: dict[str, Any]) -> dict[str, Any]:
    return compute_snapshot_diff(store, payload, source="mcp")


def workbench_tool(store: V2ArtifactStore, payload: dict[str, Any]) -> dict[str, Any]:
    return build_workbench(store, payload, source="mcp")
