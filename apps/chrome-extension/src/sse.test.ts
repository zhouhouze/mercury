import { describe, expect, it } from "vitest";
import { parseSseBlocks } from "./sse";

describe("parseSseBlocks", () => {
  it("parses complete SSE blocks and keeps trailing partial data", () => {
    const { events, remainder } = parseSseBlocks(
      'event: response.delta\ndata: {"event_id":"evt_1","session_id":"sess_1","type":"response.delta","data":{"text":"ok"}}\n\n' +
        'event: response.done\ndata: {"event_id":"evt_2"'
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("response.delta");
    expect(remainder).toContain("response.done");
  });

  it("ignores malformed events without throwing", () => {
    const { events } = parseSseBlocks("event: broken\ndata: {not-json}\n\n");
    expect(events).toEqual([]);
  });
});

