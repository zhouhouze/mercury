from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


EVIDENCE_DIR = Path(__file__).resolve().parent / "evidence" / "a_v1_2"
SNAPSHOT_DIR = EVIDENCE_DIR / "snapshots"
MANIFEST_PATH = EVIDENCE_DIR / "corpus-manifest.json"
CAPTURE_REPORT_PATH = EVIDENCE_DIR / "capture-report.json"


@dataclass(frozen=True)
class CatalogEntry:
    page_key: str
    url: str
    category: str
    language: str
    complexity_tags: list[str]
    expected_risks: list[str]
    expected_outcome: str = "pass"
    source_license_note: str = "public web snapshot captured for A-V1.2 evaluation"


def main() -> int:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    captured_at = dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    pages = []
    failures = []
    reused = []
    for entry in corpus_catalog():
        snapshot_name = f"{entry.page_key}.html"
        snapshot_path = SNAPSHOT_DIR / snapshot_name
        try:
            html = fetch_html(entry.url)
        except (subprocess.CalledProcessError, TimeoutError, OSError) as exc:
            if snapshot_path.is_file():
                reused.append({"pageKey": entry.page_key, "url": entry.url, "reason": str(exc)})
            else:
                failures.append({"pageKey": entry.page_key, "url": entry.url, "error": str(exc)})
                continue
        else:
            snapshot_path.write_text(html, encoding="utf-8")
        pages.append(
            {
                "schemaVersion": "a-v1.2-corpus-page-2026-06-05",
                "pageKey": entry.page_key,
                "url": entry.url,
                "snapshotPath": f"snapshots/{snapshot_name}",
                "category": entry.category,
                "language": entry.language,
                "complexityTags": entry.complexity_tags,
                "expectedRisks": entry.expected_risks,
                "goldStatus": "semi_auto_accepted",
                "allowedNetworkAtCapture": True,
                "capturedAt": captured_at,
                "sourceLicenseNote": entry.source_license_note if not any(item["pageKey"] == entry.page_key for item in reused) else f"{entry.source_license_note}; reused previously captured snapshot after transient network failure",
                "expectedOutcome": entry.expected_outcome,
            }
        )
        time.sleep(0.15)
    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "schemaVersion": "a-v1.2-corpus-manifest-2026-06-08",
                "capturedAt": captured_at,
                "captureMethod": "system curl HTML snapshot capture",
                "pages": pages,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    CAPTURE_REPORT_PATH.write_text(
        json.dumps(
            {
                "schemaVersion": "a-v1.2-corpus-capture-report-2026-06-08",
                "capturedAt": captured_at,
                "requested": len(corpus_catalog()),
                "captured": len(pages),
                "freshCaptured": len(pages) - len(reused),
                "reusedSnapshots": len(reused),
                "failed": len(failures),
                "reused": reused,
                "failures": failures,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    return 0 if len(pages) >= 100 else 1


def fetch_html(url: str) -> str:
    result = subprocess.run(
        [
            "curl",
            "-L",
            "--fail",
            "--silent",
            "--show-error",
            "--compressed",
            "--max-time",
            "12",
            "--user-agent",
            "NaviaA-V1.2CorpusCapture/1.0 (+https://github.com/zhouhouze/mercury)",
            "--header",
            "Accept: text/html,application/xhtml+xml",
            url,
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    text = result.stdout[:2_000_000].decode("utf-8", errors="replace")
    return normalize_snapshot(text, url)


def normalize_snapshot(html: str, url: str) -> str:
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"\s+", " ", html)
    return f"<!-- captured_url: {url} -->\n{html.strip()}\n"


def corpus_catalog() -> list[CatalogEntry]:
    entries: list[CatalogEntry] = []
    entries.extend(
        entry_group(
            "news",
            "news_article",
            "en",
            ["longform", "mixed_language"],
            ["date_noise", "event_timeline", "sidebar"],
            [
                ("go_loopvar_preview", "https://go.dev/blog/loopvar-preview"),
                ("go_121_release", "https://go.dev/blog/go1.21"),
                ("go_120_release", "https://go.dev/blog/go1.20"),
                ("go_119_release", "https://go.dev/blog/go1.19"),
                ("go_118_release", "https://go.dev/blog/go1.18"),
                ("routing_enhancements", "https://go.dev/blog/routing-enhancements"),
                ("slog", "https://go.dev/blog/slog"),
                ("pgo", "https://go.dev/blog/pgo"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "blog",
            "longform_blog",
            "en",
            ["longform"],
            ["long_context", "section_hierarchy"],
            [
                ("pep_0008", "https://peps.python.org/pep-0008/"),
                ("pep_0020", "https://peps.python.org/pep-0020/"),
                ("pep_0257", "https://peps.python.org/pep-0257/"),
                ("pep_0484", "https://peps.python.org/pep-0484/"),
                ("pep_0695", "https://peps.python.org/pep-0695/"),
                ("pep_0589", "https://peps.python.org/pep-0589/"),
                ("pep_0618", "https://peps.python.org/pep-0618/"),
                ("pep_0634", "https://peps.python.org/pep-0634/"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "tech",
            "technical_docs",
            "en",
            ["longform", "code_heavy"],
            ["multi_level_headings", "api_terms"],
            [
                ("go_effective", "https://go.dev/doc/effective_go"),
                ("python_tutorial_intro", "https://docs.python.org/3/tutorial/introduction.html"),
                ("python_tutorial_controlflow", "https://docs.python.org/3/tutorial/controlflow.html"),
                ("python_tutorial_datastructures", "https://docs.python.org/3/tutorial/datastructures.html"),
                ("go_spec", "https://go.dev/ref/spec"),
                ("python_tutorial_inputoutput", "https://docs.python.org/3/tutorial/inputoutput.html"),
                ("python_tutorial_errors", "https://docs.python.org/3/tutorial/errors.html"),
                ("python_tutorial_classes", "https://docs.python.org/3/tutorial/classes.html"),
                ("w3c_wcag21", "https://www.w3.org/TR/WCAG21/"),
                ("w3c_wcag22", "https://www.w3.org/TR/WCAG22/"),
                ("w3c_wai_aria", "https://www.w3.org/TR/wai-aria-1.2/"),
                ("w3c_accname", "https://www.w3.org/TR/accname-1.2/"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "github",
            "github_readme",
            "en",
            ["code_heavy", "sidebar"],
            ["repo_navigation", "badges", "code_blocks"],
            [
                ("python_cpython", "https://raw.githubusercontent.com/python/cpython/main/README.rst"),
                ("pallets_flask", "https://raw.githubusercontent.com/pallets/flask/main/README.md"),
                ("django_django", "https://raw.githubusercontent.com/django/django/main/README.rst"),
                ("numpy_numpy", "https://raw.githubusercontent.com/numpy/numpy/main/README.md"),
                ("pandas_pandas", "https://raw.githubusercontent.com/pandas-dev/pandas/main/README.md"),
                ("psf_requests", "https://raw.githubusercontent.com/psf/requests/main/README.md"),
                ("fastapi_fastapi", "https://raw.githubusercontent.com/fastapi/fastapi/master/README.md"),
                ("microsoft_playwright", "https://raw.githubusercontent.com/microsoft/playwright/main/README.md"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "product_docs",
            "product_docs",
            "en",
            ["sidebar", "longform"],
            ["version_switcher", "navigation_noise"],
            [
                ("django_tutorial01", "https://docs.djangoproject.com/en/stable/intro/tutorial01/"),
                ("django_models", "https://docs.djangoproject.com/en/stable/topics/db/models/"),
                ("flask_quickstart", "https://flask.palletsprojects.com/en/stable/quickstart/"),
                ("fastapi_tutorial", "https://fastapi.tiangolo.com/tutorial/"),
                ("github_actions", "https://docs.github.com/en/actions"),
                ("github_rest", "https://docs.github.com/en/rest"),
                ("go_doc_effective", "https://go.dev/doc/effective_go"),
                ("numpy_beginners", "https://numpy.org/doc/stable/user/absolute_beginners.html"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "product",
            "ecommerce_product",
            "en",
            ["sidebar"],
            ["price", "ratings", "recommendation"],
            [
                ("book_light_attic", "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html"),
                ("book_tipping_velvet", "https://books.toscrape.com/catalogue/tipping-the-velvet_999/index.html"),
                ("book_soumission", "https://books.toscrape.com/catalogue/soumission_998/index.html"),
                ("book_sharp_objects", "https://books.toscrape.com/catalogue/sharp-objects_997/index.html"),
                ("book_sapiens", "https://books.toscrape.com/catalogue/sapiens-a-brief-history-of-humankind_996/index.html"),
                ("book_requiem_red", "https://books.toscrape.com/catalogue/the-requiem-red_995/index.html"),
                ("book_dream_job", "https://books.toscrape.com/catalogue/the-dirty-little-secrets-of-getting-your-dream-job_994/index.html"),
                ("book_coming_woman", "https://books.toscrape.com/catalogue/the-coming-woman-a-novel-based-on-the-life-of-the-infamous-feminist-victoria-woodhull_993/index.html"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "forum",
            "forum_thread",
            "en",
            ["comments", "longform"],
            ["multi_author", "reply_noise", "quoted_text"],
            [
                ("lobsters_page_1", "https://lobste.rs/"),
                ("lobsters_page_2", "https://lobste.rs/page/2"),
                ("lobsters_page_3", "https://lobste.rs/page/3"),
                ("lobsters_page_4", "https://lobste.rs/page/4"),
                ("lobsters_page_5", "https://lobste.rs/page/5"),
                ("python_discuss_latest", "https://discuss.python.org/latest"),
                ("python_discuss_top", "https://discuss.python.org/top"),
                ("python_discuss_categories", "https://discuss.python.org/categories"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "report",
            "academic_or_report",
            "en",
            ["longform", "table_heavy"],
            ["formal_sections", "references"],
            [
                ("rfc_9110", "https://www.rfc-editor.org/rfc/rfc9110.html"),
                ("rfc_9111", "https://www.rfc-editor.org/rfc/rfc9111.html"),
                ("rfc_9112", "https://www.rfc-editor.org/rfc/rfc9112.html"),
                ("rfc_8259", "https://www.rfc-editor.org/rfc/rfc8259.html"),
                ("rfc_6455", "https://www.rfc-editor.org/rfc/rfc6455.html"),
                ("rfc_8446", "https://www.rfc-editor.org/rfc/rfc8446.html"),
                ("rfc_9000", "https://www.rfc-editor.org/rfc/rfc9000.html"),
                ("rfc_3986", "https://www.rfc-editor.org/rfc/rfc3986.html"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "table",
            "table_heavy_page",
            "en",
            ["table_heavy"],
            ["large_tables", "header_scope"],
            [
                ("python_modindex", "https://docs.python.org/3/py-modindex.html"),
                ("python_genindex", "https://docs.python.org/3/genindex.html"),
                ("python_stdtypes", "https://docs.python.org/3/library/stdtypes.html"),
                ("python_functions", "https://docs.python.org/3/library/functions.html"),
                ("w3c_wcag21", "https://www.w3.org/TR/WCAG21/"),
                ("w3c_wcag22", "https://www.w3.org/TR/WCAG22/"),
                ("w3c_wai_aria", "https://www.w3.org/TR/wai-aria-1.2/"),
                ("w3c_accname", "https://www.w3.org/TR/accname-1.2/"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "code",
            "code_heavy_page",
            "en",
            ["code_heavy", "longform"],
            ["code_blocks", "api_terms"],
            [
                ("py_asyncio", "https://docs.python.org/3/library/asyncio.html"),
                ("py_json", "https://docs.python.org/3/library/json.html"),
                ("py_pathlib", "https://docs.python.org/3/library/pathlib.html"),
                ("py_re", "https://docs.python.org/3/library/re.html"),
                ("py_dataclasses", "https://docs.python.org/3/library/dataclasses.html"),
                ("py_argparse", "https://docs.python.org/3/library/argparse.html"),
                ("py_unittest", "https://docs.python.org/3/library/unittest.html"),
                ("py_typing", "https://docs.python.org/3/library/typing.html"),
                ("go_tutorial_start", "https://go.dev/doc/tutorial/getting-started"),
                ("go_tutorial_module", "https://go.dev/doc/tutorial/create-module"),
                ("go_tutorial_call", "https://go.dev/doc/tutorial/call-module-code"),
                ("go_tutorial_error", "https://go.dev/doc/tutorial/handle-errors"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "image",
            "image_rich_article",
            "en",
            ["image_rich", "longform"],
            ["image_alt", "caption", "gallery_noise"],
            [
                ("go_image_draw", "https://go.dev/blog/image-draw"),
                ("go_gopher", "https://go.dev/blog/gopher"),
                ("go_slices", "https://go.dev/blog/generic-slice-functions"),
                ("go_maps", "https://go.dev/blog/maps"),
                ("go_strings", "https://go.dev/blog/strings"),
                ("go_json", "https://go.dev/blog/json"),
                ("go_context", "https://go.dev/blog/context"),
                ("go_pipelines", "https://go.dev/blog/pipelines"),
                ("go_error_handling", "https://go.dev/blog/error-handling-and-go"),
                ("go_defer", "https://go.dev/blog/defer-panic-and-recover"),
                ("go_concurrency", "https://go.dev/blog/waza-talk"),
                ("go_interfaces", "https://go.dev/blog/laws-of-reflection"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "zh",
            "localized_chinese_page",
            "zh",
            ["mixed_language", "longform"],
            ["chinese_segmentation", "site_navigation"],
            [
                ("python_tutorial_index", "https://docs.python.org/zh-cn/3/tutorial/index.html"),
                ("python_tutorial_intro", "https://docs.python.org/zh-cn/3/tutorial/introduction.html"),
                ("python_tutorial_controlflow", "https://docs.python.org/zh-cn/3/tutorial/controlflow.html"),
                ("python_tutorial_datastructures", "https://docs.python.org/zh-cn/3/tutorial/datastructures.html"),
                ("python_tutorial_modules", "https://docs.python.org/zh-cn/3/tutorial/modules.html"),
                ("python_tutorial_inputoutput", "https://docs.python.org/zh-cn/3/tutorial/inputoutput.html"),
                ("python_tutorial_errors", "https://docs.python.org/zh-cn/3/tutorial/errors.html"),
                ("python_tutorial_classes", "https://docs.python.org/zh-cn/3/tutorial/classes.html"),
            ],
        )
    )
    entries.extend(
        entry_group(
            "low",
            LOW_SIGNAL_CATEGORY,
            "en",
            ["low_signal"],
            ["low_text", "generic_page"],
            [
                ("example_com", "https://example.com"),
                ("example_org", "https://www.example.org"),
                ("iana_reserved", "https://www.iana.org/domains/reserved"),
                ("httpbin_html", "https://httpbin.org/html"),
            ],
            expected_outcome="degraded",
        )
    )
    return entries


def entry_group(
    prefix: str,
    category: str,
    language: str,
    complexity_tags: list[str],
    expected_risks: list[str],
    pairs: Iterable[tuple[str, str]],
    *,
    expected_outcome: str = "pass",
) -> list[CatalogEntry]:
    return [
        CatalogEntry(
            page_key=f"{prefix}_{index + 1:03d}_{slug}",
            url=url,
            category=category,
            language=language,
            complexity_tags=complexity_tags,
            expected_risks=expected_risks,
            expected_outcome=expected_outcome,
        )
        for index, (slug, url) in enumerate(pairs)
    ]


LOW_SIGNAL_CATEGORY = "low_signal_or_paywall_like"


if __name__ == "__main__":
    sys.exit(main())
