#!/usr/bin/env python3
"""Validate V1.3 Evidence Card Mindmap evidence.

This script intentionally checks both JSON Schema shape and stage-specific
semantics that JSON Schema cannot express.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCHEMA = REPO_ROOT / "docs/active/project/contracts/v1_3_evidence_card_mindmap.schema.json"
DEFAULT_REPORT = REPO_ROOT / "docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def schema_validator(schema: dict[str, Any], ref: str | None = None) -> Draft202012Validator:
    target = schema
    if ref:
        target = schema
        for part in ref.strip("/").split("/"):
            target = target[part]
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(target)


def collect_schema_errors(validator: Draft202012Validator, payload: Any) -> list[str]:
    errors = sorted(validator.iter_errors(payload), key=lambda error: list(error.path))
    messages: list[str] = []
    for error in errors:
        location = "/" + "/".join(str(part) for part in error.path) if error.path else "<root>"
        messages.append(f"{location}: {error.message}")
    return messages


def validate_report_semantics(report: dict[str, Any], report_path: Path) -> list[str]:
    errors: list[str] = []
    summary = report.get("summary", {})
    screenshots = report.get("screenshots", [])
    pages = report.get("pages", [])

    if report.get("passed") is True:
        if report.get("fatalIssues"):
            errors.append("passed=true but fatalIssues is not empty")
        if report.get("majorIssues"):
            errors.append("passed=true but majorIssues is not empty")
        if report.get("claim") != "V1.3 Evidence Card Mindmap experience complete":
            errors.append("passed=true requires the V1.3 complete claim")
    elif "complete" in str(report.get("claim", "")).lower():
        errors.append("passed=false must not use a completion claim")

    pages_total = int(summary.get("pagesTotal", 0))
    pages_passed = int(summary.get("pagesPassed", 0))
    if pages_passed > pages_total:
        errors.append("summary.pagesPassed is greater than summary.pagesTotal")
    if pages_total != len(pages):
        errors.append(f"summary.pagesTotal={pages_total} does not match pages length={len(pages)}")
    if pages_passed < 8:
        errors.append("summary.pagesPassed must be at least 8 for V1.3 exit")

    qualifying_native = [
        screenshot
        for screenshot in screenshots
        if screenshot.get("isNativeSidePanel") is True
        and screenshot.get("containsWebPageBody") is True
        and screenshot.get("containsNaviaPanel") is True
        and screenshot.get("containsEvidenceCardMindmap") is True
        and screenshot.get("containsSourcePanel") is True
        and screenshot.get("sourceEvidenceVisible") is True
        and bool(str(screenshot.get("sourceEvidenceText", "")).strip())
    ]
    native_samples = int(summary.get("nativeSidePanelSamples", 0))
    if native_samples > len(qualifying_native):
        errors.append(
            "summary.nativeSidePanelSamples exceeds screenshots with native side panel, web page body, Navia panel, Evidence Card Mindmap, and visible source evidence text"
        )
    if native_samples < 3:
        errors.append("summary.nativeSidePanelSamples must be at least 3 for V1.3 exit")

    sampled_pages = [page for page in pages if page.get("visualEvidenceStatus") != "not_sampled"]
    if sampled_pages and native_samples > len(sampled_pages) + len(qualifying_native):
        errors.append("native sample accounting is inconsistent with sampled pages and screenshot evidence")

    if int(summary.get("fallbackSamples", 0)) < 1:
        errors.append("summary.fallbackSamples must be at least 1")
    if int(summary.get("evidenceCardSamples", 0)) < 3:
        errors.append("summary.evidenceCardSamples must be at least 3")

    for screenshot in screenshots:
        if screenshot.get("containsSourcePanel") is True and (
            screenshot.get("sourceEvidenceVisible") is not True or not str(screenshot.get("sourceEvidenceText", "")).strip()
        ):
            errors.append(f"screenshot claims source panel but lacks visible source evidence text: {screenshot.get('screenshotPath')}")
        metadata_path = screenshot.get("metadataPath")
        if metadata_path:
            resolved = report_path.parent / metadata_path
            if not resolved.exists():
                errors.append(f"screenshot metadata is missing: {metadata_path}")
        screenshot_path = screenshot.get("screenshotPath")
        if screenshot_path:
            resolved = report_path.parent / screenshot_path
            if not resolved.exists():
                errors.append(f"screenshot file is missing: {screenshot_path}")

    return errors


def validate_view_model_fixture(schema: dict[str, Any], fixture_path: Path) -> list[str]:
    fixture = load_json(fixture_path)
    view_model_schema = {
        "$schema": schema.get("$schema", "https://json-schema.org/draft/2020-12/schema"),
        "$id": f"{schema.get('$id', 'navia.v1_3.evidence_card_mindmap')}.view_model_fixture",
        "$ref": "#/$defs/EvidenceCardViewModel",
        "$defs": schema.get("$defs", {}),
    }
    validator = schema_validator(view_model_schema)
    return collect_schema_errors(validator, fixture)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(DEFAULT_SCHEMA), help="Path to V1.3 schema")
    parser.add_argument("--report", default=str(DEFAULT_REPORT), help="Path to V1.3 report")
    parser.add_argument("--view-model-fixture", action="append", default=[], help="EvidenceCardViewModel fixture JSON to validate")
    args = parser.parse_args()

    schema_path = Path(args.schema)
    report_path = Path(args.report)
    schema = load_json(schema_path)
    report = load_json(report_path)

    errors: list[str] = []
    report_validator = schema_validator(schema)
    errors.extend(collect_schema_errors(report_validator, report))
    errors.extend(validate_report_semantics(report, report_path))

    for fixture in args.view_model_fixture:
        errors.extend(f"{fixture}: {message}" for message in validate_view_model_fixture(schema, Path(fixture)))

    if errors:
        print("V1.3 evidence validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("V1.3 evidence validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
