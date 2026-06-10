from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


SCHEMA_PATH = Path(__file__).resolve().parents[5] / "docs/active/project/contracts/a_v1_2_page_perception.schema.json"
CORE_CATEGORY_MINIMUM = 8
REQUIRED_TOTAL_PAGES = 100
REQUIRED_CATEGORY_COUNT = 10
LOW_SIGNAL_CATEGORY = "low_signal_or_paywall_like"
CORE_CATEGORIES = {
    "news_article",
    "longform_blog",
    "technical_docs",
    "github_readme",
    "product_docs",
    "ecommerce_product",
    "forum_thread",
    "academic_or_report",
    "table_heavy_page",
    "code_heavy_page",
    "image_rich_article",
    "localized_chinese_page",
}
REQUIRED_EVIDENCE_SUFFIXES = [
    "structured-page",
    "high-signal-page",
    "source-map",
    "perception-digest",
    "quality-report",
    "debug-evidence",
]


@dataclass
class GateResult:
    gate: str
    passed: bool
    message: str
    details: dict[str, Any]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate A-V1.2 page perception corpus evidence.")
    parser.add_argument("--manifest", required=True, help="Path to corpus-manifest.json")
    parser.add_argument("--output", required=True, help="Path to corpus-level-report.json")
    parser.add_argument(
        "--stage",
        choices=["corpus", "exit"],
        default="exit",
        help="corpus checks A-V1.2-1 gates only; exit checks A-V1.2-8 evidence gates.",
    )
    args = parser.parse_args(argv)

    manifest_path = Path(args.manifest)
    output_path = Path(args.output)
    report = evaluate_corpus(manifest_path, stage=args.stage)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    return 0 if report["passed"] else 1


def evaluate_corpus(manifest_path: Path, *, stage: str = "exit") -> dict[str, Any]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    pages = manifest.get("pages")
    if not isinstance(pages, list):
        pages = []
    base_dir = manifest_path.parent
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)

    gates: list[GateResult] = []
    gates.extend(validate_manifest_records(pages, validator))
    gates.extend(validate_corpus_distribution(pages))
    gates.extend(validate_snapshot_and_gold(pages, base_dir))
    if stage == "exit":
        gates.extend(validate_exit_evidence(pages, base_dir))

    category_distribution = Counter(str(page.get("category") or "unknown") for page in pages if isinstance(page, dict))
    final_counted_pages = [page for page in pages if is_final_counted_page(page, base_dir)]
    failed_gates = [gate for gate in gates if not gate.passed]
    return {
        "schemaVersion": "a-v1.2-corpus-level-report-2026-06-08",
        "stage": stage,
        "manifestPath": str(manifest_path),
        "passed": not failed_gates,
        "summary": {
            "totalPages": len(pages),
            "finalCountedPages": len(final_counted_pages),
            "categoryCount": len(category_distribution),
            "categoryDistribution": dict(sorted(category_distribution.items())),
        },
        "gates": [gate.__dict__ for gate in gates],
        "failedGates": [gate.__dict__ for gate in failed_gates],
    }


def validate_manifest_records(pages: list[Any], validator: Draft202012Validator) -> list[GateResult]:
    invalid_records: list[dict[str, Any]] = []
    for index, page in enumerate(pages):
        if not isinstance(page, dict):
            invalid_records.append({"index": index, "errors": ["record is not an object"]})
            continue
        errors = sorted(validator.iter_errors(page), key=lambda error: list(error.path))
        if errors:
            invalid_records.append(
                {
                    "pageKey": page.get("pageKey", f"index_{index}"),
                    "errors": [error.message for error in errors],
                }
            )
    return [
        GateResult(
            gate="manifest_schema",
            passed=not invalid_records,
            message="Every page record validates as CorpusPageRecord.",
            details={"invalidRecords": invalid_records[:20], "invalidRecordCount": len(invalid_records)},
        )
    ]


def validate_corpus_distribution(pages: list[Any]) -> list[GateResult]:
    records = [page for page in pages if isinstance(page, dict)]
    category_distribution = Counter(str(page.get("category") or "unknown") for page in records)
    core_failures = {
        category: category_distribution.get(category, 0)
        for category in sorted(CORE_CATEGORIES)
        if category_distribution.get(category, 0) < CORE_CATEGORY_MINIMUM
    }
    return [
        GateResult(
            gate="total_pages",
            passed=len(records) >= REQUIRED_TOTAL_PAGES,
            message=f"Corpus has at least {REQUIRED_TOTAL_PAGES} page records.",
            details={"actual": len(records), "required": REQUIRED_TOTAL_PAGES},
        ),
        GateResult(
            gate="category_count",
            passed=len(category_distribution) >= REQUIRED_CATEGORY_COUNT,
            message=f"Corpus covers at least {REQUIRED_CATEGORY_COUNT} categories.",
            details={"actual": len(category_distribution), "required": REQUIRED_CATEGORY_COUNT, "distribution": dict(sorted(category_distribution.items()))},
        ),
        GateResult(
            gate="core_category_minimum",
            passed=not core_failures,
            message=f"Each core category has at least {CORE_CATEGORY_MINIMUM} pages.",
            details={"minimum": CORE_CATEGORY_MINIMUM, "failures": core_failures},
        ),
    ]


def validate_snapshot_and_gold(pages: list[Any], base_dir: Path) -> list[GateResult]:
    missing_snapshots: list[str] = []
    invalid_gold: list[str] = []
    low_signal_pass: list[str] = []
    for page in pages:
        if not isinstance(page, dict):
            continue
        page_key = str(page.get("pageKey") or "unknown")
        snapshot_path = resolve_path(base_dir, str(page.get("snapshotPath") or ""))
        if not snapshot_path.is_file():
            missing_snapshots.append(page_key)
        if page.get("goldStatus") not in {"reviewed", "semi_auto_accepted"}:
            invalid_gold.append(page_key)
        if page.get("category") == LOW_SIGNAL_CATEGORY and page.get("expectedOutcome") == "pass":
            low_signal_pass.append(page_key)
    return [
        GateResult(
            gate="snapshot_reproducibility",
            passed=not missing_snapshots,
            message="Every final counted page has a stored reproducible HTML snapshot.",
            details={"missingSnapshots": missing_snapshots[:50], "missingSnapshotCount": len(missing_snapshots)},
        ),
        GateResult(
            gate="gold_review",
            passed=not invalid_gold,
            message="Every final counted page has reviewed or semi-auto-accepted gold status.",
            details={"invalidGoldPages": invalid_gold[:50], "invalidGoldCount": len(invalid_gold)},
        ),
        GateResult(
            gate="low_signal_expected_outcome",
            passed=not low_signal_pass,
            message="Low-signal pages must not be expected to pass.",
            details={"lowSignalPassPages": low_signal_pass[:50], "lowSignalPassCount": len(low_signal_pass)},
        ),
    ]


def validate_exit_evidence(pages: list[Any], base_dir: Path) -> list[GateResult]:
    missing_evidence: dict[str, list[str]] = {}
    quality_failures: dict[str, list[str]] = defaultdict(list)
    for page in pages:
        if not isinstance(page, dict):
            continue
        page_key = str(page.get("pageKey") or "unknown")
        if page.get("expectedOutcome") == "fail":
            error_path = base_dir / f"{page_key}.error.json"
            if not error_path.is_file():
                missing_evidence[page_key] = [f"{page_key}.error.json"]
            continue
        expected_files = [base_dir / f"{page_key}.{suffix}.json" for suffix in REQUIRED_EVIDENCE_SUFFIXES]
        missing = [path.name for path in expected_files if not path.is_file()]
        if missing:
            missing_evidence[page_key] = missing
            continue
        quality_payload = read_json(base_dir / f"{page_key}.quality-report.json")
        debug_payload = read_json(base_dir / f"{page_key}.debug-evidence.json")
        quality_failures[page_key].extend(validate_quality_payload(quality_payload, page))
        quality_failures[page_key].extend(validate_debug_payload(debug_payload))

    quality_failures = {key: value for key, value in quality_failures.items() if value}
    return [
        GateResult(
            gate="required_evidence_files",
            passed=not missing_evidence,
            message="Every non-fail page has required evidence files, and fail pages have error evidence.",
            details={"missingEvidence": dict(list(missing_evidence.items())[:50]), "missingEvidenceCount": len(missing_evidence)},
        ),
        GateResult(
            gate="quality_and_debug_evidence",
            passed=not quality_failures,
            message="Quality and Debug evidence satisfy source, grounding, jumpback, low-signal, and explanation gates.",
            details={"qualityFailures": dict(list(quality_failures.items())[:50]), "qualityFailureCount": len(quality_failures)},
        ),
    ]


def validate_quality_payload(payload: dict[str, Any], page: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    metrics = payload.get("metrics") if isinstance(payload, dict) else None
    if not isinstance(metrics, dict):
        return ["quality report missing metrics"]
    thresholds = {
        "sourceCoverage": 0.95,
        "groundingCompleteness": 0.95,
        "jumpbackCoverage": 0.90,
    }
    for metric_name, threshold in thresholds.items():
        metric = metrics.get(metric_name)
        if not isinstance(metric, dict):
            failures.append(f"missing {metric_name}")
            continue
        value = float(metric.get("value") or 0)
        if value < threshold:
            failures.append(f"{metric_name} {value} < {threshold}")
        for required_key in ["numerator", "denominator", "method", "threshold", "passed"]:
            if required_key not in metric:
                failures.append(f"{metric_name} missing {required_key}")
    if page.get("category") == LOW_SIGNAL_CATEGORY and payload.get("downstreamReadiness") == "pass":
        failures.append("low-signal page passed")
    return failures


def validate_debug_payload(payload: dict[str, Any]) -> list[str]:
    if not isinstance(payload, dict):
        return ["debug evidence is not an object"]
    failures = []
    if not payload.get("statusReason"):
        failures.append("debug evidence missing statusReason")
    audit_trail = payload.get("auditTrail")
    if not isinstance(audit_trail, list) or not audit_trail:
        failures.append("debug evidence missing auditTrail")
    return failures


def is_final_counted_page(page: Any, base_dir: Path) -> bool:
    if not isinstance(page, dict):
        return False
    if page.get("goldStatus") not in {"reviewed", "semi_auto_accepted"}:
        return False
    return resolve_path(base_dir, str(page.get("snapshotPath") or "")).is_file()


def resolve_path(base_dir: Path, value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return base_dir / path


def read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


if __name__ == "__main__":
    sys.exit(main())
