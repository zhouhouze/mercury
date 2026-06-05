from __future__ import annotations

import json
from pathlib import Path

from navia_runtime.modules.mindmap.runtime import generate_mindmap_payload


BASE_DIR = Path(__file__).resolve()
A_EVIDENCE_DIR = BASE_DIR.parents[2] / "page_reading/tests/evidence"
EVIDENCE_DIR = BASE_DIR.parent / "evidence"


def structured_page(name: str) -> dict[str, object]:
    evidence = json.loads((A_EVIDENCE_DIR / f"{name}.structured-page.json").read_text(encoding="utf-8"))
    return evidence["structuredPage"]


def main() -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    for name in ["article", "docs", "github_readme"]:
        result = generate_mindmap_payload(
            {
                "sessionId": f"sess_{name}",
                "turnId": f"turn_{name}",
                "toolCallId": f"tc_{name}",
                "structuredPage": structured_page(name),
            }
        )
        (EVIDENCE_DIR / f"{name}.mindmap.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")

    repair = generate_mindmap_payload(
        {
            "sessionId": "sess_repair",
            "turnId": "turn_repair",
            "toolCallId": "tc_repair",
            "structuredPage": structured_page("article"),
            "debugForceInvalidOnce": True,
        }
    )
    (EVIDENCE_DIR / "repair_once.mindmap.json").write_text(json.dumps(repair, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")

    missing = generate_mindmap_payload({"sessionId": "sess_missing", "turnId": "turn_missing", "toolCallId": "tc_missing"})
    (EVIDENCE_DIR / "missing_structured_page.error.json").write_text(json.dumps(missing, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


if __name__ == "__main__":
    main()
