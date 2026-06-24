#!/usr/bin/env python3
"""Validate V1.4 Reading Map acceptance report semantics."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = REPO_ROOT / "docs/active/project/evidence/v1_4_reading_map/report.json"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    report_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_REPORT
    report = load_json(report_path)
    errors: list[str] = []

    if report.get("stage") != "V1.4":
      errors.append("stage must be V1.4")
    if report.get("passed") is True:
      if report.get("fatalIssues"):
          errors.append("passed=true but fatalIssues is not empty")
      if report.get("majorIssues"):
          errors.append("passed=true but majorIssues is not empty")
      if report.get("claim") != "V1.4 Reading Map Side Panel navigation experience complete":
          errors.append("passed=true requires V1.4 Reading Map completion claim")
    if "V1 complete" in str(report.get("claim", "")):
      errors.append("V1.4 report must not claim full V1 complete")

    summary = report.get("summary", {})
    screenshots = report.get("screenshots", [])
    native_reading_map = [
        shot for shot in screenshots
        if shot.get("isNativeSidePanel") is True
        and shot.get("containsWebPageBody") is True
        and shot.get("containsNaviaPanel") is True
        and shot.get("containsEvidenceCardMindmap") is True
        and shot.get("containsReadingMap") is True
        and int(shot.get("readingMapNavCount") or 0) > 0
        and str(shot.get("readingMapDetailText") or "").strip()
        and shot.get("containsSourcePanel") is True
        and shot.get("sourceEvidenceVisible") is True
        and str(shot.get("sourceEvidenceText") or "").strip()
    ]
    if int(summary.get("nativeReadingMapSamples") or 0) != len(native_reading_map):
        errors.append("summary.nativeReadingMapSamples does not match qualifying screenshots")
    if len(native_reading_map) < 3:
        errors.append("nativeReadingMapSamples must be at least 3")
    for shot in screenshots:
        for key in ("screenshotPath", "metadataPath"):
            value = shot.get(key)
            if value and not (report_path.parent / value).exists():
                errors.append(f"{key} does not exist: {value}")

    if errors:
        print("V1.4 Reading Map validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("V1.4 Reading Map validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
