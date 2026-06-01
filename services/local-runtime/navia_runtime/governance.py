from __future__ import annotations

from dataclasses import dataclass


class BudgetExceeded(Exception):
    pass


@dataclass(frozen=True)
class TurnBudget:
    max_tool_calls: int = 5
    max_retries: int = 1
    max_context_bytes: int = 256 * 1024


@dataclass
class GovernanceHooks:
    pre_tool_calls: int = 0
    post_tool_calls: int = 0
    started_tool_calls: int = 0

    def pre_tool_use(self, tool_name: str, budget: TurnBudget | None = None) -> None:
        budget = budget or TurnBudget()
        self.pre_tool_calls += 1
        if tool_name in {"read_local_file", "shell", "browser_automation"}:
            raise PermissionError(f"Tool denied by default policy: {tool_name}")
        if self.started_tool_calls >= budget.max_tool_calls:
            raise BudgetExceeded(f"Tool budget exceeded: max_tool_calls={budget.max_tool_calls}")
        self.started_tool_calls += 1

    def post_tool_use(self, tool_name: str) -> None:
        self.post_tool_calls += 1
