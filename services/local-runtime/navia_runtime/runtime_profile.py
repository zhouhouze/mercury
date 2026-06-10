from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal


RuntimeProfile = Literal["chat", "agent"]
ContextStrategyType = Literal["model_only", "page_context", "session_context"]

CHAT_INTENTS = {"general_chat", "page_qa", "summarize_page", "mindmap_page", "explain_selection", "rewrite", "translate", "unknown"}
PAGE_CONTEXT_INTENTS = {"page_qa", "summarize_page", "mindmap_page", "explain_selection"}
DEFERRED_INTENTS = {"weather_lookup", "web_search", "realtime_news", "deep_research", "slide_generation", "code_task"}
DEFERRED_MESSAGE = "这个能力会在后续版本开放。当前我可以先帮你做页面总结、问答或 Mindmap。"


@dataclass(frozen=True)
class ContextStrategy:
    type: ContextStrategyType
    sources: list[str]


@dataclass(frozen=True)
class ProfileResolution:
    profile: RuntimeProfile
    core_provider: str | None
    llm_provider_id: str | None
    model: str | None
    tool_policy: dict[str, Any]
    enabled: bool
    fallback_reason: str | None = None


def default_profiles(core_provider: str | None = None, llm_provider_id: str | None = None, model: str | None = None) -> dict[str, dict[str, Any]]:
    chat_core = core_provider or "llm_direct"
    base_policy = {"mode": "disabled", "allowedTools": []}
    return {
        "chat": {
            "profile": "chat",
            "coreProvider": chat_core,
            "llmProviderId": llm_provider_id,
            "model": model,
            "toolPolicy": base_policy,
            "enabled": True,
        },
        "agent": {
            "profile": "agent",
            "coreProvider": "piagent",
            "llmProviderId": llm_provider_id,
            "model": model,
            "toolPolicy": base_policy,
            "enabled": False,
        },
    }


def normalize_profile(value: Any) -> RuntimeProfile:
    return "agent" if value == "agent" else "chat"


def detect_deferred_intent(message: str, intent_hint: str | None = None) -> str | None:
    if intent_hint in DEFERRED_INTENTS:
        return intent_hint
    lowered = message.lower()
    if any(token in lowered for token in ["天气", "weather", "气温"]):
        return "weather_lookup"
    if any(token in lowered for token in ["搜索", "search", "查一下", "google", "联网"]):
        return "web_search"
    if any(token in lowered for token in ["新闻", "news", "资讯", "实时"]):
        return "realtime_news"
    if any(token in lowered for token in ["deep research", "深度研究", "深入研究"]):
        return "deep_research"
    if any(token in lowered for token in ["ppt", "幻灯片", "演示文稿"]):
        return "slide_generation"
    if any(token in lowered for token in ["code task", "代码任务", "改代码", "写代码"]):
        return "code_task"
    return None


def resolve_context_strategy(intent: str, message: str) -> ContextStrategy:
    if intent in PAGE_CONTEXT_INTENTS:
        return ContextStrategy("page_context", ["active_page"])
    lowered = message.lower()
    if any(token in lowered for token in ["当前页面", "这个页面", "这页", "这篇", "这篇文章", "这段", "上面内容"]):
        return ContextStrategy("page_context", ["active_page"])
    if intent in {"rewrite", "translate"} and any(token in lowered for token in ["这段", "选中", "当前页面"]):
        return ContextStrategy("page_context", ["active_page"])
    return ContextStrategy("model_only", [])


def resolve_profile(settings: dict[str, Any], body: dict[str, Any]) -> ProfileResolution:
    requested_profile = normalize_profile(body.get("profile") or settings.get("defaultProfile"))
    profiles = settings.get("profiles") if isinstance(settings.get("profiles"), dict) else default_profiles(
        settings.get("coreProvider"),
        settings.get("defaultProviderId"),
        settings.get("defaultModel"),
    )
    profile_config = profiles.get(requested_profile) if isinstance(profiles.get(requested_profile), dict) else {}
    return ProfileResolution(
        profile=requested_profile,
        core_provider=body.get("coreProvider") or profile_config.get("coreProvider") or settings.get("coreProvider"),
        llm_provider_id=body.get("llmProviderId") or profile_config.get("llmProviderId") or settings.get("defaultProviderId"),
        model=body.get("model") or profile_config.get("model") or settings.get("defaultModel"),
        tool_policy=profile_config.get("toolPolicy") if isinstance(profile_config.get("toolPolicy"), dict) else {"mode": "disabled", "allowedTools": []},
        enabled=bool(profile_config.get("enabled", requested_profile == "chat")),
    )
