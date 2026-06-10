from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


REPO_ROOT = Path(__file__).resolve().parents[6]
SCHEMA_PATH = REPO_ROOT / "docs/active/project/contracts/a_v1_1_high_signal.schema.json"
RUNTIME_DIR = Path(__file__).resolve().parents[1] / "runtime"


def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def validator() -> Draft202012Validator:
    return Draft202012Validator(load_schema())


def assert_schema_valid(payload: dict[str, Any]) -> None:
    errors = sorted(validator().iter_errors(payload), key=lambda error: list(error.path))
    assert errors == [], [error.message for error in errors]


def assert_schema_invalid(payload: dict[str, Any]) -> None:
    errors = sorted(validator().iter_errors(payload), key=lambda error: list(error.path))
    assert errors, "payload unexpectedly passed A-V1.1 schema validation"


def source_ref(**overrides: Any) -> dict[str, Any]:
    base = {
        "sourceRefId": "src_001",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "blockId": "block_001",
        "blockType": "paragraph",
        "order": 0,
        "paragraphId": "para_001",
        "chunkId": "chunk_001",
        "headingPath": ["Navia Architecture"],
        "textQuote": "Navia extracts high-signal page facts for downstream reading tools.",
        "textHash": "sha256_abcdef1234567890abcdef1234567890",
        "fallbackText": "Navia extracts high-signal page facts for downstream reading tools.",
        "confidence": 0.96,
    }
    base.update(overrides)
    for key in [key for key, value in base.items() if value is None]:
        del base[key]
    return base


def high_signal_page(status: str = "ready") -> dict[str, Any]:
    ref = source_ref()
    return {
        "schemaVersion": "a-v1.1-high-signal-2026-06-05",
        "pageId": "page_contract",
        "sessionId": "sess_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "sourceStructuredPageRef": {
            "pageId": "page_contract",
            "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        },
        "metadata": {
            "language": "en",
            "contentType": "documentation",
            "wordCount": 860,
            "paragraphCount": 12,
            "headingCount": 4,
        },
        "highSignalBlocks": [
            {
                "blockId": "block_001",
                "pageId": "page_contract",
                "contentHash": "sha256_1234567890abcdef1234567890abcdef",
                "blockType": "paragraph",
                "order": 0,
                "text": "Navia extracts high-signal page facts for downstream reading tools.",
                "paragraphIds": ["para_001"],
                "chunkIds": ["chunk_001"],
                "sourceRefs": [ref],
                "regionType": "main",
                "contentDensityScore": 0.91,
                "noiseScore": 0.04,
                "importance": 0.9,
                "confidence": 0.96,
                "warnings": [],
            }
        ],
        "filteredBlocks": [
            {
                "blockId": "block_nav",
                "pageId": "page_contract",
                "contentHash": "sha256_1234567890abcdef1234567890abcdef",
                "blockType": "list_item",
                "order": 99,
                "textQuote": "Home Pricing Sign in",
                "textHash": "sha256_11111111111111111111111111111111",
                "regionType": "nav",
                "noiseScore": 0.92,
                "reason": "navigation",
                "sourceRefs": [source_ref(sourceRefId="src_nav", blockId="block_nav", blockType="list_item", order=99)],
            }
        ],
        "sourceMapRef": "smap_contract",
        "digestRef": "digest_contract",
        "qualityReportRef": "q_contract",
        "status": status,
        "warnings": [] if status == "ready" else ["contract fixture is not ready"],
    }


def source_map() -> dict[str, Any]:
    return {
        "sourceMapId": "smap_contract",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "sourceRefs": [
            source_ref(selector=None, domPath=None),
            source_ref(
                sourceRefId="src_002",
                blockId="block_002",
                order=1,
                textQuote="The fallback text is enough for evidence-card jumpback when DOM lookup fails.",
                textHash="sha256_22222222222222222222222222222222",
                fallbackText="The fallback text is enough for evidence-card jumpback when DOM lookup fails.",
                selector=".article p:nth-child(2)",
            ),
        ],
    }


def perception_digest() -> dict[str, Any]:
    return {
        "digestId": "digest_contract",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "items": [
            {
                "itemId": "item_001",
                "kind": "key_fact",
                "text": "Navia A module acts as the perception layer for downstream reading tools.",
                "importance": 0.92,
                "confidence": 0.95,
                "sourceRefs": [source_ref()],
                "relatedParagraphIds": ["para_001"],
                "relatedChunkIds": ["chunk_001"],
                "warnings": [],
            }
        ],
        "rejectedItems": [
            {
                "itemId": "item_rejected_001",
                "text": "Unrelated navigation text",
                "reason": "low_signal",
                "warnings": ["missing stable evidence"],
            }
        ],
        "summary": {
            "tldr": "A module produces grounded high-signal page perception, not final answers.",
            "keyTakeaways": ["Every digest item is grounded by SourceRef."],
        },
        "stats": {
            "itemCount": 1,
            "sourceRefCount": 1,
            "compressionRatio": 0.18,
        },
    }


def metric(value: float, numerator: float, denominator: float, threshold: float, passed: bool, method: str) -> dict[str, Any]:
    return {
        "value": value,
        "numerator": numerator,
        "denominator": denominator,
        "method": method,
        "threshold": threshold,
        "passed": passed,
    }


def quality_report(readiness: str = "pass", overall_score: float = 0.87) -> dict[str, Any]:
    passed = readiness == "pass"
    return {
        "reportId": "q_contract",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "overallScore": overall_score,
        "metrics": {
            "noiseRatio": metric(0.08, 1, 12, 0.25, True, "filtered_or_downgraded_noise_blocks / all_detected_blocks"),
            "contentCoverage": metric(0.92, 11, 12, 0.75, True, "covered_main_content_blocks / all_main_content_blocks"),
            "sourceCoverage": metric(1.0, 1, 1, 0.95, True, "high_signal_blocks_with_source_ref / high_signal_blocks_total"),
            "groundingCompleteness": metric(1.0, 1, 1, 0.95, True, "digest_items_with_source_refs / digest_items_total"),
            "jumpbackCoverage": metric(1.0, 2, 2, 0.95, True, "source_refs_with_text_quote_or_fallback / source_refs_total"),
            "digestCompressionRatio": metric(0.18, 180, 1000, 0.35, True, "digest_token_estimate / structured_page_token_estimate"),
            "candidateFactDensity": metric(0.74, 14, 19, 0.5, True, "deterministic_candidate_fact_items / digest_token_estimate"),
        },
        "downstreamReadiness": readiness,
        "fatalIssues": []
        if passed
        else [
            {
                "code": "NO_SIGNAL_CONTENT",
                "message": "Fixture intentionally has no readable main content.",
                "severity": "fatal",
                "relatedIds": [],
            }
        ],
        "warnings": [],
    }


def candidate_extraction_result() -> dict[str, Any]:
    return {
        "extractorName": "dom_baseline",
        "version": "contract-freeze-fixture",
        "title": "Navia Architecture",
        "text": "Candidate extractor output is input evidence only.",
        "metadata": {"fixtureClass": "valid_content"},
        "blocks": [
            {
                "candidateBlockId": "cand_001",
                "order": 0,
                "text": "Candidate extractor output is input evidence only.",
                "blockType": "paragraph",
                "metadata": {"regionHint": "main"},
            }
        ],
        "confidence": 0.75,
        "warnings": [],
    }


def walk_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            keys.add(key)
            keys.update(walk_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.update(walk_keys(child))
    return keys


def test_a_v1_1_schema_file_is_draft_2020_12_valid() -> None:
    Draft202012Validator.check_schema(load_schema())


def test_public_high_signal_contract_payloads_validate() -> None:
    for payload in [high_signal_page(), source_map(), perception_digest(), quality_report(), candidate_extraction_result()]:
        assert_schema_valid(payload)


def test_source_ref_supports_fallback_jumpback_without_dom_selector() -> None:
    payload = source_ref(selector=None, domPath=None)
    assert "selector" not in payload or payload["selector"] is None
    assert "domPath" not in payload or payload["domPath"] is None
    assert payload["textQuote"]
    assert payload["fallbackText"]
    assert_schema_valid({"sourceMapId": "smap_fallback", "pageId": payload["pageId"], "contentHash": payload["contentHash"], "sourceRefs": [payload]})


def test_digest_item_without_source_refs_is_rejected() -> None:
    payload = perception_digest()
    payload["items"][0]["sourceRefs"] = []
    assert_schema_invalid(payload)


def test_quality_report_metrics_are_formula_backed_and_not_hard_coded_pass() -> None:
    payload = quality_report()
    for metric_payload in payload["metrics"].values():
        assert metric_payload["method"]
        assert "numerator" in metric_payload
        assert "denominator" in metric_payload
        assert "threshold" in metric_payload
        assert isinstance(metric_payload["passed"], bool)
    assert payload["downstreamReadiness"] == "pass"

    failed = quality_report(readiness="fail", overall_score=0.2)
    failed["metrics"]["sourceCoverage"] = metric(0, 0, 1, 0.95, False, "high_signal_blocks_with_source_ref / high_signal_blocks_total")
    assert_schema_valid(failed)
    assert failed["downstreamReadiness"] == "fail"
    assert failed["fatalIssues"]


def test_fixture_class_gates_close_false_green_cases() -> None:
    valid = quality_report(readiness="pass", overall_score=0.87)
    no_signal = quality_report(readiness="fail", overall_score=0.1)
    planning_only_page = high_signal_page(status="degraded")
    planning_only_page["warnings"] = ["video_page_stub is planning-only and not real perception ready"]

    assert valid["downstreamReadiness"] == "pass"
    assert no_signal["downstreamReadiness"] != "pass"
    assert planning_only_page["status"] != "ready"

    for payload in [valid, no_signal, planning_only_page]:
        assert_schema_valid(payload)


def test_candidate_extractor_result_is_isolated_from_final_contracts() -> None:
    assert_schema_valid(candidate_extraction_result())

    forbidden_candidate_keys = {"extractorName", "candidateBlockId"}
    for final_payload in [high_signal_page(), source_map(), perception_digest(), quality_report()]:
        assert not (walk_keys(final_payload) & forbidden_candidate_keys)

    leaked = copy.deepcopy(high_signal_page())
    leaked["highSignalBlocks"][0]["extractorName"] = "dom_baseline"
    assert_schema_invalid(leaked)


def test_a_v1_1_boundary_does_not_introduce_forbidden_runtime_couplings() -> None:
    forbidden_tokens = {
        "ArtifactRecord",
        "EventStore",
        "text/event-stream",
        "ServerSentEvent",
        "MCP",
        "Skill",
        "CoreProvider",
        "OCR",
        "VLM",
        "ASR",
        "video engine",
        "live engine",
    }
    runtime_text = "\n".join(path.read_text(encoding="utf-8") for path in RUNTIME_DIR.glob("*.py"))
    found = sorted(token for token in forbidden_tokens if token in runtime_text)
    assert found == []
