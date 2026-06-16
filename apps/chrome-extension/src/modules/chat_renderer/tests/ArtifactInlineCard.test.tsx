import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArtifactInlineCard } from "../ArtifactInlineCard";

vi.mock("mermaid", () => ({
  default: {
    render: vi.fn(async () => ({ svg: "<svg><text>Source node</text></svg>" }))
  }
}));

const artifact = {
  artifactId: "art_jumpback",
  type: "mindmap",
  sourcePageId: "page_1",
  turnId: "turn_1",
  toolCallId: "tc_1",
  source: "page",
  content: "mindmap\n  root((Source node))",
  metadata: {
    format: "mermaid",
    nodeBindings: [
      {
        nodeId: "root",
        nodeSourceMapKey: "root",
        nodeLabel: "Source node",
        mermaidLineIndex: 1,
        sourceRefIds: ["src_1"],
        paragraphIds: ["pg_1"],
        chunkIds: ["ck_1"]
      }
    ],
    nodeSourceMap: {
      root: {
        nodeLabel: "Source node",
        sourceRefIds: ["src_1"],
        paragraphIds: ["pg_1"],
        chunkIds: ["ck_1"],
        textQuote: "Traceable source quote.",
        fallbackText: "Traceable source quote.",
        jumpback: { mode: "fallback", reason: "selector_missing" }
      }
    }
  }
};

describe("ArtifactInlineCard jumpback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("sends a current-tab jumpback request when a source card is clicked", async () => {
    const sendMessage = vi.fn(async () => ({ ok: true, result: { status: "fallback_shown" } }));
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      tabs: {
        query: vi.fn(async () => [{ id: 7 }]),
        sendMessage
      }
    } as unknown as typeof chrome;

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<ArtifactInlineCard artifact={artifact} />);
      });
      await act(async () => {
        await Promise.resolve();
      });

      const sourceButton = container.querySelector("[data-testid='mindmap-source-card-root']");
      expect(sourceButton).toBeTruthy();
      await act(async () => {
        sourceButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(sendMessage).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          type: "navia.jumpToSource",
          request: expect.objectContaining({
            nodeId: "root",
            sourceRefIds: ["src_1"],
            fallbackText: "Traceable source quote."
          })
        })
      );
    } finally {
      root.unmount();
      globalThis.chrome = originalChrome;
    }
  });
});
