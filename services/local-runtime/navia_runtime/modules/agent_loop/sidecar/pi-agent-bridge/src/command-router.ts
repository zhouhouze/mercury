import { IncomingMessage, ServerResponse } from "node:http";
import { SessionManager } from "./session-manager.js";

const startedAt = new Date().toISOString();
const buildVersion = "v1.6.1-diagnostics";

export async function routeRequest(request: IncomingMessage, response: ServerResponse, manager: SessionManager): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, { status: "ok", service: "pi-agent-bridge", version: "v1.2", buildVersion, startedAt });
    }
    if (request.method === "POST" && url.pathname === "/sessions") {
      return json(response, 200, manager.createSession(await readJson(request)));
    }
    if (parts[0] === "sessions" && parts[1]) {
      const sessionId = parts[1];
      const action = parts[2];
      if (request.method === "POST" && action === "prompt") {
        return json(response, 200, manager.prompt(sessionId, await readJson(request)));
      }
      if (request.method === "POST" && action === "abort") {
        const body = await readJson(request);
        return json(response, 200, manager.abort(sessionId, typeof body.requestId === "string" ? body.requestId : undefined));
      }
      if (request.method === "POST" && action === "compact") {
        return json(response, 200, manager.compact(sessionId));
      }
      if (request.method === "GET" && action === "events") {
        response.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" });
        for (const event of manager.drainEvents(sessionId)) {
          response.write(`${JSON.stringify(event)}\n`);
        }
        response.end();
        return;
      }
      if (request.method === "DELETE" && action === undefined) {
        return json(response, 200, manager.destroy(sessionId));
      }
    }
    json(response, 404, { error: "not_found" });
  } catch (error) {
    json(response, 400, { error: "bad_request", message: error instanceof Error ? error.message : "Request failed." });
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

function json(response: ServerResponse, status: number, body: Record<string, unknown>): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}
