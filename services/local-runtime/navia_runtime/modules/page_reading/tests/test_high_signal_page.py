from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from navia_runtime.modules.page_reading.runtime import build_high_signal_page_perception


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"
SCHEMA_PATH = Path(__file__).resolve().parents[6] / "docs/active/project/contracts/a_v1_1_high_signal.schema.json"
VALID_FIXTURES = [
    "article_noise.html",
    "news_with_sidebar.html",
    "product_doc.html",
    "table_heavy_report.html",
    "code_doc.html",
]


def validator() -> Draft202012Validator:
    return Draft202012Validator(json.loads(SCHEMA_PATH.read_text(encoding="utf-8")))


def assert_schema_valid(payload: dict[str, Any]) -> None:
    errors = sorted(validator().iter_errors(payload), key=lambda error: list(error.path))
    assert errors == [], [error.message for error in errors]


def run_fixture(fixture_name: str, fixture_class: str = "valid_content") -> dict[str, Any]:
    return build_high_signal_page_perception(
        {
            "sessionId": f"sess_{fixture_name}",
            "url": f"https://module-fixtures.example/{fixture_name}",
            "title": fixture_name,
            "domain": "module-fixtures.example",
            "capturedAt": "2026-06-05T00:00:00Z",
            "fixtureClass": fixture_class,
            "html": (FIXTURE_DIR / fixture_name).read_text(encoding="utf-8"),
        }
    )


def test_valid_content_fixtures_generate_public_a_v1_1_contracts() -> None:
    for fixture_name in VALID_FIXTURES:
        result = run_fixture(fixture_name)

        assert result["ok"] is True, fixture_name
        assert_schema_valid(result["candidateExtraction"])
        assert_schema_valid(result["highSignalPage"])
        assert_schema_valid(result["sourceMap"])
        assert_schema_valid(result["perceptionDigest"])
        assert_schema_valid(result["qualityReport"])

        assert result["highSignalPage"]["status"] == "ready", fixture_name
        assert result["qualityReport"]["downstreamReadiness"] == "pass", fixture_name
        assert result["highSignalPage"]["highSignalBlocks"], fixture_name
        assert result["sourceMap"]["sourceRefs"], fixture_name
        assert all(item["sourceRefs"] for item in result["perceptionDigest"]["items"]), fixture_name
        assert result["qualityReport"]["metrics"]["sourceCoverage"]["value"] >= 0.95, fixture_name
        assert result["qualityReport"]["metrics"]["groundingCompleteness"]["value"] >= 0.95, fixture_name
        assert result["qualityReport"]["metrics"]["jumpbackCoverage"]["value"] >= 0.95, fixture_name


def test_noise_blocks_are_filtered_or_downgraded_from_high_signal_output() -> None:
    result = run_fixture("news_with_sidebar.html")
    assert result["ok"] is True
    filtered = result["highSignalPage"]["filteredBlocks"]
    high_text = " ".join(block["text"].lower() for block in result["highSignalPage"]["highSignalBlocks"])
    filtered_reasons = {block["reason"] for block in filtered}

    assert filtered
    assert "recommendation" in filtered_reasons or "ad_like" in filtered_reasons
    assert "advertisement sponsored" not in high_text
    assert "related articles" not in high_text


def test_image_fixture_uses_dom_metadata_and_does_not_infer_unknown_images() -> None:
    result = run_fixture("image_rich_article.html", fixture_class="degraded_content")

    assert result["ok"] is True
    assert_schema_valid(result["perceptionDigest"])
    image_items = [item for item in result["perceptionDigest"]["items"] if item["kind"] == "image_metadata"]
    assert image_items
    assert any("Floating Ask AI toolbar" in item["text"] for item in image_items)
    digest_text = " ".join(item["text"] for item in result["perceptionDigest"]["items"])
    assert "unknown-photo" not in digest_text


def test_empty_or_low_signal_fixture_does_not_pass() -> None:
    result = run_fixture("empty_or_low_signal.html", fixture_class="no_signal")

    assert result["ok"] is False
    assert result["error"]["code"] == "PAGE_CONTEXT_REQUIRED"
    assert result["highSignalPage"] is None
    assert result["qualityReport"] is None


def test_small_readable_page_is_degraded_without_fixture_override() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_small_readable",
            "url": "https://example.com",
            "title": "Example Domain",
            "domain": "example.com",
            "capturedAt": "2026-06-14T00:00:00Z",
            "cleaned_text": "Example Domain. This domain is for use in documentation examples without needing permission.",
            "visible_text": "Example Domain. This domain is for use in documentation examples without needing permission.",
        }
    )

    assert result["ok"] is True
    assert result["qualityReport"]["downstreamReadiness"] == "degraded"
    assert any(issue["code"] == "LOW_SIGNAL_PAGE_DEGRADED" for issue in result["qualityReport"]["warnings"])


def test_video_stub_is_planning_only_not_real_perception_ready() -> None:
    result = run_fixture("video_page_stub.html", fixture_class="planning_only")

    assert result["ok"] is True
    assert_schema_valid(result["highSignalPage"])
    assert_schema_valid(result["qualityReport"])
    assert result["highSignalPage"]["status"] != "ready"
    assert result["qualityReport"]["downstreamReadiness"] != "pass"
    assert any(issue["code"] == "PLANNING_ONLY_MEDIA" for issue in result["qualityReport"]["warnings"])


def test_candidate_extractor_output_is_not_leaked_to_final_payloads() -> None:
    result = run_fixture("product_doc.html")
    forbidden_keys = {"extractorName", "candidateBlockId"}

    assert forbidden_keys & recursive_keys(result["candidateExtraction"])
    for final_payload_name in ["highSignalPage", "sourceMap", "perceptionDigest", "qualityReport"]:
        assert not (forbidden_keys & recursive_keys(result[final_payload_name])), final_payload_name


def recursive_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            keys.add(key)
            keys.update(recursive_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.update(recursive_keys(child))
    return keys
