from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


class EventStore(Protocol):
    def append(self, event: dict[str, Any]) -> None: ...

    def list_by_session(self, session_id: str) -> list[dict[str, Any]]: ...


class EventStream(Protocol):
    def publish(self, event: dict[str, Any]) -> None: ...

    def drain(self) -> list[dict[str, Any]]: ...


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
