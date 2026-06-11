import { describe, expect, it } from "vitest";
import type { AgentEvent } from "../../../sse";
import { chatViewReducer, createChatViewState } from "../chatViewReducer";
import type { ChatViewAction, ChatViewState } from "../chatViewTypes";

const TECHNICAL_TERMS = ["ToolApprovalCard", "PiAgentCoreProvider", "sidecar", "toolNames", "CoreEvent", "raw event"];

function event(type: string, data: Record<string, unknown> = {}, turnId?: string): AgentEvent {
  return {
    event_id: `evt_${type}_${turnId ?? "none"}`,
    session_id: "sess_test",
    turn_id: turnId,
    type,
    data
  };
}

function reduce(actions: ChatViewAction[]): ChatViewState {
  return actions.reduce((state, action) => chatViewReducer(state, action), createChatViewState("chat"));
}

function assistantTexts(state: ChatViewState): string[] {
  return state.messages.filter((message) => message.role === "assistant").map((message) => message.text);
}

function uiShape(state: ChatViewState) {
  const assistants = state.messages.filter((message) => message.role === "assistant");
  return {
    roles: state.messages.map((message) => message.role),
    hasAssistant: assistants.length > 0,
    artifactTypes: assistants.flatMap((message) => (message.role === "assistant" ? message.artifacts.map((artifact) => artifact.type) : [])),
    deferredKind: state.deferredNotice ? "DeferredCapabilityNotice" : null,
    activeStatus: state.activeStatus?.text ?? null
  };
}

function expectNoTechnicalTerms(state: ChatViewState) {
  const visible = JSON.stringify({
    messages: state.messages,
    deferredNotice: state.deferredNotice,
    activeStatus: state.activeStatus
  });
  for (const term of TECHNICAL_TERMS) {
    expect(visible).not.toContain(term);
  }
}

const mindmapArtifact = {
  artifactId: "art_mindmap",
  type: "mindmap",
  sourcePageId: "page_1",
  turnId: "turn_mindmap",
  toolCallId: "tc_mindmap",
  source: "page",
  content: "mindmap\n  root((Navia))",
  metadata: { format: "mermaid", title: "Navia Mindmap" }
};

describe("ChatViewReducer turn lifecycle", () => {
  it("keeps independent turns from appending deltas to the previous assistant message", () => {
    const state = reduce([
      { type: "start_turn", turnId: "turn_1", text: "hello" },
      { type: "agent_event", event: event("response.delta", { text: "first" }, "turn_1") },
      { type: "agent_event", event: event("response.done", {}, "turn_1") },
      { type: "start_turn", turnId: "turn_2", text: "again" },
      { type: "agent_event", event: event("response.delta", { text: "second" }, "turn_2") }
    ]);

    expect(assistantTexts(state)).toEqual(["first", "second"]);
  });

  it("closes the active turn on response.done or error", () => {
    const done = reduce([
      { type: "start_turn", turnId: "turn_done", text: "hello" },
      { type: "agent_event", event: event("response.done", {}, "turn_done") }
    ]);
    const failed = reduce([
      { type: "start_turn", turnId: "turn_error", text: "hello" },
      { type: "agent_event", event: event("error", { message: "failed" }, "turn_error") }
    ]);

    expect(done.currentTurnId).toBeUndefined();
    expect(failed.currentTurnId).toBeUndefined();
    expect(failed.messages.find((message) => message.role === "assistant")?.status).toBe("error");
  });

  it("handles orphan events without appending them to a closed turn", () => {
    const state = reduce([
      { type: "agent_event", event: event("response.delta", { text: "orphan delta" }) },
      { type: "agent_event", event: event("artifact.created", { artifact: mindmapArtifact }) },
      { type: "agent_event", event: event("response.done") }
    ]);

    expect(assistantTexts(state)).toEqual(["orphan delta", ""]);
    expect(state.messages.filter((message) => message.role === "assistant")[1].artifacts[0].artifactId).toBe("art_mindmap");
    expect(state.debugWarnings.length).toBeGreaterThanOrEqual(3);
  });

  it("attaches late artifacts to the matching done assistant message without duplicates", () => {
    const state = reduce([
      { type: "start_turn", turnId: "turn_mindmap", text: "mindmap" },
      { type: "agent_event", event: event("response.delta", { text: "Here is the map" }, "turn_mindmap") },
      { type: "agent_event", event: event("response.done", {}, "turn_mindmap") },
      { type: "agent_event", event: event("artifact.created", { artifact: mindmapArtifact }, "turn_mindmap") },
      { type: "agent_event", event: event("artifact.created", { artifact: mindmapArtifact }, "turn_mindmap") }
    ]);
    const assistant = state.messages.find((message) => message.role === "assistant" && message.turnId === "turn_mindmap");

    expect(assistant?.role).toBe("assistant");
    if (assistant?.role !== "assistant") throw new Error("Expected assistant message.");
    expect(assistant?.artifacts).toHaveLength(1);
    expect(assistant?.artifacts[0].type).toBe("mindmap");
  });

  it("keeps state.transition as a transient per-turn status", () => {
    const state = reduce([
      { type: "start_turn", turnId: "turn_status", text: "summary" },
      { type: "agent_event", event: event("state.transition", { to: "context_resolving" }, "turn_status") },
      { type: "agent_event", event: event("state.transition", { to: "streaming_response" }, "turn_status") }
    ]);
    const afterDelta = chatViewReducer(state, { type: "agent_event", event: event("response.delta", { text: "answer" }, "turn_status") });

    expect(state.activeStatus?.text).toBe("正在生成回答……");
    expect(state.messages.filter((message) => message.role === "system").map((message) => message.text)).not.toContain("正在生成回答……");
    expect(afterDelta.activeStatus).toBeUndefined();
  });

  it("applies a conservative duplicate-prefix guard when provider sends snapshots as deltas", () => {
    const state = reduce([
      { type: "start_turn", turnId: "turn_snapshot", text: "聊聊马刺" },
      { type: "agent_event", event: event("response.delta", { text: "马刺" }, "turn_snapshot") },
      { type: "agent_event", event: event("response.delta", { text: "马刺能夺冠" }, "turn_snapshot") },
      { type: "agent_event", event: event("response.delta", { text: "能夺冠" }, "turn_snapshot") },
      { type: "agent_event", event: event("response.done", {}, "turn_snapshot") }
    ]);

    expect(assistantTexts(state)).toEqual(["马刺能夺冠"]);
    expect(state.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
  });

  it("keeps chatbot mode free of coding-agent personality text for ordinary questions", () => {
    const state = reduce([
      { type: "start_turn", turnId: "turn_persona", text: "我今天有点累，怎么调整一下？" },
      { type: "agent_event", event: event("response.delta", { text: "这不是代码任务。我在编程项目中工作，但我可以帮你写数据抓取代码。建议先休息。" }, "turn_persona") },
      { type: "agent_event", event: event("response.done", {}, "turn_persona") }
    ]);
    const visible = JSON.stringify(state.messages);

    expect(visible).not.toContain("这不是代码任务");
    expect(visible).not.toContain("我在编程项目中工作");
    expect(visible).not.toContain("我可以帮你写数据抓取代码");
    expect(assistantTexts(state)[0]).toContain("建议先休息");
  });

  it("keeps pi normalizer debug events out of the ordinary message list", () => {
    const state = reduce([
      { type: "start_turn", turnId: "turn_debug", text: "你好" },
      { type: "agent_event", event: event("state", { from: "piagent", to: "pi.normalizer.debug", snapshotKey: "turn_debug:assistant:0", emittedDeltaPreview: "你好" }, "turn_debug") },
      { type: "agent_event", event: event("response.delta", { text: "你好！" }, "turn_debug") }
    ]);
    const visible = JSON.stringify(state.messages);

    expect(visible).not.toContain("pi.normalizer.debug");
    expect(visible).not.toContain("snapshotKey");
    expect(assistantTexts(state)).toEqual(["你好！"]);
  });
});

describe("provider consistency golden UI shape", () => {
  it("renders general_chat similarly for LLMDirectProvider and PiAgentCoreProvider events", () => {
    const llm = reduce([
      { type: "start_turn", turnId: "turn_a", text: "你好" },
      { type: "agent_event", event: event("response.delta", { text: "你好！" }, "turn_a") },
      { type: "agent_event", event: event("response.done", {}, "turn_a") }
    ]);
    const pi = reduce([
      { type: "start_turn", turnId: "turn_b", text: "你好" },
      { type: "agent_event", event: event("intent.detected", { provider: "piagent" }, "turn_b") },
      { type: "agent_event", event: event("response.delta", { text: "你好！" }, "turn_b") },
      { type: "agent_event", event: event("response.done", {}, "turn_b") }
    ]);

    expect(uiShape(pi)).toMatchObject(uiShape(llm));
    expectNoTechnicalTerms(pi);
  });

  it("renders summarize_page status and assistant message consistently", () => {
    const actions = (turnId: string): ChatViewAction[] => [
      { type: "start_turn", turnId, text: "总结当前页面", intentHint: "summarize_page" },
      { type: "agent_event", event: event("state.transition", { to: "context_resolving" }, turnId) },
      { type: "agent_event", event: event("response.delta", { text: "页面摘要" }, turnId) },
      { type: "agent_event", event: event("response.done", {}, turnId) }
    ];

    expect(uiShape(reduce(actions("turn_llm")))).toMatchObject(uiShape(reduce(actions("turn_pi"))));
  });

  it("renders mindmap artifact card consistently", () => {
    const actions = (turnId: string): ChatViewAction[] => [
      { type: "start_turn", turnId, text: "生成思维导图", intentHint: "mindmap_page" },
      { type: "agent_event", event: event("response.delta", { text: "已生成思维导图" }, turnId) },
      { type: "agent_event", event: event("artifact.created", { artifact: { ...mindmapArtifact, turnId } }, turnId) },
      { type: "agent_event", event: event("response.done", {}, turnId) }
    ];

    expect(uiShape(reduce(actions("turn_llm"))).artifactTypes).toEqual(["mindmap"]);
    expect(uiShape(reduce(actions("turn_pi"))).artifactTypes).toEqual(["mindmap"]);
  });

  it("renders deferred notice consistently without tool approval UI", () => {
    const actions = (turnId: string): ChatViewAction[] => [
      { type: "start_turn", turnId, text: "查天气", intentHint: "weather_lookup" },
      { type: "agent_event", event: event("intent.detected", { adapter_id: "weather_lookup", status: "deferred" }, turnId) },
      { type: "agent_event", event: event("response.delta", { text: "这个能力会在后续版本开放。当前我可以先帮你做页面总结、问答或 Mindmap。" }, turnId) },
      { type: "agent_event", event: event("response.done", {}, turnId) }
    ];
    const llm = reduce(actions("turn_llm"));
    const pi = reduce(actions("turn_pi"));

    expect(uiShape(llm).deferredKind).toBe("DeferredCapabilityNotice");
    expect(uiShape(pi).deferredKind).toBe("DeferredCapabilityNotice");
    expectNoTechnicalTerms(llm);
    expectNoTechnicalTerms(pi);
  });
});
