from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from navia_runtime.modules.page_reading import eval_corpus


def test_corpus_stage_passes_manifest_snapshot_and_gold_gates(tmp_path: Path, monkeypatch: Any) -> None:
    patch_small_gates(monkeypatch)
    manifest_path = write_manifest(tmp_path)

    report = eval_corpus.evaluate_corpus(manifest_path, stage="corpus")

    assert report["passed"] is True
    assert report["summary"]["totalPages"] == 3
    assert report["summary"]["finalCountedPages"] == 3
    assert not report["failedGates"]


def test_exit_stage_passes_with_required_evidence_files(tmp_path: Path, monkeypatch: Any) -> None:
    patch_small_gates(monkeypatch)
    manifest_path = write_manifest(tmp_path)
    write_success_evidence(tmp_path, "news_001")
    write_success_evidence(tmp_path, "docs_001")
    (tmp_path / "low_001.error.json").write_text(json.dumps({"error": {"code": "PAGE_CONTEXT_REQUIRED"}}), encoding="utf-8")

    report = eval_corpus.evaluate_corpus(manifest_path, stage="exit")

    assert report["passed"] is True
    assert not report["failedGates"]


def test_cli_writes_report_and_exits_nonzero_on_missing_snapshots(tmp_path: Path, monkeypatch: Any) -> None:
    patch_small_gates(monkeypatch)
    manifest_path = tmp_path / "corpus-manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "schemaVersion": "a-v1.2-corpus-manifest-2026-06-08",
                "pages": [
                    corpus_record("news_001", "news_article", "missing/news_001.html"),
                    corpus_record("docs_001", "technical_docs", "missing/docs_001.html"),
                    corpus_record("low_001", "low_signal_or_paywall_like", "missing/low_001.html", expected_outcome="fail"),
                ],
            }
        ),
        encoding="utf-8",
    )
    output_path = tmp_path / "corpus-level-report.json"

    exit_code = eval_corpus.main(["--manifest", str(manifest_path), "--output", str(output_path), "--stage", "corpus"])

    assert exit_code == 1
    report = json.loads(output_path.read_text(encoding="utf-8"))
    assert report["passed"] is False
    assert any(gate["gate"] == "snapshot_reproducibility" for gate in report["failedGates"])


def patch_small_gates(monkeypatch: Any) -> None:
    monkeypatch.setattr(eval_corpus, "REQUIRED_TOTAL_PAGES", 3)
    monkeypatch.setattr(eval_corpus, "REQUIRED_CATEGORY_COUNT", 2)
    monkeypatch.setattr(eval_corpus, "CORE_CATEGORIES", {"news_article", "technical_docs"})
    monkeypatch.setattr(eval_corpus, "CORE_CATEGORY_MINIMUM", 1)


def write_manifest(base_dir: Path) -> Path:
    snapshot_dir = base_dir / "snapshots"
    snapshot_dir.mkdir()
    for page_key in ["news_001", "docs_001", "low_001"]:
        (snapshot_dir / f"{page_key}.html").write_text(f"<html><title>{page_key}</title><p>Real captured page snapshot.</p></html>", encoding="utf-8")
    manifest_path = base_dir / "corpus-manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "schemaVersion": "a-v1.2-corpus-manifest-2026-06-08",
                "pages": [
                    corpus_record("news_001", "news_article", "snapshots/news_001.html"),
                    corpus_record("docs_001", "technical_docs", "snapshots/docs_001.html"),
                    corpus_record("low_001", "low_signal_or_paywall_like", "snapshots/low_001.html", expected_outcome="fail"),
                ],
            }
        ),
        encoding="utf-8",
    )
    return manifest_path


def corpus_record(page_key: str, category: str, snapshot_path: str, *, expected_outcome: str = "pass") -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-corpus-page-2026-06-05",
        "pageKey": page_key,
        "url": f"https://corpus.example/{page_key}",
        "snapshotPath": snapshot_path,
        "category": category,
        "language": "en",
        "complexityTags": ["longform"],
        "expectedRisks": ["noise_filtering"],
        "goldStatus": "reviewed",
        "allowedNetworkAtCapture": True,
        "capturedAt": "2026-06-08T00:00:00Z",
        "sourceLicenseNote": "test fixture",
        "expectedOutcome": expected_outcome,
    }


def write_success_evidence(base_dir: Path, page_key: str) -> None:
    for suffix in ["structured-page", "high-signal-page", "source-map", "perception-digest"]:
        (base_dir / f"{page_key}.{suffix}.json").write_text("{}", encoding="utf-8")
    (base_dir / f"{page_key}.quality-report.json").write_text(json.dumps(quality_report()), encoding="utf-8")
    (base_dir / f"{page_key}.debug-evidence.json").write_text(
        json.dumps({"statusReason": "All gates passed.", "auditTrail": [{"step": "quality", "status": "pass"}]}),
        encoding="utf-8",
    )


def quality_report() -> dict[str, Any]:
    return {
        "downstreamReadiness": "pass",
        "metrics": {
            "sourceCoverage": metric(1.0),
            "groundingCompleteness": metric(1.0),
            "jumpbackCoverage": metric(1.0),
        },
    }


def metric(value: float) -> dict[str, Any]:
    return {
        "value": value,
        "numerator": 1,
        "denominator": 1,
        "method": "test",
        "threshold": 0.95,
        "passed": True,
    }
