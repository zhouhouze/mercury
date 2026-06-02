export type AgentEvent = {
  event_id: string;
  session_id: string;
  turn_id?: string;
  type: string;
  data: Record<string, unknown>;
};

export function parseSseBlocks(input: string): { events: AgentEvent[]; remainder: string } {
  const blocks = input.split("\n\n");
  const remainder = blocks.pop() ?? "";
  const events: AgentEvent[] = [];

  for (const block of blocks) {
    const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
    if (!dataLine) continue;
    try {
      events.push(JSON.parse(dataLine.slice(5).trim()) as AgentEvent);
    } catch {
      // Malformed SSE payloads are ignored so unknown/bad events cannot crash the UI.
    }
  }

  return { events, remainder };
}

