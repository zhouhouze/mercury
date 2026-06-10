from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


class CoreEventType(str, Enum):
    STATE = "state"
    INTENT = "intent"
    RESPONSE_DELTA = "response.delta"
    RESPONSE_DONE = "response.done"
    TOOL_REQUESTED = "tool.requested"
    TOOL_DENIED = "tool.denied"
    TOOL_STARTED = "tool.started"
    TOOL_DONE = "tool.done"
    TOOL_FAILED = "tool.failed"
    ARTIFACT_CREATED = "artifact.created"
    ERROR = "error"


@dataclass(frozen=True)
class CoreProviderConfig:
    provider: str = "mock"
    llm_provider_id: str | None = None
    model_provider_id: str | None = None
    model: str | None = None
    mode: str = "chat"
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CoreTurnInput:
    session_id: str
    turn_id: str
    trace_id: str
    request_id: str
    user_message: str
    active_page: dict[str, Any] | None
    recent_messages: list[dict[str, Any]]
    budget: dict[str, Any]
    adapters: list[dict[str, Any]]
    mode: str
    provider_config: dict[str, Any]


@dataclass(frozen=True)
class CoreEvent:
    type: CoreEventType
    session_id: str
    turn_id: str
    trace_id: str
    request_id: str
    data: dict[str, Any] = field(default_factory=dict)


class CoreProvider(Protocol):
    async def run_turn(self, input: CoreTurnInput) -> AsyncIterator[CoreEvent]:
        ...
