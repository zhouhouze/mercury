import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import { SessionManager } from "../dist/session-manager.js";

test("chat profile session init isolates coding-agent context", () => {
  const writes = [];
  const child = {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: () => true,
    on: () => undefined
  };
  child.stdin.on("data", (chunk) => {
    writes.push(JSON.parse(chunk.toString()));
  });
  const manager = new SessionManager("pi", "/tmp/project-path", () => child);

  manager.createSession({ naviaSessionId: "navia_sess", systemPrompt: "通用网页伴读 Chatbot", toolNames: ["bash"], profile: "chat", toolPolicy: "disabled" });

  assert.equal(writes[0].type, "session.init");
  assert.equal(writes[0].profile, "chat");
  assert.equal(writes[0].toolPolicy, "disabled");
  assert.deepEqual(writes[0].toolNames, []);
  assert.deepEqual(writes[0].tools, []);
  assert.deepEqual(writes[0].messages, []);
  assert.equal(writes[0].systemPrompt, "通用网页伴读 Chatbot");
  assert.equal("cwd" in writes[0], false);
  assert.equal(JSON.stringify(writes[0]).includes("pi-agent-bridge"), false);
});
