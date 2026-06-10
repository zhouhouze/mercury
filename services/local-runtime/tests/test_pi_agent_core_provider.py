from __future__ import annotations

import asyncio

from navia_runtime.modules.agent_loop.runtime.core_types import CoreEventType, CoreTurnInput
from navia_runtime.modules.agent_loop.runtime.pi_agent_core_provider import PiAgentCoreProvider
from navia_runtime.modules.agent_loop.runtime.pi_sidecar_client import PiSidecarError


class FakePiClient:
    def __init__(self, events=None, fail_health: bool = False) -> None:
        self.events = events or [{"type": "response.delta", "text": "hello"}, {"type": "response.done"}]
        self.fail_health = fail_health
        self.created_body_tool_names = None
        self.prompted = False

    def health(self):
        if self.fail_health:
            raise PiSidecarError("offline")
        return {"status": "ok"}

    def create_session(self, navia_session_id: str, model_provider=None):
        self.created_body_tool_names = []
        return {"sessionId": f"pi_{navia_session_id}", "toolNames": []}

    def send_prompt(self, session_id: str, message: str, request_id: str, turn_id: str, trace_id: str):
        self.prompted = True
        return {"accepted": True, "sessionId": session_id}

    def stream_events(self, session_id: str):
        yield from self.events


def core_input(message: str = "hello") -> CoreTurnInput:
    return CoreTurnInput(
        session_id="sess_pi_provider",
        turn_id="turn_pi_provider",
        trace_id="trace_pi_provider",
        request_id="req_pi_provider",
        user_message=message,
        active_page=None,
        recent_messages=[],
        budget={},
        adapters=[],
        mode="chat",
        provider_config={"provider": "piagent"},
    )


def collect(provider: PiAgentCoreProvider):
    async def run():
        return [event async for event in provider.run_turn(core_input())]

    return asyncio.run(run())


def test_pi_agent_core_provider_yields_delta_done() -> None:
    fake = FakePiClient()
    events = collect(PiAgentCoreProvider(client=fake, max_polls=1))

    assert [event.type for event in events] == [CoreEventType.RESPONSE_DELTA, CoreEventType.RESPONSE_DONE]
    assert fake.prompted is True
    assert fake.created_body_tool_names == []


def test_pi_agent_core_provider_done_without_text_yields_empty_response_error() -> None:
    fake = FakePiClient(events=[{"type": "state", "state": "pi.raw", "rawSummary": "{\"type\":\"agent_end\"}"}, {"type": "response.done"}])
    events = collect(PiAgentCoreProvider(client=fake, max_polls=1))

    assert [event.type for event in events] == [CoreEventType.STATE, CoreEventType.ERROR]
    assert events[1].data["code"] == "piagent_empty_response"
    assert events[1].data["recoverable"] is True


def test_pi_agent_core_provider_offline_yields_recoverable_error() -> None:
    events = collect(PiAgentCoreProvider(client=FakePiClient(fail_health=True), max_polls=1))

    assert events[0].type == CoreEventType.ERROR
    assert events[0].data["recoverable"] is True


def test_pi_agent_tool_request_is_denied_without_started() -> None:
    fake = FakePiClient(events=[{"type": "tool.requested", "toolName": "bash", "toolCallId": "tc_pi"}, {"type": "tool.denied", "toolName": "bash", "toolCallId": "tc_pi"}, {"type": "response.done"}])
    events = collect(PiAgentCoreProvider(client=fake, max_polls=1))

    assert CoreEventType.TOOL_REQUESTED in [event.type for event in events]
    assert CoreEventType.TOOL_DENIED in [event.type for event in events]
    assert CoreEventType.TOOL_STARTED not in [event.type for event in events]
