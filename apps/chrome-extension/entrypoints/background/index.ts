const RUNTIME_URL = "http://127.0.0.1:17861";

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
    if (port.name !== "navia.runtimeStream") return;
    port.onMessage.addListener((message) => {
      if (message?.type !== "navia.runtimeStream") return;
      void proxyRuntimeStream(message.request, port);
    });
  });

  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id !== undefined) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "navia.openPanel" });
        return;
      } catch {
        // Fall back to the debug Side Panel when the active page cannot host content scripts.
      }
    }
    if (tab.windowId !== undefined && chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  });
});

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
