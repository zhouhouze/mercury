from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from navia_runtime.modules.page_reading.corpus_evidence import generate_corpus_evidence


REPO_ROOT = Path(__file__).resolve().parents[6]
SCHEMA_PATH = REPO_ROOT / "docs/active/project/contracts/a_v1_2_page_perception.schema.json"


def test_generates_a_v1_2_debug_and_quality_evidence(tmp_path: Path) -> None:
    snapshot_dir = tmp_path / "snapshots"
    snapshot_dir.mkdir()
    snapshot = snapshot_dir / "article.html"
    snapshot.write_text(
        """
        <html><head><title>Corpus Article</title></head><body>
        <main>
          <h1>Corpus Article</h1>
          <p>Navia page perception extracts grounded facts from readable webpages.</p>
          <p>Evidence includes source references, fallback text, and quality metrics.</p>
          <p>Procedure: parse the page, classify blocks, create digest items, and validate evidence.</p>
        </main>
        </body></html>
        """,
        encoding="utf-8",
    )
    manifest = tmp_path / "corpus-manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "schemaVersion": "a-v1.2-corpus-manifest-2026-06-08",
                "pages": [
                    {
                        "schemaVersion": "a-v1.2-corpus-page-2026-06-05",
                        "pageKey": "article",
                        "url": "https://corpus.example/article",
                        "snapshotPath": "snapshots/article.html",
                        "category": "news_article",
                        "language": "en",
                        "complexityTags": ["longform"],
                        "expectedRisks": ["noise_filtering"],
                        "goldStatus": "reviewed",
                        "allowedNetworkAtCapture": True,
                        "capturedAt": "2026-06-09T00:00:00Z",
                        "sourceLicenseNote": "test",
                        "expectedOutcome": "pass",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    report = generate_corpus_evidence(manifest)

    assert report["generated"] == 1
    assert report["failed"] == 0
    debug = read_json(tmp_path / "article.debug-evidence.json")
    quality = read_json(tmp_path / "article.quality-report.json")
    assert_schema_valid(debug)
    assert_schema_valid(quality)
    assert debug["statusReason"]
    assert debug["auditTrail"]
    assert quality["metrics"]["sourceCoverage"]["denominatorZeroBehavior"] in {"not_applicable", "fail_when_empty"}


def assert_schema_valid(payload: dict[str, Any]) -> None:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    errors = sorted(Draft202012Validator(schema).iter_errors(payload), key=lambda error: list(error.path))
    assert errors == [], [error.message for error in errors]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
