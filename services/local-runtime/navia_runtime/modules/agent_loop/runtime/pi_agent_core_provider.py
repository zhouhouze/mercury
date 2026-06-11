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
            pi_session_id = self._sessions.get(input.session_id)
            if pi_session_id is None:
                created = self.client.create_session(
                    input.session_id,
                    model_provider=self.model_provider or input.provider_config.get("modelProvider"),
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
            for _ in range(self.max_polls):
                for raw_event in self.client.stream_events(pi_session_id):
                    for core_event in normalize_pi_event(raw_event, input):
                        if core_event.type == CoreEventType.RESPONSE_DELTA and str(core_event.data.get("text") or "").strip():
                            saw_text_delta = True
                        if core_event.type == CoreEventType.RESPONSE_DONE and not saw_text_delta:
                            yield self._error(input, "piagent_empty_response", "PiAgent 已结束但未返回普通文本，请检查 pi RPC 输出格式。")
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

    def _error(self, input: CoreTurnInput, code: str, message: str) -> CoreEvent:
        return CoreEvent(
            type=CoreEventType.ERROR,
            session_id=input.session_id,
            turn_id=input.turn_id,
            trace_id=input.trace_id,
            request_id=input.request_id,
            data={"code": code or ErrorCode.MODEL_UNAVAILABLE.value, "message": message, "recoverable": True},
        )
