import { initializeContentBridge } from "../../src/contentBridge";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    initializeContentBridge(document, window.location.href);
  }
});
