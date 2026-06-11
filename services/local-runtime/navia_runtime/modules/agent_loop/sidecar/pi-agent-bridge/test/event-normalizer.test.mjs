import assert from "node:assert/strict";
import test from "node:test";
import { createPiEventNormalizer, normalizeRawEvent } from "../dist/event-normalizer.js";
import { sanitizeToolNames } from "../dist/tool-policy.js";

test("normalizes response delta and done events", () => {
  assert.deepEqual(normalizeRawEvent({ type: "response.delta", text: "hello", requestId: "req" }), [
    { type: "state", state: "pi.raw", rawSummary: "{\"type\":\"response.delta\",\"text\":\"hello\",\"requestId\":\"req\"}", requestId: "req", turnId: undefined, traceId: undefined },
    { type: "response.delta", text: "hello", requestId: "req", turnId: undefined, traceId: undefined }
  ]);
  assert.equal(normalizeRawEvent({ type: "agent_end", requestId: "req" })[1].type, "response.done");
});

test("treats assistantMessageEvent text_delta as explicit delta", () => {
  const normalizer = createPiEventNormalizer();
  const events = normalizer.normalize({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "**马" }, messageId: "msg_1" });

  assert.equal(events[1].type, "response.delta");
  assert.equal(events[1].text, "**马");
});

test("diffs cumulative snapshot text by message id", () => {
  const normalizer = createPiEventNormalizer();

  assert.equal(normalizer.normalize({ type: "message_update", messageId: "msg_1", content: { text: "A" } })[1].text, "A");
  assert.equal(normalizer.normalize({ type: "message_update", messageId: "msg_1", content: { text: "AB" } })[1].text, "B");
  assert.equal(normalizer.normalize({ type: "message_update", messageId: "msg_1", content: { text: "ABC" } })[1].text, "C");
});

test("does not emit duplicate delta for duplicate snapshot", () => {
  const normalizer = createPiEventNormalizer();

  assert.equal(normalizer.normalize({ type: "message", messageId: "msg_dup", message: { content: "ABC" } })[1].text, "ABC");
  assert.equal(normalizer.normalize({ type: "message", messageId: "msg_dup", message: { content: "ABC" } }).length, 1);
});

test("uses fallback snapshot key without dropping text", () => {
  const normalizer = createPiEventNormalizer();
  const events = normalizer.normalize({ type: "message_update", content: { text: "fallback" } }, { sessionId: "sess", turnId: "turn" });

  assert.equal(events[0].snapshotKeyFallback, true);
  assert.equal(events[1].text, "fallback");
});

test("fallback snapshot key advances across message_start boundaries", () => {
  const normalizer = createPiEventNormalizer();
  normalizer.normalize({ type: "message_start" }, { sessionId: "sess", turnId: "turn" });
  assert.equal(normalizer.normalize({ type: "message_update", content: { text: "One" } }, { sessionId: "sess", turnId: "turn" })[1].text, "One");
  normalizer.normalize({ type: "message_end" }, { sessionId: "sess", turnId: "turn" });
  normalizer.normalize({ type: "message_start" }, { sessionId: "sess", turnId: "turn" });
  assert.equal(normalizer.normalize({ type: "message_update", content: { text: "One" } }, { sessionId: "sess", turnId: "turn" })[1].text, "One");
});

test("debug trace is disabled by default and enabled with bounded redacted metadata", () => {
  const quiet = createPiEventNormalizer();
  assert.equal(quiet.normalize({ type: "message_update", content: { text: "secret sk-1234567890abcdef" } }).some((event) => event.state === "pi.normalizer.debug"), false);

  const noisy = createPiEventNormalizer({ streamDebug: true, maxDebugEventsPerTurn: 1, systemPromptInjectionMode: "prompt_envelope", systemPromptPreview: "通用网页伴读 Chatbot" });
  const events = noisy.normalize({ type: "message_update", content: { text: "secret sk-1234567890abcdef" }, assistantMessageIndex: 0 }, { sessionId: "sess", turnId: "turn" });
  const debug = events.find((event) => event.type === "state" && event.state === "pi.normalizer.debug");

  assert.equal(debug.snapshotKeySource, "assistant_message_index");
  assert.equal(debug.emittedDeltaLength > 0, true);
  assert.equal(String(debug.emittedDeltaPreview).length <= 80, true);
  assert.equal(String(debug.emittedDeltaPreview).includes("sk-123"), false);
  assert.equal(debug.systemPromptInjectionMode, "prompt_envelope");
  assert.equal(debug.systemPromptPreview, "通用网页伴读 Chatbot");
  assert.equal(noisy.normalize({ type: "message_update", content: { text: "secret sk-1234567890abcdef!" }, assistantMessageIndex: 0 }, { sessionId: "sess", turnId: "turn" }).some((event) => event.state === "pi.normalizer.debug"), false);
});

test("duplicate-prefix guard handles provider snapshots for Chinese and Markdown", () => {
  const normalizer = createPiEventNormalizer();

  assert.equal(normalizer.normalize({ type: "response.delta", text: "马刺" }, { sessionId: "sess", turnId: "turn_cn" })[1].text, "马刺");
  assert.equal(normalizer.normalize({ type: "response.delta", text: "马刺能夺冠" }, { sessionId: "sess", turnId: "turn_cn" })[1].text, "能夺冠");
  assert.equal(normalizer.normalize({ type: "response.delta", text: "能夺冠" }, { sessionId: "sess", turnId: "turn_cn" }).length, 1);

  assert.equal(normalizer.normalize({ type: "response.delta", text: "**马" }, { sessionId: "sess", turnId: "turn_md" })[1].text, "**马");
  assert.equal(normalizer.normalize({ type: "response.delta", text: "**马刺的优势**" }, { sessionId: "sess", turnId: "turn_md" })[1].text, "刺的优势**");
});

test("ten snapshot events without ids use stable assistant index key", () => {
  const normalizer = createPiEventNormalizer();
  const frames = ["A", "AB", "ABC", "ABCD", "ABCDE", "ABCDEF", "ABCDEFG", "ABCDEFGH", "ABCDEFGHI", "ABCDEFGHIJ"];
  const deltas = frames.map((text) => normalizer.normalize({ type: "message_update", content: { text }, assistantMessageIndex: 0 }, { sessionId: "sess", turnId: "turn_long" }).find((event) => event.type === "response.delta")?.text ?? "");

  assert.deepEqual(deltas, ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
});

test("message end never appends full text and keeps late duplicate from re-emitting", () => {
  const normalizer = createPiEventNormalizer({ completedTtlMs: 60_000 });
  assert.equal(normalizer.normalize({ type: "message_update", messageId: "msg_done", content: { text: "ABC" } })[1].text, "ABC");
  assert.deepEqual(normalizer.normalize({ type: "message_end", messageId: "msg_done", content: { text: "ABC" } }).map((event) => event.type), ["state", "response.done"]);
  assert.equal(normalizer.normalize({ type: "message_update", messageId: "msg_done", content: { text: "ABC" } }).length, 1);
});

test("keeps multiple assistant message snapshots separate and clears on session destroy", () => {
  const normalizer = createPiEventNormalizer();
  assert.equal(normalizer.normalize({ type: "message", messageId: "msg_a", message: { content: "Hello" } })[1].text, "Hello");
  assert.equal(normalizer.normalize({ type: "message", messageId: "msg_b", message: { content: "Hello" } })[1].text, "Hello");
  normalizer.destroy();
  assert.equal(normalizer.normalize({ type: "message", messageId: "msg_a", message: { content: "Hello" } })[1].text, "Hello");
});

test("normalizes nested pi fallback text fields into response delta", () => {
  const shapes = [
    { type: "delta", data: { delta: "from data delta" } },
    { type: "unknown", assistant: { text: "from assistant text" } },
    { type: "unknown", output_text: "from output text" }
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
