import { randomUUID } from "node:crypto";
import { BridgeEvent } from "./types.js";
import { deniedToolMessage } from "./tool-policy.js";

export function normalizeRawEvent(raw: unknown, context: { requestId?: string; turnId?: string; traceId?: string } = {}): BridgeEvent[] {
  const event = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : { type: "response.delta", text: String(raw ?? "") };
  const type = String(event.type ?? event.event ?? event.kind ?? "");
  const requestId = stringValue(event.requestId) ?? stringValue(event.request_id) ?? context.requestId;
  const turnId = stringValue(event.turnId) ?? stringValue(event.turn_id) ?? context.turnId;
  const traceId = stringValue(event.traceId) ?? stringValue(event.trace_id) ?? context.traceId;
  const diagnostic = { type: "state" as const, state: "pi.raw", rawSummary: summarizeRawEvent(raw), requestId, turnId, traceId };

  if (isDelta(type, event)) {
    const text = extractText(event);
    return text ? [diagnostic, { type: "response.delta", text, requestId, turnId, traceId }] : [diagnostic];
  }
  if (isDone(type)) {
    return [diagnostic, { type: "response.done", requestId, turnId, traceId }];
  }
  if (isState(type)) {
    return [diagnostic, { type: "state", state: stringValue(event.state) ?? stringValue(event.status) ?? "running", requestId, turnId, traceId }];
  }
  if (isToolRequest(type, event)) {
    const toolName = stringValue(event.toolName) ?? stringValue(event.tool_name) ?? stringValue(event.name) ?? "pi.tool";
    const toolCallId = stringValue(event.toolCallId) ?? stringValue(event.tool_call_id) ?? `pitc_${randomUUID().replaceAll("-", "")}`;
    return [
      diagnostic,
      { type: "tool.requested", toolName, toolCallId, requestId, turnId, traceId },
      { type: "tool.denied", toolName, toolCallId, message: deniedToolMessage(), requestId, turnId, traceId },
      { type: "response.delta", text: deniedToolMessage(), requestId, turnId, traceId },
      { type: "response.done", requestId, turnId, traceId }
    ];
  }
  if (isError(type)) {
    return [diagnostic, { type: "error", code: stringValue(event.code) ?? "piagent_error", message: stringValue(event.message) ?? "Pi agent bridge error.", recoverable: true, requestId, turnId, traceId }];
  }
  return [diagnostic];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isDelta(type: string, event: Record<string, unknown>): boolean {
  return (
    ["response.delta", "text_delta", "message_update", "delta", "assistant_message", "message"].includes(type) ||
    extractText(event) !== undefined
  );
}

function isDone(type: string): boolean {
  return ["response.done", "agent_end", "done", "final"].includes(type);
}

function isState(type: string): boolean {
  return ["state", "state.update", "status"].includes(type);
}

function isToolRequest(type: string, event: Record<string, unknown>): boolean {
  return ["tool.requested", "tool_call", "tool_request", "tool_use"].includes(type) || typeof event.toolName === "string" || typeof event.tool_name === "string";
}

function isError(type: string): boolean {
  return ["error", "agent_error"].includes(type);
}

function extractText(event: Record<string, unknown>): string | undefined {
  const candidates = [
    event.text,
    event.delta,
    event.content,
    event.output_text,
    pathValue(event, ["message", "content"]),
    pathValue(event, ["message", "text"]),
    pathValue(event, ["content", "text"]),
    pathValue(event, ["assistant", "text"]),
    pathValue(event, ["assistant", "content"]),
    pathValue(event, ["data", "delta"]),
    pathValue(event, ["data", "text"]),
    pathValue(event, ["data", "content"])
  ];
  for (const candidate of candidates) {
    const text = textValue(candidate);
    if (text) return text;
  }
  return undefined;
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? value : undefined;
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
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      if (/api[_-]?key|authorization|token|secret/i.test(key)) return [key, "[redacted]"];
      return [key, redactSecrets(child)];
    }));
  }
  return value;
}
