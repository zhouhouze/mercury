import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Navia",
    description: "In-page companion reading with a local headless runtime.",
    version: "0.1.0",
    permissions: ["activeTab", "scripting", "sidePanel", "storage", "tabs"],
    host_permissions: ["<all_urls>", "http://127.0.0.1:17861/*", "http://localhost:17861/*"],
    action: {
      default_title: "Open Navia"
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Alt+Shift+N",
          mac: "Alt+Shift+N"
        },
        description: "Open Navia"
      }
    },
    side_panel: {
      default_path: "sidepanel.html"
    },
    web_accessible_resources: [
      {
        resources: ["mermaid-renderer.html", "assets/*", "chunks/*"],
        matches: ["<all_urls>"]
      }
    ]
  }
});
