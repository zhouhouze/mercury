from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[6]
EVIDENCE_DIR = Path(__file__).resolve().parent / "evidence" / "a_v1_2"
REPORT_DIR = ROOT / "docs" / "navia_v1_project_docs" / "evidence" / "a_v1_2_acceptance"
SCREENSHOT_DIR = REPORT_DIR / "screenshots"
ALL_SCREENSHOT_DIR = SCREENSHOT_DIR / "all"
REPORT_PATH = REPORT_DIR / "a-v1.2-human-acceptance-report.html"
GALLERY_PATH = REPORT_DIR / "a-v1.2-107-page-gallery.html"
GALLERY_REVIEW_PATH = REPORT_DIR / "a-v1.2-107-page-gallery-review.json"
CHINESE_VISUAL_DIR = REPORT_DIR / "chinese-visual"
CHINESE_VISUAL_REPORT_PATH = CHINESE_VISUAL_DIR / "chinese-visual-capture-report.json"
CHINESE_VISUAL_HTML_PATH = REPORT_DIR / "a-v1.2-chinese-visual-supplement.html"

SAMPLES = [
    ("news_001_go_loopvar_preview", "新闻/博客长文"),
    ("tech_002_python_tutorial_intro", "技术文档"),
    ("github_007_fastapi_fastapi", "GitHub README"),
    ("product_001_book_light_attic", "商品页"),
    ("image_001_go_image_draw", "图文页"),
    ("zh_002_python_tutorial_intro", "中文页面"),
    ("low_001_example_com", "低信号页"),
]


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    ALL_SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    corpus_report = read_json(EVIDENCE_DIR / "corpus-level-report.json")
    generation_report = read_json(EVIDENCE_DIR / "corpus-evidence-generation-report.json")
    capture_report = read_json(EVIDENCE_DIR / "capture-report.json")
    manifest = read_json(EVIDENCE_DIR / "corpus-manifest.json")

    samples = [build_sample(page_key, label) for page_key, label in SAMPLES]
    pages = [build_page_record(page) for page in manifest["pages"]]
    review = build_gallery_review(pages)
    chinese_visual_report = read_json(CHINESE_VISUAL_REPORT_PATH) if CHINESE_VISUAL_REPORT_PATH.is_file() else None
    REPORT_PATH.write_text(
        render_html(corpus_report, generation_report, capture_report, manifest, samples, review, chinese_visual_report),
        encoding="utf-8",
    )
    GALLERY_PATH.write_text(render_gallery_html(corpus_report, pages, review), encoding="utf-8")
    GALLERY_REVIEW_PATH.write_text(json.dumps(review, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    if chinese_visual_report:
        CHINESE_VISUAL_HTML_PATH.write_text(render_chinese_visual_html(chinese_visual_report), encoding="utf-8")
    print(REPORT_PATH)
    print(GALLERY_PATH)
    if chinese_visual_report:
        print(CHINESE_VISUAL_HTML_PATH)
    return 0


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_sample(page_key: str, label: str) -> dict[str, Any]:
    manifest = read_json(EVIDENCE_DIR / "corpus-manifest.json")
    page = next((item for item in manifest["pages"] if item["pageKey"] == page_key), {})
    quality = read_json(EVIDENCE_DIR / f"{page_key}.quality-report.json")
    digest = read_json(EVIDENCE_DIR / f"{page_key}.perception-digest.json")
    source_map = read_json(EVIDENCE_DIR / f"{page_key}.source-map.json")
    high_signal = read_json(EVIDENCE_DIR / f"{page_key}.high-signal-page.json")
    debug = read_json(EVIDENCE_DIR / f"{page_key}.debug-evidence.json")
    items = digest.get("items", [])[:3]
    metrics = quality.get("metrics", {})
    return {
        "pageKey": page_key,
        "label": label,
        "url": page.get("url", ""),
        "category": page.get("category", ""),
        "expectedOutcome": page.get("expectedOutcome", ""),
        "status": quality.get("downstreamReadiness", quality.get("status", "unknown")),
        "overallScore": quality.get("overallScore", 0),
        "sourceRefs": len(source_map.get("sourceRefs", [])),
        "digestItems": len(digest.get("items", [])),
        "highSignalBlocks": len(high_signal.get("highSignalBlocks", [])),
        "filteredBlocks": len(high_signal.get("filteredBlocks", [])),
        "statusReason": debug.get("statusReason", ""),
        "metrics": {
            "sourceCoverage": metrics.get("sourceCoverage", {}).get("value", 0),
            "groundingCompleteness": metrics.get("groundingCompleteness", {}).get("value", 0),
            "jumpbackCoverage": metrics.get("jumpbackCoverage", {}).get("value", 0),
            "noiseRatio": metrics.get("noiseRatio", {}).get("value", 0),
        },
        "items": [
            {
                "kind": item.get("kind", ""),
                "text": item.get("text", ""),
                "sourceCount": len(item.get("sourceRefs", [])),
            }
            for item in items
        ],
        "screenshot": f"screenshots/{page_key}.png",
    }


def build_page_record(page: dict[str, Any]) -> dict[str, Any]:
    page_key = page["pageKey"]
    quality = read_json(EVIDENCE_DIR / f"{page_key}.quality-report.json")
    digest = read_json(EVIDENCE_DIR / f"{page_key}.perception-digest.json")
    source_map = read_json(EVIDENCE_DIR / f"{page_key}.source-map.json")
    high_signal = read_json(EVIDENCE_DIR / f"{page_key}.high-signal-page.json")
    debug = read_json(EVIDENCE_DIR / f"{page_key}.debug-evidence.json")
    metrics = quality.get("metrics", {})
    screenshot_path = ALL_SCREENSHOT_DIR / f"{page_key}.png"
    digest_items = digest.get("items", [])
    return {
        "pageKey": page_key,
        "url": page.get("url", ""),
        "snapshotPath": page.get("snapshotPath", ""),
        "category": page.get("category", ""),
        "language": page.get("language", ""),
        "expectedOutcome": page.get("expectedOutcome", ""),
        "goldStatus": page.get("goldStatus", ""),
        "status": quality.get("downstreamReadiness", quality.get("status", "unknown")),
        "overallScore": quality.get("overallScore", 0),
        "sourceRefs": len(source_map.get("sourceRefs", [])),
        "digestItems": len(digest_items),
        "highSignalBlocks": len(high_signal.get("highSignalBlocks", [])),
        "filteredBlocks": len(high_signal.get("filteredBlocks", [])),
        "statusReason": debug.get("statusReason", ""),
        "metrics": {
            "sourceCoverage": metrics.get("sourceCoverage", {}).get("value", 0),
            "groundingCompleteness": metrics.get("groundingCompleteness", {}).get("value", 0),
            "jumpbackCoverage": metrics.get("jumpbackCoverage", {}).get("value", 0),
            "noiseRatio": metrics.get("noiseRatio", {}).get("value", 0),
        },
        "topDigest": [
            {
                "kind": item.get("kind", ""),
                "text": item.get("text", ""),
                "sourceCount": len(item.get("sourceRefs", [])),
            }
            for item in digest_items[:2]
        ],
        "screenshot": f"screenshots/all/{page_key}.png",
        "screenshotExists": screenshot_path.is_file(),
        "screenshotBytes": screenshot_path.stat().st_size if screenshot_path.is_file() else 0,
    }


def build_gallery_review(pages: list[dict[str, Any]]) -> dict[str, Any]:
    missing_screenshots = [page["pageKey"] for page in pages if not page["screenshotExists"]]
    small_screenshots = [page["pageKey"] for page in pages if page["screenshotExists"] and page["screenshotBytes"] < 1000]
    missing_links = [page["pageKey"] for page in pages if not page["url"]]
    low_signal_pass = [
        page["pageKey"]
        for page in pages
        if page["category"] == "low_signal_or_paywall_like" and page["status"] == "pass"
    ]
    expected_pass_failed = [
        page["pageKey"]
        for page in pages
        if page["category"] != "low_signal_or_paywall_like"
        and page["expectedOutcome"] == "pass"
        and page["status"] == "fail"
    ]
    expected_pass_degraded = [
        page["pageKey"]
        for page in pages
        if page["category"] != "low_signal_or_paywall_like"
        and page["expectedOutcome"] == "pass"
        and page["status"] == "degraded"
    ]
    missing_result = [page["pageKey"] for page in pages if page["status"] not in {"pass", "degraded", "fail"}]
    failed = missing_screenshots or small_screenshots or missing_links or low_signal_pass or expected_pass_failed or missing_result
    return {
        "schemaVersion": "a-v1.2-gallery-review-2026-06-09",
        "passed": not failed,
        "pageCount": len(pages),
        "screenshotCount": len([page for page in pages if page["screenshotExists"]]),
        "missingScreenshots": missing_screenshots,
        "smallScreenshots": small_screenshots,
        "missingLinks": missing_links,
        "lowSignalPass": low_signal_pass,
        "expectedPassFailed": expected_pass_failed,
        "expectedPassDegraded": expected_pass_degraded,
        "missingResult": missing_result,
        "method": "Checks every counted corpus page has a screenshot, source URL, A result status, and low-signal pages are not marked pass. Non-low-signal degraded pages are listed as review warnings, not hidden.",
    }


def render_html(
    corpus_report: dict[str, Any],
    generation_report: dict[str, Any],
    capture_report: dict[str, Any],
    manifest: dict[str, Any],
    samples: list[dict[str, Any]],
    review: dict[str, Any],
    chinese_visual_report: dict[str, Any] | None,
) -> str:
    summary = corpus_report["summary"]
    distribution = summary["categoryDistribution"]
    gates = corpus_report["gates"]
    pages = manifest["pages"]
    snapshot_count = sum(1 for page in pages if (EVIDENCE_DIR / page["snapshotPath"]).is_file())
    final_pass = "通过" if corpus_report.get("passed") else "未通过"
    review_pass = "通过" if review.get("passed") else "未通过"
    chinese_visual_status = "未生成"
    chinese_visual_detail = "尚未生成中文复杂站点视觉补充。"
    chinese_visual_link = ""
    if chinese_visual_report:
        chinese_visual_passed = (
            chinese_visual_report.get("mustHaveBilibiliHomeVisual")
            and chinese_visual_report.get("mustHaveBilibiliVideoVisual")
            and chinese_visual_report.get("captured", 0) >= 4
        )
        chinese_visual_status = "通过" if chinese_visual_passed else "未通过"
        chinese_visual_detail = (
            f"已捕获 {chinese_visual_report.get('captured', 0)} / {chinese_visual_report.get('requested', 0)} 个中文复杂站点；"
            f"B站首页视觉门槛 {'通过' if chinese_visual_report.get('mustHaveBilibiliHomeVisual') else '未通过'}，"
            f"B站视频页视觉门槛 {'通过' if chinese_visual_report.get('mustHaveBilibiliVideoVisual') else '未通过'}。"
        )
        chinese_visual_link = '<p><a href="a-v1.2-chinese-visual-supplement.html">打开中文复杂站点视觉补充：B站首页、B站视频页、中文图文站点</a></p>'
    sample_html = "\n".join(render_sample(sample) for sample in samples)
    distribution_html = "\n".join(
        f"""
        <div class="bar-row">
          <span>{escape(category)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:{min(count / 12 * 100, 100):.1f}%"></div></div>
          <strong>{count}</strong>
        </div>
        """
        for category, count in distribution.items()
    )
    gate_html = "\n".join(
        f"""
        <div class="gate {'pass' if gate['passed'] else 'fail'}">
          <div class="gate-icon">{'✓' if gate['passed'] else '!'}</div>
          <div>
            <strong>{escape(gate['gate'])}</strong>
            <p>{escape(gate['message'])}</p>
          </div>
        </div>
        """
        for gate in gates
    )
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Navia A-V1.2 人类验收报告</title>
  <style>
    :root {{
      --ink: #172033;
      --muted: #657086;
      --line: #dfe5ee;
      --panel: #ffffff;
      --bg: #f6f8fb;
      --blue: #4f63ff;
      --green: #1f9d6a;
      --amber: #b7791f;
      --red: #c53030;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: var(--ink);
      background: var(--bg);
      line-height: 1.55;
    }}
    header {{
      padding: 44px 48px 28px;
      background: linear-gradient(135deg, #152238, #3543a4);
      color: white;
    }}
    header h1 {{ margin: 0 0 10px; font-size: 34px; letter-spacing: 0; }}
    header p {{ margin: 0; max-width: 980px; color: rgba(255,255,255,.84); font-size: 16px; }}
    main {{ padding: 28px 48px 56px; max-width: 1420px; margin: 0 auto; }}
    section {{ margin: 0 0 28px; }}
    h2 {{ font-size: 22px; margin: 0 0 14px; }}
    h3 {{ font-size: 16px; margin: 0 0 10px; }}
    .grid {{ display: grid; gap: 16px; }}
    .kpis {{ grid-template-columns: repeat(5, minmax(150px, 1fr)); }}
    .card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 10px 30px rgba(20, 32, 52, .06);
    }}
    .kpi .value {{ font-size: 30px; font-weight: 760; }}
    .kpi .label {{ color: var(--muted); font-size: 13px; }}
    .pass-text {{ color: var(--green); }}
    .warn-text {{ color: var(--amber); }}
    .two {{ grid-template-columns: 1.1fr .9fr; }}
    .bars {{ display: grid; gap: 9px; }}
    .bar-row {{ display: grid; grid-template-columns: 190px 1fr 36px; align-items: center; gap: 10px; font-size: 13px; }}
    .bar-track {{ height: 10px; border-radius: 999px; background: #edf1f7; overflow: hidden; }}
    .bar-fill {{ height: 100%; background: var(--blue); }}
    .gates {{ grid-template-columns: repeat(3, minmax(220px, 1fr)); }}
    .gate {{ display: flex; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: white; }}
    .gate strong {{ overflow-wrap: anywhere; word-break: break-word; }}
    .gate p {{ margin: 2px 0 0; color: var(--muted); font-size: 12px; }}
    .gate-icon {{ width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: white; font-weight: 800; flex: 0 0 auto; }}
    .gate.pass .gate-icon {{ background: var(--green); }}
    .gate.fail .gate-icon {{ background: var(--red); }}
    .samples {{ grid-template-columns: repeat(2, minmax(420px, 1fr)); }}
    .sample {{ overflow: hidden; padding: 0; }}
    .sample img {{ width: 100%; height: 220px; object-fit: cover; border-bottom: 1px solid var(--line); background: #edf1f7; display: block; }}
    .sample-body {{ padding: 16px; }}
    .meta {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }}
    .pill {{ border: 1px solid var(--line); border-radius: 999px; padding: 4px 8px; color: var(--muted); font-size: 12px; background: #fafcff; }}
    .metrics {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }}
    .metric {{ background: #f7f9fc; border-radius: 6px; padding: 8px; }}
    .metric strong {{ display: block; font-size: 15px; }}
    .metric span {{ color: var(--muted); font-size: 11px; }}
    ul {{ margin: 10px 0 0; padding-left: 18px; }}
    li {{ margin: 6px 0; }}
    code {{ background: #eef2f7; border-radius: 4px; padding: 1px 4px; }}
    .evidence-paths {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #334155; }}
    .footer-note {{ color: var(--muted); font-size: 13px; }}
    @media (max-width: 980px) {{
      header, main {{ padding-left: 20px; padding-right: 20px; }}
      .kpis, .two, .gates, .samples {{ grid-template-columns: 1fr; }}
      .bar-row {{ grid-template-columns: 1fr; gap: 4px; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>Navia A-V1.2 阶段验收报告</h1>
    <p>本报告用真实网页快照、结构化 JSON、质量门槛和截图样例展示 A 模块“高质量网页感知 + 结构化页面摘要 + 可反跳证据 + Debug 可验证 JSON”的完成情况。</p>
  </header>
  <main>
    <section class="grid kpis">
      <div class="card kpi"><div class="value pass-text">{final_pass}</div><div class="label">Corpus Exit Gate</div></div>
      <div class="card kpi"><div class="value">{summary['finalCountedPages']}</div><div class="label">真实快照计入页面</div></div>
      <div class="card kpi"><div class="value">{summary['categoryCount']}</div><div class="label">页面类别</div></div>
      <div class="card kpi"><div class="value">{generation_report['generated']}</div><div class="label">生成 evidence 页面</div></div>
      <div class="card kpi"><div class="value">{snapshot_count}</div><div class="label">可复现 HTML 快照</div></div>
    </section>

    <section class="card">
      <h2>107 个网页明细二级页</h2>
      <p><strong>截图复核：{review_pass}</strong>。已为 {review.get('screenshotCount', 0)} / {review.get('pageCount', 0)} 个验证网页生成截图，并逐条核对截图、链接、结果状态和低信号结论。另有 {len(review.get('expectedPassDegraded', []))} 个非低信号页面实际结果为 degraded，已在二级页逐条展示。</p>
      <p><a href="a-v1.2-107-page-gallery.html">打开 107 个网页逐项截图、链接与结果明细</a></p>
    </section>

    <section class="card">
      <h2>中文复杂站点视觉补充</h2>
      <p><strong>视觉补充：{chinese_visual_status}</strong>。{escape(chinese_visual_detail)}</p>
      <p class="footer-note">这部分使用真实浏览器页面截图，专门补足 B站首页、B站视频页以及中文图文复杂布局的用户视角证据；它不替换 107 页可复现 HTML corpus gate。</p>
      {chinese_visual_link}
    </section>

    <section class="grid two">
      <div class="card">
        <h2>验收结论</h2>
        <p><strong>A-V1.2 已完成本阶段确定性基线开发。</strong> 当前通过范围是 <code>dom_baseline + A-owned schema normalization + real snapshot corpus evidence</code>。</p>
        <p>这意味着 A 模块已经能在真实网页快照上稳定产出结构化页面、HighSignal、SourceMap、PerceptionDigest、QualityReport 与 DebugEvidence。</p>
        <p class="footer-note">不包含：第三方 extractor ensemble、OCR/VLM/ASR、视频/直播理解、最终回答、Mindmap、ArtifactRecord、SSE、EventStore、Trace、RAG、MCP、Skill 或外部 API 调用。</p>
      </div>
      <div class="card">
        <h2>采集与生成</h2>
        <div class="metrics">
          <div class="metric"><strong>{capture_report.get('requested', 0)}</strong><span>请求抓取</span></div>
          <div class="metric"><strong>{capture_report.get('freshCaptured', 0)}</strong><span>新抓取</span></div>
          <div class="metric"><strong>{capture_report.get('reusedSnapshots', 0)}</strong><span>复用快照</span></div>
          <div class="metric"><strong>{capture_report.get('failed', 0)}</strong><span>未计入失败</span></div>
        </div>
        <p class="footer-note">网络失败页面不计入最终验收；只有存在 <code>snapshotPath</code> 的页面才能被 corpus exit gate 计入。</p>
      </div>
    </section>

    <section class="grid two">
      <div class="card">
        <h2>页面类型覆盖</h2>
        <div class="bars">{distribution_html}</div>
      </div>
      <div class="card">
        <h2>验收门槛</h2>
        <div class="grid gates">{gate_html}</div>
      </div>
    </section>

    <section>
      <h2>截图证据与样例页面</h2>
      <div class="grid samples">{sample_html}</div>
    </section>

    <section class="card">
      <h2>证据文件</h2>
      <div class="evidence-paths">
        <p>services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json</p>
        <p>services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-level-report.json</p>
        <p>services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-evidence-generation-report.json</p>
        <p>docs/navia_v1_project_docs/evidence/a_v1_2_acceptance/a-v1.2-107-page-gallery.html</p>
        <p>docs/navia_v1_project_docs/evidence/a_v1_2_acceptance/a-v1.2-107-page-gallery-review.json</p>
        <p>docs/navia_v1_project_docs/evidence/a_v1_2_acceptance/a-v1.2-chinese-visual-supplement.html</p>
        <p>docs/navia_v1_project_docs/evidence/a_v1_2_acceptance/chinese-visual/chinese-visual-capture-report.json</p>
        <p>services/local-runtime/navia_runtime/modules/page_reading/docs/a-v1.2-2-8-final-acceptance-report.md</p>
      </div>
    </section>
  </main>
</body>
</html>
"""


def render_chinese_visual_html(report: dict[str, Any]) -> str:
    passed = (
        report.get("mustHaveBilibiliHomeVisual")
        and report.get("mustHaveBilibiliVideoVisual")
        and report.get("captured", 0) >= 4
    )
    cards = "\n".join(render_chinese_visual_card(index + 1, page) for index, page in enumerate(report.get("capturedPages", [])))
    failures = "\n".join(
        f"<li>{escape(item.get('label', item.get('pageKey', 'unknown')))} · {escape(item.get('error', ''))}</li>"
        for item in report.get("failures", [])
    )
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A-V1.2 中文复杂站点视觉补充</title>
  <style>
    :root {{
      --ink: #172033;
      --muted: #647084;
      --line: #dfe5ee;
      --bg: #f6f8fb;
      --panel: #fff;
      --green: #1f9d6a;
      --red: #c53030;
      --blue: #4f63ff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.55;
    }}
    header {{
      padding: 38px 44px 24px;
      background: #101a2e;
      color: white;
    }}
    header h1 {{ margin: 0 0 8px; font-size: 30px; }}
    header p {{ margin: 0; color: rgba(255,255,255,.82); max-width: 1050px; }}
    main {{ max-width: 1520px; margin: 0 auto; padding: 24px 44px 56px; }}
    a {{ color: #3347d6; text-decoration: none; }}
    .summary {{ display: grid; grid-template-columns: repeat(5, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }}
    .kpi, .card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 10px 26px rgba(20,32,52,.06);
    }}
    .kpi {{ padding: 16px; }}
    .kpi strong {{ display: block; font-size: 25px; color: {('#1f9d6a' if passed else '#c53030')}; }}
    .kpi span {{ color: var(--muted); font-size: 13px; }}
    .note {{ color: var(--muted); font-size: 13px; }}
    .pages {{ display: grid; grid-template-columns: repeat(2, minmax(560px, 1fr)); gap: 16px; }}
    .card {{ overflow: hidden; }}
    .shot {{ width: 100%; height: 440px; object-fit: contain; display: block; background: #f8fafc; border-bottom: 1px solid var(--line); }}
    .body {{ padding: 16px; }}
    h2 {{ margin: 0 0 8px; font-size: 18px; overflow-wrap: anywhere; }}
    .meta {{ display: flex; flex-wrap: wrap; gap: 7px; margin: 8px 0 11px; }}
    .pill {{ border: 1px solid var(--line); border-radius: 999px; padding: 3px 8px; font-size: 12px; color: var(--muted); background: #fafcff; }}
    .url {{ font-size: 12px; overflow-wrap: anywhere; }}
    .failures {{ margin-top: 18px; padding: 16px; }}
    @media (max-width: 1180px) {{
      header, main {{ padding-left: 18px; padding-right: 18px; }}
      .summary, .pages {{ grid-template-columns: 1fr; }}
      .shot {{ height: 300px; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>A-V1.2 中文复杂站点视觉补充</h1>
    <p>本页专门回应“B站首页、B站视频页面、复杂布局和中文内容多的图文网站”覆盖要求。截图来自本机真实浏览器页面渲染，用于用户视角复核；结构化验收仍以 107 页可复现 corpus gate 为准。</p>
  </header>
  <main>
    <section class="summary">
      <div class="kpi"><strong>{'通过' if passed else '未通过'}</strong><span>中文视觉补充</span></div>
      <div class="kpi"><strong>{report.get('captured', 0)} / {report.get('requested', 0)}</strong><span>捕获页面</span></div>
      <div class="kpi"><strong>{'通过' if report.get('mustHaveBilibiliHomeVisual') else '未通过'}</strong><span>B站首页</span></div>
      <div class="kpi"><strong>{'通过' if report.get('mustHaveBilibiliVideoVisual') else '未通过'}</strong><span>B站视频页</span></div>
      <div class="kpi"><strong>{report.get('failed', 0)}</strong><span>失败页面</span></div>
    </section>
    <p class="note"><a href="a-v1.2-human-acceptance-report.html">返回总览页</a> · 证据 JSON：<code>chinese-visual/chinese-visual-capture-report.json</code></p>
    <section class="pages">{cards}</section>
    <section class="card failures">
      <h2>失败项</h2>
      <ul>{failures or '<li>无</li>'}</ul>
    </section>
  </main>
</body>
</html>"""


def render_chinese_visual_card(index: int, page: dict[str, Any]) -> str:
    screenshot = f"chinese-visual/{page.get('screenshotPath', '')}"
    return f"""
      <article class="card">
        <img class="shot" src="{escape(screenshot)}" alt="{escape(page.get('label', page.get('pageKey', '')))} 实际页面截图" />
        <div class="body">
          <h2>{index:02d}. {escape(page.get('label', page.get('pageKey', '')))}</h2>
          <div class="meta">
            <span class="pill">{escape(page.get('category', ''))}</span>
            <span class="pill">textLength {escape(page.get('textLength', 0))}</span>
            <span class="pill">screenshot {escape(page.get('screenshotBytes', 0))} bytes</span>
            <span class="pill">{escape(page.get('status', ''))}</span>
          </div>
          <p class="url"><a href="{escape(page.get('url', ''))}">{escape(page.get('url', ''))}</a></p>
          <p><strong>页面标题：</strong>{escape(page.get('title', ''))}</p>
          <p class="note"><strong>验收要求：</strong>{escape(page.get('requirement', ''))}</p>
          <p class="note"><strong>快照：</strong>{escape(page.get('snapshotPath', ''))}</p>
        </div>
      </article>
    """


def render_gallery_html(corpus_report: dict[str, Any], pages: list[dict[str, Any]], review: dict[str, Any]) -> str:
    passed_text = "通过" if review.get("passed") else "未通过"
    cards = "\n".join(render_gallery_card(index + 1, page) for index, page in enumerate(pages))
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A-V1.2 107 个验证网页明细</title>
  <style>
    :root {{
      --ink: #172033;
      --muted: #647084;
      --line: #dfe5ee;
      --bg: #f6f8fb;
      --panel: #fff;
      --green: #1f9d6a;
      --amber: #b7791f;
      --blue: #4f63ff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.52;
    }}
    header {{
      padding: 36px 42px 24px;
      background: #172033;
      color: white;
    }}
    header h1 {{ margin: 0 0 8px; font-size: 30px; }}
    header p {{ margin: 0; color: rgba(255,255,255,.82); }}
    main {{ max-width: 1500px; margin: 0 auto; padding: 24px 42px 54px; }}
    a {{ color: #3347d6; text-decoration: none; }}
    .summary {{ display: grid; grid-template-columns: repeat(5, minmax(150px, 1fr)); gap: 14px; margin-bottom: 22px; }}
    .kpi, .page-card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 10px 26px rgba(20,32,52,.06);
    }}
    .kpi {{ padding: 16px; }}
    .kpi strong {{ display: block; font-size: 26px; }}
    .kpi span {{ color: var(--muted); font-size: 13px; }}
    .pages {{ display: grid; grid-template-columns: repeat(2, minmax(520px, 1fr)); gap: 16px; }}
    .page-card {{ overflow: hidden; display: grid; grid-template-columns: 320px 1fr; min-height: 280px; }}
    .page-shot {{ width: 100%; height: 100%; min-height: 280px; object-fit: contain; border-right: 1px solid var(--line); background: #f8fafc; }}
    .page-body {{ padding: 15px; min-width: 0; }}
    h2 {{ margin: 0 0 8px; font-size: 16px; overflow-wrap: anywhere; }}
    .meta {{ display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }}
    .pill {{ border: 1px solid var(--line); border-radius: 999px; padding: 3px 8px; font-size: 12px; color: var(--muted); background: #fafcff; }}
    .status-pass {{ color: var(--green); font-weight: 800; }}
    .status-degraded {{ color: var(--amber); font-weight: 800; }}
    .metrics {{ display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 7px; margin: 10px 0; }}
    .metric {{ background: #f7f9fc; border-radius: 6px; padding: 7px; }}
    .metric strong {{ display: block; font-size: 14px; }}
    .metric span {{ color: var(--muted); font-size: 11px; }}
    .url {{ font-size: 12px; overflow-wrap: anywhere; margin: 8px 0; }}
    ul {{ padding-left: 18px; margin: 8px 0 0; }}
    li {{ margin: 5px 0; font-size: 13px; }}
    .note {{ color: var(--muted); font-size: 12px; }}
    @media (max-width: 1100px) {{
      header, main {{ padding-left: 18px; padding-right: 18px; }}
      .summary, .pages {{ grid-template-columns: 1fr; }}
      .page-card {{ grid-template-columns: 1fr; }}
      .page-shot {{ height: 240px; border-right: 0; border-bottom: 1px solid var(--line); }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>A-V1.2 107 个验证网页明细</h1>
    <p>逐条展示真实网页截图、原始链接、A 模块结构化感知结果和关键验收指标。</p>
  </header>
  <main>
    <section class="summary">
      <div class="kpi"><strong>{passed_text}</strong><span>截图复核</span></div>
      <div class="kpi"><strong>{review.get('pageCount', 0)}</strong><span>验证网页</span></div>
      <div class="kpi"><strong>{review.get('screenshotCount', 0)}</strong><span>截图数量</span></div>
      <div class="kpi"><strong>{len(review.get('lowSignalPass', []))}</strong><span>低信号误判通过</span></div>
      <div class="kpi"><strong>{'通过' if corpus_report.get('passed') else '未通过'}</strong><span>Corpus Exit</span></div>
    </section>
    <p class="note"><a href="a-v1.2-human-acceptance-report.html">返回总览页</a> · 复核方法：每条记录必须有截图、链接、结果状态；低信号页面不得标记为 pass；非低信号 degraded 页面作为需关注项显示，不隐藏。</p>
    <p class="note">需关注 degraded 页面：{", ".join(escape(item) for item in review.get('expectedPassDegraded', [])) or "无"}</p>
    <section class="pages">{cards}</section>
  </main>
</body>
</html>"""


def render_gallery_card(index: int, page: dict[str, Any]) -> str:
    status_class = "status-pass" if page["status"] == "pass" else "status-degraded"
    metric_html = "\n".join(
        f"""<div class="metric"><strong>{float(value):.2f}</strong><span>{escape(name)}</span></div>"""
        for name, value in page["metrics"].items()
    )
    digest_html = "\n".join(
        f"""<li><strong>{escape(item['kind'])}</strong> · {escape(shorten(item['text'], 112))} <span class="pill">sourceRefs {item['sourceCount']}</span></li>"""
        for item in page["topDigest"]
    )
    return f"""
      <article class="page-card">
        <img class="page-shot" src="{escape(page['screenshot'])}" alt="{escape(page['pageKey'])} 实际网页截图" />
        <div class="page-body">
          <h2>{index:03d}. {escape(page['pageKey'])}</h2>
          <div class="meta">
            <span class="pill">{escape(page['category'])}</span>
            <span class="pill">语言 {escape(page['language'])}</span>
            <span class="pill">期望 {escape(page['expectedOutcome'])}</span>
            <span class="pill">结果 <span class="{status_class}">{escape(page['status'])}</span></span>
            <span class="pill">score {float(page['overallScore']):.2f}</span>
          </div>
          <p class="url"><a href="{escape(page['url'])}">{escape(page['url'])}</a></p>
          <div class="metrics">{metric_html}</div>
          <p class="note">HighSignal blocks {page['highSignalBlocks']} · filtered {page['filteredBlocks']} · digest {page['digestItems']} · sourceRefs {page['sourceRefs']} · screenshot {page['screenshotBytes']} bytes</p>
          <ul>{digest_html}</ul>
        </div>
      </article>
    """


def render_sample(sample: dict[str, Any]) -> str:
    metric_html = "\n".join(
        f"""<div class="metric"><strong>{float(value):.2f}</strong><span>{escape(name)}</span></div>"""
        for name, value in sample["metrics"].items()
    )
    items_html = "\n".join(
        f"""<li><strong>{escape(item['kind'])}</strong> · {escape(shorten(item['text'], 130))} <span class="pill">sourceRefs {item['sourceCount']}</span></li>"""
        for item in sample["items"]
    )
    return f"""
      <article class="card sample">
        <img src="{escape(sample['screenshot'])}" alt="{escape(sample['label'])} 截图" />
        <div class="sample-body">
          <h3>{escape(sample['label'])} · {escape(sample['pageKey'])}</h3>
          <div class="meta">
            <span class="pill">{escape(sample['category'])}</span>
            <span class="pill">status: {escape(sample['status'])}</span>
            <span class="pill">expected: {escape(sample['expectedOutcome'])}</span>
            <span class="pill">score: {float(sample['overallScore']):.2f}</span>
          </div>
          <div class="metrics">{metric_html}</div>
          <p class="footer-note">blocks {sample['highSignalBlocks']} · filtered {sample['filteredBlocks']} · digest {sample['digestItems']} · sourceRefs {sample['sourceRefs']}</p>
          <ul>{items_html}</ul>
        </div>
      </article>
    """


def escape(value: Any) -> str:
    return html.escape(str(value), quote=True)


def shorten(value: str, limit: int) -> str:
    value = " ".join(str(value).split())
    if len(value) <= limit:
        return value
    return value[: limit - 1].rstrip() + "..."


if __name__ == "__main__":
    raise SystemExit(main())
