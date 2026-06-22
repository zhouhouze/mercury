from __future__ import annotations

import asyncio
import json
import re
from collections.abc import AsyncIterator

from navia_runtime.contracts import ErrorCode, new_id, utc_now
from navia_runtime.modules.agent_loop.runtime.chat_profile_prompt import CHAT_PROFILE_SYSTEM_PROMPT, build_prompt_envelope
from navia_runtime.modules.agent_loop.runtime.core_types import CoreEvent, CoreEventType, CoreTurnInput
from navia_runtime.modules.agent_loop.runtime.pi_event_normalizer import normalize_pi_event
from navia_runtime.modules.agent_loop.runtime.pi_sidecar_client import PiSidecarClient, PiSidecarError
from navia_runtime.modules.mindmap.runtime.generator import sanitize_label, validate_mermaid_source


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
            task_type = self._task_type(input)
            if self._requires_page_context(task_type) and input.active_page is None:
                yield self._error(input, "page_context_missing", "当前没有可用页面内容，请先读取当前页面。")
                return
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
            self.client.send_prompt(
                pi_session_id,
                build_prompt_envelope(input.user_message, task_type=task_type, active_page=input.active_page),
                input.request_id,
                input.turn_id,
                input.trace_id,
            )
            done = False
            saw_displayable_text = False
            saw_raw_event = False
            saw_hidden_thinking = False
            saw_toolcall = False
            raw_text_seen = False
            assistant_text_parts: list[str] = []
            artifact_emitted = False
            for _ in range(self.max_polls):
                for raw_event in self.client.stream_events(pi_session_id):
                    for core_event in normalize_pi_event(raw_event, input):
                        if core_event.type == CoreEventType.STATE:
                            if core_event.data.get("to") in {"pi.raw", "pi.normalizer.debug", "pi.stdio.debug"}:
                                saw_raw_event = True
                            if self._state_suggests_hidden_thinking(core_event.data):
                                saw_hidden_thinking = True
                            if self._state_suggests_toolcall(core_event.data):
                                saw_toolcall = True
                            if self._state_suggests_raw_text(core_event.data):
                                raw_text_seen = True
                        if core_event.type in {CoreEventType.TOOL_REQUESTED, CoreEventType.TOOL_DENIED}:
                            saw_toolcall = True
                        if core_event.type == CoreEventType.RESPONSE_DELTA:
                            text = str(core_event.data.get("text") or "")
                            if text:
                                assistant_text_parts.append(text)
                            if text.strip():
                                saw_displayable_text = True
                            if task_type == "mindmap_page":
                                continue
                        if core_event.type == CoreEventType.RESPONSE_DONE and not saw_displayable_text:
                            code, message = self._empty_response_error(saw_toolcall=saw_toolcall, saw_hidden_thinking=saw_hidden_thinking, raw_text_seen=raw_text_seen, saw_raw_event=saw_raw_event)
                            yield self._error(input, code, message)
                            done = True
                            break
                        if core_event.type == CoreEventType.RESPONSE_DONE and task_type == "mindmap_page" and not artifact_emitted:
                            artifact = self._mindmap_artifact(input, "".join(assistant_text_parts))
                            if artifact is not None:
                                artifact_emitted = True
                                yield CoreEvent(
                                    type=CoreEventType.ARTIFACT_CREATED,
                                    session_id=input.session_id,
                                    turn_id=input.turn_id,
                                    trace_id=input.trace_id,
                                    request_id=input.request_id,
                                    data={"artifact_id": artifact["artifactId"], "artifact": artifact, "metadata": artifact.get("metadata", {})},
                                )
                                yield CoreEvent(
                                    type=CoreEventType.RESPONSE_DELTA,
                                    session_id=input.session_id,
                                    turn_id=input.turn_id,
                                    trace_id=input.trace_id,
                                    request_id=input.request_id,
                                    data={"text": "已生成当前页面思维导图。"},
                                )
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
        except KeyError:
            yield self._error(input, "piagent_invalid_response", "PiAgent 返回了无效响应，请检查 Sidecar 版本。")
        except PiSidecarError:
            yield self._error(input, "piagent_sidecar_unavailable", "Pi Sidecar 未启动或暂不可用，请启动 Pi Sidecar 后重试。")
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
        if data.get("rawEventRole") == "user":
            return False
        if self._state_suggests_hidden_thinking(data) or self._state_suggests_toolcall(data):
            return False
        full_text_length = data.get("fullTextLength")
        emitted_delta_length = data.get("emittedDeltaLength")
        if isinstance(full_text_length, int) and full_text_length > 0:
            return True
        if isinstance(emitted_delta_length, int) and emitted_delta_length > 0:
            return True
        raw_summary = str(data.get("raw_summary") or "")
        if self._raw_summary_role(raw_summary) == "user":
            return False
        lowered = raw_summary.lower()
        return any(marker in lowered for marker in ('"text"', '"content"', '"delta"', '"output_text"', '"assistant"'))

    def _state_suggests_hidden_thinking(self, data: dict[str, object]) -> bool:
        if data.get("to") == "pi.hidden_thinking" or data.get("piEventCategory") == "hidden_thinking":
            return True
        event_type = str(data.get("rawEventType") or "").lower()
        if event_type.startswith("thinking_"):
            return True
        raw_summary = str(data.get("raw_summary") or "")
        return self._raw_summary_has_event_type(raw_summary, {"thinking_start", "thinking_delta", "thinking_end"})

    def _state_suggests_toolcall(self, data: dict[str, object]) -> bool:
        if data.get("piEventCategory") == "toolcall":
            return True
        event_type = str(data.get("rawEventType") or "").lower()
        if event_type in {"tool_call", "tool_use", "toolcall_start", "toolcall_delta", "toolcall_end", "tool_request", "tool.requested"}:
            return True
        raw_summary = str(data.get("raw_summary") or "")
        return self._raw_summary_has_event_type(raw_summary, {"tool_call", "tool_use", "toolcall_start", "toolcall_delta", "toolcall_end"})

    def _raw_summary_has_event_type(self, raw_summary: str, event_types: set[str]) -> bool:
        if not raw_summary:
            return False
        lowered = raw_summary.lower()
        if any(f'"type":"{event_type}"' in lowered.replace(" ", "") for event_type in event_types):
            return True
        try:
            value = json.loads(raw_summary)
        except json.JSONDecodeError:
            return False
        return self._object_has_event_type(value, event_types)

    def _object_has_event_type(self, value: object, event_types: set[str]) -> bool:
        if isinstance(value, dict):
            type_value = value.get("type")
            if isinstance(type_value, str) and type_value.lower() in event_types:
                return True
            assistant_event = value.get("assistantMessageEvent")
            if isinstance(assistant_event, dict):
                assistant_type = assistant_event.get("type")
                if isinstance(assistant_type, str) and assistant_type.lower() in event_types:
                    return True
            return any(self._object_has_event_type(child, event_types) for child in value.values())
        if isinstance(value, list):
            return any(self._object_has_event_type(child, event_types) for child in value)
        return False

    def _empty_response_error(self, *, saw_toolcall: bool, saw_hidden_thinking: bool, raw_text_seen: bool, saw_raw_event: bool) -> tuple[str, str]:
        if saw_toolcall:
            return "piagent_tool_call_denied", "PiAgent 尝试调用工具，但当前聊天模式不支持工具调用。请直接基于 Runtime 提供的网页上下文回答。"
        if saw_hidden_thinking:
            return "piagent_hidden_thinking_only", "PiAgent 没有返回可展示的普通文本，内部思考内容已被安全过滤。"
        if raw_text_seen:
            return "piagent_no_assistant_text_delta", "PiAgent raw event 中未发现可展示的普通文本 delta，请检查 pi RPC 文本事件格式。"
        if saw_raw_event:
            return "pi_rpc_no_text", "PiAgent raw 输出没有普通文本，请检查 pi RPC 协议是否兼容 session.init / prompt。"
        return "piagent_empty_response", "PiAgent 已结束但未返回普通文本，请检查 pi RPC 输出格式。"

    def _raw_summary_role(self, raw_summary: str) -> str | None:
        if not raw_summary:
            return None
        try:
            value = json.loads(raw_summary)
        except json.JSONDecodeError:
            return "user" if '"role":"user"' in raw_summary.replace(" ", "").lower() else None
        if not isinstance(value, dict):
            return None
        role = value.get("role")
        if isinstance(role, str):
            return role.lower()
        message = value.get("message")
        if isinstance(message, dict) and isinstance(message.get("role"), str):
            return str(message["role"]).lower()
        data = value.get("data")
        if isinstance(data, dict) and isinstance(data.get("role"), str):
            return str(data["role"]).lower()
        return None

    def _task_type(self, input: CoreTurnInput) -> str:
        message = input.user_message.lower()
        if any(keyword in message for keyword in ["mindmap", "思维导图", "脑图", "mermaid"]):
            return "mindmap_page"
        if any(keyword in message for keyword in ["总结", "summary", "summarize"]):
            return "summarize_page"
        if any(keyword in message for keyword in ["解释选区", "解释选中", "selection", "selected text"]):
            return "explain_selection"
        if input.active_page is not None:
            return "page_qa"
        return "general_chat"

    def _requires_page_context(self, task_type: str) -> bool:
        return task_type in {"summarize_page", "mindmap_page"}

    def _mindmap_artifact(self, input: CoreTurnInput, text: str) -> dict[str, object] | None:
        mermaid = self._extract_mermaid_mindmap(text)
        if not mermaid:
            return None
        mermaid = self._limit_mindmap_depth(mermaid, max_depth=2)
        validation = validate_mermaid_source(mermaid)
        if not validation.get("valid"):
            return None
        source_page_id = self._active_page_id(input.active_page)
        node_source_map, node_bindings = self._mindmap_metadata_from_mermaid(input.active_page, mermaid)
        return {
            "artifactId": new_id("art_"),
            "sessionId": input.session_id,
            "turnId": input.turn_id,
            "toolCallId": new_id("tc_"),
            "type": "mindmap",
            "sourcePageId": source_page_id,
            "sourceChunkIds": self._active_page_chunk_ids(input.active_page),
            "source": "page",
            "content": mermaid,
            "metadata": {
                "format": "mermaid",
                "sourcePageId": source_page_id,
                "nodeSourceMap": node_source_map,
                "nodeBindings": node_bindings,
                "validation": validation,
                "maxDepth": 3,
                "layout": "pyramid",
                "generatedBy": "piagent",
            },
            "createdAt": utc_now(),
        }

    def _extract_mermaid_mindmap(self, text: str) -> str | None:
        if not text.strip():
            return None
        candidates: list[str] = []
        for match in re.finditer(r"```([A-Za-z0-9_-]*)\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL):
            language = match.group(1).strip().lower()
            body = match.group(2)
            candidates.append(f"mindmap\n{body}" if language == "mindmap" else body)
        candidates.append(text)
        for candidate in candidates:
            normalized = self._normalize_mindmap_source(candidate)
            if normalized:
                return normalized
        return None

    def _normalize_mindmap_source(self, text: str) -> str | None:
        lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")]
        lines = [line for line in lines if not line.strip().startswith("```")]
        while lines and not lines[0].strip():
            lines.pop(0)
        if lines and lines[0].strip().lower() == "mermaid":
            lines.pop(0)
        while lines and not lines[0].strip():
            lines.pop(0)
        if lines and lines[0].strip().lower() != "mindmap":
            first_mindmap = next((index for index, line in enumerate(lines) if line.strip().lower() == "mindmap"), None)
            if first_mindmap is not None:
                lines = lines[first_mindmap:]
        if not lines or lines[0].strip().lower() != "mindmap":
            return None
        source = "\n".join(lines).strip()
        return source if source.startswith("mindmap\n") or source == "mindmap" else None

    def _limit_mindmap_depth(self, source: str, *, max_depth: int) -> str:
        lines = source.splitlines()
        if not lines:
            return source
        kept: list[str] = []
        root_indent: int | None = None
        node_count = 0
        for index, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            if index == 0 and stripped == "mindmap":
                kept.append("mindmap")
                continue
            indent = len(line) - len(line.lstrip(" "))
            if root_indent is None:
                root_indent = indent
                depth = 0
            else:
                depth = max(0, (indent - root_indent) // 2)
            if depth > max_depth:
                continue
            node_count += 1
            if node_count > 32:
                continue
            kept.append(line.rstrip())
        return "\n".join(kept)

    def _mindmap_metadata_from_mermaid(self, active_page: dict[str, object] | None, source: str) -> tuple[dict[str, object], list[dict[str, object]]]:
        fallback_text = self._active_page_excerpt(active_page)
        chunk_ids = self._active_page_chunk_ids(active_page)
        source_page_id = self._active_page_id(active_page)
        node_source_map: dict[str, object] = {}
        node_bindings: list[dict[str, object]] = []
        for line_index, line in enumerate(source.splitlines()):
            stripped = line.strip()
            if not stripped or stripped == "mindmap":
                continue
            node_id = "root" if not node_source_map else f"node_{len(node_source_map)}"
            label = self._mindmap_label(stripped)
            source_ref_id = f"piagent_{node_id}"
            node_source_map[node_id] = {
                "nodeLabel": label,
                "sourceRefIds": [source_ref_id],
                "paragraphIds": [],
                "chunkIds": chunk_ids[:1],
                "excerpt": fallback_text[:180],
                "textQuote": "",
                "fallbackText": fallback_text[:240] or label,
                "jumpback": {"mode": "fallback", "reason": "piagent_generated_mindmap", "sourcePageId": source_page_id},
            }
            node_bindings.append(
                {
                    "nodeId": node_id,
                    "nodeSourceMapKey": node_id,
                    "nodeLabel": label,
                    "mermaidLineIndex": line_index,
                    "sourceRefIds": [source_ref_id],
                    "paragraphIds": [],
                    "chunkIds": chunk_ids[:1],
                }
            )
        return node_source_map, node_bindings

    def _mindmap_label(self, line: str) -> str:
        bracket_match = re.search(r"\(\((.+?)\)\)", line)
        raw_label = bracket_match.group(1) if bracket_match else re.sub(r"^[\w-]+\s*", "", line)
        return sanitize_label(raw_label.replace("<br/>", " ").replace("<br>", " "))

    def _active_page_id(self, active_page: dict[str, object] | None) -> str:
        if not isinstance(active_page, dict):
            return ""
        page_id = active_page.get("pageId") or active_page.get("page_id")
        return str(page_id) if page_id else ""

    def _active_page_chunk_ids(self, active_page: dict[str, object] | None) -> list[str]:
        if not isinstance(active_page, dict):
            return []
        chunk_ids: list[str] = []
        chunks = active_page.get("chunks")
        if isinstance(chunks, list):
            for chunk in chunks:
                if isinstance(chunk, dict):
                    chunk_id = chunk.get("chunkId") or chunk.get("chunk_id") or chunk.get("id")
                    if chunk_id:
                        chunk_ids.append(str(chunk_id))
        return chunk_ids

    def _active_page_excerpt(self, active_page: dict[str, object] | None) -> str:
        if not isinstance(active_page, dict):
            return ""
        for key in ("selectedText", "cleanedText", "visibleText"):
            value = active_page.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        chunks = active_page.get("chunks")
        if isinstance(chunks, list):
            for chunk in chunks:
                if isinstance(chunk, dict) and isinstance(chunk.get("text"), str) and chunk["text"].strip():
                    return str(chunk["text"]).strip()
        return str(active_page.get("title") or "").strip()

    def _error(self, input: CoreTurnInput, code: str, message: str) -> CoreEvent:
        return CoreEvent(
            type=CoreEventType.ERROR,
            session_id=input.session_id,
            turn_id=input.turn_id,
            trace_id=input.trace_id,
            request_id=input.request_id,
            data={"code": code or ErrorCode.MODEL_UNAVAILABLE.value, "message": message, "recoverable": True},
        )
