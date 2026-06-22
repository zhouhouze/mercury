from __future__ import annotations

from collections.abc import AsyncIterator, Callable

import httpx

from navia_runtime.contracts import ErrorCode, new_id
from navia_runtime.modules.agent_loop.runtime.chat_profile_prompt import CHAT_PROFILE_SYSTEM_PROMPT, build_page_context_prompt
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType, CoreTurnInput


class LLMDirectProvider:
    provider_id = "llm_direct"

    def __init__(self, model_provider: dict[str, object] | None = None, client_factory: Callable[[], httpx.Client] | None = None) -> None:
        self.model_provider = model_provider or {}
        self.client_factory = client_factory or (lambda: httpx.Client(timeout=30.0))

    async def run_turn(self, input: CoreTurnInput) -> AsyncIterator[CoreEvent]:
        if not self.model_provider:
            yield self._error(input, "llm_provider_missing", "LLM Provider 未配置，请在 Settings 中选择 DeepSeek Provider。")
            return
        api_key = str(self.model_provider.get("apiKey") or "")
        base_url = str(self.model_provider.get("baseUrl") or "")
        model = str(self.model_provider.get("model") or "")
        if not api_key or not base_url or not model:
            yield self._error(input, "llm_provider_missing", "LLM Provider 配置不完整。")
            return
        try:
            with self.client_factory() as client:
                with client.stream(
                    "POST",
                    f"{base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": self._messages(input), "stream": True},
                ) as response:
                    response.raise_for_status()
                    for line in response.iter_lines():
                        if not line.startswith("data:"):
                            continue
                        payload = line[5:].strip()
                        if not payload or payload == "[DONE]":
                            continue
                        text = self._delta_text(payload)
                        if text:
                            yield CoreEvent(CoreEventType.RESPONSE_DELTA, input.session_id, input.turn_id, input.trace_id, input.request_id, {"text": text})
            yield CoreEvent(CoreEventType.RESPONSE_DONE, input.session_id, input.turn_id, input.trace_id, input.request_id, {"message_id": new_id("msg_")})
        except Exception:
            yield self._error(input, "provider_call_failed", "LLM Provider 调用失败，请检查 Settings 配置。")

    def _messages(self, input: CoreTurnInput) -> list[dict[str, str]]:
        messages = [{"role": "system", "content": CHAT_PROFILE_SYSTEM_PROMPT}]
        if input.active_page:
            messages.append({"role": "system", "content": f"PAGE_CONTEXT:\n{build_page_context_prompt(input.active_page)}"})
        messages.append({"role": "user", "content": input.user_message})
        return messages

    def _delta_text(self, payload: str) -> str:
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            return ""
        text = data.get("choices", [{}])[0].get("delta", {}).get("content")
        return text if isinstance(text, str) else ""

    def _error(self, input: CoreTurnInput, code: str, message: str) -> CoreEvent:
        return CoreEvent(
            CoreEventType.ERROR,
            input.session_id,
            input.turn_id,
            input.trace_id,
            input.request_id,
            {"code": code or ErrorCode.MODEL_UNAVAILABLE.value, "message": message, "recoverable": True},
        )
