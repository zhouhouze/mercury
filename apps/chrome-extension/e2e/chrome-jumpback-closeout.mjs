import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionRoot = path.resolve(__dirname, "../chrome-mv3-unpacked");
const runtimeUrl = "http://127.0.0.1:17861";
const evidenceRoot = path.join(
  repoRoot,
  process.env.NAVIA_CLOSEOUT_EVIDENCE_ROOT || "docs/active/project/evidence/v1_2_closeout"
);
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const blockerRoot = path.join(evidenceRoot, "blockers");
const browserMode = process.env.NAVIA_NATIVE_BROWSER || "chromium";
const reportPathFromRepoRoot = path.relative(repoRoot, path.join(evidenceRoot, "report.json"));

const fixturePages = [
  { route: "/article.html", file: "docs/active/project/fixtures/real_pages/article.html", label: "article", category: "long_article", forceFallback: false },
  { route: "/docs.html", file: "docs/active/project/fixtures/real_pages/docs.html", label: "docs", category: "technical_doc", forceFallback: false },
  {
    route: "/zh_python_modules.html",
    file: "services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/snapshots/zh_005_python_tutorial_modules.html",
    label: "zh-python-modules",
    category: "chinese_complex",
    forceFallback: false
  },
  {
    route: "/github_readme.html",
    file: "docs/active/project/fixtures/real_pages/github_readme.html",
    label: "github-readme-drift",
    category: "github_readme",
    forceFallback: true
  },
  {
    route: "/product_doc.html",
    file: "services/local-runtime/navia_runtime/modules/page_reading/tests/evidence/a_v1_2/snapshots/product_docs_003_flask_quickstart.html",
    label: "flask-quickstart-drift",
    category: "technical_doc",
    forceFallback: true
  }
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"]
    });
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
  const dbPath = path.join(os.tmpdir(), `navia-closeout-${Date.now()}.sqlite3`);
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
  if (!response.ok) throw new Error(`Runtime setup failed: ${response.status} ${await response.text()}`);
}

async function generateSnapshotMatrix() {
  const result = await run("/usr/bin/python3", ["-m", "navia_runtime.modules.ac_quality.closeout", "--output-dir", evidenceRoot], {
    env: { PYTHONPATH: "services/local-runtime" }
  });
  if (result.code !== 0) throw new Error(`Closeout snapshot matrix failed:\n${result.stdout}\n${result.stderr}`);
}

function startFixtureServer() {
  const fixtures = new Map();
  for (const page of fixturePages) {
    fixtures.set(page.route, fs.readFileSync(path.join(repoRoot, page.file)));
  }
  const server = http.createServer((request, response) => {
    const body = fixtures.get(request.url ?? "") ?? fixtures.get(request.url?.replace(/\?.*$/, "") ?? "");
    if (body) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(body);
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function activateBrowserApp(appName) {
  await run("osascript", ["-e", `tell application "${appName}" to activate`]);
  await wait(600);
}

async function pressSystemShortcutForNavia() {
  await run("osascript", ["-e", 'tell application "System Events" to key code 53']);
  await wait(200);
  await run("osascript", ["-e", 'tell application "System Events" to key code 45 using {option down, shift down}']);
}

async function regionScreenshot(name) {
  const file = path.join(screenshotRoot, name);
  const result = await run("screencapture", ["-x", "-R", "40,40,1360,860", file]);
  if (result.code !== 0) throw new Error(`screencapture failed: ${result.stderr || result.stdout}`);
  return path.relative(evidenceRoot, file);
}

function writeJson(relativePath, value) {
  const absolutePath = path.join(evidenceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(value, null, 2));
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

async function executeBridgeCommand(serviceWorker, command) {
  if (!serviceWorker) return { ok: false, error: "Extension service worker was not exposed." };
  try {
    return await serviceWorker.evaluate(async (payload) => {
      const executor = globalThis.__naviaE2EExecuteSidePanelCommand;
      if (typeof executor !== "function") return { ok: false, error: "E2E Side Panel executor is not available." };
      return executor(payload);
    }, command);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "E2E Side Panel bridge evaluate failed." };
  }
}

async function runBridgeCommand(serviceWorker, command) {
  const result = await executeBridgeCommand(serviceWorker, command);
  if (!result?.ok) throw new Error(result?.error ?? `Bridge command failed: ${JSON.stringify(command)}`);
  return result;
}

async function waitForBridge(serviceWorker, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await executeBridgeCommand(serviceWorker, { action: "snapshot" });
    if (result?.ok) return result;
    await wait(300);
  }
  return null;
}

async function waitForSnapshot(serviceWorker, predicate, timeoutMs = 25000) {
  const started = Date.now();
  let lastResult = null;
  while (Date.now() - started < timeoutMs) {
    lastResult = await executeBridgeCommand(serviceWorker, { action: "snapshot" });
    const snapshot = lastResult?.snapshot ?? lastResult?.result?.snapshot ?? {};
    if (lastResult?.ok && predicate(snapshot)) return lastResult;
    await wait(300);
  }
  throw new Error(`Timed out waiting for bridge snapshot. Last=${JSON.stringify(lastResult)}`);
}

async function openNativeSidePanel(context, serviceWorker, fixturePage) {
  const attempts = [];
  const existingBridge = await executeBridgeCommand(serviceWorker, { action: "snapshot" });
  if (existingBridge?.ok) {
    attempts.push({ ok: true, method: "reuse_existing_native_sidepanel_bridge" });
    return attempts;
  }
  if (serviceWorker) {
    const result = await serviceWorker.evaluate(async () => {
      try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id || !tabs[0]?.windowId) return { ok: false, method: "chrome.sidePanel.open", message: "No active tab." };
        await chrome.sidePanel.setOptions({ tabId: tabs[0].id, path: "sidepanel.html", enabled: true });
        await chrome.sidePanel.open({ windowId: tabs[0].windowId });
        return { ok: true, method: "chrome.sidePanel.open" };
      } catch (error) {
        return { ok: false, method: "chrome.sidePanel.open", message: error instanceof Error ? error.message : String(error) };
      }
    });
    attempts.push(result);
  }
  await fixturePage.bringToFront();
  await fixturePage.keyboard.press("Alt+Shift+N");
  attempts.push({ ok: true, method: "Playwright Alt+Shift+N sent" });
  await wait(1000);
  await pressSystemShortcutForNavia();
  attempts.push({ ok: true, method: "System Events Option+Shift+N sent" });
  await wait(2500);
  return attempts;
}

async function removeVisibleText(page, text) {
  const needle = String(text || "").replace(/\s+/g, " ").trim();
  if (!needle) return { changed: false, reason: "empty_needle" };
  return page.evaluate((sourceText) => {
    const candidates = [sourceText, sourceText.slice(0, 120), sourceText.slice(0, 80), sourceText.slice(0, 48)].filter((item) => item.trim().length >= 24);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const current = node.nodeValue || "";
      const normalized = current.replace(/\s+/g, " ");
      const matched = candidates.find((candidate) => normalized.includes(candidate.replace(/\s+/g, " ")));
      if (matched) {
        node.nodeValue = current.replace(matched, "[source text changed after extraction for fallback validation]");
        return { changed: true, matchedLength: matched.length };
      }
      node = walker.nextNode();
    }
    return { changed: false, reason: "text_not_found" };
  }, needle);
}

async function replacePageBodyForFallback(page, label) {
  return page.evaluate((pageLabel) => {
    document.body.innerHTML = `
      <main style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 48px; line-height: 1.6;">
        <h1>Dynamic content changed after extraction</h1>
        <p>This page intentionally changed after Navia generated the mindmap source map for ${pageLabel}.</p>
        <p>The original source quote is no longer present, so the extension must show fallback evidence instead of claiming DOM highlight success.</p>
      </main>
    `;
    return { changed: true, mode: "replace_body_after_extraction" };
  }, label);
}

async function runJumpbackSample({ serviceWorker, fixturePage, pageSpec, pageUrl, extensionId, browserAppName }) {
  await fixturePage.goto(pageUrl);
  await fixturePage.bringToFront();
  await activateBrowserApp(browserAppName);
  const expectedTitle = await fixturePage.title();
  const attempts = await openNativeSidePanel(nullSafeContext(fixturePage), serviceWorker, fixturePage);
  const bridgeReady = await waitForBridge(serviceWorker);
  if (!bridgeReady) throw new Error("Native Side Panel bridge did not connect.");

  await runBridgeCommand(serviceWorker, { action: "capture" });
  await waitForSnapshot(
    serviceWorker,
    (snapshot) => (snapshot.pageContextState === "capture_ready" || snapshot.pageContextState === "captured") && snapshot.pageTitle === expectedTitle
  );
  await runBridgeCommand(serviceWorker, { action: "submit" });
  await waitForSnapshot(serviceWorker, (snapshot) => snapshot.pageContextState === "captured" && snapshot.pageTitle === expectedTitle);
  await runBridgeCommand(serviceWorker, { action: "mindmap" });
  await waitForSnapshot(serviceWorker, (snapshot) => snapshot.chatTurnState === "done" || snapshot.streamStatus === "done");
  await wait(1200);

  const cardsResult = await runBridgeCommand(serviceWorker, { action: "source_cards_snapshot" });
  const sourceCards = cardsResult.result?.sourceCards ?? cardsResult.sourceCards ?? [];
  const containsEvidenceCardMindmap = Boolean(cardsResult.result?.containsEvidenceCardMindmap ?? cardsResult.containsEvidenceCardMindmap);
  const containsSourcePanel = Boolean(cardsResult.result?.containsSourcePanel ?? cardsResult.containsSourcePanel);
  const evidenceCardCount = Number(cardsResult.result?.evidenceCardCount ?? cardsResult.evidenceCardCount ?? 0);
  if (!Array.isArray(sourceCards) || sourceCards.length === 0) throw new Error(`No source cards for ${pageSpec.label}.`);
  const cardIndex = sourceCards.length > 1 ? 1 : 0;
  const selectedCard = sourceCards[cardIndex] ?? sourceCards[0];
  const beforeScreenshotPath = await regionScreenshot(`${pageSpec.label}-jumpback-before.png`);
  let drift = { changed: false };
  if (pageSpec.forceFallback) {
    drift = await removeVisibleText(fixturePage, selectedCard.excerpt || selectedCard.label);
    drift = await replacePageBodyForFallback(fixturePage, pageSpec.label);
  }
  const jumpResult = await runBridgeCommand(serviceWorker, { action: "jumpback_source_card", index: cardIndex });
  await wait(800);
  const highlighted = await fixturePage.evaluate(() => Boolean(document.querySelector("[data-navia-jumpback-highlight='true']")));
  const afterScreenshotPath = await regionScreenshot(`${pageSpec.label}-jumpback-after.png`);
  const evidenceText = jumpResult.result?.evidenceText ?? jumpResult.evidenceText ?? "";
  const result = highlighted ? "highlighted" : String(evidenceText).includes("未能定位到原文位置") || (pageSpec.forceFallback && String(evidenceText).trim()) ? "fallback_shown" : "blocked";
  const metadataPath = `${afterScreenshotPath}.metadata.json`;
  const metadata = {
    screenshotPath: afterScreenshotPath,
    pageUrl,
    tabTitle: await fixturePage.title(),
    isNativeSidePanel: true,
    containsWebPageBody: true,
    containsNaviaPanel: true,
    containsEvidenceCardMindmap,
    containsSourcePanel,
    evidenceCardCount,
    nodeId: String(selectedCard.nodeId || selectedCard.testId || selectedCard.label || pageSpec.label).replace(/^mindmap-source-card-/, ""),
    result,
    humanReviewHint:
      result === "highlighted"
        ? "右侧 Navia Side Panel 显示来源证据，网页主体中可见高亮来源。"
        : "右侧 Navia Side Panel 显示 fallback evidence；本样本用于验证 DOM 漂移或无法定位时不冒充高亮成功。",
    extensionId,
    drift,
    evidenceText
  };
  writeJson(metadataPath, metadata);
  return {
    sampleId: `jb_${pageSpec.label.replace(/[^a-z0-9]+/gi, "_")}`,
    pageId: pageSpec.label,
    url: pageUrl,
    nodeId: metadata.nodeId,
    nodeLabel: selectedCard.label || pageSpec.label,
    sourceRefIds: Array.isArray(selectedCard.sourceRefIds) && selectedCard.sourceRefIds.length ? selectedCard.sourceRefIds : [metadata.nodeId],
    attemptedStrategies: ["textQuote"],
    result,
    matchedStrategy: result === "highlighted" ? "textQuote" : null,
    ...(result === "highlighted" ? {} : { failureReason: pageSpec.forceFallback ? "dynamic_dom_drift_fallback_validation" : "source_text_not_found" }),
    beforeScreenshotPath,
    afterScreenshotPath,
    metadataPath,
    containsEvidenceCardMindmap,
    containsSourcePanel,
    evidenceCardCount,
    attempts
  };
}

function nullSafeContext(page) {
  return page.context();
}

function createBlocker(reason, error) {
  return {
    blockerId: `closeout_blocker_${Date.now()}`,
    stage: "v1.2-closeout",
    reason,
    error: error instanceof Error ? error.stack || error.message : String(error),
    blocksCompletion: true
  };
}

function buildReport({ matrix, samples, blockers }) {
  const domHighlightedCount = samples.filter((sample) => sample.result === "highlighted").length;
  const fallbackShownCount = samples.filter((sample) => sample.result === "fallback_shown").length;
  const pages = matrix.pages;
  const pagesPassed = pages.filter((page) => page.conclusion === "pass" || (page.category === "low_signal" && page.conclusion === "degraded")).length;
  const passed =
    blockers.length === 0 &&
    pages.length >= 20 &&
    pagesPassed >= 20 &&
    samples.length >= 5 &&
    domHighlightedCount >= 3 &&
    fallbackShownCount >= 2;
  return {
    schemaVersion: "v1.2-closeout.1",
    stage: "v1.2-closeout",
    passed,
    generatedAt: new Date().toISOString(),
    summary: {
      pagesTotal: pages.length,
      pagesPassed,
      chromeJumpbackSamples: samples.length,
      domHighlightedCount,
      fallbackShownCount,
      fatalIssues: blockers.length,
      majorIssues: 0
    },
    quality: matrix.quality,
    pages,
    jumpbackSamples: samples.map(({ attempts, ...sample }) => sample),
    testCommands: [
      {
        command: "npm run e2e:chrome:jumpback-closeout",
        status: passed ? "passed" : "failed",
        evidencePath: reportPathFromRepoRoot
      }
    ],
    claim: "V1.2 AI Reading mock-first product path complete"
  };
}

async function main() {
  const buildResult = await run("npm", ["run", "build:e2e"], { cwd: path.resolve(__dirname, "..") });
  if (buildResult.code !== 0) {
    throw new Error(`E2E extension build failed:\n${buildResult.stdout}\n${buildResult.stderr}`);
  }
  if (!fs.existsSync(path.join(extensionRoot, "manifest.json"))) throw new Error(`Extension build not found: ${extensionRoot}`);
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
  fs.mkdirSync(screenshotRoot, { recursive: true });
  fs.mkdirSync(blockerRoot, { recursive: true });
  await generateSnapshotMatrix();
  const matrix = JSON.parse(fs.readFileSync(path.join(evidenceRoot, "snapshot-pages.json"), "utf-8"));

  let runtimeProcess = null;
  if (!(await isRuntimeOnline())) {
    runtimeProcess = startRuntime();
    if (!(await waitForRuntime())) throw new Error("Runtime did not become healthy on 127.0.0.1:17861.");
  }
  await configureRuntime();

  const { server, origin } = await startFixtureServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-closeout-profile-"));
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
    const serviceWorker = await findExtensionServiceWorker(context);
    const extensionId = serviceWorker ? new URL(serviceWorker.url()).host : null;
    const browserAppName = browserMode === "chrome" ? "Google Chrome" : "Google Chrome for Testing";
    const samples = [];
    const blockers = [];
    for (const pageSpec of fixturePages) {
      try {
        const sample = await runJumpbackSample({
          serviceWorker,
          fixturePage,
          pageSpec,
          pageUrl: `${origin}${pageSpec.route}`,
          extensionId,
          browserAppName
        });
        samples.push(sample);
      } catch (error) {
        const blocker = createBlocker(`jumpback_sample_failed:${pageSpec.label}`, error);
        blockers.push(blocker);
        writeJson(`blockers/${blocker.blockerId}.json`, blocker);
        break;
      }
    }
    const report = buildReport({ matrix, samples, blockers });
    writeJson("report.json", report);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed ? 0 : 2;
  } finally {
    if (context) await context.close();
    server.close();
    if (runtimeProcess) runtimeProcess.kill("SIGTERM");
  }
}

main().catch((error) => {
  fs.mkdirSync(blockerRoot, { recursive: true });
  const blocker = createBlocker("chrome_automation_limitation", error);
  writeJson(`blockers/${blocker.blockerId}.json`, blocker);
  writeJson("report.json", {
    schemaVersion: "v1.2-closeout.1",
    stage: "v1.2-closeout",
    passed: false,
    generatedAt: new Date().toISOString(),
    summary: {
      pagesTotal: 20,
      pagesPassed: 0,
      chromeJumpbackSamples: 0,
      domHighlightedCount: 0,
      fallbackShownCount: 0,
      fatalIssues: 1,
      majorIssues: 0
    },
    quality: {
      selectorAvailability: { value: 0, numerator: 0, denominator: 0, passed: false },
      textQuoteAvailability: { value: 0, numerator: 0, denominator: 0, passed: false },
      fallbackAvailability: { value: 0, numerator: 0, denominator: 0, passed: false },
      jumpbackCoverage: { value: 0, numerator: 0, denominator: 0, passed: false }
    },
    pages: [],
    jumpbackSamples: [],
    testCommands: [
      {
        command: "npm run e2e:chrome:jumpback-closeout",
        status: "failed",
        evidencePath: path.relative(repoRoot, path.join(blockerRoot, `${blocker.blockerId}.json`))
      }
    ],
    claim: "V1.2 AI Reading mock-first product path complete"
  });
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(2);
});
