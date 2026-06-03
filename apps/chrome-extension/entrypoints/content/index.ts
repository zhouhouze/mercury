import { extractPageContext } from "../../src/pageContext";
import { mountNaviaInjectedPanel } from "../../src/injectedPanel";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const panel = mountNaviaInjectedPanel();

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "navia.openPanel") {
        panel?.open();
        sendResponse({ ok: Boolean(panel) });
        return true;
      }

      if (message?.type !== "navia.extractPageContext") {
        return false;
      }

      const context = extractPageContext(document, window.location.href);
      sendResponse({ ok: true, context });
      return true;
    });
  }
});
