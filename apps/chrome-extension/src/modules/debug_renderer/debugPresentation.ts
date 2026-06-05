export type DebugEntry = {
  type: string;
  level: "info" | "warning" | "error";
  message: string;
  event?: unknown;
};

export function debugUnknownEvent(event: { type?: string }): DebugEntry {
  return {
    type: event.type ?? "unknown",
    level: "warning",
    message: "Unknown SSE event ignored by chat renderer.",
    event
  };
}

export function debugError(message: string, event?: unknown): DebugEntry {
  return {
    type: "error",
    level: "error",
    message,
    event
  };
}
