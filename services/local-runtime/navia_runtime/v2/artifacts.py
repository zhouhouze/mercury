from __future__ import annotations

import json
import sqlite3
from uuid import uuid4
from pathlib import Path
from threading import RLock
from typing import Any

from navia_runtime.contracts import utc_now
from navia_runtime.v2.schemas import validate_artifact_envelope


def to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def from_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    return json.loads(value)


class V2ArtifactStore:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS v2_artifacts (
                    artifact_id TEXT PRIMARY KEY,
                    artifact_type TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    snapshot_id TEXT,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_v2_artifacts_project ON v2_artifacts(project_id)")
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_v2_artifacts_snapshot ON v2_artifacts(snapshot_id)")

    def make_artifact(
        self,
        *,
        artifact_type: str,
        project_id: str,
        payload: dict[str, Any],
        schema_version: str,
        snapshot_id: str | None = None,
        parent_artifact_ids: list[str] | None = None,
        source: str = "system",
        evidence_refs: list[dict[str, Any]] | None = None,
        warnings: list[str] | None = None,
        artifact_id: str | None = None,
    ) -> dict[str, Any]:
        return {
            "artifactId": artifact_id or f"v2art_{uuid4().hex}",
            "artifactType": artifact_type,
            "schemaVersion": schema_version,
            "projectId": project_id,
            "snapshotId": snapshot_id,
            "parentArtifactIds": parent_artifact_ids or [],
            "createdAt": utc_now(),
            "source": source,
            "payload": payload,
            "evidenceRefs": evidence_refs or [],
            "warnings": warnings or [],
        }

    def insert(self, artifact: dict[str, Any]) -> dict[str, Any]:
        validate_artifact_envelope(artifact)
        artifact_id = str(artifact["artifactId"])
        payload_json = to_json(artifact)
        with self._lock, self._conn:
            existing = self._conn.execute(
                "SELECT payload_json FROM v2_artifacts WHERE artifact_id = ?",
                (artifact_id,),
            ).fetchone()
            if existing:
                if existing["payload_json"] == payload_json:
                    return artifact
                raise ValueError(f"V2 artifact is immutable and already exists: {artifact_id}")
            self._conn.execute(
                """
                INSERT INTO v2_artifacts(artifact_id, artifact_type, project_id, snapshot_id, created_at, payload_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact_id,
                    artifact["artifactType"],
                    artifact["projectId"],
                    artifact.get("snapshotId"),
                    artifact["createdAt"],
                    payload_json,
                ),
            )
        return artifact

    def get(self, artifact_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload_json FROM v2_artifacts WHERE artifact_id = ?",
                (artifact_id,),
            ).fetchone()
        if not row:
            return None
        value = from_json(row["payload_json"], {})
        return value if isinstance(value, dict) else None

    def list_by_project(self, project_id: str) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload_json FROM v2_artifacts WHERE project_id = ? ORDER BY rowid",
                (project_id,),
            ).fetchall()
        return [from_json(row["payload_json"], {}) for row in rows]

    def clear(self) -> None:
        with self._lock, self._conn:
            self._conn.execute("DELETE FROM v2_artifacts")
