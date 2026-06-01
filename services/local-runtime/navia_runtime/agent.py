from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from navia_runtime.contracts import AgentEventType, ErrorCode, agent_event, new_id
from navia_runtime.governance import BudgetExceeded, GovernanceHooks, TurnBudget
from navia_runtime.intent import RuleBasedIntentRouter
from navia_runtime.state_machine import AgentState, StateMachine
from navia_runtime.stores import SessionStore
from navia_runtime.tools import ToolExecutor, default_tool_registry


PersistFn = Callable[[dict[str, Any]], dict[str, Any]]


@dataclass
class TurnRunner:
    persist: PersistFn
    session_store: SessionStore
    intent_router: RuleBasedIntentRouter
    tool_executor: ToolExecutor

    @classmethod
    def create(cls, persist: PersistFn, session_store: SessionStore) -> "TurnRunner":
        hooks = GovernanceHooks()
        return cls(
            persist=persist,
            session_store=session_store,
            intent_router=RuleBasedIntentRouter(),
            tool_executor=ToolExecutor(default_tool_registry(), hooks),
        )

    def run(self, body: dict[str, Any]) -> list[dict[str, Any]]:
        session_id = body["session_id"]
        request_id = body.get("request_id") or new_id("req_")
        page_id = body.get("page_id")
        message = body.get("message", "")
        turn_id = new_id("turn_")
        trace_id = new_id("trace_")
        message_id = new_id("msg_")
        raw_budget = body.get("budget") if isinstance(body.get("budget"), dict) else {}
        budget = TurnBudget(
            max_tool_calls=int(raw_budget.get("max_tool_calls", 5)),
            max_retries=int(raw_budget.get("max_retries", 1)),
            max_context_bytes=int(raw_budget.get("max_context_bytes", 256 * 1024)),
        )
        sm = StateMachine()
        emitted: list[dict[str, Any]] = []

        def emit(event_type: AgentEventType, data: dict[str, Any]) -> None:
            emitted.append(
                self.persist(
                    agent_event(
                        event_type,
                        session_id=session_id,
                        turn_id=turn_id,
                        trace_id=trace_id,
                        request_id=request_id,
                        data=data,
                    )
                )
            )

        def transition(target: AgentState) -> None:
            source, dest = sm.transition(target)
            emit(AgentEventType.STATE_TRANSITION, {"from": source.value, "to": dest.value})

        def finish_with_response(text: str) -> list[dict[str, Any]]:
            transition(AgentState.STREAMING_RESPONSE)
            emit(AgentEventType.RESPONSE_DELTA, {"text": text})
            emit(AgentEventType.RESPONSE_DONE, {"message_id": message_id})
            transition(AgentState.PERSISTING_TURN)
            transition(AgentState.WAITING_USER)
            return emitted

        transition(AgentState.DETECTING_INTENT)
        intent = self.intent_router.detect(message)
        emit(
            AgentEventType.INTENT_DETECTED,
            {"intent": intent.intent, "confidence": intent.confidence, "tool_name": intent.tool_name},
        )

        transition(AgentState.PLANNING)
        transition(AgentState.BUDGET_CHECKING)
        emit(AgentEventType.BUDGET_CHECKED, {"status": "ok", "max_tool_calls": budget.max_tool_calls})

        transition(AgentState.RUNNING_TOOL)
        tool_call_id = new_id("tc_")
        try:
            self.tool_executor.authorize(intent.tool_name, budget)
        except PermissionError as exc:
            emit(
                AgentEventType.TOOL_DENIED,
                {"tool_call_id": tool_call_id, "tool_name": intent.tool_name, "reason": "permission_denied", "message": str(exc)},
            )
            return finish_with_response("该工具默认被权限策略拒绝，未执行任何本地文件或高风险操作。")
        except BudgetExceeded as exc:
            emit(AgentEventType.BUDGET_CHECKED, {"status": "exceeded", "max_tool_calls": budget.max_tool_calls})
            emit(
                AgentEventType.TOOL_DENIED,
                {"tool_call_id": tool_call_id, "tool_name": intent.tool_name, "reason": "budget_exceeded", "message": str(exc)},
            )
            return finish_with_response("本轮工具预算已用尽，未继续执行工具。")

        active_page = self.session_store.get_active_page(session_id)
        if intent.requires_page_context and not active_page:
            emit(
                AgentEventType.ERROR,
                {
                    "code": ErrorCode.PAGE_CONTEXT_REQUIRED.value,
                    "message": "请先读取并提交当前页面上下文。",
                    "recoverable": True,
                },
            )
            return finish_with_response("请先点击“读取当前页面”并提交上下文，然后再进行网页伴读。")

        emit(AgentEventType.TOOL_STARTED, {"tool_call_id": tool_call_id, "tool_name": intent.tool_name})
        result = self.tool_executor.execute_authorized(
            intent.tool_name,
            {
                "message": message,
                "page_id": page_id,
                "session_id": session_id,
                "turn_id": turn_id,
                "trace_id": trace_id,
                "request_id": request_id,
                "active_page": active_page,
            },
            tool_call_id,
        )
        emit(
            AgentEventType.TOOL_DONE,
            {
                "tool_call_id": result["tool_call_id"],
                "tool_name": result["tool_name"],
                "status": result["status"],
                "tool_result": result,
            },
        )
        artifact = result.get("content", {}).get("artifact") if isinstance(result.get("content"), dict) else None
        if result["status"] == "succeeded" and isinstance(artifact, dict):
            self.session_store.add_artifact(session_id, artifact)
            emit(
                AgentEventType.ARTIFACT_CREATED,
                {
                    "artifact_id": artifact["artifactId"],
                    "artifact": artifact,
                    "metadata": artifact.get("metadata", {}),
                },
            )
        elif result["status"] != "succeeded":
            error = result.get("error") or {
                "code": ErrorCode.RUNTIME_INTERNAL_ERROR.value,
                "message": "Tool failed.",
                "recoverable": True,
            }
            emit(AgentEventType.ERROR, error)

        text = result["content"].get("summary") or result["content"].get("answer") or "Navia 已处理当前请求。"
        return finish_with_response(text)
