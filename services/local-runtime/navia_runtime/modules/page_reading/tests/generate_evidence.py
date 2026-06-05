from __future__ import annotations

import json
from pathlib import Path

from navia_runtime.modules.page_reading.runtime import build_high_signal_page_perception


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"
EVIDENCE_DIR = Path(__file__).resolve().parent / "evidence"
FIXTURE_CLASSES = {
    "image_rich_article": "degraded_content",
    "empty": "no_signal",
    "empty_or_low_signal": "no_signal",
    "video_page_stub": "planning_only",
}


def main() -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    for fixture_path in sorted(FIXTURE_DIR.glob("*.html")):
        fixture_class = FIXTURE_CLASSES.get(fixture_path.stem, "valid_content")
        result = build_high_signal_page_perception(
            {
                "sessionId": f"evidence_{fixture_path.stem}",
                "url": f"https://module-fixtures.example/{fixture_path.stem}",
                "title": fixture_path.stem,
                "domain": "module-fixtures.example",
                "capturedAt": "2026-06-04T00:00:00Z",
                "fixtureClass": fixture_class,
                "html": fixture_path.read_text(encoding="utf-8"),
            }
        )
        suffix = "structured-page" if result.get("ok") else "error"
        target = EVIDENCE_DIR / f"{fixture_path.stem}.{suffix}.json"
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
        if not result.get("ok"):
            continue
        write_payload(fixture_path.stem, "candidate-extraction", result["candidateExtraction"])
        write_payload(fixture_path.stem, "high-signal-page", result["highSignalPage"])
        write_payload(fixture_path.stem, "source-map", result["sourceMap"])
        write_payload(fixture_path.stem, "perception-digest", result["perceptionDigest"])
        write_payload(fixture_path.stem, "quality-report", result["qualityReport"])


def write_payload(fixture_name: str, suffix: str, payload: dict) -> None:
    target = EVIDENCE_DIR / f"{fixture_name}.{suffix}.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


if __name__ == "__main__":
    main()
