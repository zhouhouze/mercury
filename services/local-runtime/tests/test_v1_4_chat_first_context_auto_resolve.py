from __future__ import annotations

import json

from fastapi.testclient import TestClient

from navia_runtime.app import app, event_store, event_stream, session_store, settings_store


client = TestClient(app)


def setup_function() -> None:
    settings_store.clear()
    event_store.events.clear()
    event_stream.drain()
    session_store.sessions.clear()
    session_store.pages.clear()


def parse_sse(text: str) -> list[dict[str, object]]:
    return [json.loads(line.removeprefix("data: ")) for line in text.splitlines() if line.startswith("data: ")]


def test_general_chat_without_active_page_does_not_require_page_context() -> None:
    session_id = client.post("/v1/sessions", json={"metadata": {"source": "test"}}).json()["data"]["session_id"]

    response = client.post(
        "/v1/chat/stream",
        json={"session_id": session_id, "message": "你好", "coreProvider": "mock", "intentHint": "general_chat"},
    )
    events = parse_sse(response.text)

    assert response.status_code == 200
    assert events[0]["type"] == "response.delta"
    assert "PAGE_CONTEXT_REQUIRED" not in response.text


def test_page_intent_without_active_page_returns_auto_capture_action() -> None:
    session_id = client.post("/v1/sessions", json={"metadata": {"source": "test"}}).json()["data"]["session_id"]

    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "总结当前页面",
            "coreProvider": "mock",
            "intentHint": "summarize_page",
            "autoContext": True,
        },
    )
    events = parse_sse(response.text)

    assert response.status_code == 200
    assert events[0]["type"] == "error"
    assert events[0]["data"]["code"] == "page_context_auto_capture_required"
    assert events[0]["data"]["action"] == "capture_page_and_retry"
    assert events[0]["data"]["recoverable"] is True
