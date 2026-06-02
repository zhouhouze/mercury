from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from itertools import count
from typing import Any


class StrEnum(str, Enum):
    pass


class ErrorCode(StrEnum):
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    TURN_NOT_FOUND = "TURN_NOT_FOUND"
    PAGE_CONTEXT_REQUIRED = "PAGE_CONTEXT_REQUIRED"
    REQUEST_INVALID = "REQUEST_INVALID"
    INTENT_UNKNOWN = "INTENT_UNKNOWN"
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND"
    TOOL_PERMISSION_DENIED = "TOOL_PERMISSION_DENIED"
    BUDGET_EXCEEDED = "BUDGET_EXCEEDED"
    BUDGET_EXHAUSTED = "BUDGET_EXHAUSTED"
    CONTEXT_TOO_LARGE = "CONTEXT_TOO_LARGE"
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    APPROVAL_INACTIVE = "APPROVAL_INACTIVE"
    APPROVAL_REJECTED = "APPROVAL_REJECTED"
    MODEL_NOT_READY = "MODEL_NOT_READY"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
    FUNASR_NOT_READY = "FUNASR_NOT_READY"
    MERMAID_VALIDATION_FAILED = "MERMAID_VALIDATION_FAILED"
    INVALID_TRANSITION = "INVALID_TRANSITION"
    RUNTIME_NOT_READY = "RUNTIME_NOT_READY"
    RUNTIME_INTERNAL_ERROR = "RUNTIME_INTERNAL_ERROR"


class AgentEventType(StrEnum):
    STATE_TRANSITION = "state.transition"
    INTENT_DETECTED = "intent.detected"
    BUDGET_CHECKED = "budget.checked"
    TOOL_STARTED = "tool.started"
    TOOL_DONE = "tool.done"
    TOOL_DENIED = "tool.denied"
    ARTIFACT_CREATED = "artifact.created"
    RESPONSE_DELTA = "response.delta"
    RESPONSE_DONE = "response.done"
    ERROR = "error"
    PAGE_CONTEXT_RECEIVED = "page.context.received"


_id_counter = count(1)


def new_id(prefix: str) -> str:
    return f"{prefix}{next(_id_counter):026d}"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def success(data: dict[str, Any], request_id: str | None = None) -> dict[str, Any]:
    return {
        "ok": True,
        "data": data,
        "error": None,
        "request_id": request_id or new_id("req_"),
    }


def failure(
    code: ErrorCode,
    message: str,
    *,
    request_id: str | None = None,
    recoverable: bool = True,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "ok": False,
        "data": None,
        "error": {
            "code": code.value,
            "message": message,
            "recoverable": recoverable,
            "details": details or {},
        },
        "request_id": request_id or new_id("req_"),
    }


def agent_event(
    event_type: AgentEventType,
    *,
    session_id: str,
    data: dict[str, Any],
    turn_id: str | None = None,
    trace_id: str | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    event = {
        "event_id": new_id("evt_"),
        "session_id": session_id,
        "type": event_type.value,
        "timestamp": utc_now(),
        "data": data,
    }
    if turn_id is not None:
        event["turn_id"] = turn_id
    if trace_id is not None:
        event["trace_id"] = trace_id
    if request_id is not None:
        event["request_id"] = request_id
    return event
