import type { AgentEvent } from "../../sse";
import type { ArtifactRecord, ChatIntent } from "../../runtimeClient";

export type ChatProfile = "chat" | "agent";
export type MessageRole = "user" | "assistant" | "system";
export type AssistantStatus = "streaming" | "done" | "error";
export type SystemKind = "status" | "deferred" | "error";

export type ArtifactPreview = ArtifactRecord;

export type DeferredNotice = {
  intent: string;
  profile: ChatProfile;
  message: string;
  turnId?: string;
};

export type InlineStatus = {
  turnId: string;
  text: string;
  state: string;
  status: "active" | "done";
};

export type ChatMessageView =
  | {
      id: string;
      turnId: string;
      role: "user";
      text: string;
      createdAt: string;
      intentHint?: ChatIntent;
    }
  | {
      id: string;
      turnId: string;
      role: "assistant";
      text: string;
      status: AssistantStatus;
      createdAt: string;
      artifacts: ArtifactPreview[];
    }
  | {
      id: string;
      turnId?: string;
      role: "system";
      kind: SystemKind;
      text: string;
      createdAt: string;
    };

export type DebugWarning = {
  id: string;
  message: string;
  event?: AgentEvent;
  createdAt: string;
};

export type ChatViewState = {
  profile: ChatProfile;
  messages: ChatMessageView[];
  currentTurnId?: string;
  currentAssistantMessageId?: string;
  activeStatus?: InlineStatus;
  artifacts: ArtifactPreview[];
  deferredNotice?: DeferredNotice;
  debugEvents: AgentEvent[];
  debugWarnings: DebugWarning[];
};

export type ChatViewAction =
  | {
      type: "set_profile";
      profile: ChatProfile;
    }
  | {
      type: "start_turn";
      turnId: string;
      text: string;
      intentHint?: ChatIntent;
      createdAt?: string;
    }
  | {
      type: "agent_event";
      event: AgentEvent;
    }
  | {
      type: "system_message";
      kind: SystemKind;
      text: string;
      turnId?: string;
      createdAt?: string;
    }
  | {
      type: "restore_messages";
      messages: Array<{ id: string; role: MessageRole; text: string; turnId?: string; artifact?: ArtifactRecord; artifacts?: ArtifactRecord[] }>;
    }
  | {
      type: "reset";
    };

export const DEFAULT_DEFERRED_MESSAGE = "这个能力会在后续版本开放。当前我可以先帮你做页面总结、问答或 Mindmap。";
export const CHAT_TOOL_DENIED_MESSAGE = "当前是 Chat 模式，不会调用工具。这个能力会在后续版本开放。";
export const AGENT_TOOL_DENIED_MESSAGE = "当前 Agent 模式暂未开放工具调用。该请求已被安全策略拒绝。";
