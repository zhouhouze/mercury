import { extractPageContext } from "../../src/pageContext";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== "navia.extractPageContext") {
        return false;
      }

      const context = extractPageContext(document, window.location.href);
      sendResponse({ ok: true, context });
      return true;
    });
  }
});
