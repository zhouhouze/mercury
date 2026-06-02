from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path
from threading import RLock
from typing import Any, Protocol


class EventStore(Protocol):
    def append(self, event: dict[str, Any]) -> None: ...

    def list_by_session(self, session_id: str) -> list[dict[str, Any]]: ...


class EventStream(Protocol):
    def publish(self, event: dict[str, Any]) -> None: ...

    def drain(self) -> list[dict[str, Any]]: ...


def _to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _from_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    return json.loads(value)


@dataclass
class InMemoryEventStore:
    events: list[dict[str, Any]] = field(default_factory=list)

    def append(self, event: dict[str, Any]) -> None:
        self.events.append(event)

    def list_by_session(self, session_id: str) -> list[dict[str, Any]]:
        return [event for event in self.events if event["session_id"] == session_id]


@dataclass
class InMemoryEventStream:
    published: list[dict[str, Any]] = field(default_factory=list)

    def publish(self, event: dict[str, Any]) -> None:
        self.published.append(event)

    def drain(self) -> list[dict[str, Any]]:
        events = list(self.published)
        self.published.clear()
        return events


class _SQLiteEventCollection:
    def __init__(self, store: "SQLiteEventStore") -> None:
        self.store = store

    def clear(self) -> None:
        self.store.clear()

    def __len__(self) -> int:
        return self.store.count()

    def __iter__(self):
        return iter(self.store.list_all())


class SQLiteEventStore:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()
        self.events = _SQLiteEventCollection(self)

    def _init_schema(self) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    turn_id TEXT,
                    type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)")
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_events_turn ON events(turn_id)")

    def append(self, event: dict[str, Any]) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO events(event_id, session_id, turn_id, type, timestamp, payload_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    event["event_id"],
                    event["session_id"],
                    event.get("turn_id"),
                    event["type"],
                    event["timestamp"],
                    _to_json(event),
                ),
            )

    def list_by_session(self, session_id: str) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload_json FROM events WHERE session_id = ? ORDER BY rowid",
                (session_id,),
            ).fetchall()
        return [_from_json(row["payload_json"], {}) for row in rows]

    def list_all(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute("SELECT payload_json FROM events ORDER BY rowid").fetchall()
        return [_from_json(row["payload_json"], {}) for row in rows]

    def count(self) -> int:
        with self._lock:
            row = self._conn.execute("SELECT COUNT(*) AS count FROM events").fetchone()
        return int(row["count"])

    def clear(self) -> None:
        with self._lock, self._conn:
            self._conn.execute("DELETE FROM events")


@dataclass
class SessionStore:
    sessions: dict[str, dict[str, Any]] = field(default_factory=dict)
    pages: dict[str, dict[str, Any]] = field(default_factory=dict)

    def create(self, session_id: str, created_at: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        session = {
            "session_id": session_id,
            "created_at": created_at,
            "updated_at": created_at,
            "metadata": metadata or {},
        }
        self.sessions[session_id] = session
        return session

    def exists(self, session_id: str) -> bool:
        return session_id in self.sessions

    def set_active_page(self, session_id: str, page: dict[str, Any]) -> None:
        self.pages[page["page_id"]] = page
        if session_id in self.sessions:
            self.sessions[session_id]["active_page"] = {
                "page_id": page["page_id"],
                "url": page["url"],
                "title": page["title"],
                "domain": page["domain"],
                "content_hash": page["content_hash"],
                "captured_at": page["captured_at"],
            }

    def get_active_page(self, session_id: str) -> dict[str, Any] | None:
        session = self.sessions.get(session_id)
        if not session:
            return None
        active_page = session.get("active_page")
        if not isinstance(active_page, dict):
            return None
        page_id = active_page.get("page_id")
        if not isinstance(page_id, str):
            return None
        return self.pages.get(page_id)

    def add_artifact(self, session_id: str, artifact: dict[str, Any]) -> None:
        if session_id not in self.sessions:
            return
        self.sessions[session_id].setdefault("artifacts", []).append(artifact)

    def add_message(self, session_id: str, message: dict[str, Any]) -> None:
        if session_id not in self.sessions:
            return
        self.sessions[session_id].setdefault("messages", []).append(message)

    def add_tool_call(self, session_id: str, record: dict[str, Any]) -> None:
        if session_id not in self.sessions:
            return
        self.sessions[session_id].setdefault("tool_calls", []).append(record)

    def add_budget_entry(self, session_id: str, entry: dict[str, Any]) -> None:
        if session_id not in self.sessions:
            return
        self.sessions[session_id].setdefault("budget_ledger", []).append(entry)

    def upsert_checkpoint(self, session_id: str, checkpoint: dict[str, Any]) -> None:
        if session_id not in self.sessions:
            return
        self.sessions[session_id].setdefault("checkpoints", []).append(checkpoint)

    def get_session_record(self, session_id: str) -> dict[str, Any] | None:
        return self.sessions.get(session_id)


class SQLiteSessionStore(SessionStore):
    def __init__(self, db_path: str | Path) -> None:
        super().__init__()
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()
        self._load_cache()

    def _init_schema(self) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    active_page_id TEXT
                )
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS pages (
                    page_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    url TEXT NOT NULL,
                    title TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    captured_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    message_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    turn_id TEXT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    metadata_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tool_calls (
                    tool_call_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    turn_id TEXT NOT NULL,
                    tool_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS artifacts (
                    artifact_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    turn_id TEXT NOT NULL,
                    tool_call_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    source_page_id TEXT,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS budget_ledger (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    turn_id TEXT NOT NULL,
                    tool_call_id TEXT,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS checkpoints (
                    checkpoint_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_pages_session ON pages(session_id)")
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id)")
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id)")
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_budget_session ON budget_ledger(session_id)")
            self._conn.execute("CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id)")

    def _load_cache(self) -> None:
        with self._lock:
            session_rows = self._conn.execute("SELECT * FROM sessions").fetchall()
            page_rows = self._conn.execute("SELECT payload_json FROM pages").fetchall()
        self.sessions.clear()
        self.pages.clear()
        for row in session_rows:
            self.sessions[row["session_id"]] = {
                "session_id": row["session_id"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "metadata": _from_json(row["metadata_json"], {}),
            }
            if row["active_page_id"]:
                self.sessions[row["session_id"]]["active_page"] = {"page_id": row["active_page_id"]}
        for row in page_rows:
            page = _from_json(row["payload_json"], {})
            if isinstance(page, dict) and isinstance(page.get("page_id"), str):
                self.pages[page["page_id"]] = page
                session = self.sessions.get(str(page.get("session_id")))
                if session and session.get("active_page", {}).get("page_id") == page["page_id"]:
                    session["active_page"] = {
                        "page_id": page["page_id"],
                        "url": page["url"],
                        "title": page["title"],
                        "domain": page["domain"],
                        "content_hash": page["content_hash"],
                        "captured_at": page["captured_at"],
                    }

    def create(self, session_id: str, created_at: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        session = super().create(session_id, created_at, metadata)
        with self._lock, self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO sessions(session_id, created_at, updated_at, metadata_json, active_page_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (session_id, created_at, created_at, _to_json(metadata or {}), None),
            )
        return session

    def exists(self, session_id: str) -> bool:
        if super().exists(session_id):
            return True
        with self._lock:
            row = self._conn.execute("SELECT 1 FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if row:
            self._load_cache()
            return True
        return False

    def set_active_page(self, session_id: str, page: dict[str, Any]) -> None:
        super().set_active_page(session_id, page)
        with self._lock, self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO pages(page_id, session_id, url, title, domain, content_hash, captured_at, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    page["page_id"],
                    session_id,
                    page["url"],
                    page["title"],
                    page["domain"],
                    page["content_hash"],
                    page["captured_at"],
                    _to_json(page),
                ),
            )
            self._conn.execute(
                "UPDATE sessions SET active_page_id = ?, updated_at = ? WHERE session_id = ?",
                (page["page_id"], page["captured_at"], session_id),
            )

    def get_active_page(self, session_id: str) -> dict[str, Any] | None:
        page = super().get_active_page(session_id)
        if page:
            return page
        with self._lock:
            row = self._conn.execute(
                """
                SELECT pages.payload_json
                FROM sessions
                JOIN pages ON pages.page_id = sessions.active_page_id
                WHERE sessions.session_id = ?
                """,
                (session_id,),
            ).fetchone()
        if not row:
            return None
        page = _from_json(row["payload_json"], {})
        if isinstance(page, dict) and isinstance(page.get("page_id"), str):
            self.pages[page["page_id"]] = page
            return page
        return None

    def add_artifact(self, session_id: str, artifact: dict[str, Any]) -> None:
        super().add_artifact(session_id, artifact)
        with self._lock, self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO artifacts(artifact_id, session_id, turn_id, tool_call_id, type, source_page_id, created_at, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact["artifactId"],
                    session_id,
                    artifact["turnId"],
                    artifact["toolCallId"],
                    artifact["type"],
                    artifact.get("sourcePageId"),
                    artifact["createdAt"],
                    _to_json(artifact),
                ),
            )

    def add_message(self, session_id: str, message: dict[str, Any]) -> None:
        super().add_message(session_id, message)
        with self._lock, self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO messages(message_id, session_id, turn_id, role, content, created_at, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    message["message_id"],
                    session_id,
                    message.get("turn_id"),
                    message["role"],
                    message["content"],
                    message["created_at"],
                    _to_json(message.get("metadata", {})),
                ),
            )

    def add_tool_call(self, session_id: str, record: dict[str, Any]) -> None:
        super().add_tool_call(session_id, record)
        with self._lock, self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO tool_calls(tool_call_id, session_id, turn_id, tool_name, status, created_at, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["tool_call_id"],
                    session_id,
                    record["turn_id"],
                    record["tool_name"],
                    record["status"],
                    record["created_at"],
                    _to_json(record),
                ),
            )

    def add_budget_entry(self, session_id: str, entry: dict[str, Any]) -> None:
        super().add_budget_entry(session_id, entry)
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT INTO budget_ledger(session_id, turn_id, tool_call_id, created_at, payload_json) VALUES (?, ?, ?, ?, ?)",
                (session_id, entry["turn_id"], entry.get("tool_call_id"), entry["created_at"], _to_json(entry)),
            )

    def upsert_checkpoint(self, session_id: str, checkpoint: dict[str, Any]) -> None:
        super().upsert_checkpoint(session_id, checkpoint)
        with self._lock, self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO checkpoints(checkpoint_id, session_id, created_at, summary, payload_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    checkpoint["checkpoint_id"],
                    session_id,
                    checkpoint["created_at"],
                    checkpoint["summary"],
                    _to_json(checkpoint),
                ),
            )

    def get_session_record(self, session_id: str) -> dict[str, Any] | None:
        if not self.exists(session_id):
            return None
        with self._lock:
            row = self._conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
            messages = self._conn.execute(
                "SELECT * FROM messages WHERE session_id = ? ORDER BY rowid",
                (session_id,),
            ).fetchall()
            tool_calls = self._conn.execute(
                "SELECT payload_json FROM tool_calls WHERE session_id = ? ORDER BY rowid",
                (session_id,),
            ).fetchall()
            artifacts = self._conn.execute(
                "SELECT payload_json FROM artifacts WHERE session_id = ? ORDER BY rowid",
                (session_id,),
            ).fetchall()
            budget = self._conn.execute(
                "SELECT payload_json FROM budget_ledger WHERE session_id = ? ORDER BY rowid",
                (session_id,),
            ).fetchall()
            checkpoints = self._conn.execute(
                "SELECT payload_json FROM checkpoints WHERE session_id = ? ORDER BY rowid",
                (session_id,),
            ).fetchall()
        if not row:
            return None
        return {
            "session_id": row["session_id"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "metadata": _from_json(row["metadata_json"], {}),
            "active_page": self.get_active_page(session_id),
            "messages": [
                {
                    "message_id": message["message_id"],
                    "session_id": message["session_id"],
                    "turn_id": message["turn_id"],
                    "role": message["role"],
                    "content": message["content"],
                    "created_at": message["created_at"],
                    "metadata": _from_json(message["metadata_json"], {}),
                }
                for message in messages
            ],
            "tool_calls": [_from_json(tool_call["payload_json"], {}) for tool_call in tool_calls],
            "artifacts": [_from_json(artifact["payload_json"], {}) for artifact in artifacts],
            "budget_ledger": [_from_json(entry["payload_json"], {}) for entry in budget],
            "checkpoints": [_from_json(checkpoint["payload_json"], {}) for checkpoint in checkpoints],
        }

    def clear(self) -> None:
        with self._lock, self._conn:
            for table in ["checkpoints", "budget_ledger", "artifacts", "tool_calls", "messages", "pages", "sessions"]:
                self._conn.execute(f"DELETE FROM {table}")
        self.sessions.clear()
        self.pages.clear()
