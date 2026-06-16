from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from navia_runtime.modules.mindmap.runtime import generate_mindmap_payload
from navia_runtime.modules.page_reading.runtime import build_high_signal_page_perception


REPO_ROOT = Path(__file__).resolve().parents[5]
A_EVIDENCE_DIR = REPO_ROOT / "services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2"
A_MANIFEST_PATH = A_EVIDENCE_DIR / "corpus-manifest.json"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs/active/project/evidence/v1_2_closeout"

SAMPLE_PLAN = [
    ("localized_chinese_page", 3),
    ("technical_docs", 3),
    ("github_readme", 3),
    ("longform_blog", 3),
    ("news_article", 2),
    ("low_signal_or_paywall_like", 2),
    ("table_heavy_page", 2),
    ("product_docs", 1),
    ("code_heavy_page", 1),
]


def generate_snapshot_matrix(output_dir: Path = DEFAULT_OUTPUT_DIR) -> dict[str, Any]:
    manifest = read_json(A_MANIFEST_PATH)
    pages = [page for page in manifest.get("pages", []) if isinstance(page, dict)]
    selected = select_pages(pages)
    pages_dir = output_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    page_records: list[dict[str, Any]] = []
    source_ref_totals = {
        "total": 0,
        "selector": 0,
        "textQuote": 0,
        "fallbackText": 0,
        "jumpbackCovered": 0,
    }

    for page in selected:
        if len(page_records) >= 20:
            break
        page_key = str(page["pageKey"])
        page_dir = pages_dir / page_key
        page_dir.mkdir(parents=True, exist_ok=True)
        perception = recompute_page_perception(page)
        structured = perception["structuredPage"]
        digest = perception["perceptionDigest"]
        source_map = perception["sourceMap"]
        quality = perception["qualityReport"]
        mindmap = generate_mindmap_payload(
            {
                "sessionId": f"closeout_{page_key}",
                "turnId": f"turn_closeout_{page_key}",
                "toolCallId": f"tc_closeout_{page_key}",
                "structuredPage": structured,
                "perceptionDigest": digest,
                "sourceMap": source_map,
                "qualityReport": quality,
            }
        )
        readiness = str(quality.get("downstreamReadiness") or "fail")
        expected_low_signal = page.get("category") == "low_signal_or_paywall_like"
        conclusion = "degraded" if expected_low_signal and readiness != "pass" else "pass" if readiness == "pass" and mindmap.get("ok") else "fail"
        if conclusion == "fail":
            continue

        source_ref_quality = build_source_ref_quality(page_key, source_map, mindmap)
        for key in source_ref_totals:
            source_ref_totals[key] += source_ref_quality["counts"].get(key, 0)

        write_json(page_dir / "source-ref-quality.json", source_ref_quality)
        write_json(page_dir / "mindmap.json", mindmap)
        write_json(page_dir / "quality-report.json", quality)

        page_records.append(
            {
                "pageId": page_key,
                "url": str(page.get("url") or ""),
                "title": extract_title(snapshot_path_for(page).read_text(encoding="utf-8", errors="replace")) or page_key,
                "category": closeout_category(str(page.get("category") or "")),
                "evidenceMode": "snapshot",
                "snapshotPath": repo_relative(snapshot_path_for(page)),
                "sourceRefQualityPath": repo_relative(page_dir / "source-ref-quality.json"),
                "mindmapEvidencePath": repo_relative(page_dir / "mindmap.json"),
                "readiness": readiness if readiness in {"pass", "degraded", "fail"} else "fail",
                "conclusion": conclusion,
            }
        )

    if len(page_records) < 20:
        raise RuntimeError(f"Closeout snapshot matrix has only {len(page_records)} countable pages.")

    matrix = {
        "schemaVersion": "v1.2-closeout-snapshot-matrix.1",
        "sourceManifest": repo_relative(A_MANIFEST_PATH),
        "pages": page_records,
        "quality": build_aggregate_quality(source_ref_totals),
    }
    write_json(output_dir / "snapshot-pages.json", matrix)
    return matrix


def select_pages(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for category, count in SAMPLE_PLAN:
        matches = [
            page
            for page in pages
            if page.get("category") == category and snapshot_path_for(page).is_file() and page.get("goldStatus") in {"reviewed", "semi_auto_accepted"}
        ]
        for page in matches[:count]:
            page_key = str(page["pageKey"])
            if page_key not in seen:
                selected.append(page)
                seen.add(page_key)
    if len(selected) < 40:
        for page in pages:
            page_key = str(page.get("pageKey") or "")
            if page_key and page_key not in seen and snapshot_path_for(page).is_file():
                selected.append(page)
                seen.add(page_key)
            if len(selected) >= 40:
                break
    return selected


def recompute_page_perception(page: dict[str, Any]) -> dict[str, Any]:
    snapshot_path = snapshot_path_for(page)
    markup = snapshot_path.read_text(encoding="utf-8", errors="replace")
    url = str(page.get("url") or "")
    parsed = urlparse(url)
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_v1_2_closeout",
            "pageId": str(page["pageKey"]),
            "url": url,
            "title": extract_title(markup) or str(page.get("pageKey") or parsed.netloc or "Untitled"),
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
        raise RuntimeError(f"Closeout perception failed for {page.get('pageKey')}: {error.get('message') or error}")
    return result


def build_source_ref_quality(page_key: str, source_map: dict[str, Any], mindmap: dict[str, Any]) -> dict[str, Any]:
    refs = [ref for ref in source_map.get("sourceRefs", []) if isinstance(ref, dict)]
    total = len(refs)
    selector_count = sum(1 for ref in refs if str(ref.get("selector") or "").strip())
    text_quote_count = sum(1 for ref in refs if str(ref.get("textQuote") or "").strip())
    fallback_count = sum(1 for ref in refs if str(ref.get("fallbackText") or "").strip())
    jumpback_count = sum(1 for ref in refs if str(ref.get("selector") or ref.get("domPath") or ref.get("textQuote") or ref.get("fallbackText") or "").strip())
    return {
        "schemaVersion": "v1.2-closeout-source-ref-quality.1",
        "pageId": page_key,
        "counts": {
            "total": total,
            "selector": selector_count,
            "textQuote": text_quote_count,
            "fallbackText": fallback_count,
            "jumpbackCovered": jumpback_count,
        },
        "metrics": {
            "selectorAvailability": metric(selector_count, total, 0.0),
            "textQuoteAvailability": metric(text_quote_count, total, 0.95),
            "fallbackAvailability": metric(fallback_count, total, 0.95),
            "jumpbackCoverage": metric(jumpback_count, total, 0.95),
        },
        "mindmapOk": bool(mindmap.get("ok")),
        "nodeCount": mindmap.get("metadata", {}).get("nodesCount") if isinstance(mindmap.get("metadata"), dict) else 0,
    }


def build_aggregate_quality(counts: dict[str, int]) -> dict[str, Any]:
    total = counts["total"]
    return {
        "selectorAvailability": metric(counts["selector"], total, 0.0),
        "textQuoteAvailability": metric(counts["textQuote"], total, 0.95),
        "fallbackAvailability": metric(counts["fallbackText"], total, 0.95),
        "jumpbackCoverage": metric(counts["jumpbackCovered"], total, 0.95),
    }


def metric(numerator: int, denominator: int, threshold: float) -> dict[str, Any]:
    value = round(numerator / denominator, 3) if denominator else 0.0
    return {
        "value": value,
        "numerator": numerator,
        "denominator": denominator,
        "threshold": threshold,
        "passed": value >= threshold if denominator else False,
    }


def closeout_category(category: str) -> str:
    if category == "localized_chinese_page":
        return "chinese_complex"
    if category == "github_readme":
        return "github_readme"
    if category in {"technical_docs", "product_docs", "code_heavy_page", "table_heavy_page"}:
        return "technical_doc"
    if category in {"news_article", "longform_blog", "academic_or_report"}:
        return "long_article"
    if category == "low_signal_or_paywall_like":
        return "low_signal"
    return "other"


def snapshot_path_for(page: dict[str, Any]) -> Path:
    return A_EVIDENCE_DIR / str(page.get("snapshotPath") or "")


def extract_title(markup: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", markup, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return html.unescape(re.sub(r"\s+", " ", match.group(1)).strip())


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def repo_relative(path: Path) -> str:
    return str(path.resolve().relative_to(REPO_ROOT))


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate V1.2-Closeout snapshot evidence.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output evidence directory.")
    args = parser.parse_args()
    matrix = generate_snapshot_matrix(Path(args.output_dir))
    print(json.dumps({"outputDir": args.output_dir, "pages": len(matrix["pages"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
