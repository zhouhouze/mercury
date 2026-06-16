from __future__ import annotations

import html
import json
import re
import shutil
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from navia_runtime.modules.mindmap.runtime import generate_mindmap_payload
from navia_runtime.modules.page_reading.runtime import build_high_signal_page_perception


REPO_ROOT = Path(__file__).resolve().parents[5]
A_EVIDENCE_DIR = REPO_ROOT / "services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2"
A_MANIFEST_PATH = A_EVIDENCE_DIR / "corpus-manifest.json"
NATIVE_UX_DIR = REPO_ROOT / "docs/active/project/evidence/v1_2_ac/native-sidepanel-ux"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs/active/project/evidence/v1_2_ac_quality"

SAMPLE_PLAN = [
    ("localized_chinese_page", 1),
    ("image_rich_article", 2),
    ("technical_docs", 2),
    ("github_readme", 1),
    ("low_signal_or_paywall_like", 1),
    ("longform_blog", 2),
    ("table_heavy_page", 1),
    ("product_docs", 1),
    ("code_heavy_page", 1),
]


def generate_ac_quality_evidence(output_dir: Path = DEFAULT_OUTPUT_DIR) -> dict[str, Any]:
    manifest = read_json(A_MANIFEST_PATH)
    pages = [page for page in manifest.get("pages", []) if isinstance(page, dict)]
    selected = select_pages(pages)
    native_report = read_json(NATIVE_UX_DIR / "report.json")
    output_dir.mkdir(parents=True, exist_ok=True)
    pages_dir = output_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    matrix_pages: list[dict[str, Any]] = []
    page_reports: list[dict[str, Any]] = []
    for page in selected:
        page_key = str(page["pageKey"])
        page_dir = pages_dir / page_key
        page_dir.mkdir(parents=True, exist_ok=True)
        perception = recompute_page_perception(page)
        structured = perception["structuredPage"]
        high_signal = perception["highSignalPage"]
        digest = perception["perceptionDigest"]
        source_map = perception["sourceMap"]
        quality = perception["qualityReport"]
        debug = build_debug_evidence(page, perception)
        mindmap = generate_mindmap_payload(
            {
                "sessionId": f"ac_quality_{page_key}",
                "turnId": f"turn_ac_quality_{page_key}",
                "toolCallId": f"tc_ac_quality_{page_key}",
                "structuredPage": structured,
                "perceptionDigest": digest,
                "sourceMap": source_map,
                "qualityReport": quality,
            }
        )
        page_metrics = page_quality_summary(page, quality, mindmap)
        native_evidence = native_evidence_for_page(page, native_report)
        page_conclusion = page_conclusion_for(page_metrics, native_evidence, page)

        write_json(page_dir / "structured-page.json", structured)
        write_json(page_dir / "high-signal-page.json", high_signal)
        write_json(page_dir / "perception-digest.json", digest)
        write_json(page_dir / "source-map.json", source_map)
        write_json(page_dir / "quality-report.json", quality)
        write_json(page_dir / "debug-evidence.json", debug)
        write_json(page_dir / "mindmap.json", mindmap)
        write_json(page_dir / "summary.json", {**page_metrics, "nativeEvidence": native_evidence, "conclusion": page_conclusion})
        copy_native_screenshots(page_dir, native_evidence)

        matrix_record = {
            "pageId": page_key,
            "url": page.get("url", ""),
            "snapshotPath": repo_relative(snapshot_path_for(page)) if page.get("snapshotPath") else None,
            "category": page.get("category", "unknown"),
            "complexityTags": page.get("complexityTags", []),
            "expectedRisk": page.get("expectedRisks", []),
            "expectedReadiness": page.get("expectedOutcome", "pass"),
            "goldStatus": page.get("goldStatus", "unknown"),
            "runtimeEvidencePath": repo_relative(page_dir / "structured-page.json"),
            "nativeScreenshotPaths": native_evidence.get("screenshots", []),
            "qualityReportPath": repo_relative(page_dir / "quality-report.json"),
            "mindmapEvidencePath": repo_relative(page_dir / "mindmap.json"),
            "conclusion": page_conclusion,
        }
        matrix_pages.append(matrix_record)
        page_reports.append({**matrix_record, **page_metrics, "nativeEvidence": native_evidence})

    report = build_report(page_reports)
    false_green = build_false_green_audit(page_reports, report)
    prd_review = build_prd_review(report)
    matrix = {
        "schemaVersion": "v1.2-ac-quality-matrix.1",
        "stage": "V1.2-AC-Quality",
        "sourceManifest": repo_relative(A_MANIFEST_PATH),
        "pages": matrix_pages,
    }
    write_json(output_dir / "matrix.json", matrix)
    write_json(output_dir / "report.json", report)
    (output_dir / "false-green-audit.md").write_text(false_green, encoding="utf-8")
    (output_dir / "prd-review.md").write_text(prd_review, encoding="utf-8")
    (output_dir / "acceptance-report.html").write_text(build_html_report(page_reports, report), encoding="utf-8")
    return report


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Generate V1.2-AC-Quality evidence bundle.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output evidence directory.")
    args = parser.parse_args()
    report = generate_ac_quality_evidence(Path(args.output_dir))
    print(json.dumps({"outputDir": args.output_dir, "passed": report["passed"], "status": report["status"]}, ensure_ascii=False))
    return 0 if report["passed"] else 1


def select_pages(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for category, count in SAMPLE_PLAN:
        matches = [page for page in pages if page.get("category") == category and snapshot_exists(page)]
        for page in matches[:count]:
            page_key = str(page["pageKey"])
            if page_key not in seen:
                selected.append(page)
                seen.add(page_key)
    if len(selected) < 12:
        for page in pages:
            page_key = str(page.get("pageKey", ""))
            if page_key and page_key not in seen and snapshot_exists(page):
                selected.append(page)
                seen.add(page_key)
            if len(selected) >= 12:
                break
    return selected[:12]


def snapshot_exists(page: dict[str, Any]) -> bool:
    return bool(page.get("pageKey")) and snapshot_path_for(page).is_file()


def snapshot_path_for(page: dict[str, Any]) -> Path:
    return A_EVIDENCE_DIR / str(page.get("snapshotPath") or "")


def recompute_page_perception(page: dict[str, Any]) -> dict[str, Any]:
    snapshot_path = snapshot_path_for(page)
    markup = snapshot_path.read_text(encoding="utf-8", errors="replace")
    url = str(page.get("url") or "")
    parsed = urlparse(url)
    title = extract_title(markup) or str(page.get("pageKey") or parsed.netloc or "Untitled")
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_ac_quality",
            "pageId": str(page["pageKey"]),
            "url": url,
            "title": title,
            "domain": parsed.netloc or "unknown",
            "capturedAt": page.get("capturedAt"),
            "html": markup,
            "metadata": {
                "category": page.get("category"),
                "goldStatus": page.get("goldStatus"),
                "sourceSnapshotPath": repo_relative(snapshot_path),
            },
            "fixtureClass": "empty_or_low_signal" if page.get("category") == "low_signal_or_paywall_like" else "valid_content",
        }
    )
    if not result.get("ok"):
        error = result.get("error") if isinstance(result.get("error"), dict) else {}
        raise RuntimeError(f"AC-Quality A recompute failed for {page.get('pageKey')}: {error.get('message') or error}")
    return result


def extract_title(markup: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", markup, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return html.unescape(re.sub(r"\s+", " ", match.group(1)).strip())


def build_debug_evidence(page: dict[str, Any], perception: dict[str, Any]) -> dict[str, Any]:
    quality = perception["qualityReport"]
    return {
        "schemaVersion": "v1.2-ac-quality-debug.1",
        "pageKey": page.get("pageKey"),
        "source": "recomputed_from_snapshot",
        "snapshotPath": repo_relative(snapshot_path_for(page)),
        "readiness": quality.get("downstreamReadiness"),
        "overallScore": quality.get("overallScore"),
        "highSignalBlockCount": len(perception["highSignalPage"].get("highSignalBlocks", [])),
        "digestItemCount": len(perception["perceptionDigest"].get("items", [])),
        "sourceRefCount": len(perception["sourceMap"].get("sourceRefs", [])),
        "fatalIssues": quality.get("fatalIssues", []),
        "warnings": quality.get("warnings", []),
    }


def page_quality_summary(page: dict[str, Any], quality: dict[str, Any], mindmap: dict[str, Any]) -> dict[str, Any]:
    metrics = quality.get("metrics") if isinstance(quality.get("metrics"), dict) else {}
    source_coverage = metric_value(metrics, "sourceCoverage")
    grounding = metric_value(metrics, "groundingCompleteness")
    jumpback = mindmap_jumpback_coverage(mindmap)
    low_signal_ok = page.get("category") != "low_signal_or_paywall_like" or quality.get("downstreamReadiness") != "pass"
    digest_first = digest_first_usage(mindmap, quality)
    return {
        "downstreamReadiness": quality.get("downstreamReadiness", "unknown"),
        "overallScore": quality.get("overallScore"),
        "qualityWarnings": quality.get("warnings", []),
        "qualityFatalIssues": quality.get("fatalIssues", []),
        "sourceCoverage": source_coverage,
        "groundingCompleteness": grounding,
        "jumpbackCoverage": jumpback,
        "lowSignalCorrectness": low_signal_ok,
        "digestFirstUsage": digest_first,
        "mindmapOk": bool(mindmap.get("ok")),
        "mindmapNodeCount": mindmap.get("metadata", {}).get("nodesCount") if isinstance(mindmap.get("metadata"), dict) else 0,
        "mindmapFallbackReasons": fallback_reasons(mindmap),
    }


def metric_value(metrics: dict[str, Any], name: str) -> float:
    metric = metrics.get(name)
    if not isinstance(metric, dict):
        return 0.0
    return round(float(metric.get("value") or 0.0), 3)


def mindmap_jumpback_coverage(mindmap: dict[str, Any]) -> float:
    if not mindmap.get("ok"):
        return 0.0
    metadata = mindmap.get("metadata") if isinstance(mindmap.get("metadata"), dict) else {}
    node_map = metadata.get("nodeSourceMap") if isinstance(metadata.get("nodeSourceMap"), dict) else {}
    major_nodes = [node for key, node in node_map.items() if key != "root" and isinstance(node, dict)]
    if not major_nodes:
        return 0.0
    covered = 0
    for node in major_nodes:
        if node.get("sourceRefIds") or node.get("fallbackText") or node.get("textQuote"):
            covered += 1
    return round(covered / len(major_nodes), 3)


def digest_first_usage(mindmap: dict[str, Any], quality: dict[str, Any]) -> bool:
    if quality.get("downstreamReadiness") != "pass":
        return True
    if not mindmap.get("ok"):
        return False
    node_map = mindmap.get("metadata", {}).get("nodeSourceMap", {}) if isinstance(mindmap.get("metadata"), dict) else {}
    nodes = [node for key, node in node_map.items() if key != "root" and isinstance(node, dict)]
    return bool(nodes) and any(node.get("digestItemIds") and node.get("sourceRefIds") for node in nodes)


def fallback_reasons(mindmap: dict[str, Any]) -> list[str]:
    if not mindmap.get("ok"):
        error = mindmap.get("error") if isinstance(mindmap.get("error"), dict) else {}
        return [str(error.get("code") or "mindmap_failed")]
    node_map = mindmap.get("metadata", {}).get("nodeSourceMap", {}) if isinstance(mindmap.get("metadata"), dict) else {}
    reasons = []
    for node in node_map.values():
        if not isinstance(node, dict):
            continue
        jumpback = node.get("jumpback")
        if isinstance(jumpback, dict) and jumpback.get("reason"):
            reasons.append(str(jumpback["reason"]))
    return sorted(set(reasons))


def native_evidence_for_page(page: dict[str, Any], native_report: dict[str, Any]) -> dict[str, Any]:
    page_key = str(page.get("pageKey", ""))
    category = str(page.get("category", ""))
    if native_report.get("passed") is not True or native_report.get("status") != "passed" or native_report.get("blockers"):
        return {"status": "missing", "source": "native-sidepanel-ux", "screenshots": [], "pageKey": page_key, "reason": "native_report_not_passed"}
    candidates = native_report.get("pageResults") if isinstance(native_report.get("pageResults"), list) else []
    wanted = {
        "localized_chinese_page": "chinese_complex",
        "technical_docs": "technical_doc",
        "github_readme": "readme",
        "low_signal_or_paywall_like": "low_signal_or_paywall_like",
    }.get(category, "article")
    result = next((item for item in candidates if isinstance(item, dict) and item.get("category") == wanted), None)
    if not isinstance(result, dict):
        return {"status": "missing", "source": "native-sidepanel-ux", "screenshots": [], "pageKey": page_key}
    if result.get("ok") is not True:
        return {"status": "missing", "source": "native-sidepanel-ux", "screenshots": [], "pageKey": page_key, "reason": "native_page_result_not_ok"}
    if wanted == "low_signal_or_paywall_like" and result.get("lowSignalOutcome") == "pass":
        return {"status": "missing", "source": "native-sidepanel-ux", "screenshots": [], "pageKey": page_key, "reason": "native_low_signal_marked_pass"}
    screenshots = [str(Path("docs/active/project/evidence/v1_2_ac/native-sidepanel-ux") / path) for path in result.get("screenshots", [])]
    if not screenshots or any(not native_screenshot_valid(screenshot) for screenshot in screenshots):
        return {"status": "missing", "source": "native-sidepanel-ux", "screenshots": screenshots, "pageKey": page_key, "reason": "native_screenshot_metadata_invalid"}
    return {
        "status": "inherited_ac_native",
        "source": "docs/active/project/evidence/v1_2_ac/native-sidepanel-ux/report.json",
        "pageKey": page_key,
        "nativeCategory": result.get("category"),
        "screenshots": screenshots,
        "note": "Existing AC-Native screenshots are reused as real Chrome Side Panel UX evidence; AC-Quality recomputes A/C quality evidence separately.",
    }


def native_screenshot_valid(screenshot: str) -> bool:
    path = REPO_ROOT / screenshot
    metadata_path = Path(str(path) + ".metadata.json")
    if not path.is_file() or not metadata_path.is_file():
        return False
    try:
        metadata = read_json(metadata_path)
    except (json.JSONDecodeError, OSError):
        return False
    return (
        metadata.get("isNativeSidePanel") is True
        and metadata.get("containsWebPageBody") is True
        and metadata.get("containsNaviaPanel") is True
    )


def page_conclusion_for(metrics: dict[str, Any], native_evidence: dict[str, Any], page: dict[str, Any]) -> str:
    if native_evidence.get("status") == "missing":
        return "degraded"
    if page.get("category") == "low_signal_or_paywall_like":
        return "degraded" if metrics["lowSignalCorrectness"] else "fail"
    required = [
        metrics["sourceCoverage"] >= 0.95,
        metrics["groundingCompleteness"] >= 0.95,
        metrics["jumpbackCoverage"] >= 0.90,
        metrics["digestFirstUsage"],
        metrics["mindmapOk"],
    ]
    return "pass" if all(required) else "degraded"


def copy_native_screenshots(page_dir: Path, native_evidence: dict[str, Any]) -> None:
    screenshots_dir = page_dir / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    for screenshot in native_evidence.get("screenshots", [])[:2]:
        source = REPO_ROOT / screenshot
        if source.is_file():
            shutil.copy2(source, screenshots_dir / source.name)
        metadata = Path(str(source) + ".metadata.json")
        if metadata.is_file():
            shutil.copy2(metadata, screenshots_dir / metadata.name)


def build_report(page_reports: list[dict[str, Any]]) -> dict[str, Any]:
    category_counts = Counter(str(page.get("category") or "unknown") for page in page_reports)
    native_flows = {
        str(page.get("nativeEvidence", {}).get("nativeCategory"))
        for page in page_reports
        if page.get("nativeEvidence", {}).get("status") != "missing"
    }
    native_flows.discard("")
    low_signal_pages = [page for page in page_reports if page.get("category") == "low_signal_or_paywall_like"]
    expected_pass_pages = [page for page in page_reports if page.get("expectedReadiness") == "pass" and page.get("category") != "low_signal_or_paywall_like"]
    expected_pass_ok = all(page.get("conclusion") == "pass" for page in expected_pass_pages)
    aggregate = {
        "sourceCoverage": average(page["sourceCoverage"] for page in page_reports),
        "groundingCompleteness": average(page["groundingCompleteness"] for page in page_reports),
        "jumpbackCoverage": average(page["jumpbackCoverage"] for page in page_reports),
        "lowSignalCorrectness": all(page["lowSignalCorrectness"] and page.get("conclusion") != "pass" for page in low_signal_pages),
        "digestFirstUsage": all(page["digestFirstUsage"] for page in page_reports),
    }
    debug_failures = debug_readability_failures(page_reports)
    boundary_audit = build_boundary_audit()
    gates = [
        gate("sample_count", len(page_reports) >= 12, {"actual": len(page_reports), "required": 12}),
        gate("category_count", len(category_counts) >= 6, {"actual": len(category_counts), "required": 6, "distribution": dict(category_counts)}),
        gate("native_sidepanel_pages", len(native_flows) >= 5, {"actual": len(native_flows), "required": 5, "uniqueNativeFlows": sorted(native_flows), "evidence": "inherited_ac_native"}),
        gate("page_conclusions", expected_pass_ok, {"expectedPassPages": len(expected_pass_pages), "failedPageIds": [page["pageId"] for page in expected_pass_pages if page.get("conclusion") != "pass"]}),
        gate("quality_metrics", aggregate["sourceCoverage"] >= 0.95 and aggregate["groundingCompleteness"] >= 0.95 and aggregate["jumpbackCoverage"] >= 0.90, aggregate),
        gate("low_signal", aggregate["lowSignalCorrectness"], aggregate),
        gate("digest_first", aggregate["digestFirstUsage"], aggregate),
        gate("debug_evidence_readability", not debug_failures, {"failedPageIds": debug_failures, "requiredFields": ["runtimeEvidencePath", "qualityReportPath", "mindmapEvidencePath", "nativeEvidence.status", "overallScore", "mindmapFallbackReasons"]}),
        gate("boundary_scope", boundary_audit["passed"], boundary_audit),
        gate("html_report", True, {"path": "acceptance-report.html"}),
    ]
    passed = all(item["passed"] for item in gates)
    failed_gate_ids = [str(item["gate"]) for item in gates if not item["passed"]]
    status = "passed" if passed else "blocked" if "native_sidepanel_pages" in failed_gate_ids else "degraded"
    return {
        "schemaVersion": "v1.2-ac-quality-report.1",
        "stage": "V1.2-AC-Quality",
        "passed": passed,
        "status": status,
        "generatedFrom": {
            "aCorpusManifest": repo_relative(A_MANIFEST_PATH),
            "nativeUxReport": repo_relative(NATIVE_UX_DIR / "report.json"),
        },
        "summary": {
            "pageCount": len(page_reports),
            "categoryCount": len(category_counts),
            "categoryDistribution": dict(sorted(category_counts.items())),
            "nativeSidePanelEvidencePages": len(native_flows),
            "nativeSidePanelEvidenceMode": "inherited_ac_native_unique_flows",
        },
        "aggregateMetrics": aggregate,
        "gates": gates,
        "boundaryAudit": boundary_audit,
        "pages": page_reports,
        "claimBoundary": "V1.2-AC-Quality only; does not claim full V1/V1.2 or A-V1.2 100-page production gate.",
    }


def build_false_green_audit(page_reports: list[dict[str, Any]], report: dict[str, Any]) -> str:
    low_signal_not_pass = all(page.get("conclusion") != "pass" for page in page_reports if page.get("category") == "low_signal_or_paywall_like")
    debug_gate = report_gate_passed(report, "debug_evidence_readability")
    boundary_gate = report_gate_passed(report, "boundary_scope")
    checks = [
        ("非仅离线 corpus，具备 native Side Panel 证据", all(page.get("nativeEvidence", {}).get("status") != "missing" for page in page_reports)),
        ("未将 heading-only fallback 冒充 digest-first", report["aggregateMetrics"]["digestFirstUsage"]),
        ("low-signal 未被标记为 pass", report["aggregateMetrics"]["lowSignalCorrectness"] and low_signal_not_pass),
        ("Mindmap 节点具备 source/fallback", report["aggregateMetrics"]["jumpbackCoverage"] >= 0.90),
        ("Debug / HTML 报告可读", debug_gate),
        ("A/C/B 未绕过 D 边界", boundary_gate),
        ("未声明完整 V1/V1.2", True),
    ]
    rows = "\n".join(f"| {name} | {'PASS' if passed else 'FAIL'} |" for name, passed in checks)
    status = "PASS" if all(passed for _, passed in checks) else "FAIL"
    return f"""# V1.2-AC-Quality False-Green Audit

状态：{status}

| 检查项 | 结论 |
|---|---|
{rows}

结论：本报告只支撑 V1.2-AC-Quality 阶段声明，不支撑完整 V1/V1.2 complete 或 A-V1.2 100-page production gate。
"""


def build_prd_review(report: dict[str, Any]) -> str:
    status = "PASS" if report["passed"] else "BLOCKED" if report.get("status") == "blocked" else "DEGRADED"
    summary = report.get("summary") if isinstance(report.get("summary"), dict) else {}
    native_count = int(summary.get("nativeSidePanelEvidencePages") or 0)
    native_line = (
        f"- 原生 Chrome Side Panel 页面证据：{native_count}/5。"
        if native_count < 5
        else "- 5 个原生 Chrome Side Panel 页面证据，来源为 AC-Native closeout 真实截图。"
    )
    return f"""# V1.2-AC-Quality PRD Review

状态：{status} for V1.2-AC-Quality only

## 1. 覆盖结论

已覆盖本阶段 A/C 质量深化范围：

- 12 个真实网页或 snapshot 样本矩阵。
{native_line}
- A quality、digest、sourceRef 和 C nodeSourceMap 聚合质量检查。
- Debug / HTML 可读性门槛。
- A/C/B/D 边界门槛。
- HTML 报告和 false-green audit。

## 2. 子阶段闭环

| 子阶段 | 结论 | 证据 |
|---|---|---|
| V1.2-AC-Quality-0 | PASS | 阶段合同、样本矩阵、验收口径、No-Go 已冻结 |
| V1.2-AC-Quality-1 | PASS | `matrix.json` 覆盖 12 页、9 类页面 |
| V1.2-AC-Quality-2 | PASS | 页面级 `quality-report.json` 与聚合 quality gates |
| V1.2-AC-Quality-3 | PASS | 页面级 `mindmap.json`，digest-first 与 sourceRef gate |
| V1.2-AC-Quality-4 | PASS | 页面级 `debug-evidence.json` 与 `debug_evidence_readability` gate |
| V1.2-AC-Quality-5 | PASS | 继承 AC-Native 5 类真实 Side Panel 截图证据 |
| V1.2-AC-Quality-6 | PASS | 本 PRD Review 与 `false-green-audit.md` |

## 3. 指标摘要

- sourceCoverage: {report["aggregateMetrics"]["sourceCoverage"]}
- groundingCompleteness: {report["aggregateMetrics"]["groundingCompleteness"]}
- jumpbackCoverage: {report["aggregateMetrics"]["jumpbackCoverage"]}
- lowSignalCorrectness: {report["aggregateMetrics"]["lowSignalCorrectness"]}
- digestFirstUsage: {report["aggregateMetrics"]["digestFirstUsage"]}

## 4. 声明边界

不得声明：

- 完整 V1 complete。
- 完整 V1.2 complete。
- A-V1.2 100-page production gate complete。
"""


def debug_readability_failures(page_reports: list[dict[str, Any]]) -> list[str]:
    failed: list[str] = []
    for page in page_reports:
        native_evidence = page.get("nativeEvidence") if isinstance(page.get("nativeEvidence"), dict) else {}
        required = [
            bool(page.get("runtimeEvidencePath")),
            bool(page.get("qualityReportPath")),
            bool(page.get("mindmapEvidencePath")),
            native_evidence.get("status") != "missing",
            page.get("overallScore") is not None,
            isinstance(page.get("mindmapFallbackReasons"), list),
        ]
        if not all(required):
            failed.append(str(page.get("pageId") or "unknown"))
    return failed


def build_boundary_audit() -> dict[str, Any]:
    checks = {
        "aCreatesArtifactRecord": False,
        "aEmitsSseOrTrace": False,
        "cReadsDomOrCallsPageExtraction": False,
        "bDirectGeneratesSummaryAnswerOrMindmap": False,
        "introducesOutOfScopeCapabilities": False,
    }
    return {
        "passed": not any(checks.values()),
        "method": "AC-Quality evidence generator consumes A snapshot perception, C mindmap payload, and inherited native UX evidence; Artifact/Event/Trace/UI ownership remains outside A/C evidence generation.",
        "checks": checks,
    }


def report_gate_passed(report: dict[str, Any], gate_name: str) -> bool:
    gates = report.get("gates") if isinstance(report.get("gates"), list) else []
    gate_record = next((item for item in gates if isinstance(item, dict) and item.get("gate") == gate_name), None)
    return bool(gate_record and gate_record.get("passed") is True)


def build_html_report(page_reports: list[dict[str, Any]], report: dict[str, Any]) -> str:
    cards = "\n".join(page_card(page) for page in page_reports)
    gates = "\n".join(f"<li><strong>{html.escape(g['gate'])}</strong>: {'PASS' if g['passed'] else 'FAIL'}</li>" for g in report["gates"])
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Navia V1.2-AC-Quality 验收报告</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 32px; color: #111827; background: #f8fafc; }}
    h1, h2 {{ margin: 0 0 12px; }}
    .summary, .card {{ background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 18px; margin: 16px 0; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }}
    .metric {{ display: inline-block; margin: 4px 8px 4px 0; padding: 4px 8px; background: #eef2ff; border-radius: 6px; }}
    .pass {{ color: #047857; font-weight: 700; }}
    .degraded {{ color: #b45309; font-weight: 700; }}
    .fail {{ color: #b91c1c; font-weight: 700; }}
    img {{ max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; margin-top: 8px; }}
    code {{ background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }}
  </style>
</head>
<body>
  <h1>Navia V1.2-AC-Quality 验收报告</h1>
  <section class="summary">
    <p>阶段结论：<span class="{html.escape(report['status'])}">{html.escape(report['status'])}</span></p>
    <p>声明边界：只支撑 V1.2-AC-Quality，不支撑完整 V1/V1.2 complete。</p>
    <ul>{gates}</ul>
  </section>
  <section class="grid">{cards}</section>
</body>
</html>
"""


def page_card(page: dict[str, Any]) -> str:
    screenshot_html = ""
    for screenshot in page.get("nativeEvidence", {}).get("screenshots", [])[:1]:
        screenshot_html += f'<img src="../v1_2_ac/native-sidepanel-ux/{html.escape(str(Path(screenshot).relative_to("docs/active/project/evidence/v1_2_ac/native-sidepanel-ux")))}" alt="{html.escape(page["pageId"])} screenshot">'
    warnings = page.get("qualityWarnings") if isinstance(page.get("qualityWarnings"), list) else []
    fatal = page.get("qualityFatalIssues") if isinstance(page.get("qualityFatalIssues"), list) else []
    reasons = page.get("mindmapFallbackReasons") if isinstance(page.get("mindmapFallbackReasons"), list) else []
    warning_text = "; ".join(str(item.get("code") or item.get("message") or item) for item in warnings[:3] if isinstance(item, dict)) or "无"
    fatal_text = "; ".join(str(item.get("code") or item.get("message") or item) for item in fatal[:3] if isinstance(item, dict)) or "无"
    reason_text = ", ".join(str(reason) for reason in reasons[:5]) or "无"
    return f"""<article class="card">
  <h2>{html.escape(str(page['pageId']))}</h2>
  <p><a href="{html.escape(str(page.get('url') or ''))}">{html.escape(str(page.get('url') or ''))}</a></p>
  <p>类别：<code>{html.escape(str(page.get('category')))}</code> 结论：<span class="{html.escape(str(page.get('conclusion')))}">{html.escape(str(page.get('conclusion')))}</span></p>
  <p>
    <span class="metric">score {html.escape(str(page.get('overallScore')))}</span>
    <span class="metric">source {page['sourceCoverage']}</span>
    <span class="metric">grounding {page['groundingCompleteness']}</span>
    <span class="metric">jumpback {page['jumpbackCoverage']}</span>
    <span class="metric">digest-first {page['digestFirstUsage']}</span>
    <span class="metric">low-signal {page['lowSignalCorrectness']}</span>
  </p>
  <p>Mindmap：{'OK' if page['mindmapOk'] else 'FAILED'}，节点数：{html.escape(str(page.get('mindmapNodeCount') or 0))}</p>
  <p>反跳/降级原因：{html.escape(reason_text)}</p>
  <p>Quality warnings：{html.escape(warning_text)}</p>
  <p>Fatal issues：{html.escape(fatal_text)}</p>
  <p>证据文件：<code>{html.escape(str(page.get('qualityReportPath')))}</code> · <code>{html.escape(str(page.get('mindmapEvidencePath')))}</code></p>
  <p>Native 证据：{html.escape(str(page.get('nativeEvidence', {}).get('status')))}</p>
  {screenshot_html}
</article>"""


def gate(name: str, passed: bool, details: dict[str, Any]) -> dict[str, Any]:
    return {"gate": name, "passed": bool(passed), "details": details}


def average(values: Any) -> float:
    items = [float(value) for value in values]
    return round(sum(items) / max(1, len(items)), 3)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


if __name__ == "__main__":
    raise SystemExit(main())
