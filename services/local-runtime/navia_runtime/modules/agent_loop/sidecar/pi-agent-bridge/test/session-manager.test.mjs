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

test("session diagnostics expose provider config without leaking api key", () => {
  const child = {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: () => true,
    on: () => undefined
  };
  const manager = new SessionManager("pi", "/tmp/project-path", () => child);
  const created = manager.createSession({
    naviaSessionId: "navia_sess",
    profile: "chat",
    toolPolicy: "disabled",
    modelProvider: {
      type: "deepseek",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-flash",
      apiKey: "sk-1234567890abcdef",
      apiKeyRef: "sqlite:provider:api_key"
    }
  });

  const events = manager.drainEvents(created.sessionId);
  const diagnostic = events.find((event) => event.type === "state" && event.state === "pi.session.provider");

  assert.equal(diagnostic.providerType, "deepseek");
  assert.equal(diagnostic.providerBaseUrl, "https://api.deepseek.com");
  assert.equal(diagnostic.providerModel, "deepseek-v4-flash");
  assert.equal(diagnostic.providerHasApiKey, true);
  assert.equal(diagnostic.providerHasApiKeyRef, true);
  assert.equal(JSON.stringify(events).includes("sk-123"), false);
});

test("stream debug records redacted stdout and stderr summaries", () => {
  const previous = process.env.NAVIA_PI_STREAM_DEBUG;
  process.env.NAVIA_PI_STREAM_DEBUG = "true";
  const child = {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: () => true,
    on: () => undefined
  };
  const manager = new SessionManager("pi", "/tmp/project-path", () => child);
  const created = manager.createSession({
    naviaSessionId: "navia_sess",
    profile: "chat",
    toolPolicy: "disabled",
    modelProvider: { type: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash", apiKeyRef: "sqlite:provider:api_key" }
  });

  child.stdout.write('{"type":"unknown","payload":{"note":"hello"}}\n');
  child.stderr.write("401 invalid api key sk-1234567890abcdef\n");
  const events = manager.drainEvents(created.sessionId);
  const stdio = events.find((event) => event.type === "state" && event.state === "pi.stdio.debug");
  const authError = events.find((event) => event.type === "error" && event.code === "provider_auth_failed");

  assert.equal(stdio.stdoutLineCount, 1);
  assert.equal(stdio.stderrLineCount, 1);
  assert.equal(stdio.stdoutPreviews[0].includes("hello"), true);
  assert.equal(stdio.stderrPreviews[0].includes("sk-123"), false);
  assert.equal(authError.code, "provider_auth_failed");
  if (previous === undefined) {
    delete process.env.NAVIA_PI_STREAM_DEBUG;
  } else {
    process.env.NAVIA_PI_STREAM_DEBUG = previous;
  }
});
