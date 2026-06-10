from __future__ import annotations

import os

from navia_runtime.modules.agent_loop.runtime.core_types import CoreProviderConfig
from navia_runtime.modules.agent_loop.runtime.llm_direct_provider import LLMDirectProvider
from navia_runtime.modules.agent_loop.runtime.mock_core_provider import MockCoreProvider
from navia_runtime.modules.agent_loop.runtime.pi_agent_core_provider import PiAgentCoreProvider


class CoreProviderNotImplementedError(NotImplementedError):
    recoverable = True


def create_core_provider(config: CoreProviderConfig | dict[str, object] | None = None):
    parsed = parse_core_provider_config(config)
    if parsed.provider == "mock":
        return MockCoreProvider()
    model_provider = parsed.options.get("modelProvider") if isinstance(parsed.options.get("modelProvider"), dict) else None
    if parsed.provider == "llm_direct":
        return LLMDirectProvider(model_provider=model_provider)
    if parsed.provider == "piagent":
        return PiAgentCoreProvider(model_provider=model_provider)
    if parsed.provider in {"custom"}:
        raise CoreProviderNotImplementedError(f"Core provider '{parsed.provider}' is not implemented in V1.2.")
    raise CoreProviderNotImplementedError(f"Unknown core provider '{parsed.provider}'.")


def parse_core_provider_config(config: CoreProviderConfig | dict[str, object] | None = None) -> CoreProviderConfig:
    if isinstance(config, CoreProviderConfig):
        return config
    raw = config if isinstance(config, dict) else {}
    options = raw.get("options") if isinstance(raw.get("options"), dict) else {}
    return CoreProviderConfig(
        provider=str(raw.get("provider") or os.environ.get("NAVIA_CORE_PROVIDER") or "mock"),
        llm_provider_id=str(raw["llmProviderId"]) if isinstance(raw.get("llmProviderId"), str) else str(raw["llm_provider_id"]) if isinstance(raw.get("llm_provider_id"), str) else None,
        model_provider_id=str(raw["model_provider_id"]) if isinstance(raw.get("model_provider_id"), str) else None,
        model=str(raw["model"]) if isinstance(raw.get("model"), str) else None,
        mode=str(raw.get("mode") or "chat"),
        options=options,
    )
