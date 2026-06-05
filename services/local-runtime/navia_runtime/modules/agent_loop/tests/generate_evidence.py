from __future__ import annotations

import json
from pathlib import Path

from navia_runtime.modules.agent_loop.runtime import run_agentic_turn
from test_agent_loop import active_page


EVIDENCE_DIR = Path(__file__).resolve().parent / "evidence"


SCENARIOS = {
    "summary_turn": {"userMessage": "请总结当前页面", "activePage": active_page()},
    "qa_turn": {"userMessage": "这些适配器为什么需要治理？", "activePage": active_page()},
    "mindmap_turn": {"userMessage": "生成思维导图", "activePage": active_page()},
    "denied_adapter": {"userMessage": "执行高风险工具", "activePage": active_page(), "forceAdapterId": "fixture.denied"},
    "missing_active_page": {"userMessage": "请总结当前页面"},
    "budget_exceeded": {"userMessage": "请总结当前页面", "activePage": active_page(), "budget": {"maxToolCalls": 0}},
    "adapter_failure": {"userMessage": "触发失败", "activePage": active_page(), "forceAdapterId": "fixture.failure"},
}


def main() -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    for name, payload in SCENARIOS.items():
        result = run_agentic_turn(
            {
                "sessionId": f"sess_{name}",
                "requestId": f"req_{name}",
                "recentMessages": [{"messageId": "msg_prev", "role": "assistant", "content": "上一轮摘要", "turnId": "turn_prev"}],
                "budget": {"maxToolCalls": 2, "maxRetries": 1, "maxContextBytes": 4096},
                **payload,
            }
        )
        (EVIDENCE_DIR / f"{name}.events.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


if __name__ == "__main__":
    main()
