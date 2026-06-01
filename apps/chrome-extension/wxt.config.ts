import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Navia",
    description: "Current-page companion reading with a local headless runtime.",
    version: "0.1.0",
    permissions: ["activeTab", "scripting", "sidePanel", "storage", "tabs"],
    host_permissions: ["<all_urls>", "http://127.0.0.1:17861/*", "http://localhost:17861/*"],
    action: {
      default_title: "Open Navia"
    },
    side_panel: {
      default_path: "sidepanel.html"
    }
  }
});
