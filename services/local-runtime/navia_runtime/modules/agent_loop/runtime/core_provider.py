from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from navia_runtime.contracts import AgentEventType, ErrorCode, agent_event, new_id, utc_now
from navia_runtime.modules.adapters.runtime import AdapterRegistry, default_adapter_registry


DEFAULT_BUDGET = {
    "maxToolCalls": 5,
    "maxRetries": 1,
    "maxContextBytes": 256 * 1024,
}


def read_budget(raw: dict[str, Any] | None) -> dict[str, int]:
    raw = raw if isinstance(raw, dict) else {}
    max_tool_calls = raw["maxToolCalls"] if "maxToolCalls" in raw else raw.get("max_tool_calls", DEFAULT_BUDGET["maxToolCalls"])
    max_retries = raw["maxRetries"] if "maxRetries" in raw else raw.get("max_retries", DEFAULT_BUDGET["maxRetries"])
    max_context_bytes = raw["maxContextBytes"] if "maxContextBytes" in raw else raw.get("max_context_bytes", DEFAULT_BUDGET["maxContextBytes"])
    return {
        "maxToolCalls": int(max_tool_calls),
        "maxRetries": int(max_retries),
        "maxContextBytes": int(max_context_bytes),
    }


def event(event_type: AgentEventType, context: dict[str, str], data: dict[str, Any]) -> dict[str, Any]:
    return agent_event(
        event_type,
        session_id=context["sessionId"],
        turn_id=context["turnId"],
        trace_id=context["traceId"],
        request_id=context["requestId"],
        data=data,
    )


def runtime_error(code: ErrorCode, message: str) -> dict[str, Any]:
    return {"code": code.value, "message": message, "recoverable": True, "details": {}}


def to_tool_result(spec: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    tool_result = {
        "tool_call_id": result["toolCallId"],
        "tool_name": spec["adapterId"],
        "status": result["status"],
        "content": result["content"],
        "artifact_ids": [artifact["artifactId"] for artifact in result.get("artifacts", [])],
        "budget_cost": result.get("budgetCost", {}),
        "warnings": result.get("warnings", []),
    }
    if result.get("error") is not None:
        tool_result["error"] = result["error"]
    return tool_result


@dataclass
class MockCoreProvider:
    provider_id: str = "mock"

    def run_turn(self, core_input: dict[str, Any]) -> dict[str, Any]:
        message = str(core_input.get("userMessage") or "").lower()
        forced_adapter = core_input.get("forceAdapterId")
        if isinstance(forced_adapter, str) and forced_adapter:
            adapter_id = forced_adapter
        elif any(token in message for token in ["mindmap", "思维导图", "脑图"]):
            adapter_id = "mindmap.generate"
        elif any(token in message for token in ["总结", "summary", "summarize", "概括"]):
            adapter_id = "page.summarize"
        else:
            adapter_id = "page.answer"
        return {
            "providerId": self.provider_id,
            "status": "requires_adapter",
            "adapterRequests": [
                {
                    "adapterId": adapter_id,
                    "input": {
                        "userMessage": core_input.get("userMessage") or "",
                        "activePage": core_input.get("activePage"),
                        "recentMessages": core_input.get("recentMessages") or [],
                    },
                    "contextRefs": {
                        "pageId": (core_input.get("activePage") or {}).get("pageId") if isinstance(core_input.get("activePage"), dict) else None,
                        "messageIds": [str(message.get("messageId")) for message in core_input.get("recentMessages", []) if isinstance(message, dict) and message.get("messageId")],
                    },
                }
            ],
        }


def create_core_provider(config: dict[str, Any] | None = None) -> MockCoreProvider:
    provider = str((config or {}).get("provider") or "mock")
    if provider != "mock":
        raise NotImplementedError("Only MockCoreProvider is implemented in V1.2-D. piAgentProvider is contract-only.")
    return MockCoreProvider()


@dataclass
class GovernanceBridge:
    budget: dict[str, int]
    started_tool_calls: int = 0

    def pre_adapter_use(self, spec: dict[str, Any], core_input: dict[str, Any]) -> tuple[bool, dict[str, Any] | None]:
        if self.started_tool_calls >= self.budget["maxToolCalls"]:
            return False, runtime_error(ErrorCode.BUDGET_EXCEEDED, f"Tool budget exceeded: maxToolCalls={self.budget['maxToolCalls']}")
        if spec.get("riskLevel") == "deny_by_default":
            return False, runtime_error(ErrorCode.TOOL_PERMISSION_DENIED, f"Adapter denied by default policy: {spec['adapterId']}")
        if spec.get("riskLevel") == "approval_required":
            return False, runtime_error(ErrorCode.APPROVAL_REQUIRED, f"Adapter requires approval: {spec['adapterId']}")
        required_context = spec.get("requiredContext") if isinstance(spec.get("requiredContext"), list) else []
        if "activePage" in required_context and not isinstance(core_input.get("activePage"), dict):
            return False, runtime_error(ErrorCode.PAGE_CONTEXT_REQUIRED, "Active page is required before this adapter can run.")
        self.started_tool_calls += 1
        return True, None


def run_agentic_turn(input_data: dict[str, Any]) -> dict[str, Any]:
    context = {
        "sessionId": str(input_data.get("sessionId") or input_data.get("session_id") or ""),
        "turnId": str(input_data.get("turnId") or input_data.get("turn_id") or new_id("turn_")),
        "traceId": str(input_data.get("traceId") or input_data.get("trace_id") or new_id("trace_")),
        "requestId": str(input_data.get("requestId") or input_data.get("request_id") or new_id("req_")),
    }
    if not context["sessionId"]:
        context["sessionId"] = new_id("sess_")
    budget = read_budget(input_data.get("budget") if isinstance(input_data.get("budget"), dict) else None)
    registry = input_data.get("adapterRegistry") if isinstance(input_data.get("adapterRegistry"), AdapterRegistry) else default_adapter_registry()
    provider = input_data.get("coreProvider") if isinstance(input_data.get("coreProvider"), MockCoreProvider) else create_core_provider(input_data.get("coreConfig") if isinstance(input_data.get("coreConfig"), dict) else None)
    core_input = {
        **context,
        "userMessage": str(input_data.get("userMessage") or input_data.get("message") or ""),
        "activePage": input_data.get("activePage") if isinstance(input_data.get("activePage"), dict) else None,
        "recentMessages": input_data.get("recentMessages") if isinstance(input_data.get("recentMessages"), list) else [],
        "budget": budget,
        "adapterSpecs": registry.list_adapters(),
        "forceAdapterId": input_data.get("forceAdapterId"),
    }
    governance = GovernanceBridge(budget=budget)
    events: list[dict[str, Any]] = []
    tool_results: list[dict[str, Any]] = []
    artifacts: list[dict[str, Any]] = []

    def emit(event_type: AgentEventType, data: dict[str, Any]) -> None:
        events.append(event(event_type, context, data))

    def transition(source: str, dest: str) -> None:
        emit(AgentEventType.STATE_TRANSITION, {"from": source, "to": dest})

    transition("waiting_user", "detecting_intent")
    provider_result = provider.run_turn(core_input)
    requested = provider_result["adapterRequests"][0]
    emit(AgentEventType.INTENT_DETECTED, {"provider": provider_result["providerId"], "adapter_id": requested["adapterId"], "confidence": 1.0})
    transition("detecting_intent", "planning")
    transition("planning", "budget_checking")
    emit(AgentEventType.BUDGET_CHECKED, {"status": "ok", **budget})

    spec = registry.get_spec(str(requested["adapterId"]))
    tool_call_id = new_id("tc_")
    allowed, denial = governance.pre_adapter_use(spec, core_input)
    if not allowed:
        status = "budget_exceeded" if denial and denial["code"] == ErrorCode.BUDGET_EXCEEDED.value else "denied"
        reason = "budget_exceeded" if status == "budget_exceeded" else "permission_denied" if denial and denial["code"] == ErrorCode.TOOL_PERMISSION_DENIED.value else "approval_required"
        emit(AgentEventType.BUDGET_CHECKED, {"status": "exceeded" if status == "budget_exceeded" else "blocked", **budget})
        emit(AgentEventType.TOOL_DENIED, {"tool_call_id": tool_call_id, "tool_name": spec["adapterId"], "reason": reason, "message": denial["message"] if denial else "Denied."})
        emit(AgentEventType.ERROR, denial or runtime_error(ErrorCode.RUNTIME_INTERNAL_ERROR, "Adapter denied."))
        text = denial["message"] if denial else "Adapter denied."
        emit(AgentEventType.RESPONSE_DELTA, {"text": text})
        emit(AgentEventType.RESPONSE_DONE, {"message_id": new_id("msg_")})
        transition("budget_checking", "persisting_turn")
        transition("persisting_turn", "waiting_user")
        return {
            **context,
            "status": status,
            "events": events,
            "toolResults": tool_results,
            "artifacts": artifacts,
            "trace": trace_summary(context, events, tool_results, artifacts),
        }

    transition("budget_checking", "running_tool")
    emit(AgentEventType.TOOL_STARTED, {"tool_call_id": tool_call_id, "tool_name": spec["adapterId"], "adapter": spec})
    invocation = {
        "adapterId": spec["adapterId"],
        **context,
        "toolCallId": tool_call_id,
        "input": requested.get("input") if isinstance(requested.get("input"), dict) else {},
        "contextRefs": requested.get("contextRefs") if isinstance(requested.get("contextRefs"), dict) else {},
    }
    adapter_result = registry.invoke(invocation)
    tool_result = to_tool_result(spec, adapter_result)
    tool_results.append(tool_result)
    emit(AgentEventType.TOOL_DONE, {"tool_call_id": tool_call_id, "tool_name": spec["adapterId"], "status": adapter_result["status"], "tool_result": tool_result})
    if adapter_result["status"] == "succeeded":
        for record in adapter_result.get("artifacts", []):
            artifacts.append(record)
            emit(AgentEventType.ARTIFACT_CREATED, {"artifact_id": record["artifactId"], "artifact": record, "metadata": record.get("metadata", {})})
        text = str(adapter_result.get("content", {}).get("summary") or adapter_result.get("content", {}).get("answer") or "Navia 已处理当前页面。")
        status = "succeeded"
    else:
        error = adapter_result.get("error") or runtime_error(ErrorCode.RUNTIME_INTERNAL_ERROR, "Adapter failed.")
        emit(AgentEventType.ERROR, error)
        text = str(error.get("message") or "Adapter failed.")
        status = "failed"

    transition("running_tool", "streaming_response")
    emit(AgentEventType.RESPONSE_DELTA, {"text": text})
    emit(AgentEventType.RESPONSE_DONE, {"message_id": new_id("msg_")})
    transition("streaming_response", "persisting_turn")
    transition("persisting_turn", "waiting_user")
    return {
        **context,
        "status": status,
        "events": events,
        "toolResults": tool_results,
        "artifacts": artifacts,
        "trace": trace_summary(context, events, tool_results, artifacts),
    }


def trace_summary(context: dict[str, str], events: list[dict[str, Any]], tool_results: list[dict[str, Any]], artifacts: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        **context,
        "eventTypes": [event["type"] for event in events],
        "toolCallIds": [result["tool_call_id"] for result in tool_results],
        "artifactIds": [artifact["artifactId"] for artifact in artifacts],
        "createdAt": utc_now(),
    }
