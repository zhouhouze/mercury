import { randomUUID } from "node:crypto";
import { BridgeEvent } from "./types.js";
import { deniedToolMessage } from "./tool-policy.js";

type NormalizeContext = { requestId?: string; turnId?: string; traceId?: string; sessionId?: string };
type SnapshotRecord = { text: string; completed: boolean; lastSeen: number };
type NormalizerOptions = {
  completedTtlMs?: number;
  streamDebug?: boolean;
  maxDebugEventsPerTurn?: number;
  systemPromptInjectionMode?: string;
  systemPromptPreview?: string;
};
type SnapshotKeyInfo = { key: string; fallback: boolean; source: string };

const DONE_TYPES = new Set(["response.done", "agent_end", "turn_end", "message_end", "assistant_message_end", "done", "final"]);
const STATE_TYPES = new Set(["state", "state.update", "status", "message_start", "assistant_message_start"]);
const TOOL_TYPES = new Set(["tool.requested", "tool_call", "tool_request", "tool_use"]);
const ERROR_TYPES = new Set(["error", "agent_error"]);
const DELTA_TYPES = new Set(["response.delta", "text_delta", "delta"]);
const SNAPSHOT_TYPES = new Set(["message_update", "assistant_message", "message", "message_snapshot", "snapshot", "response.snapshot"]);

export function createPiEventNormalizer(options: NormalizerOptions = {}) {
  return new PiEventNormalizer(options);
}

export function normalizeRawEvent(raw: unknown, context: NormalizeContext = {}): BridgeEvent[] {
  return createPiEventNormalizer().normalize(raw, context);
}

export class PiEventNormalizer {
  private readonly snapshots = new Map<string, SnapshotRecord>();
  private readonly fallbackIndexesByTurn = new Map<string, number>();
  private readonly activeFallbackKeyByTurn = new Map<string, string>();
  private readonly accumulatedByTurn = new Map<string, string>();
  private readonly debugCountsByTurn = new Map<string, number>();
  private readonly completedTtlMs: number;
  private readonly streamDebug: boolean;
  private readonly maxDebugEventsPerTurn: number;
  private readonly systemPromptInjectionMode?: string;
  private readonly systemPromptPreview?: string;

  constructor(options: NormalizerOptions = {}) {
    this.completedTtlMs = options.completedTtlMs ?? 30_000;
    this.streamDebug = options.streamDebug ?? process.env.NAVIA_PI_STREAM_DEBUG === "true";
    this.maxDebugEventsPerTurn = options.maxDebugEventsPerTurn ?? 80;
    this.systemPromptInjectionMode = options.systemPromptInjectionMode;
    this.systemPromptPreview = options.systemPromptPreview;
  }

  normalize(raw: unknown, context: NormalizeContext = {}): BridgeEvent[] {
    const event = normalizeObject(raw);
    const type = eventType(event);
    const requestId = stringValue(event.requestId) ?? stringValue(event.request_id) ?? context.requestId;
    const turnId = stringValue(event.turnId) ?? stringValue(event.turn_id) ?? context.turnId;
    const traceId = stringValue(event.traceId) ?? stringValue(event.trace_id) ?? context.traceId;
    const sessionId = stringValue(event.sessionId) ?? stringValue(event.session_id) ?? context.sessionId;
    const diagnostic: Extract<BridgeEvent, { type: "state" }> = {
      type: "state",
      state: "pi.raw",
      rawSummary: summarizeRawEvent(raw),
      requestId,
      turnId,
      traceId
    };

    this.pruneCompleted();
    let debugDetails: Partial<Extract<BridgeEvent, { type: "state" }>> = {
      rawEventType: type || "unknown",
      rawEventKeys: Object.keys(event).slice(0, 32),
      messageId: stringValue(event.messageId) ?? stringValue(event.message_id) ?? stringValue(pathValue(event, ["message", "id"])),
      assistantMessageId:
        stringValue(event.assistantMessageId) ??
        stringValue(event.assistant_message_id) ??
        stringValue(pathValue(event, ["assistantMessageEvent", "assistantMessageId"])),
      assistantMessageIndex: numericValue(event.assistantMessageIndex) ?? numericValue(event.messageIndex),
      sessionId,
      systemPromptInjectionMode: this.systemPromptInjectionMode,
      systemPromptPreview: this.systemPromptPreview
    };

    if (isMessageStart(type)) {
      const keyInfo = this.snapshotKey(event, { requestId, turnId, traceId, sessionId }, { start: true });
      this.snapshots.set(keyInfo.key, { text: "", completed: false, lastSeen: Date.now() });
      if (keyInfo.fallback) diagnostic.snapshotKeyFallback = true;
      debugDetails = { ...debugDetails, snapshotKey: keyInfo.key, snapshotKeySource: keyInfo.source, snapshotKeyFallback: keyInfo.fallback };
      return this.withDebug([diagnostic, { type: "state", state: "message.started", snapshotKeyFallback: keyInfo.fallback, requestId, turnId, traceId }], debugDetails, { requestId, turnId, traceId });
    }

    if (isDone(type)) {
      let keyInfo: SnapshotKeyInfo | undefined;
      if (isMessageEnd(type)) {
        keyInfo = this.snapshotKey(event, { requestId, turnId, traceId, sessionId });
        this.markSnapshotCompleted(keyInfo.key);
        if (keyInfo.fallback) diagnostic.snapshotKeyFallback = true;
      }
      if (isTurnEnd(type)) {
        this.clearTurn(turnId);
      }
      debugDetails = {
        ...debugDetails,
        snapshotKey: keyInfo?.key,
        snapshotKeySource: keyInfo?.source,
        snapshotKeyFallback: keyInfo?.fallback,
        isSnapshot: isMessageEnd(type),
        fullTextLength: explicitSnapshotText(type, event)?.length
      };
      return this.withDebug([diagnostic, { type: "response.done", requestId, turnId, traceId }], debugDetails, { requestId, turnId, traceId });
    }

    if (isToolRequest(type, event)) {
      const toolName = stringValue(event.toolName) ?? stringValue(event.tool_name) ?? stringValue(event.name) ?? "pi.tool";
      const toolCallId = stringValue(event.toolCallId) ?? stringValue(event.tool_call_id) ?? `pitc_${randomUUID().replaceAll("-", "")}`;
      const message = deniedToolMessage();
      return this.withDebug([
        diagnostic,
        { type: "tool.requested", toolName, toolCallId, requestId, turnId, traceId },
        { type: "tool.denied", toolName, toolCallId, message, requestId, turnId, traceId },
        { type: "response.delta", text: message, requestId, turnId, traceId },
        { type: "response.done", requestId, turnId, traceId }
      ], { ...debugDetails, emittedDeltaLength: message.length, emittedDeltaPreview: preview(message) }, { requestId, turnId, traceId });
    }

    if (isError(type)) {
      return this.withDebug([diagnostic, { type: "error", code: stringValue(event.code) ?? "piagent_error", message: stringValue(event.message) ?? "Pi agent bridge error.", recoverable: true, requestId, turnId, traceId }], debugDetails, { requestId, turnId, traceId });
    }

    const semanticDelta = explicitDeltaText(type, event);
    if (semanticDelta !== undefined) {
      const guarded = this.guardDelta({ requestId, turnId, traceId, sessionId }, semanticDelta);
      debugDetails = { ...debugDetails, isTextDelta: true, emittedDeltaLength: guarded.length, emittedDeltaPreview: preview(guarded) };
      return this.withDebug(guarded.length > 0 ? [diagnostic, { type: "response.delta", text: guarded, requestId, turnId, traceId }] : [diagnostic], debugDetails, { requestId, turnId, traceId });
    }

    const snapshot = explicitSnapshotText(type, event);
    if (snapshot !== undefined) {
      const keyInfo = this.snapshotKey(event, { requestId, turnId, traceId, sessionId });
      const previousSnapshotLength = this.snapshots.get(keyInfo.key)?.text.length ?? 0;
      const delta = this.guardDelta({ requestId, turnId, traceId, sessionId }, this.diffSnapshot(keyInfo.key, snapshot), keyInfo.key);
      if (keyInfo.fallback) diagnostic.snapshotKeyFallback = true;
      debugDetails = {
        ...debugDetails,
        snapshotKey: keyInfo.key,
        snapshotKeySource: keyInfo.source,
        snapshotKeyFallback: keyInfo.fallback,
        isSnapshot: true,
        fullTextLength: snapshot.length,
        previousSnapshotLength,
        emittedDeltaLength: delta.length,
        emittedDeltaPreview: preview(delta)
      };
      return this.withDebug(delta ? [diagnostic, { type: "response.delta", text: delta, requestId, turnId, traceId }] : [diagnostic], debugDetails, { requestId, turnId, traceId });
    }

    const fallbackText = fallbackTextValue(event);
    if (fallbackText !== undefined) {
      const guarded = this.guardDelta({ requestId, turnId, traceId, sessionId }, fallbackText);
      debugDetails = { ...debugDetails, emittedDeltaLength: guarded.length, emittedDeltaPreview: preview(guarded) };
      return this.withDebug(guarded.length > 0 ? [diagnostic, { type: "response.delta", text: guarded, requestId, turnId, traceId }] : [diagnostic], debugDetails, { requestId, turnId, traceId });
    }

    if (isState(type)) {
      return this.withDebug([diagnostic, { type: "state", state: stringValue(event.state) ?? stringValue(event.status) ?? "running", requestId, turnId, traceId }], debugDetails, { requestId, turnId, traceId });
    }

    return this.withDebug([diagnostic], debugDetails, { requestId, turnId, traceId });
  }

  destroy(): void {
    this.snapshots.clear();
    this.fallbackIndexesByTurn.clear();
    this.activeFallbackKeyByTurn.clear();
    this.accumulatedByTurn.clear();
    this.debugCountsByTurn.clear();
  }

  private withDebug(events: BridgeEvent[], details: Partial<Extract<BridgeEvent, { type: "state" }>>, context: NormalizeContext): BridgeEvent[] {
    if (!this.streamDebug) return events;
    const turnKey = context.turnId ?? context.requestId ?? "unknown";
    const count = this.debugCountsByTurn.get(turnKey) ?? 0;
    if (count >= this.maxDebugEventsPerTurn) return events;
    this.debugCountsByTurn.set(turnKey, count + 1);
    return [
      ...events,
      {
        type: "state",
        state: "pi.normalizer.debug",
        ...details,
        emittedDeltaPreview: details.emittedDeltaPreview ? preview(details.emittedDeltaPreview) : undefined,
        requestId: context.requestId,
        turnId: context.turnId,
        traceId: context.traceId
      }
    ];
  }

  private guardDelta(context: NormalizeContext, candidate: string, streamKey?: string): string {
    if (!candidate) return "";
    const key = streamKey ?? `${context.sessionId ?? "session"}:${context.turnId ?? context.requestId ?? "turn"}:assistant`;
    const accumulated = this.accumulatedByTurn.get(key) ?? "";
    let delta = candidate;
    if (candidate.startsWith(accumulated)) {
      delta = candidate.slice(accumulated.length);
    } else if (accumulated.endsWith(candidate)) {
      delta = "";
    }
    if (delta) this.accumulatedByTurn.set(key, `${accumulated}${delta}`);
    return delta;
  }

  private snapshotKey(event: Record<string, unknown>, context: NormalizeContext, options: { start?: boolean } = {}): SnapshotKeyInfo {
    const explicit =
      stringValue(event.messageId) ??
      stringValue(event.message_id) ??
      stringValue(event.assistantMessageId) ??
      stringValue(event.assistant_message_id) ??
      stringValue(pathValue(event, ["message", "id"])) ??
      stringValue(pathValue(event, ["assistantMessageEvent", "messageId"])) ??
      stringValue(pathValue(event, ["assistantMessageEvent", "assistantMessageId"]));
    if (explicit) return { key: explicit, fallback: false, source: "message_id" };
    const role = stringValue(event.role) ?? stringValue(pathValue(event, ["message", "role"])) ?? "assistant";
    const turnKey = `${context.sessionId ?? "session"}:${context.turnId ?? context.requestId ?? "turn"}:${role}`;
    const explicitIndex = numericValue(event.assistantMessageIndex) ?? numericValue(event.messageIndex);
    if (explicitIndex !== undefined) {
      const key = `${turnKey}:${explicitIndex}`;
      this.activeFallbackKeyByTurn.set(turnKey, key);
      return { key, fallback: true, source: "assistant_message_index" };
    }
    if (options.start || !this.activeFallbackKeyByTurn.has(turnKey)) {
      const index = this.fallbackIndexesByTurn.get(turnKey) ?? 0;
      const key = `${turnKey}:${index}`;
      this.fallbackIndexesByTurn.set(turnKey, index + 1);
      this.activeFallbackKeyByTurn.set(turnKey, key);
      return { key, fallback: true, source: "current_assistant_sequence" };
    }
    return { key: this.activeFallbackKeyByTurn.get(turnKey) as string, fallback: true, source: "active_assistant_sequence" };
  }

  private diffSnapshot(key: string, fullText: string): string {
    const previous = this.snapshots.get(key);
    const previousText = previous?.text ?? "";
    const delta = fullText.startsWith(previousText) ? fullText.slice(previousText.length) : fullText;
    this.snapshots.set(key, { text: fullText, completed: previous?.completed ?? false, lastSeen: Date.now() });
    return delta;
  }

  private markSnapshotCompleted(key: string): void {
    const previous = this.snapshots.get(key);
    this.snapshots.set(key, { text: previous?.text ?? "", completed: true, lastSeen: Date.now() });
  }

  private clearTurn(turnId: string | undefined): void {
    if (!turnId) return;
    for (const key of this.snapshots.keys()) {
      if (key.includes(`:${turnId}:`)) this.snapshots.delete(key);
    }
    for (const key of this.fallbackIndexesByTurn.keys()) {
      if (key.includes(`:${turnId}:`)) this.fallbackIndexesByTurn.delete(key);
    }
    for (const key of this.activeFallbackKeyByTurn.keys()) {
      if (key.includes(`:${turnId}:`)) this.activeFallbackKeyByTurn.delete(key);
    }
    for (const key of this.accumulatedByTurn.keys()) {
      if (key.includes(`:${turnId}:`)) this.accumulatedByTurn.delete(key);
    }
    this.debugCountsByTurn.delete(turnId);
  }

  private pruneCompleted(): void {
    const cutoff = Date.now() - this.completedTtlMs;
    for (const [key, record] of this.snapshots) {
      if (record.completed && record.lastSeen < cutoff) this.snapshots.delete(key);
    }
  }
}

function normalizeObject(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : { type: "response.delta", text: String(raw ?? "") };
}

function eventType(event: Record<string, unknown>): string {
  return String(event.type ?? event.event ?? event.kind ?? "");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isMessageStart(type: string): boolean {
  return ["message_start", "assistant_message_start"].includes(type);
}

function isMessageEnd(type: string): boolean {
  return ["message_end", "assistant_message_end"].includes(type);
}

function isTurnEnd(type: string): boolean {
  return ["turn_end", "agent_end", "done", "final"].includes(type);
}

function isDone(type: string): boolean {
  return DONE_TYPES.has(type);
}

function isState(type: string): boolean {
  return STATE_TYPES.has(type);
}

function isToolRequest(type: string, event: Record<string, unknown>): boolean {
  return TOOL_TYPES.has(type) || typeof event.toolName === "string" || typeof event.tool_name === "string";
}

function isError(type: string): boolean {
  return ERROR_TYPES.has(type);
}

function explicitDeltaText(type: string, event: Record<string, unknown>): string | undefined {
  const assistantEvent = objectValue(event.assistantMessageEvent);
  if (assistantEvent && stringValue(assistantEvent.type) === "text_delta") {
    return textValue(assistantEvent.delta);
  }
  if (DELTA_TYPES.has(type)) {
    return textValue(event.text) ?? textValue(event.delta) ?? textValue(pathValue(event, ["data", "delta"]));
  }
  return undefined;
}

function explicitSnapshotText(type: string, event: Record<string, unknown>): string | undefined {
  if (!SNAPSHOT_TYPES.has(type)) return undefined;
  const assistantEvent = objectValue(event.assistantMessageEvent);
  if (assistantEvent && stringValue(assistantEvent.type) === "text_delta") return undefined;
  return (
    textValue(event.content) ??
    textValue(event.output_text) ??
    textValue(pathValue(event, ["message", "content"])) ??
    textValue(pathValue(event, ["message", "text"])) ??
    textValue(pathValue(event, ["content", "text"])) ??
    textValue(pathValue(event, ["assistant", "text"])) ??
    textValue(pathValue(event, ["assistant", "content"])) ??
    textValue(pathValue(event, ["data", "text"])) ??
    textValue(pathValue(event, ["data", "content"])) ??
    textValue(pathValue(event, ["data", "delta"]))
  );
}

function fallbackTextValue(event: Record<string, unknown>): string | undefined {
  return (
    textValue(event.text) ??
    textValue(event.delta) ??
    textValue(event.content) ??
    textValue(event.output_text) ??
    textValue(pathValue(event, ["message", "content"])) ??
    textValue(pathValue(event, ["message", "text"])) ??
    textValue(pathValue(event, ["content", "text"])) ??
    textValue(pathValue(event, ["assistant", "text"])) ??
    textValue(pathValue(event, ["assistant", "content"])) ??
    textValue(pathValue(event, ["data", "delta"])) ??
    textValue(pathValue(event, ["data", "text"])) ??
    textValue(pathValue(event, ["data", "content"]))
  );
}

function numericValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function preview(value: string): string {
  return value.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-****").replace(/\s+/g, " ").slice(0, 80);
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.length > 0 ? value : undefined;
  }
  if (Array.isArray(value)) {
    const joined = value.map((item) => textValue(item)).filter(Boolean).join("");
    return joined.length > 0 ? joined : undefined;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return textValue(record.text) ?? textValue(record.content) ?? textValue(record.delta);
  }
  return undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function pathValue(value: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function summarizeRawEvent(raw: unknown): string {
  const redacted = redactSecrets(raw);
  try {
    return JSON.stringify(redacted).slice(0, 800);
  } catch {
    return String(redacted).slice(0, 800);
  }
}

function redactSecrets(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-****");
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => {
        if (/api[_-]?key|authorization|token|secret/i.test(key)) return [key, "[redacted]"];
        return [key, redactSecrets(child)];
      })
    );
  }
  return value;
}
