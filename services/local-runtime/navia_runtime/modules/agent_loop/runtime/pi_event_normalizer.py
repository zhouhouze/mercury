from __future__ import annotations

from typing import Any

from navia_runtime.contracts import ErrorCode, new_id
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType, CoreTurnInput


def normalize_pi_event(raw: dict[str, Any], input: CoreTurnInput) -> list[CoreEvent]:
    event_type = str(raw.get("type") or "")
    request_id = str(raw.get("requestId") or input.request_id)
    turn_id = str(raw.get("turnId") or input.turn_id)
    trace_id = str(raw.get("traceId") or input.trace_id)

    if event_type == "response.delta":
        return [_event(input, CoreEventType.RESPONSE_DELTA, {"text": str(raw.get("text") or "")}, request_id, turn_id, trace_id)]
    if event_type == "response.done":
        return [_event(input, CoreEventType.RESPONSE_DONE, {"message_id": new_id("msg_")}, request_id, turn_id, trace_id)]
    if event_type == "state":
        data: dict[str, Any] = {"from": "piagent", "to": str(raw.get("state") or "running")}
        if isinstance(raw.get("rawSummary"), str):
            data["raw_summary"] = str(raw["rawSummary"])[:800]
        return [_event(input, CoreEventType.STATE, data, request_id, turn_id, trace_id)]
    if event_type == "error":
        return [
            _event(
                input,
                CoreEventType.ERROR,
                {
                    "code": str(raw.get("code") or ErrorCode.MODEL_UNAVAILABLE.value),
                    "message": safe_error_message(raw.get("message")),
                    "recoverable": bool(raw.get("recoverable", True)),
                },
                request_id,
                turn_id,
                trace_id,
            )
        ]
    if event_type == "tool.requested":
        tool_call_id = str(raw.get("toolCallId") or raw.get("tool_call_id") or new_id("pitc_"))
        tool_name = str(raw.get("toolName") or raw.get("tool_name") or "pi.tool")
        return [_event(input, CoreEventType.TOOL_REQUESTED, {"tool_call_id": tool_call_id, "tool_name": tool_name}, request_id, turn_id, trace_id)]
    if event_type == "tool.denied":
        tool_call_id = str(raw.get("toolCallId") or raw.get("tool_call_id") or new_id("pitc_"))
        tool_name = str(raw.get("toolName") or raw.get("tool_name") or "pi.tool")
        return [
            _event(
                input,
                CoreEventType.TOOL_DENIED,
                {"tool_call_id": tool_call_id, "tool_name": tool_name, "reason": "permission_denied", "message": "当前是 Chat 模式，不会调用工具。这个能力会在后续版本开放。"},
                request_id,
                turn_id,
                trace_id,
            )
        ]
    return []


def safe_error_message(value: object) -> str:
    message = str(value or "Pi agent provider failed.")
    return message.splitlines()[0][:240]


def _event(input: CoreTurnInput, event_type: CoreEventType, data: dict[str, Any], request_id: str, turn_id: str, trace_id: str) -> CoreEvent:
    return CoreEvent(
        type=event_type,
        session_id=input.session_id,
        turn_id=turn_id,
        trace_id=trace_id,
        request_id=request_id,
        data=data,
    )
