#!/usr/bin/env python3
"""Validate V1 current interaction baseline closeout report."""

from __future__ import annotations

import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = REPO_ROOT / "docs/active/project/evidence/v1_closeout/report.json"


def main() -> int:
    report_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_REPORT
    report = json.loads(report_path.read_text(encoding="utf-8"))
    errors: list[str] = []
    if report.get("stage") != "V1":
        errors.append("stage must be V1")
    if report.get("passed") is True:
        if report.get("fatalIssues"):
            errors.append("passed=true but fatalIssues is not empty")
        if report.get("majorIssues"):
            errors.append("passed=true but majorIssues is not empty")
        claim = str(report.get("claim", ""))
        if "current interaction baseline complete" not in claim:
            errors.append("passed=true must use the current interaction baseline claim")
        if "floating ball" in claim.lower():
            errors.append("V1 current baseline claim must not claim floating ball completion")
    snapshot = report.get("snapshot", {})
    frame = report.get("frameSnapshot", {})
    if snapshot.get("hostVisible") is not True:
        errors.append("in-page sidebar host must be visible")
    if "sidepanel.html" not in str(snapshot.get("frameSrc", "")):
        errors.append("in-page iframe must load sidepanel.html")
    if frame.get("hasRoot") is not True:
        errors.append("Navia root must render inside the iframe")
    for shot in report.get("screenshots", []):
        path = report_path.parent / str(shot.get("screenshotPath", ""))
        if not path.exists():
            errors.append(f"screenshot missing: {path}")
    if errors:
        print("V1 closeout validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("V1 closeout validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

