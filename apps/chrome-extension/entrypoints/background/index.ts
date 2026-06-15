const RUNTIME_URL = "http://127.0.0.1:17861";

declare const __NAVIA_E2E_BRIDGE__: boolean;

let e2eSidePanelPort: chrome.runtime.Port | null = null;

declare global {
  var __naviaE2EExecuteSidePanelCommand:
    | ((command: unknown) => Promise<unknown>)
    | undefined;
}

export default defineBackground(() => {
  void configureSidePanel();
  if (__NAVIA_E2E_BRIDGE__) {
    globalThis.__naviaE2EExecuteSidePanelCommand = executeSidePanelE2ECommand;
  }

  chrome.runtime.onInstalled.addListener(() => {
    void configureSidePanel();
  });

  chrome.runtime.onStartup?.addListener(() => {
    void configureSidePanel();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (__NAVIA_E2E_BRIDGE__ && message?.type === "navia.e2e.sidepanel.exec") {
      void executeSidePanelE2ECommand(message.command)
        .then((response) => sendResponse(response))
        .catch((error) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "E2E side panel bridge failed"
          })
        );
      return true;
    }
    if (message?.type !== "navia.runtimeFetch") return false;
    void proxyRuntimeFetch(message.request)
      .then((response) => sendResponse({ ok: true, response }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Runtime proxy failed"
        })
      );
    return true;
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (__NAVIA_E2E_BRIDGE__ && port.name === "navia.e2e.sidepanel") {
      e2eSidePanelPort = port;
      port.onDisconnect.addListener(() => {
        if (e2eSidePanelPort === port) e2eSidePanelPort = null;
      });
      return;
    }
    if (port.name !== "navia.runtimeStream") return;
    port.onMessage.addListener((message) => {
      if (message?.type !== "navia.runtimeStream") return;
      void proxyRuntimeStream(message.request, port);
    });
  });

  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.windowId !== undefined && chrome.sidePanel?.open) {
      await configureSidePanel(tab.id);
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  });
});

async function configureSidePanel(tabId?: number) {
  if (!chrome.sidePanel) return;
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  if (tabId !== undefined) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true
    });
  }
}

function executeSidePanelE2ECommand(command: unknown): Promise<unknown> {
  const port = e2eSidePanelPort;
  if (!port) {
    return Promise.resolve({ ok: false, error: "E2E Side Panel bridge is not connected." });
  }
  const commandId = crypto.randomUUID();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve({ ok: false, commandId, error: "E2E Side Panel bridge timed out." });
    }, 60_000);
    const cleanup = () => {
      clearTimeout(timeout);
      port.onMessage.removeListener(onMessage);
    };
    const onMessage = (message: unknown) => {
      if (!isE2EResponse(message) || message.commandId !== commandId) return;
      cleanup();
      resolve(message);
    };
    port.onMessage.addListener(onMessage);
    port.postMessage({
      type: "navia.e2e.command",
      commandId,
      command
    });
  });
}

function isE2EResponse(value: unknown): value is { type: string; commandId: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === "navia.e2e.response" && typeof record.commandId === "string";
}

type RuntimeProxyRequest = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

async function proxyRuntimeFetch(request: RuntimeProxyRequest) {
  const response = await fetch(`${RUNTIME_URL}${request.path}`, {
    method: request.method ?? "GET",
    headers: request.headers,
    body: request.body === undefined ? undefined : JSON.stringify(request.body)
  });
  return {
    status: response.status,
    ok: response.ok,
    body: await response.json()
  };
}

async function proxyRuntimeStream(request: RuntimeProxyRequest, port: chrome.runtime.Port) {
  try {
    const response = await fetch(`${RUNTIME_URL}${request.path}`, {
      method: request.method ?? "POST",
      headers: request.headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body)
    });
    if (!response.body) throw new Error("SSE response body is empty.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      port.postMessage({ type: "chunk", text: decoder.decode(value, { stream: true }) });
    }
    port.postMessage({ type: "done" });
  } catch (error) {
    port.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Runtime stream proxy failed"
    });
  }
}
