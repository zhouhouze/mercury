import { createServer } from "node:http";
import { routeRequest } from "./command-router.js";
import { SessionManager } from "./session-manager.js";

const host = process.env.NAVIA_PI_SIDECAR_HOST ?? "127.0.0.1";
const port = Number(process.env.NAVIA_PI_SIDECAR_PORT ?? "17862");
const manager = new SessionManager();

const server = createServer((request, response) => {
  void routeRequest(request, response, manager);
});

server.listen(port, host, () => {
  console.log(`pi-agent-bridge listening on http://${host}:${port}`);
});

