from __future__ import annotations

from navia_runtime.contracts import AgentEventType
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType
from navia_runtime.modules.agent_loop.runtime.event_mapper import map_core_event


def core_event(event_type: CoreEventType, data: dict[str, object]) -> CoreEvent:
    return CoreEvent(
        type=event_type,
        session_id="sess_map",
        turn_id="turn_map",
        trace_id="trace_map",
        request_id="req_map",
        data=data,
    )


def test_response_delta_maps_to_existing_agent_event_shape() -> None:
    mapped = map_core_event(core_event(CoreEventType.RESPONSE_DELTA, {"text": "hello"}))

    assert mapped["type"] == AgentEventType.RESPONSE_DELTA.value
    assert mapped["session_id"] == "sess_map"
    assert mapped["turn_id"] == "turn_map"
    assert mapped["trace_id"] == "trace_map"
    assert mapped["request_id"] == "req_map"
    assert mapped["data"] == {"text": "hello"}


def test_tool_requested_does_not_create_new_agent_event_type() -> None:
    mapped = map_core_event(core_event(CoreEventType.TOOL_REQUESTED, {"tool_call_id": "tc_map", "tool_name": "mock.tool"}))

    assert mapped["type"] == AgentEventType.INTENT_DETECTED.value
    assert mapped["data"]["core_event_type"] == "tool.requested"
    assert mapped["data"]["adapter_id"] == "mock.tool"


def test_tool_failed_maps_to_existing_tool_done_event() -> None:
    mapped = map_core_event(core_event(CoreEventType.TOOL_FAILED, {"tool_call_id": "tc_map", "tool_name": "mock.tool"}))

    assert mapped["type"] == AgentEventType.TOOL_DONE.value
    assert mapped["data"]["status"] == "failed"

