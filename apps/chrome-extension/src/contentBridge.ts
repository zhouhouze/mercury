import { extractPageContext, type ExtractedPageContext } from "./pageContext";

export const PAGE_CONTEXT_MESSAGE_TYPE = "navia.extractPageContext";
export const LEGACY_INJECTED_HOST_ID = ["navia", "injected", "host"].join("-");

type PageContextBridgeResponse =
  | { ok: true; context: ExtractedPageContext }
  | { ok: false; error: string };

type SendResponse = (response: PageContextBridgeResponse) => void;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "页面上下文读取失败。";
}

export function initializeContentBridge(documentRef: Document, href: string): void {
  cleanupLegacyInjectedPanel(documentRef);
  chrome.runtime.onMessage.addListener(createPageContextMessageHandler(documentRef, href));
}

export function cleanupLegacyInjectedPanel(documentRef: Document = document): void {
  documentRef.getElementById(LEGACY_INJECTED_HOST_ID)?.remove();
}

export function createPageContextMessageHandler(documentRef: Document, href: string) {
  return (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: SendResponse): boolean => {
    if (!message || typeof message !== "object" || (message as { type?: unknown }).type !== PAGE_CONTEXT_MESSAGE_TYPE) {
      return false;
    }

    try {
      const context = extractPageContext(documentRef, href);
      sendResponse({ ok: true, context });
    } catch (error) {
      sendResponse({ ok: false, error: getErrorMessage(error) });
    }
    return true;
  };
}
