import { describe, expect, it } from "vitest";
import {
  applyChatEvent,
  applyRuntimeStatus,
  createChatPresentationState,
  selectChatViewModel,
  type AgentEvent
} from "../chatPresentation";
import { buildJumpbackRequest, presentMindmapArtifact } from "../../mindmap_renderer/mindmapPresentation";

function replay(events: AgentEvent[]) {
  return events.reduce((state, event) => applyChatEvent(state, event), createChatPresentationState());
}

const summaryArtifact = {
  artifactId: "art_summary",
  type: "summary",
  sourcePageId: "page_fixture",
  sourceChunkIds: ["ck_0001"],
  source: "page",
  content: "## Summary\n- Navia extracts page context.",
  metadata: { format: "markdown", title: "Companion Reading Architecture" }
};

const mindmapArtifact = {
  artifactId: "art_mindmap",
  type: "mindmap",
  sourcePageId: "page_fixture",
  sourceChunkIds: ["ck_0001"],
  source: "page",
  content: "mindmap\n  root((Companion Reading Architecture))\n    Structured Page Facts",
  metadata: {
    format: "mermaid",
    nodeBindings: [
      {
        nodeId: "root",
        nodeSourceMapKey: "root",
        nodeLabel: "Companion Reading Architecture",
        mermaidLineIndex: 1,
        sourceRefIds: ["src_0001"],
        paragraphIds: ["pg_0001"],
        chunkIds: ["ck_0001"]
      }
    ],
    nodeSourceMap: {
      root: {
        nodeLabel: "Companion Reading Architecture",
        sourceRefIds: ["src_0001"],
        paragraphIds: ["pg_0001"],
        chunkIds: ["ck_0001"],
        excerpt: "Navia extracts page context.",
        fallbackText: "Navia extracts page context.",
        jumpback: { mode: "fallback", reason: "selector_missing" }
      }
    }
  }
};

describe("chat renderer presentation reducer", () => {
  it("accumulates response deltas and closes the assistant message", () => {
    const state = replay([
      { type: "response.delta", data: { text: "Hello " } },
      { type: "response.delta", data: { text: "Navia" } },
      { type: "response.done", data: { message_id: "msg_1" } }
    ]);

    const viewModel = selectChatViewModel(state);
    expect(viewModel.activeAssistantText).toBeNull();
    expect(viewModel.messages).toEqual([{ role: "assistant", text: "Hello Navia", status: "done" }]);
  });

  it("renders tool state and summary artifact handoff", () => {
    const state = replay([
      { type: "tool.started", data: { tool_call_id: "tc_1", tool_name: "page.summarize" } },
      { type: "tool.done", data: { tool_call_id: "tc_1", tool_name: "page.summarize", status: "succeeded" } },
      { type: "artifact.created", data: { artifact_id: "art_summary", artifact: summaryArtifact } }
    ]);

    const viewModel = selectChatViewModel(state);
    expect(viewModel.tools[0]).toMatchObject({ toolCallId: "tc_1", toolName: "page.summarize", status: "succeeded" });
    expect(viewModel.artifacts[0]).toMatchObject({ artifactId: "art_summary", kind: "summary", sourcePageId: "page_fixture" });
  });

  it("creates mindmap handoff and supports source fallback on render error", () => {
    const state = replay([{ type: "artifact.created", data: { artifact_id: "art_mindmap", artifact: mindmapArtifact } }]);
    const viewModel = selectChatViewModel(state);
    const fallback = presentMindmapArtifact(mindmapArtifact, "Mermaid render failed");

    expect(viewModel.mindmaps[0].renderMode).toBe("mermaid");
    expect(fallback.renderMode).toBe("source_fallback");
    expect(fallback.sourceFallback).toContain("mindmap");
    expect(fallback.sourceFallback).toContain("Navia extracts page context.");
    expect(fallback.nodeSourceMap.root).toBeTruthy();
    expect(fallback.nodeBindings[0]).toMatchObject({ nodeSourceMapKey: "root", sourceRefIds: ["src_0001"] });
    expect(fallback.sourceCards[0]).toMatchObject({
      nodeSourceMapKey: "root",
      fallbackText: "Navia extracts page context."
    });
    expect(buildJumpbackRequest(fallback.sourceCards[0])).toMatchObject({
      nodeId: "root",
      sourceRefIds: ["src_0001"],
      fallbackText: "Navia extracts page context."
    });
  });

  it("shows runtime offline, missing page context, tool failure, and unknown events without crashing", () => {
    let state = applyRuntimeStatus(createChatPresentationState(), "offline");
    state = applyChatEvent(state, { type: "error", data: { code: "PAGE_CONTEXT_REQUIRED", message: "请先读取当前页面" } });
    state = applyChatEvent(state, { type: "tool.done", data: { tool_call_id: "tc_fail", tool_name: "fixture.failure", status: "failed" } });
    state = applyChatEvent(state, { type: "future.event", data: { value: 1 } });

    const viewModel = selectChatViewModel(state);
    expect(viewModel.runtime.status).toBe("offline");
    expect(viewModel.visibleErrors).toContain("Runtime offline");
    expect(viewModel.visibleErrors).toContain("请先读取当前页面");
    expect(viewModel.tools[0]).toMatchObject({ status: "failed" });
    expect(viewModel.debugCount).toBeGreaterThanOrEqual(2);
  });

  it("does not treat budget denied events as started tools", () => {
    const state = replay([{ type: "tool.denied", data: { tool_call_id: "tc_budget", tool_name: "page.summarize", reason: "BUDGET_EXCEEDED", message: "budget exhausted" } }]);
    const viewModel = selectChatViewModel(state);

    expect(viewModel.tools).toHaveLength(1);
    expect(viewModel.tools[0]).toMatchObject({ toolCallId: "tc_budget", status: "budget_exceeded" });
    expect(viewModel.artifacts).toHaveLength(0);
  });
});
