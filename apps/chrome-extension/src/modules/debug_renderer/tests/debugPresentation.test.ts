import { describe, expect, it } from "vitest";
import { presentPagePerceptionDebug } from "../debugPresentation";

const perceptionBundle = {
  highSignalPage: {
    pageId: "page_debug",
    contentHash: "sha256_debug",
    highSignalBlocks: [{ blockId: "blk_1" }],
    filteredBlocks: [{ blockId: "blk_noise" }]
  },
  perceptionDigest: {
    pageId: "page_debug",
    contentHash: "sha256_debug",
    items: [{ itemId: "item_1", sourceRefs: [{ sourceRefId: "src_1" }] }]
  },
  sourceMap: {
    pageId: "page_debug",
    contentHash: "sha256_debug",
    sourceRefs: [{ sourceRefId: "src_1", fallbackText: "Navia extracts page context.", textQuote: "Navia extracts page context." }]
  },
  qualityReport: {
    pageId: "page_debug",
    contentHash: "sha256_debug",
    downstreamReadiness: "pass",
    metrics: {
      sourceCoverage: {
        value: 1,
        numerator: 1,
        denominator: 1,
        threshold: 0.95,
        passed: true,
        method: "highSignalBlocksWithSourceRef / highSignalBlocksTotal"
      }
    },
    fatalIssues: [],
    warnings: []
  }
};

describe("debug perception presentation", () => {
  it("summarizes A perception bundle quality and source fallbacks", () => {
    const view = presentPagePerceptionDebug({ perception: perceptionBundle });

    expect(view.status).toBe("pass");
    expect(view.pageId).toBe("page_debug");
    expect(view.highSignalBlockCount).toBe(1);
    expect(view.filteredBlockCount).toBe(1);
    expect(view.digestItemCount).toBe(1);
    expect(view.sourceRefCount).toBe(1);
    expect(view.metrics[0]).toMatchObject({ name: "sourceCoverage", passed: true });
    expect(view.sourceFallbacks[0]).toEqual({ sourceRefId: "src_1", text: "Navia extracts page context." });
  });
});
