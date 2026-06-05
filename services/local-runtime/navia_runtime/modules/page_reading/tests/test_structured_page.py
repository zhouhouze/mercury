from __future__ import annotations

from pathlib import Path

from navia_runtime.modules.page_reading.runtime import build_structured_page_context


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"
REAL_PAGE_FIXTURE_DIR = Path(__file__).resolve().parents[6] / "docs/navia_v1_project_docs/fixtures/real_pages"


def test_builds_structured_context_from_html_fixture() -> None:
    html = (FIXTURE_DIR / "article.html").read_text(encoding="utf-8")

    result = build_structured_page_context(
        {
            "sessionId": "sess_test",
            "url": "https://example.com/article",
            "title": "Companion Reading Architecture",
            "domain": "example.com",
            "capturedAt": "2026-06-04T00:00:00Z",
            "html": html,
        }
    )

    assert result["ok"] is True
    page = result["structuredPage"]
    assert page["pageId"].startswith("page_")
    assert page["sessionId"] == "sess_test"
    assert page["url"] == "https://example.com/article"
    assert page["domain"] == "example.com"
    assert page["contentHash"].startswith("sha256_")
    assert page["metadata"]["wordCount"] > 20
    assert page["metadata"]["paragraphCount"] >= 4
    assert page["metadata"]["headingCount"] == 3
    assert len(page["headingTree"]) == 3
    assert len(page["paragraphs"]) >= 4
    assert len(page["chunks"]) >= 1
    assert len(page["annotations"]) == len(page["paragraphs"])
    assert page["summaryDraft"]["format"] == "json"

    paragraph_ids = {paragraph["paragraphId"] for paragraph in page["paragraphs"]}
    for annotation in page["annotations"]:
        assert annotation["paragraphId"] in paragraph_ids
        assert 0 <= annotation["densityScore"] <= 1
        assert 0 <= annotation["confidence"] <= 1


def test_builds_context_from_existing_page_context_fallback() -> None:
    text = (
        "Navia reads the current page. It creates a structured page context for downstream tools. "
        "The output includes stable paragraphs and chunks. It avoids fake summaries when content is missing."
    )

    result = build_structured_page_context(
        {
            "session_id": "sess_snake",
            "url": "https://docs.example.com/runtime",
            "title": "Runtime Docs",
            "captured_at": "2026-06-04T00:00:00Z",
            "headings": [{"level": 1, "text": "Runtime Docs"}],
            "cleaned_text": text,
        }
    )

    assert result["ok"] is True
    page = result["structuredPage"]
    assert page["sessionId"] == "sess_snake"
    assert page["domain"] == "docs.example.com"
    assert page["metadata"]["contentType"] == "documentation"
    assert page["paragraphs"]
    assert page["chunks"]
    assert page["chunks"][0]["paragraphIds"]


def test_empty_readable_page_returns_page_context_required() -> None:
    result = build_structured_page_context(
        {
            "sessionId": "sess_empty",
            "url": "https://example.com/empty",
            "title": "Empty",
            "domain": "example.com",
            "cleanedText": "too short",
        }
    )

    assert result["ok"] is False
    assert result["structuredPage"] is None
    assert result["error"]["code"] == "PAGE_CONTEXT_REQUIRED"


def test_content_hash_and_ids_are_stable_for_same_input() -> None:
    payload = {
        "sessionId": "sess_stable",
        "url": "https://example.com/stable",
        "title": "Stable",
        "domain": "example.com",
        "cleanedText": "This page has stable content. It should produce stable page, paragraph, and chunk identifiers.",
    }

    first = build_structured_page_context(payload)["structuredPage"]
    second = build_structured_page_context(payload)["structuredPage"]

    assert first["contentHash"] == second["contentHash"]
    assert first["pageId"] == second["pageId"]
    assert [p["paragraphId"] for p in first["paragraphs"]] == [p["paragraphId"] for p in second["paragraphs"]]
    assert [c["chunkId"] for c in first["chunks"]] == [c["chunkId"] for c in second["chunks"]]


def test_real_page_fixtures_build_required_structured_outputs() -> None:
    for fixture_name in ["article.html", "docs.html", "github_readme.html"]:
        html = (REAL_PAGE_FIXTURE_DIR / fixture_name).read_text(encoding="utf-8")
        result = build_structured_page_context(
            {
                "sessionId": f"sess_{fixture_name}",
                "url": f"https://fixtures.example/{fixture_name}",
                "title": fixture_name,
                "domain": "fixtures.example",
                "capturedAt": "2026-06-04T00:00:00Z",
                "html": html,
            }
        )

        assert result["ok"] is True, fixture_name
        page = result["structuredPage"]
        assert page["metadata"]["paragraphCount"] >= 3, fixture_name
        assert page["metadata"]["headingCount"] >= 3, fixture_name
        assert len(page["paragraphs"]) >= 3, fixture_name
        assert len(page["chunks"]) >= 1, fixture_name
        assert len(page["annotations"]) == len(page["paragraphs"]), fixture_name
        assert all(chunk["paragraphIds"] for chunk in page["chunks"]), fixture_name


def test_module_fixtures_cover_docs_readme_and_empty_contracts() -> None:
    for fixture_name in ["docs.html", "github_readme.html"]:
        html = (FIXTURE_DIR / fixture_name).read_text(encoding="utf-8")
        result = build_structured_page_context(
            {
                "sessionId": f"sess_{fixture_name}",
                "url": f"https://module-fixtures.example/{fixture_name}",
                "title": fixture_name,
                "domain": "module-fixtures.example",
                "capturedAt": "2026-06-04T00:00:00Z",
                "html": html,
            }
        )

        assert result["ok"] is True, fixture_name
        page = result["structuredPage"]
        assert page["metadata"]["headingCount"] >= 3, fixture_name
        assert len(page["paragraphs"]) >= 3, fixture_name
        assert len(page["chunks"]) >= 1, fixture_name

    empty = build_structured_page_context(
        {
            "sessionId": "sess_empty_fixture",
            "url": "https://module-fixtures.example/empty",
            "title": "Empty Fixture",
            "domain": "module-fixtures.example",
            "capturedAt": "2026-06-04T00:00:00Z",
            "html": (FIXTURE_DIR / "empty.html").read_text(encoding="utf-8"),
        }
    )

    assert empty["ok"] is False
    assert empty["error"]["code"] == "PAGE_CONTEXT_REQUIRED"


def test_image_rich_fixture_uses_only_dom_readable_metadata() -> None:
    result = build_structured_page_context(
        {
            "sessionId": "sess_image",
            "url": "https://module-fixtures.example/image-rich",
            "title": "Visual Reading Fixture",
            "domain": "module-fixtures.example",
            "capturedAt": "2026-06-04T00:00:00Z",
            "html": (FIXTURE_DIR / "image_rich.html").read_text(encoding="utf-8"),
        }
    )

    assert result["ok"] is True
    page = result["structuredPage"]
    image_metadata = page["imageMetadata"]
    assert len(image_metadata) == 3
    assert image_metadata[0]["alt"] == "Floating AI toolbar attached to the right page edge"
    assert image_metadata[0]["title"] == "Toolbar collapsed state"
    assert image_metadata[1]["ariaLabel"] == "Side panel chat with structured summary cards"
    assert image_metadata[2]["status"] == "unknown_metadata"
    assert any(warning["code"] == "IMAGE_METADATA_UNKNOWN" for warning in result["warnings"])

    metadata_paragraphs = [p for p in page["paragraphs"] if p["sourceBlockType"] == "image_metadata"]
    assert len(metadata_paragraphs) == 2
    assert all("unknown-photo" not in p["text"] for p in page["paragraphs"])


def test_table_list_and_code_blocks_preserve_source_block_types() -> None:
    result = build_structured_page_context(
        {
            "sessionId": "sess_blocks",
            "url": "https://module-fixtures.example/blocks",
            "title": "Structured Blocks Fixture",
            "domain": "module-fixtures.example",
            "capturedAt": "2026-06-04T00:00:00Z",
            "html": (FIXTURE_DIR / "tables_lists_code.html").read_text(encoding="utf-8"),
        }
    )

    assert result["ok"] is True
    page = result["structuredPage"]
    block_types = [paragraph["sourceBlockType"] for paragraph in page["paragraphs"]]
    assert "list_item" in block_types
    assert "table_header" in block_types
    assert "table_cell" in block_types
    assert "code" in block_types

    texts = [paragraph["text"] for paragraph in page["paragraphs"]]
    list_index = next(index for index, text in enumerate(texts) if "Extract visible headings" in text)
    table_index = next(index for index, text in enumerate(texts) if "Contract Field Name" in text)
    code_index = next(index for index, text in enumerate(texts) if "pnpm --filter chrome-extension build" in text)
    assert list_index < table_index < code_index
