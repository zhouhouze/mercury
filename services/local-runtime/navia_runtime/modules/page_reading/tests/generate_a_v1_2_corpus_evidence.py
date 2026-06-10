from __future__ import annotations

import argparse
import json
from pathlib import Path

from navia_runtime.modules.page_reading.corpus_evidence import generate_corpus_evidence


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate A-V1.2 corpus perception evidence files.")
    parser.add_argument(
        "--manifest",
        default="services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/corpus-manifest.json",
    )
    parser.add_argument("--output-dir")
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    output_dir = Path(args.output_dir) if args.output_dir else manifest_path.parent
    report = generate_corpus_evidence(manifest_path, output_dir=output_dir)
    report_path = output_dir / "corpus-evidence-generation-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    return 0 if report["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
