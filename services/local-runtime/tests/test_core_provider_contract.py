from __future__ import annotations

from navia_runtime.modules.agent_loop.runtime import CoreEvent, CoreEventType, CoreProviderConfig, CoreTurnInput, MockCoreProvider, create_core_provider
from navia_runtime.modules.agent_loop.runtime.pi_agent_core_provider import PiAgentCoreProvider


def test_core_provider_factory_returns_mock_provider() -> None:
    provider = create_core_provider(CoreProviderConfig(provider="mock"))

    assert isinstance(provider, MockCoreProvider)


def test_piagent_provider_is_available_through_factory() -> None:
    provider = create_core_provider(CoreProviderConfig(provider="piagent"))

    assert isinstance(provider, PiAgentCoreProvider)


def test_core_turn_input_and_event_keep_required_ids() -> None:
    core_input = CoreTurnInput(
        session_id="sess_contract",
        turn_id="turn_contract",
        trace_id="trace_contract",
        request_id="req_contract",
        user_message="你好",
        active_page=None,
        recent_messages=[],
        budget={},
        adapters=[],
        mode="chat",
        provider_config={"provider": "mock"},
    )
    event = CoreEvent(
        type=CoreEventType.RESPONSE_DELTA,
        session_id=core_input.session_id,
        turn_id=core_input.turn_id,
        trace_id=core_input.trace_id,
        request_id=core_input.request_id,
        data={"text": "ok"},
    )

    assert event.session_id == "sess_contract"
    assert event.turn_id == "turn_contract"
    assert event.trace_id == "trace_contract"
    assert event.request_id == "req_contract"
