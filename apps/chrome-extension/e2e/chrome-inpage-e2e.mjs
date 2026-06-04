import { spawn } from "node:child_process";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const builtExtensionRoot = path.resolve(__dirname, "../.output/chrome-mv3");
const fallbackExtensionRoot = path.resolve(__dirname, "../chrome-mv3-unpacked");
const extensionRoot = fs.existsSync(path.join(builtExtensionRoot, "manifest.json"))
  ? fs.realpathSync(builtExtensionRoot)
  : fs.realpathSync(fallbackExtensionRoot);
const runtimeUrl = "http://127.0.0.1:17861";
const fixturePath = path.join(repoRoot, "docs/navia_v1_project_docs/fixtures/real_pages/article.html");
const browserMode = process.env.NAVIA_E2E_BROWSER || "chromium";
const headless = process.env.NAVIA_E2E_HEADLESS !== "false";
const stepTimeout = 20000;

function logStep(message) {
  console.log(`[navia-e2e] ${message}`);
}

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
  const dbPath = path.join(os.tmpdir(), `navia-inpage-e2e-${Date.now()}.sqlite3`);
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

async function waitForInjectedPanel(page) {
  await page.locator("#navia-injected-host").waitFor({ state: "attached", timeout: 15000 });
  await page.locator("[data-testid='navia-ball']").waitFor({ timeout: 15000 });
}

async function findExtensionServiceWorker(context) {
  const existing = context.serviceWorkers()[0];
  if (existing) return existing;
  return context.waitForEvent("serviceworker", { timeout: 15000 });
}

async function findLoadedExtensionId(context) {
  const workerUrl = context.serviceWorkers().find((worker) => worker.url().startsWith("chrome-extension://"))?.url();
  if (workerUrl) return new URL(workerUrl).host;

  const probePage = await context.newPage();
  try {
    await probePage.goto("chrome://extensions");
    await probePage.waitForSelector("extensions-manager", { timeout: 5000 });
    const extensionId = await probePage.evaluate(() => {
      const manager = document.querySelector("extensions-manager");
      const managerRoot = manager?.shadowRoot;
      const itemList = managerRoot?.querySelector("extensions-item-list");
      const itemListRoot = itemList?.shadowRoot;
      const items = Array.from(itemListRoot?.querySelectorAll("extensions-item") ?? []);
      for (const item of items) {
        const root = item.shadowRoot;
        const name = root?.querySelector("#name")?.textContent?.trim();
        const id = item.getAttribute("id");
        if (name === "Navia" && id) return id;
      }
      return null;
    });
    if (extensionId) return extensionId;
  } catch {
    // chrome://extensions is not available in all headless channels.
  } finally {
    await probePage.close();
  }

  return generateChromeExtensionId(extensionRoot);
}

function generateChromeExtensionId(extensionPath) {
  const hash = crypto.createHash("sha256").update(extensionPath).digest();
  const alphabet = "abcdefghijklmnop";
  return Array.from(hash.subarray(0, 16))
    .map((byte) => `${alphabet[byte >> 4]}${alphabet[byte & 0x0f]}`)
    .join("");
}

async function injectContentScriptViaExtensionPage(context, fixturePage) {
  const extensionId = await findLoadedExtensionId(context);
  if (!extensionId) throw new Error("Extension id was not found in chrome://extensions.");
  const extensionPage = await context.newPage();
  try {
    await extensionPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await fixturePage.bringToFront();
    const result = await extensionPage.evaluate(async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      if (!tabId) return { ok: false, message: "No active tab id." };
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-scripts/content.js"]
      });
      return { ok: true };
    });
    if (!result.ok) throw new Error(`Extension page script injection failed: ${result.message}`);
  } finally {
    await extensionPage.close();
  }
}

async function injectContentScriptViaExtension(context, fixturePage) {
  let serviceWorker = null;
  try {
    serviceWorker = await findExtensionServiceWorker(context);
  } catch {
    await injectContentScriptViaExtensionPage(context, fixturePage);
    return;
  }
  const result = await serviceWorker.evaluate(async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (!tabId) return { ok: false, message: "No active tab id." };
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-scripts/content.js"]
    });
    return { ok: true };
  });
  if (!result.ok) throw new Error(`Extension script injection failed: ${result.message}`);
}

async function assertFrameState(page, expected) {
  await page.waitForFunction(
    ({ open, mode, widthState, runtime }) => {
      const host = document.querySelector("#navia-injected-host");
      const frame = host?.shadowRoot?.querySelector("[data-testid='navia-frame']");
      return (
        frame?.getAttribute("data-open") === open &&
        (!mode || frame?.getAttribute("data-mode") === mode) &&
        (!widthState || frame?.getAttribute("data-width-state") === widthState) &&
        (!runtime || frame?.getAttribute("data-runtime") === runtime)
      );
    },
    expected,
    { timeout: 10000 }
  );
}

async function main() {
  if (!fs.existsSync(path.join(extensionRoot, "manifest.json"))) {
    throw new Error(`Extension build not found: ${extensionRoot}`);
  }

  let runtimeProcess = null;
  if (!(await isRuntimeOnline())) {
    logStep("starting local runtime");
    runtimeProcess = startRuntime();
    if (!(await waitForRuntime())) throw new Error("Runtime did not become healthy on 127.0.0.1:17861.");
  } else {
    logStep("reusing existing local runtime");
  }

  logStep("starting fixture server");
  const { server, url: fixtureUrl } = await startFixtureServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-inpage-profile-"));
  let context = null;

  try {
    logStep(`launching browser with extension ${extensionRoot}; browserMode=${browserMode}; headless=${headless}`);
    context = await chromium.launchPersistentContext(userDataDir, {
      ...(browserMode === "chrome" ? { channel: "chrome" } : {}),
      headless,
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        "--disable-features=DisableLoadExtensionCommandLineSwitch",
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${extensionRoot}`,
        `--load-extension=${extensionRoot}`
      ]
    });

    context.setDefaultTimeout(stepTimeout);
    const page = await context.newPage();
    page.on("console", (message) => console.log(`[page:${message.type()}] ${message.text()}`));
    logStep(`opening fixture ${fixtureUrl}`);
    await page.goto(fixtureUrl);
    logStep("waiting for injected panel");
    try {
      await waitForInjectedPanel(page);
    } catch {
      logStep("manifest content script was not visible; injecting built content script via chrome.scripting fallback");
      await injectContentScriptViaExtension(context, page);
      await waitForInjectedPanel(page);
    }
    await assertFrameState(page, { open: "false" });

    logStep("checking floating ball and hover strip");
    const ball = page.locator("[data-testid='navia-ball']");
    const strip = page.locator("[data-testid='navia-hover-strip']");
    await ball.hover();
    await strip.waitFor({ timeout: 5000 });
    await strip.click();
    await assertFrameState(page, { open: "true", mode: "push", widthState: "narrow" });
    await page.locator("[data-testid='navia-chat-notice']").getByText(/Runtime|当前页面|正在检查|读取/).waitFor({ timeout: 10000 });

    logStep("waiting for runtime online status in injected panel");
    await page.locator("[data-testid='navia-status']").getByText(/online|Runtime online|已提交页面/).waitFor({ timeout: 15000 });
    logStep("submitting real page context");
    await page.locator("[data-testid='navia-read-page']").click();
    await page.locator("[data-testid='navia-status']").getByText(/已提交页面/).waitFor({ timeout: 15000 });

    logStep("running summary");
    await page.locator("[data-testid='navia-summary']").click();
    await page.locator("[data-testid='navia-messages']").getByText("关键要点").waitFor({ timeout: 20000 });

    logStep("running page question");
    await page.locator("[data-testid='navia-input']").fill("这个页面的核心目标是什么？");
    await page.locator("[data-testid='navia-input']").press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
    await page.locator("[data-testid='navia-messages']").getByText("基于当前页面").waitFor({ timeout: 20000 });

    logStep("running mindmap");
    await page.locator("[data-testid='navia-mindmap']").click();
    await page.locator("[data-testid='navia-messages'] .navia-artifact").first().waitFor({
      timeout: 20000
    });

    logStep("checking resize overlay transition");
    const resize = page.locator("[data-testid='navia-resize-handle']");
    const box = await resize.boundingBox();
    if (!box) throw new Error("Resize handle is not visible.");
    await page.mouse.move(box.x + 2, box.y + 120);
    await page.mouse.down();
    await page.mouse.move(650, box.y + 120, { steps: 8 });
    await page.mouse.up();
    await assertFrameState(page, { open: "true", mode: "push", widthState: "half" });

    const halfBox = await resize.boundingBox();
    if (!halfBox) throw new Error("Resize handle is not visible after half-width resize.");
    await page.mouse.move(halfBox.x + 2, halfBox.y + 120);
    await page.mouse.down();
    await page.mouse.move(610, box.y + 120, { steps: 8 });
    await page.mouse.up();
    await assertFrameState(page, { open: "true", mode: "overlay", widthState: "overlay" });

    const htmlMarginDuringOpen = await page.evaluate(() => document.documentElement.style.marginRight || document.documentElement.style.marginLeft);
    if (htmlMarginDuringOpen) throw new Error("Overlay mode must not keep page push margin.");

    logStep("checking mobile overlay state");
    await page.setViewportSize({ width: 800, height: 900 });
    await assertFrameState(page, { open: "true", mode: "overlay", widthState: "mobile" });
    await page.setViewportSize({ width: 1280, height: 900 });

    logStep("checking collapse recovery");
    await page.locator("[data-testid='navia-collapse']").click();
    await assertFrameState(page, { open: "false" });
    const htmlMarginAfterClose = await page.evaluate(() => document.documentElement.style.marginRight || document.documentElement.style.marginLeft);
    if (htmlMarginAfterClose) throw new Error("Collapse did not restore page layout margins.");

    if (runtimeProcess) {
      logStep("checking runtime offline state");
      runtimeProcess.kill("SIGTERM");
      runtimeProcess = null;
      await ball.hover();
      await strip.click();
      await page.locator("[data-testid='navia-reconnect']").click();
      await assertFrameState(page, { open: "true", runtime: "offline" });
      await page.locator("[data-testid='navia-chat-notice']").getByText(/Runtime offline|Local Runtime/).waitFor({
        timeout: 15000
      });
      await page.locator("[data-testid='navia-tool-debug']").click();
      await page.locator("[data-testid='navia-state-banner']").getByText(/Runtime offline|Local Runtime/).waitFor({
        timeout: 15000
      });
      const sendDisabled = await page.locator("[data-testid='navia-send']").evaluate((button) => button.disabled);
      if (!sendDisabled) throw new Error("Send button must be disabled while runtime is offline.");
    }

    console.log(
      JSON.stringify(
        {
          status: "passed",
          fixtureUrl,
          extensionRoot,
          runtimeUrl,
          browserMode,
          checks: [
            "floating ball",
            "hover strip",
            "in-page panel",
            "page context",
            "summary",
            "question",
            "mindmap",
            "half push",
            "overlay resize",
            "mobile overlay",
            "runtime offline",
            "collapse recovery"
          ]
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

const timeout = setTimeout(() => {
  console.error("E2E timed out after 120000ms.");
  process.exit(1);
}, 120000);

main().finally(() => clearTimeout(timeout)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
