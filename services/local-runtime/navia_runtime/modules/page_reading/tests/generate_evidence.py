from __future__ import annotations

import json
from pathlib import Path

from navia_runtime.modules.page_reading.runtime import build_structured_page_context


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"
EVIDENCE_DIR = Path(__file__).resolve().parent / "evidence"


def main() -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    for fixture_path in sorted(FIXTURE_DIR.glob("*.html")):
        result = build_structured_page_context(
            {
                "sessionId": f"evidence_{fixture_path.stem}",
                "url": f"https://module-fixtures.example/{fixture_path.stem}",
                "title": fixture_path.stem,
                "domain": "module-fixtures.example",
                "capturedAt": "2026-06-04T00:00:00Z",
                "html": fixture_path.read_text(encoding="utf-8"),
            }
        )
        suffix = "structured-page" if result.get("ok") else "error"
        target = EVIDENCE_DIR / f"{fixture_path.stem}.{suffix}.json"
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


if __name__ == "__main__":
    main()
