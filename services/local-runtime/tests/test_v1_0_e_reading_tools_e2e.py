from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from navia_runtime.app import app, event_store, event_stream


ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / "docs/active/project/fixtures/real_pages"


class FixtureParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self._tag_stack: list[str] = []
        self.headings: list[dict[str, Any]] = []
        self.text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._tag_stack.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if self._tag_stack and self._tag_stack[-1] == tag:
            self._tag_stack.pop()

    def handle_data(self, data: str) -> None:
        text = " ".join(data.split())
        if not text:
            return
        current = self._tag_stack[-1] if self._tag_stack else ""
        if current == "title":
            self.title = text
        if current in {"h1", "h2", "h3"}:
            self.headings.append({"level": int(current[1]), "text": text})
        if current in {"h1", "h2", "h3", "p", "li"}:
            self.text_parts.append(text)


def page_context_from_fixture(name: str, session_id: str) -> dict[str, Any]:
    parser = FixtureParser()
    parser.feed((FIXTURES / name).read_text())
    cleaned_text = " ".join(parser.text_parts)
    return {
        "session_id": session_id,
        "url": f"https://fixture.local/{name}",
        "title": parser.title,
        "domain": "fixture.local",
        "captured_at": "2026-06-01T00:00:00Z",
        "headings": parser.headings,
        "visible_text": cleaned_text,
        "cleaned_text": cleaned_text,
    }


def parse_sse(raw: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for block in [block for block in raw.strip().split("\n\n") if block.strip()]:
        data_line = next(line for line in block.splitlines() if line.startswith("data:"))
        events.append(json.loads(data_line.split(":", 1)[1].strip()))
    return events


def post_fixture(client: TestClient, fixture_name: str) -> str:
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {"e2e": "v1.0-e"}}).json()
    session_id = session["data"]["session_id"]
    response = client.post("/v1/page/context", json=page_context_from_fixture(fixture_name, session_id)).json()
    assert response["ok"] is True
    event_store.events.clear()
    event_stream.published.clear()
    return session_id


def test_v1_2_page_context_returns_structured_page_for_debug_view() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {"e2e": "v1.2-debug"}}).json()
    session_id = session["data"]["session_id"]

    response = client.post("/v1/page/context", json=page_context_from_fixture("article.html", session_id)).json()

    assert response["ok"] is True
    structured = response["data"]["structuredPage"]
    assert structured["pageId"].startswith("page_")
    assert structured["contentHash"].startswith("sha256_")
    assert structured["metadata"]["paragraphCount"] >= 1
    assert len(structured["paragraphs"]) >= 1
    assert len(structured["chunks"]) >= 1
    assert len(structured["annotations"]) == len(structured["paragraphs"])


def chat(client: TestClient, session_id: str, message: str) -> list[dict[str, Any]]:
    response = client.post(
        "/v1/chat/stream",
        json={"session_id": session_id, "message": message, "source": "typed", "request_id": "req_000000000000000000009999"},
    )
    assert response.headers["content-type"].startswith("text/event-stream")
    return parse_sse(response.text)


def test_v1_0_e_real_article_fixture_summary_trace() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session_id = post_fixture(client, "article.html")

    events = chat(client, session_id, "总结这篇文章")
    event_types = [event["type"] for event in events]
    assert event_types.count("artifact.created") == 1
    assert {"state.transition", "intent.detected", "budget.checked", "tool.started", "tool.done", "response.done"}.issubset(event_types)
    artifact = next(event for event in events if event["type"] == "artifact.created")["data"]["artifact"]
    assert artifact["type"] == "summary"
    assert artifact["metadata"]["format"] == "markdown"
    assert artifact["sourcePageId"].startswith("page_")

    turn_id = events[0]["turn_id"]
    trace = client.get(f"/v1/sessions/{session_id}/trace", params={"turn_id": turn_id}).json()
    assert len(trace["data"]["events"]) == len(events)


def test_v1_0_e_real_docs_fixture_page_answer() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session_id = post_fixture(client, "docs.html")

    events = chat(client, session_id, "content scripts 如何和 extension 通信?")
    artifact = next(event for event in events if event["type"] == "artifact.created")["data"]["artifact"]
    assert artifact["type"] == "answer"
    assert artifact["source"] == "page"
    assert "Content scripts" in artifact["content"] or "extension" in artifact["content"]


def test_v1_0_e_real_github_fixture_mindmap() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session_id = post_fixture(client, "github_readme.html")

    events = chat(client, session_id, "生成 Mermaid 思维导图")
    artifact = next(event for event in events if event["type"] == "artifact.created")["data"]["artifact"]
    assert artifact["type"] == "mindmap"
    assert artifact["metadata"]["format"] == "mermaid"
    assert artifact["metadata"]["validation"]["status"] == "passed"
    assert artifact["content"].startswith("mindmap\n")
