import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRawEvent } from "../dist/event-normalizer.js";
import { sanitizeToolNames } from "../dist/tool-policy.js";

test("normalizes response delta and done events", () => {
  assert.deepEqual(normalizeRawEvent({ type: "response.delta", text: "hello", requestId: "req" }), [
    { type: "state", state: "pi.raw", rawSummary: "{\"type\":\"response.delta\",\"text\":\"hello\",\"requestId\":\"req\"}", requestId: "req", turnId: undefined, traceId: undefined },
    { type: "response.delta", text: "hello", requestId: "req", turnId: undefined, traceId: undefined }
  ]);
  assert.equal(normalizeRawEvent({ type: "agent_end", requestId: "req" })[1].type, "response.done");
});

test("normalizes nested pi text fields into response delta", () => {
  const shapes = [
    { type: "message", message: { content: "from message content" } },
    { type: "message_update", content: { text: "from content text" } },
    { type: "delta", data: { delta: "from data delta" } },
    { type: "assistant_message", assistant: { text: "from assistant text" } },
    { type: "message", output_text: "from output text" }
  ];

  for (const shape of shapes) {
    const events = normalizeRawEvent(shape);
    assert.equal(events[0].type, "state");
    assert.equal(events[1].type, "response.delta");
    assert.equal(events[1].text.startsWith("from "), true);
  }
});

test("redacts secrets in raw diagnostic summaries", () => {
  const events = normalizeRawEvent({ type: "message", message: { content: "ok" }, apiKey: "sk-1234567890abcdef" });

  assert.equal(events[0].type, "state");
  assert.equal(String(events[0].rawSummary).includes("sk-123"), false);
  assert.equal(String(events[0].rawSummary).includes("[redacted]"), true);
});

test("normalizes tool requests into requested and denied without started", () => {
  const events = normalizeRawEvent({ type: "tool_request", toolName: "bash", toolCallId: "tc_1" });
  assert.deepEqual(events.map((event) => event.type), ["state", "tool.requested", "tool.denied", "response.delta", "response.done"]);
  assert.equal(events.some((event) => event.type === "tool.started"), false);
  assert.equal(events.some((event) => String(event.message ?? event.text ?? "").includes("V1.2")), false);
  assert.equal(String(events[2].message).includes("后续版本开放"), true);
});

test("tool policy always clears requested tool names", () => {
  assert.deepEqual(sanitizeToolNames(["read", "bash", "custom"]), []);
});
