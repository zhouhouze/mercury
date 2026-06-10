from __future__ import annotations

import asyncio

from navia_runtime.contracts import ErrorCode
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEventType, CoreTurnInput
from navia_runtime.modules.agent_loop.runtime.mock_core_provider import MockCoreProvider


def page() -> dict[str, object]:
    return {"pageId": "page_mock", "title": "Mock Reading Page", "url": "https://example.com/mock"}


def core_input(message: str, active_page: dict[str, object] | None = None) -> CoreTurnInput:
    return CoreTurnInput(
        session_id="sess_mock",
        turn_id="turn_mock",
        trace_id="trace_mock",
        request_id="req_mock",
        user_message=message,
        active_page=active_page,
        recent_messages=[],
        budget={},
        adapters=[],
        mode="chat",
        provider_config={"provider": "mock"},
    )


def collect(message: str, active_page: dict[str, object] | None = None):
    async def run():
        return [event async for event in MockCoreProvider().run_turn(core_input(message, active_page))]

    return asyncio.run(run())


def test_mock_core_provider_plain_answer_is_deterministic() -> None:
    events = collect("你好")

    assert [event.type for event in events] == [CoreEventType.RESPONSE_DELTA, CoreEventType.RESPONSE_DONE]
    assert events[0].data["text"] == "Mock provider received: 你好"


def test_mock_core_provider_summary_uses_active_page() -> None:
    events = collect("请总结", page())

    assert events[0].type == CoreEventType.RESPONSE_DELTA
    assert "Mock Reading Page" in str(events[0].data["text"])
    assert events[-1].type == CoreEventType.RESPONSE_DONE


def test_mock_core_provider_summary_without_page_returns_error() -> None:
    events = collect("summary")

    assert [event.type for event in events] == [CoreEventType.ERROR]
    assert events[0].data["code"] == ErrorCode.PAGE_CONTEXT_REQUIRED.value


def test_mock_tool_emits_requested_started_done_response() -> None:
    events = collect("/mock-tool")
    event_types = [event.type for event in events]

    assert event_types == [
        CoreEventType.TOOL_REQUESTED,
        CoreEventType.TOOL_STARTED,
        CoreEventType.TOOL_DONE,
        CoreEventType.RESPONSE_DELTA,
        CoreEventType.RESPONSE_DONE,
    ]
    tool_call_ids = {event.data["tool_call_id"] for event in events[:3]}
    assert len(tool_call_ids) == 1


def test_mock_deny_does_not_emit_tool_started() -> None:
    events = collect("/mock-deny")
    event_types = [event.type for event in events]

    assert CoreEventType.TOOL_REQUESTED in event_types
    assert CoreEventType.TOOL_DENIED in event_types
    assert CoreEventType.TOOL_STARTED not in event_types
    assert "该工具被 Mock 权限策略拒绝。" in str(events[2].data["text"])

