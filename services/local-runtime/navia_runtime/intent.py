from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IntentResult:
    intent: str
    confidence: float
    tool_name: str
    requires_page_context: bool = True
    requires_selection: bool = False


class RuleBasedIntentRouter:
    def detect(self, message: str) -> IntentResult:
        normalized = message.strip().lower()
        if any(token in normalized for token in ["read_local_file", "本地文件", "/etc/passwd", "读取文件"]):
            return IntentResult("read_local_file", 0.95, "read_local_file", requires_page_context=False)
        if any(token in normalized for token in ["思维导图", "mindmap", "mermaid", "脑图"]):
            return IntentResult("generate_mindmap", 0.9, "generate_mindmap")
        if any(token in normalized for token in ["解释选区", "解释选中", "selection", "selected text"]):
            return IntentResult("explain_selection", 0.86, "explain_selection", requires_selection=True)
        if any(token in normalized for token in ["总结", "summary", "summarize"]):
            return IntentResult("summarize_page", 0.92, "summarize_page")
        if any(token in normalized for token in ["什么", "为什么", "how", "what", "why", "?"]):
            return IntentResult("ask_page", 0.82, "answer_from_page")
        return IntentResult("unknown", 0.35, "answer_from_page")
