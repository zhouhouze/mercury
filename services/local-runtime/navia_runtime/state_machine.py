from __future__ import annotations

from enum import Enum


class StrEnum(str, Enum):
    pass


class AgentState(StrEnum):
    WAITING_USER = "waiting_user"
    DETECTING_INTENT = "detecting_intent"
    PLANNING = "planning"
    BUDGET_CHECKING = "budget_checking"
    RUNNING_TOOL = "running_tool"
    STREAMING_RESPONSE = "streaming_response"
    PERSISTING_TURN = "persisting_turn"


TRANSITIONS: set[tuple[AgentState, AgentState]] = {
    (AgentState.WAITING_USER, AgentState.DETECTING_INTENT),
    (AgentState.DETECTING_INTENT, AgentState.PLANNING),
    (AgentState.PLANNING, AgentState.BUDGET_CHECKING),
    (AgentState.BUDGET_CHECKING, AgentState.RUNNING_TOOL),
    (AgentState.BUDGET_CHECKING, AgentState.STREAMING_RESPONSE),
    (AgentState.RUNNING_TOOL, AgentState.STREAMING_RESPONSE),
    (AgentState.STREAMING_RESPONSE, AgentState.PERSISTING_TURN),
    (AgentState.PERSISTING_TURN, AgentState.WAITING_USER),
}


class InvalidTransition(ValueError):
    pass


class StateMachine:
    def __init__(self) -> None:
        self.state = AgentState.WAITING_USER

    def transition(self, target: AgentState) -> tuple[AgentState, AgentState]:
        source = self.state
        if (source, target) not in TRANSITIONS:
            raise InvalidTransition(f"Invalid transition: {source.value} -> {target.value}")
        self.state = target
        return source, target


def mermaid_graph() -> str:
    lines = ["stateDiagram-v2"]
    for source, target in sorted(TRANSITIONS, key=lambda item: (item[0].value, item[1].value)):
        lines.append(f"  {source.value} --> {target.value}")
    return "\n".join(lines)
