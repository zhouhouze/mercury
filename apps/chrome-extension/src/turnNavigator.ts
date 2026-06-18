import type { ChatMessageView } from "./modules/chat_renderer/chatViewTypes";

export type ConversationTurnAnchor = {
  turnId: string;
  userMessageId: string;
  assistantMessageId?: string;
  title: string;
  status: "done" | "streaming" | "error";
  artifactCount: number;
};

export type MessageRenderGroup =
  | {
      kind: "turn";
      turnId: string;
      messages: ChatMessageView[];
    }
  | {
      kind: "single";
      message: ChatMessageView;
    };

export function deriveConversationTurns(messages: ChatMessageView[]): ConversationTurnAnchor[] {
  const byTurn = new Map<string, { user?: Extract<ChatMessageView, { role: "user" }>; assistant?: Extract<ChatMessageView, { role: "assistant" }> }>();

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const current = byTurn.get(message.turnId) ?? {};
    if (message.role === "user" && !current.user) current.user = message;
    if (message.role === "assistant" && !current.assistant) current.assistant = message;
    byTurn.set(message.turnId, current);
  }

  return Array.from(byTurn.entries())
    .filter(([, turn]) => Boolean(turn.user))
    .map(([turnId, turn]) => {
      const assistant = turn.assistant;
      const artifactCount = assistant?.artifacts.length ?? 0;
      return {
        turnId,
        userMessageId: turn.user!.id,
        assistantMessageId: assistant?.id,
        title: normalizeTurnTitle(turn.user!.text),
        status: assistant?.status ?? "done",
        artifactCount
      };
    });
}

export function groupMessagesByTurn(messages: ChatMessageView[]): MessageRenderGroup[] {
  const groups: MessageRenderGroup[] = [];
  const turnGroups = new Map<string, Extract<MessageRenderGroup, { kind: "turn" }>>();

  for (const message of messages) {
    if ((message.role === "user" || message.role === "assistant") && message.turnId) {
      let group = turnGroups.get(message.turnId);
      if (!group) {
        group = { kind: "turn", turnId: message.turnId, messages: [] };
        turnGroups.set(message.turnId, group);
        groups.push(group);
      }
      group.messages.push(message);
      continue;
    }
    groups.push({ kind: "single", message });
  }

  return groups;
}

export function normalizeTurnTitle(text: string): string {
  const normalized = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[>\s]*[-*+]\s+/gm, "")
    .replace(/[*_~>#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return truncateTitle(normalized || "未命名对话", 30);
}

export function turnMetaLabel(turn: Pick<ConversationTurnAnchor, "status" | "artifactCount">): string {
  const status = turn.status === "streaming" ? "生成中" : turn.status === "error" ? "失败" : "已完成";
  if (turn.artifactCount <= 0) return status;
  return `${status} · ${turn.artifactCount} 个 Artifact`;
}

export function shouldShowTurnNavigator(input: { turnCount: number; clientHeight: number; scrollHeight: number }): boolean {
  if (input.turnCount <= 1) return false;
  if (input.clientHeight < 240) return false;
  return input.scrollHeight > input.clientHeight + 80;
}

function truncateTitle(text: string, maxLength: number): string {
  return Array.from(text).slice(0, maxLength).join("");
}
