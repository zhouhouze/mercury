import { describe, expect, it } from "vitest";
import {
  buildEvidenceCardJumpbackRequest,
  presentMindmapArtifact,
  selectEvidenceCardNode,
  toEvidenceCardViewModel,
  type EvidenceCardNode
} from "../mindmapPresentation";

const baseArtifact = {
  artifactId: "art_v13",
  type: "mindmap",
  sourcePageId: "page_v13",
  source: "page",
  content: "mindmap\n  root((Companion Reading Architecture))\n    capture((Page Capture))\n    capture2((Page Capture))\n    long((A very long evidence card label that should be truncated before it breaks the native side panel layout because it contains many words))",
  metadata: {
    format: "mermaid",
    title: "Companion Reading Architecture",
    nodeBindings: [
      {
        nodeId: "root",
        nodeSourceMapKey: "root",
        nodeLabel: "Companion Reading Architecture",
        mermaidLineIndex: 1,
        sourceRefIds: ["src_root"],
        paragraphIds: ["pg_root"],
        chunkIds: ["ck_root"]
      },
      {
        nodeId: "capture",
        nodeSourceMapKey: "capture",
        nodeLabel: "Page Capture",
        mermaidLineIndex: 2,
        sourceRefIds: ["src_capture"],
        paragraphIds: ["pg_capture"],
        chunkIds: ["ck_capture"]
      },
      {
        nodeId: "capture2",
        nodeSourceMapKey: "capture2",
        nodeLabel: "Page Capture",
        mermaidLineIndex: 3,
        sourceRefIds: ["src_capture_2"],
        paragraphIds: ["pg_capture_2"],
        chunkIds: ["ck_capture_2"]
      },
      {
        nodeId: "long",
        nodeSourceMapKey: "long",
        nodeLabel: "A very long evidence card label that should be truncated before it breaks the native side panel layout because it contains many words",
        mermaidLineIndex: 4,
        sourceRefIds: ["src_long"],
        paragraphIds: ["pg_long"],
        chunkIds: ["ck_long"]
      }
    ],
    nodeSourceMap: {
      root: {
        nodeLabel: "Companion Reading Architecture",
        sourceRefIds: ["src_root"],
        paragraphIds: ["pg_root"],
        chunkIds: ["ck_root"],
        textQuote: "Navia reads the active page and produces traceable artifacts.",
        fallbackText: "Navia reads the active page and produces traceable artifacts.",
        confidence: 0.94,
        jumpback: { mode: "selector", selector: "#root-source" }
      },
      capture: {
        nodeLabel: "Page Capture",
        sourceRefIds: ["src_capture"],
        paragraphIds: ["pg_capture"],
        chunkIds: ["ck_capture"],
        textQuote: "Page capture creates structured page context.",
        fallbackText: "Page capture creates structured page context.",
        confidence: 0.86,
        jumpback: { mode: "fallback", reason: "selector_missing" }
      },
      capture2: {
        nodeLabel: "Page Capture",
        sourceRefIds: ["src_capture_2"],
        paragraphIds: ["pg_capture_2"],
        chunkIds: ["ck_capture_2"],
        textQuote: "Duplicate labels keep separate node identifiers.",
        fallbackText: "Duplicate labels keep separate node identifiers.",
        confidence: 0.82,
        jumpback: { mode: "fallback", reason: "selector_missing" }
      },
      long: {
        nodeLabel: "Long Node",
        sourceRefIds: ["src_long"],
        paragraphIds: ["pg_long"],
        chunkIds: ["ck_long"],
        textQuote: "Long labels must wrap or truncate instead of overflowing.",
        fallbackText: "Long labels must wrap or truncate instead of overflowing.",
        confidence: 0.76,
        jumpback: { mode: "fallback", reason: "selector_missing" }
      }
    }
  }
};

describe("V1.3 Evidence Card Mindmap presentation", () => {
  it("derives EvidenceCardViewModel from existing artifact metadata", () => {
    const viewModel = toEvidenceCardViewModel(baseArtifact);

    expect(viewModel.renderMode).toBe("evidence_card");
    expect(viewModel.artifactId).toBe("art_v13");
    expect(viewModel.sourcePageId).toBe("page_v13");
    expect(viewModel.nodes).toHaveLength(4);
    expect(viewModel.nodes[0]).toMatchObject({
      nodeId: "root",
      qualityState: "ready",
      sourceRefIds: ["src_root"],
      sourceCount: 1
    });
    expect(viewModel.displayPolicy).toMatchObject({
      maxDepth: 2,
      density: "low",
      rootNodeId: "root"
    });
    expect(viewModel.themes.map((theme) => theme.nodeId)).toEqual(["capture", "capture2", "long"]);
    expect(viewModel.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders PiAgent generated minimal metadata as Evidence Card Mindmap", () => {
    const piArtifact = {
      artifactId: "art_piagent",
      type: "mindmap",
      sourcePageId: "page_piagent",
      source: "page",
      content: "mindmap\n  root((斯塔默辞职 2026.06.22))\n    辞职经过\n      宣布辞去首相职务\n    辞职原因\n      工党地方选举惨败",
      metadata: {
        format: "mermaid",
        generatedBy: "piagent",
        layout: "pyramid",
        maxDepth: 3,
        nodeBindings: [
          { nodeId: "root", nodeSourceMapKey: "root", nodeLabel: "斯塔默辞职 2026.06.22", mermaidLineIndex: 1, sourceRefIds: ["piagent_root"], paragraphIds: [], chunkIds: ["chunk_1"] },
          { nodeId: "node_1", nodeSourceMapKey: "node_1", nodeLabel: "辞职经过", mermaidLineIndex: 2, sourceRefIds: ["piagent_node_1"], paragraphIds: [], chunkIds: ["chunk_1"] },
          { nodeId: "node_2", nodeSourceMapKey: "node_2", nodeLabel: "宣布辞去首相职务", mermaidLineIndex: 3, sourceRefIds: ["piagent_node_2"], paragraphIds: [], chunkIds: ["chunk_1"] }
        ],
        nodeSourceMap: {
          root: { nodeLabel: "斯塔默辞职 2026.06.22", sourceRefIds: ["piagent_root"], paragraphIds: [], chunkIds: ["chunk_1"], fallbackText: "页面上下文摘要", jumpback: { mode: "fallback" } },
          node_1: { nodeLabel: "辞职经过", sourceRefIds: ["piagent_node_1"], paragraphIds: [], chunkIds: ["chunk_1"], fallbackText: "页面上下文摘要", jumpback: { mode: "fallback" } },
          node_2: { nodeLabel: "宣布辞去首相职务", sourceRefIds: ["piagent_node_2"], paragraphIds: [], chunkIds: ["chunk_1"], fallbackText: "页面上下文摘要", jumpback: { mode: "fallback" } }
        }
      }
    };

    const presentation = presentMindmapArtifact(piArtifact);

    expect(presentation.renderMode).toBe("evidence_card");
    expect(presentation.evidenceCardViewModel.displayPolicy.maxDepth).toBe(2);
    expect(presentation.evidenceCardViewModel.themes.length).toBeGreaterThan(0);
    expect(presentation.sourceCards.length).toBeGreaterThan(0);
  });

  it("creates a density-aware two-level theme plan for large flat mindmaps", () => {
    const denseArtifact = buildDenseArtifact(24);
    const viewModel = toEvidenceCardViewModel(denseArtifact);

    expect(viewModel.displayPolicy).toMatchObject({
      maxDepth: 2,
      density: "high",
      maxVisibleThemes: 4,
      maxVisibleChildrenPerTheme: 2
    });
    expect(viewModel.themes).toHaveLength(4);
    expect(viewModel.themes.every((theme) => theme.visibleChildNodeIds.length <= 2)).toBe(true);
    expect(viewModel.displayPolicy.hiddenNodeCount).toBeGreaterThan(0);
  });

  it("keeps duplicate labels distinct by nodeId and sourceRefIds", () => {
    const viewModel = toEvidenceCardViewModel(baseArtifact);
    const captures = viewModel.nodes.filter((node) => node.label === "Page Capture");

    expect(captures).toHaveLength(2);
    expect(captures.map((node) => node.nodeId).sort()).toEqual(["capture", "capture2"]);
    expect(captures.map((node) => node.sourceRefIds[0]).sort()).toEqual(["src_capture", "src_capture_2"]);
  });

  it("truncates long labels and keeps source fallback text", () => {
    const viewModel = toEvidenceCardViewModel(baseArtifact);
    const node = viewModel.nodes.find((item) => item.nodeId === "long");

    expect(node?.label.length).toBeLessThanOrEqual(96);
    expect(node?.label.endsWith("…")).toBe(true);
    expect(node?.fallbackText).toContain("Long labels must wrap");
  });

  it("marks missing source as degraded evidence instead of normal success", () => {
    const artifact = {
      ...baseArtifact,
      artifactId: "art_missing",
      metadata: {
        ...baseArtifact.metadata,
        nodeBindings: [
          {
            nodeId: "missing",
            nodeSourceMapKey: "missing",
            nodeLabel: "Missing Source",
            mermaidLineIndex: 1,
            sourceRefIds: [],
            paragraphIds: [],
            chunkIds: []
          }
        ],
        nodeSourceMap: {
          missing: {
            nodeLabel: "Missing Source"
          }
        }
      }
    };

    const viewModel = toEvidenceCardViewModel(artifact);

    expect(viewModel.nodes[0]).toMatchObject({
      nodeId: "missing",
      qualityState: "missing_source",
      degradedReason: "sourceRefIds missing"
    });
    expect(viewModel.fallbacks.some((fallback) => fallback.reason === "missing_source_ref")).toBe(true);
  });

  it("selects nodes with highlighted neighbors and source panel state", () => {
    const viewModel = toEvidenceCardViewModel(baseArtifact);
    const selected = selectEvidenceCardNode(viewModel, "capture", "fallback_shown", "selector_missing");

    expect(selected.interactionState.selectedNodeId).toBe("capture");
    expect(selected.sourcePanel).toMatchObject({
      status: "fallback_shown",
      selectedNodeId: "capture",
      failureReason: "selector_missing"
    });
    expect(selected.sourcePanel.items[0]).toMatchObject({
      sourceRefId: "src_capture",
      jumpbackStatus: "fallback_shown"
    });
    expect(selected.nodes.find((node) => node.nodeId === "capture")?.uiState).toBe("fallback_shown");
  });

  it("keeps Mermaid as fallback when render fails", () => {
    const presentation = presentMindmapArtifact(baseArtifact, "Mermaid render failed");

    expect(presentation.renderMode).toBe("source_fallback");
    expect(presentation.evidenceCardViewModel.renderMode).toBe("evidence_card");
    expect(presentation.evidenceCardViewModel.fallbacks).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: "mermaid_render_failed", visibleToUser: true })])
    );
  });

  it("builds jumpback requests from cards and fallback requests from missing source nodes", () => {
    const presentation = presentMindmapArtifact(baseArtifact);
    expect(buildEvidenceCardJumpbackRequest(presentation.evidenceCardViewModel.nodes[0], presentation.sourceCards[0])).toMatchObject({
      nodeId: "root",
      sourceRefIds: ["src_root"],
      selector: "#root-source"
    });

    const missingNode: EvidenceCardNode = {
      nodeId: "missing",
      label: "Missing Source",
      depth: 1,
      parentNodeId: null,
      childNodeIds: [],
      sourceRefIds: [],
      sourceCount: 0,
      confidence: null,
      qualityState: "missing_source",
      uiState: "default",
      tags: ["missing source"],
      degradedReason: "source_ref_missing",
      textQuote: null,
      fallbackText: "Fallback only."
    };
    expect(buildEvidenceCardJumpbackRequest(missingNode)).toMatchObject({
      nodeId: "missing",
      fallbackText: "Fallback only."
    });
  });
});

function buildDenseArtifact(nodeCount: number) {
  const nodeBindings = [
    {
      nodeId: "root",
      nodeSourceMapKey: "root",
      nodeLabel: "Dense Research Page",
      mermaidLineIndex: 1,
      sourceRefIds: ["src_root"],
      paragraphIds: ["pg_root"],
      chunkIds: ["ck_root"]
    },
    ...Array.from({ length: nodeCount }, (_, index) => ({
      nodeId: `node_${index}`,
      nodeSourceMapKey: `node_${index}`,
      nodeLabel: `Dense topic ${index + 1} with evidence`,
      mermaidLineIndex: index + 2,
      sourceRefIds: [`src_${index}`],
      paragraphIds: [`pg_${index}`],
      chunkIds: [`ck_${index}`]
    }))
  ];
  const nodeSourceMap = Object.fromEntries(
    nodeBindings.map((binding, index) => [
      binding.nodeSourceMapKey,
      {
        nodeLabel: binding.nodeLabel,
        sourceRefIds: binding.sourceRefIds,
        paragraphIds: binding.paragraphIds,
        chunkIds: binding.chunkIds,
        textQuote: `Evidence quote ${index}.`,
        fallbackText: `Evidence quote ${index}.`,
        confidence: Math.max(0.5, 0.95 - index * 0.01),
        jumpback: { mode: "fallback", reason: "selector_missing" }
      }
    ])
  );
  return {
    ...baseArtifact,
    artifactId: "art_dense",
    content: `mindmap\n  root((Dense Research Page))\n${Array.from({ length: nodeCount }, (_, index) => `    node_${index}((Dense topic ${index + 1} with evidence))`).join("\n")}`,
    metadata: {
      ...baseArtifact.metadata,
      nodeBindings,
      nodeSourceMap
    }
  };
}
