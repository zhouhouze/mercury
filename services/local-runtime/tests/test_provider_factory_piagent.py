from __future__ import annotations

from navia_runtime.modules.agent_loop.runtime import CoreProviderConfig
from navia_runtime.modules.agent_loop.runtime.pi_agent_core_provider import PiAgentCoreProvider
from navia_runtime.modules.agent_loop.runtime.provider_factory import create_core_provider


def test_provider_factory_creates_piagent_provider() -> None:
    provider = create_core_provider(CoreProviderConfig(provider="piagent"))

    assert isinstance(provider, PiAgentCoreProvider)

