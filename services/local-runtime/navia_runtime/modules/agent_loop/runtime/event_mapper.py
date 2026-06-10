from __future__ import annotations

from navia_runtime.contracts import AgentEventType, agent_event
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType


CORE_TO_AGENT_EVENT = {
    CoreEventType.STATE: AgentEventType.STATE_TRANSITION,
    CoreEventType.INTENT: AgentEventType.INTENT_DETECTED,
    CoreEventType.RESPONSE_DELTA: AgentEventType.RESPONSE_DELTA,
    CoreEventType.RESPONSE_DONE: AgentEventType.RESPONSE_DONE,
    CoreEventType.TOOL_REQUESTED: AgentEventType.INTENT_DETECTED,
    CoreEventType.TOOL_DENIED: AgentEventType.TOOL_DENIED,
    CoreEventType.TOOL_STARTED: AgentEventType.TOOL_STARTED,
    CoreEventType.TOOL_DONE: AgentEventType.TOOL_DONE,
    CoreEventType.TOOL_FAILED: AgentEventType.TOOL_DONE,
    CoreEventType.ARTIFACT_CREATED: AgentEventType.ARTIFACT_CREATED,
    CoreEventType.ERROR: AgentEventType.ERROR,
}


def map_core_event(core_event: CoreEvent) -> dict[str, object]:
    agent_type = CORE_TO_AGENT_EVENT[core_event.type]
    data = dict(core_event.data)
    if core_event.type == CoreEventType.TOOL_REQUESTED:
        data.setdefault("provider", "mock")
        data.setdefault("adapter_id", data.get("tool_name", "mock.tool"))
        data.setdefault("confidence", 1.0)
        data["core_event_type"] = CoreEventType.TOOL_REQUESTED.value
    if core_event.type == CoreEventType.TOOL_FAILED:
        data.setdefault("status", "failed")
    return agent_event(
        agent_type,
        session_id=core_event.session_id,
        turn_id=core_event.turn_id,
        trace_id=core_event.trace_id,
        request_id=core_event.request_id,
        data=data,
    )

