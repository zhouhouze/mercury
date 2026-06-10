from __future__ import annotations

import json

from fastapi.testclient import TestClient

from navia_runtime.app import app, event_store, event_stream, session_store, settings_store
from navia_runtime.contracts import AgentEventType, ErrorCode
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType
from navia_runtime.modules.agent_loop.runtime import run_agentic_turn, run_core_provider_turn


client = TestClient(app)


def setup_function() -> None:
    settings_store.clear()
    event_store.events.clear()
    event_stream.drain()
    session_store.sessions.clear()
    session_store.pages.clear()


def active_page() -> dict[str, object]:
    return {
        "page_id": "page_runner",
        "pageId": "page_runner",
        "url": "https://example.com/runner",
        "title": "Runner Page",
        "domain": "example.com",
        "content_hash": "sha256_runner",
        "contentHash": "sha256_runner",
        "captured_at": "2026-06-09T00:00:00Z",
        "capturedAt": "2026-06-09T00:00:00Z",
        "summaryDraft": {"tldr": "Runner page summary"},
    }


def parse_sse(text: str) -> list[dict[str, object]]:
    events = []
    for block in text.strip().split("\n\n"):
        data_line = next((line for line in block.splitlines() if line.startswith("data: ")), "")
        if data_line:
            events.append(json.loads(data_line.removeprefix("data: ")))
    return events


def import_provider() -> dict[str, object]:
    response = client.post(
        "/v1/llm/providers/import",
        json={
            "type": "deepseek",
            "name": "DeepSeek",
            "baseUrl": "https://api.deepseek.com",
            "apiKey": "sk-test-agentic-runner",
            "defaultModel": "deepseek-v4-flash",
            "models": ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat"],
        },
    )
    assert response.status_code == 200
    return response.json()["data"]["provider"]


def test_core_provider_runner_plain_mock_response() -> None:
    result = run_core_provider_turn(
        {
            "sessionId": "sess_runner",
            "requestId": "req_runner",
            "userMessage": "你好",
            "coreConfig": {"provider": "mock"},
        }
    )

    assert result["status"] == "succeeded"
    assert [event["type"] for event in result["events"]] == [AgentEventType.RESPONSE_DELTA.value, AgentEventType.RESPONSE_DONE.value]
    assert result["events"][0]["data"]["text"] == "Mock provider received: 你好"


def test_core_provider_runner_mock_deny_has_no_tool_started() -> None:
    result = run_core_provider_turn(
        {
            "sessionId": "sess_runner",
            "requestId": "req_runner",
            "userMessage": "/mock-deny",
            "coreConfig": {"provider": "mock"},
        }
    )
    event_types = [event["type"] for event in result["events"]]

    assert AgentEventType.TOOL_DENIED.value in event_types
    assert AgentEventType.TOOL_STARTED.value not in event_types


def test_core_provider_runner_piagent_returns_recoverable_error() -> None:
    result = run_core_provider_turn(
        {
            "sessionId": "sess_runner",
            "requestId": "req_runner",
            "userMessage": "hi",
            "coreConfig": {"provider": "piagent"},
        }
    )

    assert result["status"] == "failed"
    assert result["events"][0]["type"] == AgentEventType.ERROR.value
    assert result["events"][0]["data"]["code"] == "piagent_unavailable"
    assert result["events"][0]["data"]["recoverable"] is True


def test_chat_stream_can_use_mock_core_provider_without_changing_sse_contract() -> None:
    session = client.post("/v1/sessions", json={"metadata": {"source": "test"}}).json()["data"]
    session_id = session["session_id"]

    response = client.post("/v1/chat/stream", json={"session_id": session_id, "message": "你好", "coreProvider": "mock"})
    events = parse_sse(response.text)

    assert response.status_code == 200
    assert [event["type"] for event in events] == [AgentEventType.RESPONSE_DELTA.value, AgentEventType.RESPONSE_DONE.value]
    assert events[0]["data"]["text"] == "Mock provider received: 你好"


def test_old_agentic_turn_fallback_still_uses_adapter_path() -> None:
    result = run_agentic_turn(
        {
            "sessionId": "sess_old",
            "requestId": "req_old",
            "userMessage": "请总结当前页面",
            "activePage": active_page(),
            "budget": {"maxToolCalls": 2},
        }
    )

    assert result["status"] == "succeeded"
    assert AgentEventType.TOOL_STARTED.value in [event["type"] for event in result["events"]]


def test_chat_stream_can_use_piagent_without_exposing_raw_events(monkeypatch) -> None:
    class FakePiProvider:
        async def run_turn(self, input):
            yield CoreEvent(CoreEventType.RESPONSE_DELTA, input.session_id, input.turn_id, input.trace_id, input.request_id, {"text": "pi hello"})
            yield CoreEvent(CoreEventType.RESPONSE_DONE, input.session_id, input.turn_id, input.trace_id, input.request_id, {"message_id": "msg_pi"})

    monkeypatch.setattr("navia_runtime.modules.agent_loop.runtime.agentic_turn_runner.create_core_provider", lambda _config: FakePiProvider())
    provider = import_provider()
    session = client.post("/v1/sessions", json={"metadata": {"source": "test"}}).json()["data"]

    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session["session_id"],
            "message": "hello",
            "coreProvider": "piagent",
            "llmProviderId": provider["id"],
            "model": "deepseek-v4-flash",
        },
    )
    events = parse_sse(response.text)

    assert [event["type"] for event in events] == [AgentEventType.RESPONSE_DELTA.value, AgentEventType.RESPONSE_DONE.value]
    assert events[0]["data"] == {"text": "pi hello"}
