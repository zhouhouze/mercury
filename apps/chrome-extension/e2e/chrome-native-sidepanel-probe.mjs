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
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_2_ac/native-sidepanel-probe");
const browserMode = process.env.NAVIA_NATIVE_BROWSER || "chromium";

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
  const dbPath = path.join(os.tmpdir(), `navia-native-sidepanel-${Date.now()}.sqlite3`);
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

async function configureRuntime() {
  const response = await fetch(`${runtimeUrl}/v1/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coreProvider: "mock",
      chatProvider: { coreProvider: "mock" },
      defaultProfile: "chat",
      profiles: {
        chat: { coreProvider: "mock", toolPolicy: { mode: "disabled", allowedTools: [] }, enabled: true },
        agent: { coreProvider: "mock", toolPolicy: { mode: "disabled", allowedTools: [] }, enabled: false }
      }
    })
  });
  if (!response.ok) {
    throw new Error(`Runtime native probe setup failed: ${response.status} ${await response.text()}`);
  }
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
  } catch {
    return null;
  }
}

async function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function activateBrowserApp(appName) {
  await run("osascript", ["-e", `tell application "${appName}" to activate`]);
  await wait(800);
}

async function pressSystemShortcutForNavia() {
  await run("osascript", ["-e", 'tell application "System Events" to key code 53']);
  await wait(300);
  await run("osascript", ["-e", 'tell application "System Events" to key code 45 using {option down, shift down}']);
}

async function regionScreenshot(name) {
  const file = path.join(evidenceRoot, name);
  const result = await run("screencapture", ["-x", "-R", "40,40,1360,860", file]);
  if (result.code !== 0) {
    throw new Error(`screencapture failed: ${result.stderr || result.stdout}`);
  }
  return file;
}

async function tryOpenSidePanel(serviceWorker, fixturePage) {
  const attempts = [];
  if (serviceWorker) {
    const result = await serviceWorker.evaluate(async () => {
      try {
        await chrome.sidePanel.setOptions({ path: "sidepanel.html", enabled: true });
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.windowId) return { ok: false, message: "No active tab windowId." };
        await chrome.sidePanel.open({ windowId: tabs[0].windowId });
        return { ok: true, method: "chrome.sidePanel.open" };
      } catch (error) {
        return { ok: false, method: "chrome.sidePanel.open", message: error instanceof Error ? error.message : String(error) };
      }
    });
    attempts.push(result);
  } else {
    attempts.push({ ok: false, method: "service_worker", message: "Extension service worker was not exposed." });
  }

  await fixturePage.bringToFront();
  await activateBrowserApp("Google Chrome for Testing");
  await fixturePage.keyboard.press("Alt+Shift+N");
  attempts.push({ ok: true, method: "Playwright Alt+Shift+N sent" });
  await wait(1000);
  await pressSystemShortcutForNavia();
  attempts.push({ ok: true, method: "System Events Option+Shift+N sent" });
  await wait(2500);
  return attempts;
}

async function bringBrowserWindowToVisibleArea(page) {
  const session = await page.context().newCDPSession(page);
  const { windowId } = await session.send("Browser.getWindowForTarget");
  await session.send("Browser.setWindowBounds", {
    windowId,
    bounds: { left: 40, top: 40, width: 1360, height: 860, windowState: "normal" }
  });
  await page.bringToFront();
  await wait(1000);
}

async function main() {
  if (!fs.existsSync(path.join(extensionRoot, "manifest.json"))) {
    throw new Error(`Extension build not found: ${extensionRoot}`);
  }
  fs.mkdirSync(evidenceRoot, { recursive: true });
  for (const file of ["01-browser-before-action.png", "02-browser-after-action.png", "result.json"]) {
    fs.rmSync(path.join(evidenceRoot, file), { force: true });
  }

  let runtimeProcess = null;
  if (!(await isRuntimeOnline())) {
    runtimeProcess = startRuntime();
    if (!(await waitForRuntime())) throw new Error("Runtime did not become healthy on 127.0.0.1:17861.");
  }
  await configureRuntime();

  const { server, url: fixtureUrl } = await startFixtureServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-native-sidepanel-profile-"));
  let context = null;

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      ...(browserMode === "chrome" ? { channel: "chrome" } : {}),
      headless: false,
      viewport: { width: 1360, height: 900 },
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        "--window-position=40,40",
        "--window-size=1360,900",
        "--disable-features=DisableLoadExtensionCommandLineSwitch",
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${extensionRoot}`,
        `--load-extension=${extensionRoot}`
      ]
    });

    const fixturePage = await context.newPage();
    await fixturePage.goto(fixtureUrl);
    await bringBrowserWindowToVisibleArea(fixturePage);
    await activateBrowserApp(browserMode === "chrome" ? "Google Chrome" : "Google Chrome for Testing");
    await regionScreenshot("01-browser-before-action.png");

    const serviceWorker = await findExtensionServiceWorker(context);
    const extensionId = serviceWorker ? new URL(serviceWorker.url()).host : null;
    const openAttempts = await tryOpenSidePanel(serviceWorker, fixturePage);
    await activateBrowserApp(browserMode === "chrome" ? "Google Chrome" : "Google Chrome for Testing");
    await regionScreenshot("02-browser-after-action.png");

    const pages = context.pages().map((page) => page.url());
    const workers = context.serviceWorkers().map((worker) => worker.url());
    const sidePanelPage = context.pages().find((page) => page.url().endsWith("/sidepanel.html"));
    const summary = {
      status: sidePanelPage ? "automatable_sidepanel_page_exposed" : "visual_probe_only",
      browserMode,
      runtimeUrl,
      fixtureUrl,
      extensionId,
      openAttempts,
      pages,
      workers,
      screenshots: ["01-browser-before-action.png", "02-browser-after-action.png"],
      acceptance: {
        nativeSidePanelUxAccepted: false,
        reason:
          "This probe only captures the browser window after attempting to open the native side panel. Human or image review must confirm whether the right-side native Side Panel is visible before UX acceptance can pass."
      }
    };
    fs.writeFileSync(path.join(evidenceRoot, "result.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (context) await context.close();
    server.close();
    if (runtimeProcess) runtimeProcess.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
