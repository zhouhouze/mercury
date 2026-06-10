from __future__ import annotations

from collections.abc import AsyncIterator

from navia_runtime.contracts import ErrorCode, new_id
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType, CoreTurnInput


class MockCoreProvider:
    provider_id = "mock"

    async def run_turn(self, input: CoreTurnInput) -> AsyncIterator[CoreEvent]:
        message = input.user_message.strip()
        lowered = message.lower()

        if "/mock-deny" in lowered:
            tool_call_id = new_id("tc_")
            yield self._event(input, CoreEventType.TOOL_REQUESTED, {"tool_call_id": tool_call_id, "tool_name": "mock.tool"})
            yield self._event(input, CoreEventType.TOOL_DENIED, {"tool_call_id": tool_call_id, "tool_name": "mock.tool", "reason": "permission_denied", "message": "该工具被 Mock 权限策略拒绝。"})
            yield self._event(input, CoreEventType.RESPONSE_DELTA, {"text": "该工具被 Mock 权限策略拒绝。"})
            yield self._event(input, CoreEventType.RESPONSE_DONE, {"message_id": new_id("msg_")})
            return

        if "/mock-tool" in lowered:
            tool_call_id = new_id("tc_")
            yield self._event(input, CoreEventType.TOOL_REQUESTED, {"tool_call_id": tool_call_id, "tool_name": "mock.tool"})
            yield self._event(input, CoreEventType.TOOL_STARTED, {"tool_call_id": tool_call_id, "tool_name": "mock.tool"})
            yield self._event(input, CoreEventType.TOOL_DONE, {"tool_call_id": tool_call_id, "tool_name": "mock.tool", "status": "succeeded", "tool_result": {"tool_call_id": tool_call_id, "tool_name": "mock.tool", "status": "succeeded", "content": {"summary": "Mock 工具已完成。"}, "artifact_ids": [], "budget_cost": {}, "warnings": []}})
            yield self._event(input, CoreEventType.RESPONSE_DELTA, {"text": "Mock 工具已完成。"})
            yield self._event(input, CoreEventType.RESPONSE_DONE, {"message_id": new_id("msg_")})
            return

        if self._requires_page_summary(lowered):
            if input.active_page is None:
                yield self._event(input, CoreEventType.ERROR, {"code": ErrorCode.PAGE_CONTEXT_REQUIRED.value, "message": "Active page is required before Mock summary.", "recoverable": True})
                return
            title = str(input.active_page.get("title") or input.active_page.get("url") or "当前页面")
            yield self._event(input, CoreEventType.RESPONSE_DELTA, {"text": f"这是基于当前页面的 Mock 摘要：{title}"})
            yield self._event(input, CoreEventType.RESPONSE_DONE, {"message_id": new_id("msg_")})
            return

        yield self._event(input, CoreEventType.RESPONSE_DELTA, {"text": f"Mock provider received: {message}"})
        yield self._event(input, CoreEventType.RESPONSE_DONE, {"message_id": new_id("msg_")})

    def _event(self, input: CoreTurnInput, event_type: CoreEventType, data: dict[str, object]) -> CoreEvent:
        return CoreEvent(
            type=event_type,
            session_id=input.session_id,
            turn_id=input.turn_id,
            trace_id=input.trace_id,
            request_id=input.request_id,
            data=dict(data),
        )

    def _requires_page_summary(self, lowered_message: str) -> bool:
        return any(token in lowered_message for token in ["总结", "summary", "summarize", "概括"])

