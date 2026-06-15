from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from navia_runtime.contracts import ErrorCode
from navia_runtime.modules.agent_loop.runtime.chat_profile_prompt import CHAT_PROFILE_SYSTEM_PROMPT, build_prompt_envelope
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType, CoreTurnInput
from navia_runtime.modules.agent_loop.runtime.pi_event_normalizer import normalize_pi_event
from navia_runtime.modules.agent_loop.runtime.pi_sidecar_client import PiSidecarClient, PiSidecarError


class PiAgentCoreProvider:
    provider_id = "piagent"

    def __init__(
        self,
        client: PiSidecarClient | None = None,
        model_provider: dict[str, object] | None = None,
        max_polls: int = 120,
        poll_interval_seconds: float = 0.1,
    ) -> None:
        self.client = client or PiSidecarClient()
        self.model_provider = model_provider
        self.max_polls = max_polls
        self.poll_interval_seconds = poll_interval_seconds
        self._sessions: dict[str, str] = {}

    async def run_turn(self, input: CoreTurnInput) -> AsyncIterator[CoreEvent]:
        try:
            self.client.health()
            model_provider = self.model_provider or input.provider_config.get("modelProvider")
            if self._missing_model_provider(model_provider):
                yield self._error(input, "piagent_provider_config_missing", "PiAgent 缺少 Chat Provider 配置，请在 Settings 中选择 DeepSeek Provider 和模型。")
                return
            pi_session_id = self._sessions.get(input.session_id)
            if pi_session_id is None:
                created = self.client.create_session(
                    input.session_id,
                    model_provider=model_provider,
                    system_prompt=CHAT_PROFILE_SYSTEM_PROMPT,
                    profile="chat",
                    tool_policy="disabled",
                )
                pi_session_id = str(created["sessionId"])
                self._sessions[input.session_id] = pi_session_id
            # Some pi RPC builds do not yet honor session-level systemPrompt. The
            # prompt envelope keeps Chat Profile behavior stable without exposing
            # the instruction text to the ordinary chat UI.
            yield CoreEvent(
                type=CoreEventType.STATE,
                session_id=input.session_id,
                turn_id=input.turn_id,
                trace_id=input.trace_id,
                request_id=input.request_id,
                data={"from": "piagent", "to": "system_prompt.injected", "systemPromptInjectionMode": "prompt_envelope"},
            )
            self.client.send_prompt(pi_session_id, build_prompt_envelope(input.user_message), input.request_id, input.turn_id, input.trace_id)
            done = False
            saw_text_delta = False
            saw_raw_event = False
            raw_text_seen = False
            for _ in range(self.max_polls):
                for raw_event in self.client.stream_events(pi_session_id):
                    for core_event in normalize_pi_event(raw_event, input):
                        if core_event.type == CoreEventType.STATE:
                            if core_event.data.get("to") in {"pi.raw", "pi.normalizer.debug", "pi.stdio.debug"}:
                                saw_raw_event = True
                            if self._state_suggests_raw_text(core_event.data):
                                raw_text_seen = True
                        if core_event.type == CoreEventType.RESPONSE_DELTA and str(core_event.data.get("text") or "").strip():
                            saw_text_delta = True
                        if core_event.type == CoreEventType.RESPONSE_DONE and not saw_text_delta:
                            code = "pi_normalizer_no_delta" if raw_text_seen else "pi_rpc_no_text" if saw_raw_event else "piagent_empty_response"
                            message = (
                                "PiAgent raw event 里疑似包含文本，但没有转换成普通文本 delta，请检查 sidecar normalizer 字段映射。"
                                if code == "pi_normalizer_no_delta"
                                else "PiAgent raw 输出没有普通文本，请检查 pi RPC 协议是否兼容 session.init / prompt。"
                                if code == "pi_rpc_no_text"
                                else "PiAgent 已结束但未返回普通文本，请检查 pi RPC 输出格式。"
                            )
                            yield self._error(input, code, message)
                            done = True
                            break
                        yield core_event
                        if core_event.type in {CoreEventType.RESPONSE_DONE, CoreEventType.ERROR}:
                            done = True
                    if done:
                        break
                    if done:
                        return
                if done:
                    return
                await asyncio.sleep(self.poll_interval_seconds)
            yield self._error(input, "piagent_timeout", "PiAgent 服务响应超时，请稍后重试。")
        except (KeyError, PiSidecarError) as exc:
            yield self._error(input, "piagent_unavailable", "PiAgent 服务暂不可用或返回了无效响应。")
        except RuntimeError:
            yield self._error(input, "piagent_failed", "PiAgent 服务调用失败。")

    def _missing_model_provider(self, value: object) -> bool:
        if not isinstance(value, dict):
            return True
        required = ("type", "baseUrl", "model")
        if any(not isinstance(value.get(key), str) or not str(value.get(key)).strip() for key in required):
            return True
        has_secret_ref = isinstance(value.get("apiKeyRef"), str) and bool(str(value.get("apiKeyRef")).strip())
        has_secret = isinstance(value.get("apiKey"), str) and bool(str(value.get("apiKey")).strip())
        return not (has_secret_ref or has_secret)

    def _state_suggests_raw_text(self, data: dict[str, object]) -> bool:
        full_text_length = data.get("fullTextLength")
        emitted_delta_length = data.get("emittedDeltaLength")
        if isinstance(full_text_length, int) and full_text_length > 0:
            return True
        if isinstance(emitted_delta_length, int) and emitted_delta_length > 0:
            return True
        raw_summary = str(data.get("raw_summary") or "")
        lowered = raw_summary.lower()
        return any(marker in lowered for marker in ('"text"', '"content"', '"delta"', '"output_text"', '"assistant"'))

    def _error(self, input: CoreTurnInput, code: str, message: str) -> CoreEvent:
        return CoreEvent(
            type=CoreEventType.ERROR,
            session_id=input.session_id,
            turn_id=input.turn_id,
            trace_id=input.trace_id,
            request_id=input.request_id,
            data={"code": code or ErrorCode.MODEL_UNAVAILABLE.value, "message": message, "recoverable": True},
        )
