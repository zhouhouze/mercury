from __future__ import annotations

from navia_runtime.modules.agent_loop.runtime.core_types import CoreEventType, CoreTurnInput
from navia_runtime.modules.agent_loop.runtime.pi_event_normalizer import normalize_pi_event


def core_input() -> CoreTurnInput:
    return CoreTurnInput(
        session_id="sess_pi",
        turn_id="turn_pi",
        trace_id="trace_pi",
        request_id="req_pi",
        user_message="hello",
        active_page=None,
        recent_messages=[],
        budget={},
        adapters=[],
        mode="chat",
        provider_config={"provider": "piagent"},
    )


def test_pi_delta_and_done_normalize_to_core_events() -> None:
    delta = normalize_pi_event({"type": "response.delta", "text": "hi"}, core_input())
    done = normalize_pi_event({"type": "response.done"}, core_input())

    assert delta[0].type == CoreEventType.RESPONSE_DELTA
    assert delta[0].data == {"text": "hi"}
    assert done[0].type == CoreEventType.RESPONSE_DONE


def test_pi_raw_summary_is_kept_on_state_event() -> None:
    events = normalize_pi_event({"type": "state", "state": "pi.raw", "rawSummary": "{\"type\":\"message\"}"}, core_input())

    assert events[0].type == CoreEventType.STATE
    assert events[0].data["to"] == "pi.raw"
    assert events[0].data["raw_summary"] == "{\"type\":\"message\"}"


def test_pi_stdio_and_provider_diagnostics_are_kept_on_state_event() -> None:
    events = normalize_pi_event(
        {
            "type": "state",
            "state": "pi.stdio.debug",
            "stdoutLineCount": 2,
            "stderrLineCount": 1,
            "stdoutPreviews": ["{\"type\":\"agent_end\"}"],
            "stderrPreviews": ["401 invalid api key sk-****"],
            "providerType": "deepseek",
            "providerBaseUrl": "https://api.deepseek.com",
            "providerModel": "deepseek-v4-flash",
            "providerHasApiKeyRef": True,
            "providerHasApiKey": False,
        },
        core_input(),
    )

    assert events[0].type == CoreEventType.STATE
    assert events[0].data["to"] == "pi.stdio.debug"
    assert events[0].data["stdoutLineCount"] == 2
    assert events[0].data["stderrLineCount"] == 1
    assert events[0].data["providerType"] == "deepseek"
    assert events[0].data["providerHasApiKeyRef"] is True


def test_pi_error_is_sanitized() -> None:
    events = normalize_pi_event({"type": "error", "message": "boom\nstack trace"}, core_input())

    assert events[0].type == CoreEventType.ERROR
    assert events[0].data["message"] == "boom"
    assert events[0].data["recoverable"] is True


def test_pi_tool_request_and_denied_do_not_create_started() -> None:
    requested = normalize_pi_event({"type": "tool.requested", "toolName": "bash", "toolCallId": "tc_pi"}, core_input())
    denied = normalize_pi_event({"type": "tool.denied", "toolName": "bash", "toolCallId": "tc_pi"}, core_input())

    assert requested[0].type == CoreEventType.TOOL_REQUESTED
    assert denied[0].type == CoreEventType.TOOL_DENIED
    assert "V1.2" not in str(denied[0].data["message"])
    assert "后续版本开放" in str(denied[0].data["message"])
