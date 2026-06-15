from __future__ import annotations

import json

from navia_runtime.modules.ac_quality.evidence import build_report, generate_ac_quality_evidence, native_evidence_for_page


def test_ac_quality_evidence_bundle_has_required_gates(tmp_path) -> None:
    report = generate_ac_quality_evidence(tmp_path)

    assert report["stage"] == "V1.2-AC-Quality"
    assert report["summary"]["pageCount"] >= 12
    assert report["summary"]["categoryCount"] >= 6
    assert report["aggregateMetrics"]["sourceCoverage"] >= 0.95
    assert report["aggregateMetrics"]["groundingCompleteness"] >= 0.95
    assert report["aggregateMetrics"]["jumpbackCoverage"] >= 0.90
    assert report["aggregateMetrics"]["lowSignalCorrectness"] is True
    assert report["aggregateMetrics"]["digestFirstUsage"] is True
    if report["summary"]["nativeSidePanelEvidencePages"] >= 5:
        assert report["passed"] is True
        assert all(gate["passed"] for gate in report["gates"])
    else:
        assert report["passed"] is False
        assert report["status"] == "blocked"
        native_gate = next(gate for gate in report["gates"] if gate["gate"] == "native_sidepanel_pages")
        assert native_gate["passed"] is False

    matrix = json.loads((tmp_path / "matrix.json").read_text(encoding="utf-8"))
    assert len(matrix["pages"]) == report["summary"]["pageCount"]
    assert all(page["runtimeEvidencePath"] for page in matrix["pages"])
    assert all(page["qualityReportPath"] for page in matrix["pages"])
    assert all(page["mindmapEvidencePath"] for page in matrix["pages"])

    assert (tmp_path / "report.json").is_file()
    assert (tmp_path / "acceptance-report.html").is_file()
    assert (tmp_path / "false-green-audit.md").is_file()
    assert (tmp_path / "prd-review.md").is_file()
    assert "完整 V1.2 complete" in (tmp_path / "prd-review.md").read_text(encoding="utf-8")


def test_ac_quality_page_evidence_contains_mindmap_and_quality(tmp_path) -> None:
    report = generate_ac_quality_evidence(tmp_path)
    first_page = report["pages"][0]["pageId"]
    page_dir = tmp_path / "pages" / first_page

    quality = json.loads((page_dir / "quality-report.json").read_text(encoding="utf-8"))
    debug = json.loads((page_dir / "debug-evidence.json").read_text(encoding="utf-8"))
    mindmap = json.loads((page_dir / "mindmap.json").read_text(encoding="utf-8"))
    summary = json.loads((page_dir / "summary.json").read_text(encoding="utf-8"))

    assert quality["metrics"]["sourceCoverage"]["value"] >= 0.95
    assert debug["source"] == "recomputed_from_snapshot"
    assert mindmap["ok"] is True
    assert mindmap["metadata"]["nodeSourceMap"]
    assert summary["nativeEvidence"]["status"] in {"inherited_ac_native", "missing"}
    if summary["nativeEvidence"]["status"] == "missing":
        assert summary["conclusion"] == "degraded"
    else:
        assert summary["conclusion"] in {"pass", "degraded"}


def test_failed_native_report_is_not_counted_as_sidepanel_evidence() -> None:
    page = {"pageKey": "p1", "category": "technical_docs"}
    native_report = {
        "passed": False,
        "status": "blocked",
        "blockers": ["blockers/native_blocker.json"],
        "pageResults": [{"ok": True, "category": "technical_doc", "screenshots": ["screenshots/a.png"]}],
    }

    evidence = native_evidence_for_page(page, native_report)

    assert evidence["status"] == "missing"
    assert evidence["reason"] == "native_report_not_passed"


def test_degraded_expected_pass_page_blocks_ac_quality_report() -> None:
    page_reports = []
    categories = [
        "article",
        "technical_docs",
        "github_readme",
        "localized_chinese_page",
        "image_rich_article",
        "product_docs",
        "table_heavy_page",
        "longform_blog",
        "code_heavy_page",
        "low_signal_or_paywall_like",
        "article",
        "technical_docs",
    ]
    native_categories = ["article", "technical_doc", "readme", "chinese_complex", "low_signal_or_paywall_like"]
    for index, category in enumerate(categories):
        page_reports.append(
            {
                "pageId": f"page_{index}",
                "category": category,
                "expectedReadiness": "pass",
                "conclusion": "degraded" if index == 0 else "degraded" if category == "low_signal_or_paywall_like" else "pass",
                "sourceCoverage": 1.0,
                "groundingCompleteness": 1.0,
                "jumpbackCoverage": 1.0,
                "lowSignalCorrectness": True,
                "digestFirstUsage": True,
                "nativeEvidence": {
                    "status": "inherited_ac_native",
                    "nativeCategory": native_categories[index % len(native_categories)],
                },
            }
        )

    report = build_report(page_reports)
    page_conclusion_gate = next(gate for gate in report["gates"] if gate["gate"] == "page_conclusions")

    assert report["passed"] is False
    assert page_conclusion_gate["passed"] is False
    assert "page_0" in page_conclusion_gate["details"]["failedPageIds"]
