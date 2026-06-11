from __future__ import annotations

import asyncio

from navia_runtime.modules.agent_loop.runtime.core_types import CoreEventType, CoreTurnInput
from navia_runtime.modules.agent_loop.runtime.chat_profile_prompt import CHAT_PROFILE_SYSTEM_PROMPT
from navia_runtime.modules.agent_loop.runtime.pi_agent_core_provider import PiAgentCoreProvider
from navia_runtime.modules.agent_loop.runtime.pi_sidecar_client import PiSidecarError


class FakePiClient:
    def __init__(self, events=None, fail_health: bool = False) -> None:
        self.events = events or [{"type": "response.delta", "text": "hello"}, {"type": "response.done"}]
        self.fail_health = fail_health
        self.created_body_tool_names = None
        self.system_prompt = None
        self.profile = None
        self.tool_policy = None
        self.prompt_message = None
        self.prompted = False

    def health(self):
        if self.fail_health:
            raise PiSidecarError("offline")
        return {"status": "ok"}

    def create_session(self, navia_session_id: str, model_provider=None, system_prompt=None, profile="chat", tool_policy="disabled"):
        self.created_body_tool_names = []
        self.system_prompt = system_prompt
        self.profile = profile
        self.tool_policy = tool_policy
        return {"sessionId": f"pi_{navia_session_id}", "toolNames": []}

    def send_prompt(self, session_id: str, message: str, request_id: str, turn_id: str, trace_id: str):
        self.prompted = True
        self.prompt_message = message
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
        provider_config={
            "provider": "piagent",
            "modelProvider": {
                "type": "deepseek",
                "baseUrl": "https://api.deepseek.com",
                "model": "deepseek-v4-flash",
                "apiKeyRef": "sqlite:provider:api_key",
            },
        },
    )


def collect(provider: PiAgentCoreProvider):
    async def run():
        return [event async for event in provider.run_turn(core_input())]

    return asyncio.run(run())


def test_pi_agent_core_provider_yields_delta_done() -> None:
    fake = FakePiClient()
    events = collect(PiAgentCoreProvider(client=fake, max_polls=1))

    assert [event.type for event in events] == [CoreEventType.STATE, CoreEventType.RESPONSE_DELTA, CoreEventType.RESPONSE_DONE]
    assert fake.prompted is True
    assert fake.created_body_tool_names == []
    assert fake.profile == "chat"
    assert fake.tool_policy == "disabled"
    assert fake.system_prompt == CHAT_PROFILE_SYSTEM_PROMPT
    assert fake.prompt_message is not None
    assert "网页伴读 Chatbot" in fake.prompt_message
    assert "hello" in fake.prompt_message
    assert events[0].data["systemPromptInjectionMode"] == "prompt_envelope"


def test_pi_agent_core_provider_done_without_text_yields_empty_response_error() -> None:
    fake = FakePiClient(events=[{"type": "state", "state": "pi.raw", "rawSummary": "{\"type\":\"agent_end\"}"}, {"type": "response.done"}])
    events = collect(PiAgentCoreProvider(client=fake, max_polls=1))

    assert [event.type for event in events] == [CoreEventType.STATE, CoreEventType.STATE, CoreEventType.ERROR]
    assert events[2].data["code"] == "pi_rpc_no_text"
    assert events[2].data["recoverable"] is True


def test_pi_agent_core_provider_raw_text_without_delta_yields_normalizer_error() -> None:
    fake = FakePiClient(events=[{"type": "state", "state": "pi.raw", "rawSummary": "{\"message\":{\"content\":\"hello\"}}"}, {"type": "response.done"}])
    events = collect(PiAgentCoreProvider(client=fake, max_polls=1))

    assert events[2].data["code"] == "pi_normalizer_no_delta"


def test_pi_agent_core_provider_missing_model_provider_is_explicit() -> None:
    async def run():
        input_data = core_input()
        input_data.provider_config.clear()
        return [event async for event in PiAgentCoreProvider(client=FakePiClient(), max_polls=1).run_turn(input_data)]

    events = asyncio.run(run())

    assert events[0].type == CoreEventType.ERROR
    assert events[0].data["code"] == "piagent_provider_config_missing"


def test_pi_agent_core_provider_preserves_provider_auth_failed() -> None:
    fake = FakePiClient(events=[{"type": "error", "code": "provider_auth_failed", "message": "401 invalid api key", "recoverable": True}])
    events = collect(PiAgentCoreProvider(client=fake, max_polls=1))

    assert events[1].type == CoreEventType.ERROR
    assert events[1].data["code"] == "provider_auth_failed"


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


def test_chat_profile_prompt_does_not_leak_coding_agent_mindset() -> None:
    forbidden = ["这是代码任务", "这不是代码任务", "我在编程项目中工作", "我可以帮你写数据抓取代码", "让我看看当前目录", "PiAgentCoreProvider", "sidecar", "toolNames", "工具已禁用"]

    assert "网页伴读 Chatbot" in CHAT_PROFILE_SYSTEM_PROMPT
    assert "默认先给结论" in CHAT_PROFILE_SYSTEM_PROMPT
    for phrase in forbidden:
        assert phrase not in CHAT_PROFILE_SYSTEM_PROMPT
