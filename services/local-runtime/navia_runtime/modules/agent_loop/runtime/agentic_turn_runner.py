from __future__ import annotations

import asyncio
from typing import Any

from navia_runtime.contracts import AgentEventType, ErrorCode, agent_event, new_id, utc_now
from navia_runtime.modules.agent_loop.runtime.core_provider import read_budget, trace_summary
from navia_runtime.modules.agent_loop.runtime.core_types import CoreProviderConfig, CoreTurnInput
from navia_runtime.modules.agent_loop.runtime.event_mapper import map_core_event
from navia_runtime.modules.agent_loop.runtime.provider_factory import CoreProviderNotImplementedError, create_core_provider, parse_core_provider_config


def run_core_provider_turn(input_data: dict[str, Any]) -> dict[str, Any]:
    return asyncio.run(run_core_provider_turn_async(input_data))


async def run_core_provider_turn_async(input_data: dict[str, Any]) -> dict[str, Any]:
    context = {
        "sessionId": str(input_data.get("sessionId") or input_data.get("session_id") or ""),
        "turnId": str(input_data.get("turnId") or input_data.get("turn_id") or new_id("turn_")),
        "traceId": str(input_data.get("traceId") or input_data.get("trace_id") or new_id("trace_")),
        "requestId": str(input_data.get("requestId") or input_data.get("request_id") or new_id("req_")),
    }
    if not context["sessionId"]:
        context["sessionId"] = new_id("sess_")

    config = parse_core_provider_config(input_data.get("coreConfig") if isinstance(input_data.get("coreConfig"), dict) else None)
    budget = read_budget(input_data.get("budget") if isinstance(input_data.get("budget"), dict) else None)
    core_input = CoreTurnInput(
        session_id=context["sessionId"],
        turn_id=context["turnId"],
        trace_id=context["traceId"],
        request_id=context["requestId"],
        user_message=str(input_data.get("userMessage") or input_data.get("message") or ""),
        active_page=input_data.get("activePage") if isinstance(input_data.get("activePage"), dict) else None,
        recent_messages=input_data.get("recentMessages") if isinstance(input_data.get("recentMessages"), list) else [],
        budget=budget,
        adapters=input_data.get("adapters") if isinstance(input_data.get("adapters"), list) else [],
        mode=config.mode,
        provider_config=_provider_config_dict(config),
    )
    events: list[dict[str, Any]] = []
    tool_results: list[dict[str, Any]] = []
    artifacts: list[dict[str, Any]] = []

    if config.provider == "piagent" and _missing_piagent_model_provider(config.options.get("modelProvider")):
        events.append(
            agent_event(
                AgentEventType.ERROR,
                session_id=context["sessionId"],
                turn_id=context["turnId"],
                trace_id=context["traceId"],
                request_id=context["requestId"],
                data={
                    "code": "piagent_provider_config_missing",
                    "message": "PiAgent 缺少 Chat Provider 配置，请在 Settings 中选择 DeepSeek Provider 和模型。",
                    "recoverable": True,
                },
            )
        )
        return {
            **context,
            "status": "failed",
            "events": events,
            "toolResults": tool_results,
            "artifacts": artifacts,
            "trace": trace_summary(context, events, tool_results, artifacts),
            "createdAt": utc_now(),
        }

    try:
        provider = create_core_provider(config)
        async for core_event in provider.run_turn(core_input):
            agent_mapped = map_core_event(core_event)
            events.append(agent_mapped)
            if agent_mapped["type"] == AgentEventType.TOOL_DONE.value and isinstance(agent_mapped.get("data"), dict):
                tool_result = agent_mapped["data"].get("tool_result")
                if isinstance(tool_result, dict):
                    tool_results.append(tool_result)
            if agent_mapped["type"] == AgentEventType.ARTIFACT_CREATED.value and isinstance(agent_mapped.get("data"), dict):
                artifact = agent_mapped["data"].get("artifact")
                if isinstance(artifact, dict):
                    artifacts.append(artifact)
    except CoreProviderNotImplementedError as exc:
        events.append(
            agent_event(
                AgentEventType.ERROR,
                session_id=context["sessionId"],
                turn_id=context["turnId"],
                trace_id=context["traceId"],
                request_id=context["requestId"],
                data={"code": ErrorCode.MODEL_UNAVAILABLE.value, "message": str(exc), "recoverable": True},
            )
        )

    status = _status_from_events(events)
    return {
        **context,
        "status": status,
        "events": events,
        "toolResults": tool_results,
        "artifacts": artifacts,
        "trace": trace_summary(context, events, tool_results, artifacts),
        "createdAt": utc_now(),
    }


def _provider_config_dict(config: CoreProviderConfig) -> dict[str, Any]:
    payload = {
        "provider": config.provider,
        "llmProviderId": config.llm_provider_id,
        "model_provider_id": config.model_provider_id,
        "model": config.model,
        "mode": config.mode,
        "options": config.options,
    }
    if isinstance(config.options.get("modelProvider"), dict):
        payload["modelProvider"] = config.options["modelProvider"]
    return payload


def _missing_piagent_model_provider(value: object) -> bool:
    if not isinstance(value, dict):
        return True
    required = ("type", "baseUrl", "model")
    if any(not isinstance(value.get(key), str) or not str(value.get(key)).strip() for key in required):
        return True
    has_secret_ref = isinstance(value.get("apiKeyRef"), str) and bool(str(value.get("apiKeyRef")).strip())
    has_secret = isinstance(value.get("apiKey"), str) and bool(str(value.get("apiKey")).strip())
    return not (has_secret_ref or has_secret)


def _status_from_events(events: list[dict[str, Any]]) -> str:
    if any(event["type"] == AgentEventType.ERROR.value for event in events):
        return "failed"
    if any(event["type"] == AgentEventType.TOOL_DENIED.value for event in events):
        return "denied"
    if events:
        return "succeeded"
    return "empty"
