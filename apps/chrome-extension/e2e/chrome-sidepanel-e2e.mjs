import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = fs.realpathSync(path.resolve(__dirname, "../chrome-mv3-unpacked"));
const repoRoot = path.resolve(__dirname, "../../..");
const runtimeUrl = "http://127.0.0.1:17861";
const fixturePath = path.join(repoRoot, "docs/active/project/fixtures/real_pages/article.html");
const browserMode = process.env.NAVIA_E2E_BROWSER || "chrome";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  return response.json();
}

async function isRuntimeOnline() {
  try {
    const body = await fetchJson(`${runtimeUrl}/v1/health`);
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

async function waitForRuntime(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isRuntimeOnline()) return true;
    await wait(250);
  }
  return false;
}

function startRuntime() {
  const dbPath = path.join(os.tmpdir(), `navia-e2e-${Date.now()}.sqlite3`);
  const child = spawn(
    "uvicorn",
    ["navia_runtime.app:app", "--host", "127.0.0.1", "--port", "17861", "--app-dir", "services/local-runtime"],
    {
      cwd: repoRoot,
      env: { ...process.env, NAVIA_DB_PATH: dbPath },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", (chunk) => process.stdout.write(`[runtime] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[runtime] ${chunk}`));
  return child;
}

function startFixtureServer() {
  const html = fs.readFileSync(fixturePath);
  const server = http.createServer((request, response) => {
    if (request.url === "/article.html" || request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/article.html` });
    });
  });
}

async function findExtensionServiceWorker(context) {
  const existing = context.serviceWorkers()[0];
  if (existing) return existing;
  try {
    return await context.waitForEvent("serviceworker", { timeout: 15000 });
  } catch (error) {
    const pages = context.pages().map((page) => page.url());
    const workers = context.serviceWorkers().map((worker) => worker.url());
    throw new Error(
      `MANUAL_REQUIRED: extension service worker was not exposed. pages=${JSON.stringify(pages)} workers=${JSON.stringify(workers)}`
    );
  }
}

async function waitForSidePanelPage(context, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const sidePanel = context.pages().find((page) => page.url().endsWith("/sidepanel.html"));
    if (sidePanel) return sidePanel;
    await wait(250);
  }
  return null;
}

async function openSidePanel(context, serviceWorker, fixturePage) {
  const result = await serviceWorker.evaluate(async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.windowId) return { ok: false, message: "No active tab windowId." };
      await chrome.sidePanel.open({ windowId: tabs[0].windowId });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  });
  if (!result.ok) {
    if (!result.message.includes("user gesture")) {
      throw new Error(`MANUAL_REQUIRED: chrome.sidePanel.open failed: ${result.message}`);
    }
    await fixturePage.bringToFront();
    await fixturePage.keyboard.press("Alt+Shift+N");
  }

  const sidePanel = await waitForSidePanelPage(context);
  if (sidePanel) return sidePanel;

  if (!result.ok && result.message.includes("user gesture")) {
    throw new Error("MANUAL_REQUIRED: keyboard-triggered extension action did not expose sidepanel.html.");
  }

  throw new Error("MANUAL_REQUIRED: sidepanel.html was not exposed as an automatable Chrome page.");
}

async function main() {
  if (!fs.existsSync(path.join(extensionRoot, "manifest.json"))) {
    throw new Error(`Extension build not found: ${extensionRoot}`);
  }

  let runtimeProcess = null;
  if (!(await isRuntimeOnline())) {
    runtimeProcess = startRuntime();
    if (!(await waitForRuntime())) throw new Error("Runtime did not become healthy on 127.0.0.1:17861.");
  }

  const { server, url: fixtureUrl } = await startFixtureServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-chrome-profile-"));
  let context = null;

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      ...(browserMode === "chrome" ? { channel: "chrome" } : {}),
      headless: false,
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        "--disable-features=DisableLoadExtensionCommandLineSwitch",
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${extensionRoot}`,
        `--load-extension=${extensionRoot}`
      ]
    });

    const serviceWorker = await findExtensionServiceWorker(context);
    const extensionId = new URL(serviceWorker.url()).host;
    const fixturePage = await context.newPage();
    await fixturePage.goto(fixtureUrl);
    await fixturePage.bringToFront();

    const sidePanel = await openSidePanel(context, serviceWorker, fixturePage);
    await sidePanel.waitForLoadState("domcontentloaded");
    await sidePanel.getByText("online", { exact: true }).waitFor({ timeout: 15000 });

    await fixturePage.bringToFront();
    await sidePanel.bringToFront();
    await sidePanel.getByRole("button", { name: "读取当前页面" }).click();
    await sidePanel.getByText("已读取页面").waitFor({ timeout: 15000 });
    await sidePanel.getByRole("button", { name: "提交上下文" }).click();
    await sidePanel.getByText("已提交").waitFor({ timeout: 15000 });

    await sidePanel.getByRole("button", { name: "总结" }).click();
    await sidePanel.getByText("关键要点").waitFor({ timeout: 20000 });

    await sidePanel.getByPlaceholder("基于当前网页提问...").fill("这个页面的核心目标是什么？");
    await sidePanel.getByRole("button", { name: "发送" }).click();
    await sidePanel.getByText("基于当前页面").waitFor({ timeout: 20000 });

    await sidePanel.getByRole("button", { name: "Mindmap" }).click();
    await sidePanel.locator(".mermaid-render svg, .mermaid-fallback pre").first().waitFor({ timeout: 20000 });

    await sidePanel.reload();
    await sidePanel.getByText("已恢复").waitFor({ timeout: 20000 });

    const restored = await fetchJson(`${runtimeUrl}/v1/health`);
    if (!restored.ok) throw new Error("Runtime health failed after UI E2E.");
    console.log(
      JSON.stringify(
        {
          status: "passed",
          extensionId,
          fixtureUrl,
          runtimeUrl,
          browserMode,
          checks: ["online", "page context", "summary", "question", "mindmap", "refresh recovery"]
        },
        null,
        2
      )
    );
  } finally {
    if (context) await context.close();
    server.close();
    if (runtimeProcess) runtimeProcess.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(error.message.startsWith("MANUAL_REQUIRED") ? 2 : 1);
});
