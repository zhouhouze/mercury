import type { ArtifactPresentation, ArtifactRecord } from "../artifact_renderer/artifactPresentation";
import { presentArtifact } from "../artifact_renderer/artifactPresentation";
import type { DebugEntry } from "../debug_renderer/debugPresentation";
import { debugError, debugUnknownEvent } from "../debug_renderer/debugPresentation";
import type { MindmapPresentation } from "../mindmap_renderer/mindmapPresentation";
import { presentMindmapArtifact } from "../mindmap_renderer/mindmapPresentation";

export type AgentEvent = {
  type: string;
  event_id?: string;
  data?: Record<string, unknown>;
};

export type ChatMessagePresentation = {
  role: "assistant" | "system";
  text: string;
  status: "streaming" | "done" | "error";
};

export type ToolPresentation = {
  toolCallId: string;
  toolName: string;
  status: "running" | "succeeded" | "failed" | "denied" | "budget_exceeded";
  message: string;
};

export type RuntimePresentation = {
  status: "online" | "offline" | "unknown";
  message: string;
};

export type ChatPresentationState = {
  messages: ChatMessagePresentation[];
  activeAssistantText: string;
  tools: ToolPresentation[];
  artifacts: ArtifactPresentation[];
  mindmaps: MindmapPresentation[];
  debug: DebugEntry[];
  visibleErrors: string[];
  runtime: RuntimePresentation;
};

export type ChatViewModel = {
  messages: ChatMessagePresentation[];
  activeAssistantText: string | null;
  tools: ToolPresentation[];
  artifacts: ArtifactPresentation[];
  mindmaps: MindmapPresentation[];
  debugCount: number;
  visibleErrors: string[];
  runtime: RuntimePresentation;
};

export function createChatPresentationState(): ChatPresentationState {
  return {
    messages: [],
    activeAssistantText: "",
    tools: [],
    artifacts: [],
    mindmaps: [],
    debug: [],
    visibleErrors: [],
    runtime: { status: "unknown", message: "Runtime status unknown" }
  };
}

export function applyRuntimeStatus(state: ChatPresentationState, status: RuntimePresentation["status"]): ChatPresentationState {
  const message = status === "online" ? "Runtime online" : status === "offline" ? "Runtime offline" : "Runtime status unknown";
  return { ...state, runtime: { status, message }, visibleErrors: status === "offline" ? [...state.visibleErrors, message] : state.visibleErrors };
}

export function applyChatEvent(state: ChatPresentationState, event: AgentEvent): ChatPresentationState {
  switch (event.type) {
    case "response.delta":
      return { ...state, activeAssistantText: state.activeAssistantText + readText(event.data, "text") };
    case "response.done":
      if (!state.activeAssistantText) return state;
      return {
        ...state,
        messages: [...state.messages, { role: "assistant", text: state.activeAssistantText, status: "done" }],
        activeAssistantText: ""
      };
    case "tool.started":
      return upsertTool(state, {
        toolCallId: readText(event.data, "tool_call_id"),
        toolName: readText(event.data, "tool_name"),
        status: "running",
        message: "Tool running"
      });
    case "tool.done":
      return upsertTool(state, {
        toolCallId: readText(event.data, "tool_call_id"),
        toolName: readText(event.data, "tool_name"),
        status: normalizeToolStatus(readText(event.data, "status")),
        message: readText(event.data, "status") || "Tool done"
      });
    case "tool.denied":
      return upsertTool(state, {
        toolCallId: readText(event.data, "tool_call_id"),
        toolName: readText(event.data, "tool_name"),
        status: readText(event.data, "reason") === "BUDGET_EXCEEDED" || readText(event.data, "reason") === "budget_exceeded" ? "budget_exceeded" : "denied",
        message: readText(event.data, "message") || "Tool denied"
      });
    case "artifact.created":
      return appendArtifact(state, readArtifact(event.data));
    case "error":
      return appendVisibleError(state, readText(event.data, "message") || readText(event.data, "code") || "Runtime error", event);
    case "state.transition":
    case "intent.detected":
    case "budget.checked":
      return state;
    default:
      return { ...state, debug: [...state.debug, debugUnknownEvent(event)] };
  }
}

export function selectChatViewModel(state: ChatPresentationState): ChatViewModel {
  return {
    messages: state.messages,
    activeAssistantText: state.activeAssistantText || null,
    tools: state.tools,
    artifacts: state.artifacts,
    mindmaps: state.mindmaps,
    debugCount: state.debug.length,
    visibleErrors: state.visibleErrors,
    runtime: state.runtime
  };
}

function upsertTool(state: ChatPresentationState, tool: ToolPresentation): ChatPresentationState {
  const index = state.tools.findIndex((item) => item.toolCallId === tool.toolCallId && tool.toolCallId);
  if (index === -1) return { ...state, tools: [...state.tools, tool] };
  const next = [...state.tools];
  next[index] = { ...next[index], ...tool };
  return { ...state, tools: next };
}

function appendArtifact(state: ChatPresentationState, artifact: ArtifactRecord | null): ChatPresentationState {
  if (!artifact) return appendVisibleError(state, "Artifact event is missing artifact payload.");
  const presented = presentArtifact(artifact);
  const mindmap = presented.kind === "mindmap" ? presentMindmapArtifact(artifact) : null;
  return {
    ...state,
    artifacts: [...state.artifacts, presented],
    mindmaps: mindmap ? [...state.mindmaps, mindmap] : state.mindmaps
  };
}

function appendVisibleError(state: ChatPresentationState, message: string, event?: unknown): ChatPresentationState {
  return {
    ...state,
    visibleErrors: [...state.visibleErrors, message],
    debug: [...state.debug, debugError(message, event)]
  };
}

function normalizeToolStatus(value: string): ToolPresentation["status"] {
  if (value === "succeeded") return "succeeded";
  if (value === "failed") return "failed";
  if (value === "denied") return "denied";
  if (value === "budget_exceeded") return "budget_exceeded";
  return "succeeded";
}

function readArtifact(data: Record<string, unknown> | undefined): ArtifactRecord | null {
  const artifact = data?.artifact;
  if (typeof artifact === "object" && artifact !== null && !Array.isArray(artifact)) return artifact as ArtifactRecord;
  return null;
}

function readText(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key];
  return typeof value === "string" ? value : "";
}
