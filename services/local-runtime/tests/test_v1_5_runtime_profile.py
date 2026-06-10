from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

import navia_runtime.app as app_module


client = TestClient(app_module.app)
ROOT = Path(__file__).resolve().parents[3]
LEGACY_TOOL_DISABLED_COPY = [
    "该工具在 V1.2 中默认禁用",
    "V1.2 默认禁用",
    "default disabled in V1.2",
    "tool disabled in V1.2",
]


def setup_function() -> None:
    app_module.settings_store.clear()
    app_module.event_store.events.clear()
    app_module.event_stream.drain()
    app_module.session_store.sessions.clear()
    app_module.session_store.pages.clear()


def parse_sse(text: str) -> list[dict[str, object]]:
    return [json.loads(line.removeprefix("data: ")) for line in text.splitlines() if line.startswith("data: ")]


def create_session() -> str:
    response = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {"source": "test"}})
    assert response.status_code == 200
    return response.json()["data"]["session_id"]


def test_settings_generates_default_runtime_profiles_for_legacy_state() -> None:
    response = client.get("/v1/settings")
    data = response.json()["data"]

    assert response.status_code == 200
    assert data["defaultProfile"] == "chat"
    assert data["profiles"]["chat"]["profile"] == "chat"
    assert data["profiles"]["chat"]["enabled"] is True
    assert data["profiles"]["chat"]["toolPolicy"]["mode"] == "disabled"
    assert data["profiles"]["chat"]["toolPolicy"]["allowedTools"] == []
    assert data["profiles"]["agent"]["profile"] == "agent"
    assert data["profiles"]["agent"]["toolPolicy"]["mode"] == "disabled"


def test_deferred_weather_intent_returns_boundary_message_without_tools() -> None:
    session_id = create_session()

    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "今天北京天气怎么样？",
            "intentHint": "weather_lookup",
            "coreProvider": "mock",
        },
    )
    events = parse_sse(response.text)
    event_types = [event["type"] for event in events]

    assert response.status_code == 200
    assert event_types == ["intent.detected", "state.transition", "response.delta", "response.done"]
    assert "tool.denied" not in event_types
    assert "tool.started" not in event_types
    assert "tool.done" not in event_types
    assert events[1]["data"]["to"] == "capability_boundary"
    assert "后续版本" in str(events[2]["data"]["text"])


def test_deferred_search_intent_does_not_switch_to_agent_or_create_tool_events() -> None:
    session_id = create_session()

    response = client.post(
        "/v1/chat/stream",
        json={"session_id": session_id, "message": "帮我联网搜索最新新闻", "coreProvider": "mock"},
    )
    events = parse_sse(response.text)
    event_types = [event["type"] for event in events]

    assert response.status_code == 200
    assert event_types == ["intent.detected", "state.transition", "response.delta", "response.done"]
    assert "tool.denied" not in event_types
    assert all(not event_type.startswith("tool.") for event_type in event_types)
    assert "后续版本" in str(events[2]["data"]["text"])


def test_agent_profile_is_preflight_only_and_does_not_execute_tools() -> None:
    session_id = create_session()

    response = client.post(
        "/v1/chat/stream",
        json={"session_id": session_id, "message": "用 agent 帮我执行长任务", "profile": "agent", "coreProvider": "piagent"},
    )
    events = parse_sse(response.text)
    event_types = [event["type"] for event in events]

    assert response.status_code == 200
    assert event_types == ["intent.detected", "state.transition", "response.delta", "response.done"]
    assert all(not event_type.startswith("tool.") for event_type in event_types)
    assert "后续版本" in str(events[2]["data"]["text"])


def test_page_intent_still_uses_auto_context_strategy() -> None:
    session_id = create_session()

    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "总结当前页面",
            "intentHint": "summarize_page",
            "autoContext": True,
            "coreProvider": "mock",
        },
    )
    events = parse_sse(response.text)

    assert response.status_code == 200
    assert events[0]["type"] == "error"
    assert events[0]["data"]["code"] == "page_context_auto_capture_required"
    assert events[0]["data"]["action"] == "capture_page_and_retry"


def test_user_visible_code_paths_do_not_contain_legacy_v1_2_tool_disabled_copy() -> None:
    paths = [
        ROOT / "services/local-runtime/navia_runtime/modules/agent_loop/runtime",
        ROOT / "services/local-runtime/navia_runtime/modules/agent_loop/sidecar/pi-agent-bridge/src",
        ROOT / "apps/chrome-extension/src",
        ROOT / "apps/chrome-extension/entrypoints/sidepanel",
    ]
    matches: list[str] = []
    for path in paths:
        for file in path.rglob("*"):
            if file.suffix not in {".py", ".ts", ".tsx"}:
                continue
            text = file.read_text(encoding="utf-8")
            for phrase in LEGACY_TOOL_DISABLED_COPY:
                if phrase in text:
                    matches.append(f"{file.relative_to(ROOT)}: {phrase}")

    assert matches == []
