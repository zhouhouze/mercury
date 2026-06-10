from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


REPO_ROOT = Path(__file__).resolve().parents[6]
SCHEMA_PATH = REPO_ROOT / "docs/navia_v1_project_docs/contracts/a_v1_2_page_perception.schema.json"


def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def validator() -> Draft202012Validator:
    return Draft202012Validator(load_schema())


def assert_schema_valid(payload: dict[str, Any]) -> None:
    errors = sorted(validator().iter_errors(payload), key=lambda error: list(error.path))
    assert errors == [], [error.message for error in errors]


def assert_schema_invalid(payload: dict[str, Any]) -> None:
    errors = sorted(validator().iter_errors(payload), key=lambda error: list(error.path))
    assert errors, "payload unexpectedly passed A-V1.2 schema validation"


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
        "headingPath": ["Navia"],
        "textQuote": "Navia extracts grounded page facts.",
        "textHash": "sha256_abcdef1234567890abcdef1234567890",
        "fallbackText": "Navia extracts grounded page facts.",
        "confidence": 0.96,
    }
    base.update(overrides)
    return base


def high_signal_page(status: str = "ready") -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-page-perception-2026-06-05",
        "pageId": "page_contract",
        "sessionId": "sess_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "sourceStructuredPageRef": {
            "pageId": "page_contract",
            "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        },
        "metadata": {"language": "en", "contentType": "documentation", "wordCount": 100, "paragraphCount": 2, "headingCount": 1},
        "highSignalBlocks": [
            {
                "blockId": "block_001",
                "pageId": "page_contract",
                "contentHash": "sha256_1234567890abcdef1234567890abcdef",
                "blockType": "paragraph",
                "order": 0,
                "text": "Navia extracts grounded page facts.",
                "paragraphIds": ["para_001"],
                "chunkIds": ["chunk_001"],
                "sourceRefs": [source_ref()],
                "regionType": "main",
                "contentDensityScore": 0.9,
                "noiseScore": 0.05,
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
                "order": 9,
                "textQuote": "Home Pricing",
                "textHash": "sha256_11111111111111111111111111111111",
                "regionType": "nav",
                "noiseScore": 0.9,
                "reason": "navigation",
                "sourceRefs": [source_ref(sourceRefId="src_nav", blockId="block_nav", blockType="list_item", order=9)],
            }
        ],
        "sourceMapRef": "smap_contract",
        "digestRef": "digest_contract",
        "qualityReportRef": "q_contract",
        "status": status,
        "warnings": [],
    }


def source_map(status: str = "pass") -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-source-map-2026-06-05",
        "sourceMapId": "smap_contract",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "status": status,
        "sourceRefs": [source_ref()],
    }


def perception_digest(status: str = "pass") -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-perception-digest-2026-06-05",
        "digestId": "digest_contract",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "status": status,
        "items": [
            {
                "itemId": "item_001",
                "kind": "key_fact",
                "text": "A module returns grounded perception facts, not final answers.",
                "importance": 0.9,
                "confidence": 0.95,
                "sourceRefs": [source_ref()],
                "relatedParagraphIds": ["para_001"],
                "relatedChunkIds": ["chunk_001"],
                "warnings": [],
            }
        ],
        "rejectedItems": [],
        "summary": {"tldr": "A returns grounded page perception.", "keyTakeaways": ["Digest items require sourceRefs."]},
        "stats": {"itemCount": 1, "sourceRefCount": 1, "compressionRatio": 0.22},
    }


def metric(value: float, numerator: float, denominator: float, threshold: float, passed: bool, method: str) -> dict[str, Any]:
    return {
        "value": value,
        "numerator": numerator,
        "denominator": denominator,
        "method": method,
        "threshold": threshold,
        "passed": passed,
        "denominatorZeroBehavior": "fail_when_empty",
    }


def quality_report(status: str = "pass") -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-quality-report-2026-06-05",
        "reportId": "q_contract",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "status": status,
        "overallScore": 0.88,
        "overallFormula": "0.20*sourceCoverage + 0.20*groundingCompleteness + 0.15*jumpbackCoverage + 0.15*(1-noiseRatio) + 0.10*contentCoverage + 0.10*compressionScore + 0.10*candidateFactDensity",
        "overallWeights": {
            "sourceCoverage": 0.2,
            "groundingCompleteness": 0.2,
            "jumpbackCoverage": 0.15,
            "inverseNoiseRatio": 0.15,
            "contentCoverage": 0.1,
            "compressionScore": 0.1,
            "candidateFactDensity": 0.1,
        },
        "lowSignalHandling": "fail",
        "metrics": {
            "noiseRatio": metric(0.08, 1, 12, 0.25, True, "filteredOrDowngradedNoiseBlocks / allDetectedBlocks"),
            "contentCoverage": metric(0.9, 900, 1000, 0.75, True, "highSignalContentChars / readableContentChars"),
            "sourceCoverage": metric(1.0, 1, 1, 0.95, True, "highSignalBlocksWithSourceRef / highSignalBlocksTotal"),
            "groundingCompleteness": metric(1.0, 1, 1, 0.95, True, "digestItemsWithSourceRefs / digestItemsTotal"),
            "jumpbackCoverage": metric(1.0, 1, 1, 0.9, True, "sourceRefsWithTextQuoteOrFallbackText / sourceRefsTotal"),
            "digestCompressionRatio": metric(0.22, 220, 1000, 0.35, True, "digestTextTokenEstimate / structuredPageTextTokenEstimate"),
            "compressionScore": metric(1.0, 0.22, 0.22, 0.75, True, "1 - min(abs(digestCompressionRatio - 0.22) / 0.22, 1)"),
            "candidateFactDensity": metric(0.7, 7, 10, 0.5, True, "digestCandidateFactItems / digestTokenEstimate"),
        },
        "downstreamReadiness": status,
        "fatalIssues": [],
        "warnings": [],
    }


def extractor_comparison(winner: str = "dom_baseline") -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-extractor-comparison-2026-06-05",
        "pageKey": "page_contract",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "selectionFormula": "0.35*sourceRefCoverage + 0.25*(1-estimatedNoiseRatio) + 0.20*headingCoverage + 0.20*mainTextCoverage",
        "winner": winner,
        "fallbackUsed": winner == "dom_baseline",
        "fallbackReason": "tie_to_dom_baseline" if winner == "dom_baseline" else "none",
        "tieBreaker": "highest_score_then_dom_baseline_then_sourceRefCoverage_then_mainTextChars",
        "candidates": [
            {
                "extractorName": "dom_baseline",
                "status": "available",
                "blockCount": 2,
                "mainTextChars": 200,
                "mainTextCoverage": 1.0,
                "estimatedNoiseRatio": 0.1,
                "headingCoverage": 0.8,
                "sourceRefCoverage": 1.0,
                "score": 0.91,
                "rejectionReason": "none",
                "warnings": [],
            },
            {
                "extractorName": "trafilatura",
                "status": "rejected",
                "blockCount": 0,
                "mainTextChars": 0,
                "mainTextCoverage": 0.0,
                "estimatedNoiseRatio": 1.0,
                "headingCoverage": 0.0,
                "sourceRefCoverage": 0.0,
                "score": 0.0,
                "rejectionReason": "dependency_not_approved",
                "warnings": ["dependency audit decision is not approved"],
            },
        ],
        "warnings": [],
    }


def debug_evidence() -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-debug-evidence-2026-06-05",
        "pageId": "page_contract",
        "contentHash": "sha256_1234567890abcdef1234567890abcdef",
        "status": "pass",
        "statusReason": "All source grounding metrics passed.",
        "rawSignals": {
            "url": "https://example.com/article",
            "title": "Example",
            "domain": "example.com",
            "capturedAt": "2026-06-05T00:00:00Z",
            "htmlAvailable": True,
            "visibleTextLength": 1200,
            "cleanedTextLength": 1000,
            "headingCount": 1,
            "imageCount": 0,
            "tableCount": 0,
            "codeBlockCount": 0,
            "linkCount": 4,
        },
        "candidateExtraction": extractor_comparison(),
        "filteredEvidence": high_signal_page()["filteredBlocks"],
        "highSignalPage": high_signal_page(),
        "sourceMap": source_map(),
        "perceptionDigest": perception_digest(),
        "qualityReport": quality_report(),
        "auditTrail": [
            {"step": "extraction", "status": "pass", "summary": "DOM baseline produced main blocks."},
            {"step": "filtering", "status": "pass", "summary": "Navigation was filtered with evidence."},
            {"step": "digest", "status": "pass", "summary": "Digest items are source grounded."},
            {"step": "source_map", "status": "pass", "summary": "Fallback text supports jumpback."},
            {"step": "quality", "status": "pass", "summary": "Quality metrics passed."},
        ],
        "warnings": [],
    }


def corpus_record() -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-corpus-page-2026-06-05",
        "pageKey": "news_001",
        "url": "https://example.com/news",
        "snapshotPath": "fixtures/a_v1_2/news_001.html",
        "category": "news_article",
        "language": "en",
        "complexityTags": ["sidebar", "ads"],
        "expectedRisks": ["recommendation noise"],
        "goldStatus": "reviewed",
        "allowedNetworkAtCapture": False,
        "capturedAt": "2026-06-05T00:00:00Z",
        "sourceLicenseNote": "snapshot stores bounded reproducible HTML for validation",
        "expectedOutcome": "pass",
    }


def gold_record() -> dict[str, Any]:
    return {
        "schemaVersion": "a-v1.2-gold-evaluation-2026-06-05",
        "pageKey": "news_001",
        "reviewedBy": "human",
        "reviewedAt": "2026-06-05T00:00:00Z",
        "goldMainContentBlocks": ["block_001"],
        "goldRejectedNoiseBlocks": ["block_nav"],
        "goldDigestItems": perception_digest()["items"],
        "goldSourceRefs": [source_ref()],
        "reviewNotes": ["Contract fixture covers source grounding."],
    }


def test_a_v1_2_schema_file_is_draft_2020_12_valid() -> None:
    Draft202012Validator.check_schema(load_schema())


def test_a_v1_2_public_contract_payloads_validate() -> None:
    for payload in [high_signal_page(), source_map(), perception_digest(), quality_report(), debug_evidence(), corpus_record(), gold_record(), extractor_comparison()]:
        assert_schema_valid(payload)


def test_a_v1_2_rejects_v1_1_schema_version_for_high_signal_context() -> None:
    payload = high_signal_page()
    payload["schemaVersion"] = "a-v1.1-high-signal-2026-06-05"
    assert_schema_invalid(payload)


def test_source_map_requires_schema_version_and_status() -> None:
    payload = source_map()
    del payload["schemaVersion"]
    assert_schema_invalid(payload)


def test_quality_metric_requires_numerator_denominator_threshold_and_zero_behavior() -> None:
    payload = quality_report()
    del payload["metrics"]["sourceCoverage"]["denominatorZeroBehavior"]
    assert_schema_invalid(payload)


def test_quality_report_requires_frozen_formula_and_weights() -> None:
    payload = quality_report()
    payload["overallWeights"]["sourceCoverage"] = 0.25
    assert_schema_invalid(payload)


def test_corpus_record_requires_reproducible_snapshot_and_reviewed_gold_status() -> None:
    url_only = corpus_record()
    del url_only["snapshotPath"]
    assert_schema_invalid(url_only)

    planned = corpus_record()
    planned["goldStatus"] = "planned"
    assert_schema_invalid(planned)


def test_extractor_comparison_requires_selection_formula_and_rejection_reason() -> None:
    payload = extractor_comparison()
    del payload["selectionFormula"]
    assert_schema_invalid(payload)

    payload = extractor_comparison()
    del payload["candidates"][1]["rejectionReason"]
    assert_schema_invalid(payload)


def test_debug_evidence_must_explain_status_and_include_all_audit_steps() -> None:
    payload = debug_evidence()
    payload["auditTrail"] = payload["auditTrail"][:4]
    assert_schema_invalid(payload)

    payload = debug_evidence()
    payload["statusReason"] = ""
    assert_schema_invalid(payload)


def test_schema_rejects_third_party_raw_leak_in_high_signal_page() -> None:
    payload = high_signal_page()
    payload["highSignalBlocks"][0]["trafilaturaRaw"] = {"text": "raw third-party output"}
    assert_schema_invalid(payload)
