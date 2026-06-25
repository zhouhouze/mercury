import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionRoot = path.resolve(__dirname, "../chrome-mv3-unpacked");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_real_site_complex_pages");
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const dataRoot = path.join(evidenceRoot, "pages");
const runtimeUrl = "http://127.0.0.1:17861";

const browserExecutable = process.env.NAVIA_BROWSER_EXECUTABLE || detectWindowsChromeExecutable();
const browserModeOverride = process.env.NAVIA_BROWSER_MODE || "";
const cdpUrl = process.env.NAVIA_CDP_URL || "";
const chromeUserDataDir =
  process.env.NAVIA_CHROME_USER_DATA_DIR || "/mnt/c/Users/Administrator/AppData/Local/Google/Chrome/User Data";
const chromeProfile = process.env.NAVIA_CHROME_PROFILE || "Default";

const sites = [
  {
    siteId: "bilibili",
    siteName: "B站",
    homeUrl: "https://www.bilibili.com/",
    detailLabel: "video-detail",
    detailPatterns: ["/video/", "/read/"],
    detailSelectors: ["a[href*='/video/']", "a[href*='/read/']"]
  },
  {
    siteId: "xiaohongshu",
    siteName: "小红书",
    homeUrl: "https://www.xiaohongshu.com/explore",
    detailLabel: "note-detail",
    detailPatterns: ["/explore/", "/discovery/item/"],
    detailSelectors: ["a[href*='/explore/']", "a[href*='/discovery/item/']"]
  },
  {
    siteId: "guancha",
    siteName: "观察者网",
    homeUrl: "https://www.guancha.cn/",
    detailLabel: "article-detail",
    detailPatterns: [".shtml"],
    detailSelectors: ["a[href$='.shtml']", "a[href*='.shtml']"]
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

async function commandAvailable(command) {
  const result = await run("bash", ["-lc", `command -v ${command}`]);
  return result.code === 0;
}

function detectWindowsChromeExecutable() {
  const candidates = [
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Users/Administrator/AppData/Local/Google/Chrome/Application/chrome.exe"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function windowsLocalTempRoot() {
  const candidates = [
    "/mnt/c/Users/Administrator/AppData/Local/Temp",
    "/mnt/c/Windows/Temp",
    os.tmpdir()
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || os.tmpdir();
}

function isWindowsExecutable(filePath) {
  return /\.exe$/i.test(filePath);
}

async function toWindowsPath(filePath) {
  const result = await run("wslpath", ["-w", filePath]);
  if (result.code !== 0) throw new Error(`wslpath failed for ${filePath}: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function toWindowsChromeArgPath(filePath) {
  return (await toWindowsPath(filePath)).replaceAll("\\", "/");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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
  const dbPath = path.join(os.tmpdir(), `navia-real-site-${Date.now()}.sqlite3`);
  const pythonPath = [path.join(repoRoot, ".tmp/python-deps"), path.join(repoRoot, "services/local-runtime"), process.env.PYTHONPATH]
    .filter(Boolean)
    .join(path.delimiter);
  const child = spawn(
    "uvicorn",
    ["navia_runtime.app:app", "--host", "127.0.0.1", "--port", "17861", "--app-dir", "services/local-runtime"],
    {
      cwd: repoRoot,
      env: { ...process.env, NAVIA_DB_PATH: dbPath, PYTHONPATH: pythonPath },
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

async function waitForCdp(port, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return true;
    } catch {
      // keep polling
    }
    await wait(300);
  }
  return false;
}

async function launchBrowser() {
  if (browserModeOverride === "playwright-chromium") {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-real-site-chromium-profile-"));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-popup-blocking",
        "--disable-sync",
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${extensionRoot}`,
        `--load-extension=${extensionRoot}`
      ]
    });
    return {
      browser: null,
      context,
      launchedProcess: null,
      ownsBrowser: true,
      mode: "launch-playwright-chromium",
      close: async () => context.close()
    };
  }

  if (cdpUrl) {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0];
    if (!context) throw new Error(`CDP connected but no context was exposed: ${cdpUrl}`);
    return { browser, context, launchedProcess: null, ownsBrowser: false, mode: "attach-cdp", close: async () => browser.close() };
  }

  if (!browserExecutable) throw new Error("Chrome executable not found. Set NAVIA_BROWSER_EXECUTABLE.");

  if (isWindowsExecutable(browserExecutable)) {
    if (!fs.existsSync(chromeUserDataDir)) throw new Error(`Chrome user data dir not found: ${chromeUserDataDir}`);
    const port = 9900 + Math.floor(Math.random() * 500);
    const args = [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-popup-blocking",
      "--disable-sync",
      "--window-position=40,40",
      "--window-size=1280,900",
      "--disable-gpu",
      "--enable-features=ExtensionsSidePanel,SidePanelPinning",
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--enable-unsafe-extension-debugging",
      `--disable-extensions-except=${await toWindowsChromeArgPath(extensionRoot)}`,
      `--load-extension=${await toWindowsChromeArgPath(extensionRoot)}`,
      `--user-data-dir=${await toWindowsChromeArgPath(chromeUserDataDir)}`,
      `--profile-directory=${chromeProfile}`,
      `--remote-debugging-port=${port}`,
      "about:blank"
    ];
    const child = spawn(browserExecutable, args, { cwd: repoRoot, env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => process.stdout.write(`[chrome] ${chunk}`));
    child.stderr.on("data", (chunk) => process.stderr.write(`[chrome] ${chunk}`));
    if (!(await waitForCdp(port))) {
      child.kill("SIGTERM");
      throw new Error(
        `Chrome did not expose CDP on port ${port}. The login profile may already be locked by an open Chrome window; close it or provide NAVIA_CDP_URL.`
      );
    }
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = browser.contexts()[0];
    if (!context) throw new Error("Chrome CDP connected but no context was exposed.");
    return {
      browser,
      context,
      launchedProcess: child,
      ownsBrowser: true,
      mode: "launch-login-profile",
      close: async () => {
        await browser.close().catch(() => undefined);
        child.kill("SIGTERM");
      }
    };
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-real-site-profile-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: browserExecutable,
    headless: false,
    viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--window-position=40,40",
      "--window-size=1280,900",
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--enable-unsafe-extension-debugging",
      `--disable-extensions-except=${extensionRoot}`,
      `--load-extension=${extensionRoot}`
    ]
  });
  return { browser: null, context, launchedProcess: null, ownsBrowser: true, mode: "launch-temp-profile", close: async () => context.close() };
}

async function launchWindowsTempPublicProfile(loginLaunchError) {
  if (!browserExecutable || !isWindowsExecutable(browserExecutable)) throw loginLaunchError;
  if (process.env.NAVIA_REAL_SITE_DISABLE_TEMP_FALLBACK === "1") throw loginLaunchError;
  const userDataDir = fs.mkdtempSync(path.join(windowsLocalTempRoot(), "navia-real-site-public-profile-"));
  const port = 10400 + Math.floor(Math.random() * 500);
  const args = [
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-popup-blocking",
    "--disable-sync",
    "--window-position=40,40",
    "--window-size=1280,900",
    "--disable-gpu",
    "--enable-features=ExtensionsSidePanel,SidePanelPinning",
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--enable-unsafe-extension-debugging",
    `--disable-extensions-except=${await toWindowsChromeArgPath(extensionRoot)}`,
    `--load-extension=${await toWindowsChromeArgPath(extensionRoot)}`,
    `--user-data-dir=${await toWindowsChromeArgPath(userDataDir)}`,
    `--remote-debugging-port=${port}`,
    "about:blank"
  ];
  const child = spawn(browserExecutable, args, { cwd: repoRoot, env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => process.stdout.write(`[chrome-temp] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[chrome-temp] ${chunk}`));
  if (!(await waitForCdp(port))) {
    child.kill("SIGTERM");
    throw loginLaunchError;
  }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  if (!context) throw new Error("Temp Chrome CDP connected but no context was exposed.");
  return {
    browser,
    context,
    launchedProcess: child,
    ownsBrowser: true,
    mode: "launch-temp-public-profile",
    loginLaunchError: loginLaunchError instanceof Error ? loginLaunchError.message : String(loginLaunchError),
    close: async () => {
      await browser.close().catch(() => undefined);
      child.kill("SIGTERM");
    }
  };
}

async function isNaviaServiceWorker(worker) {
  if (!worker.url().startsWith("chrome-extension://")) return false;
  try {
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    return manifest?.name === "Navia";
  } catch {
    return false;
  }
}

async function findNaviaServiceWorker(context) {
  for (const worker of context.serviceWorkers()) {
    if (await isNaviaServiceWorker(worker)) return worker;
  }
  return null;
}

async function waitForServiceWorker(context, timeoutMs = 15000) {
  const existing = await findNaviaServiceWorker(context);
  if (existing) return existing;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const worker = await findNaviaServiceWorker(context);
    if (worker) return worker;
    try {
      const next = await context.waitForEvent("serviceworker", { timeout: 1000 });
      if (await isNaviaServiceWorker(next)) return next;
    } catch {
      // continue
    }
  }
  return null;
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
    return { ok: false, error: error instanceof Error ? error.message : "E2E side panel bridge evaluate failed." };
  }
}

async function runBridgeCommand(serviceWorker, command) {
  const result = await executeBridgeCommand(serviceWorker, command);
  if (!result?.ok) throw new Error(result?.error ?? `Bridge command failed: ${JSON.stringify(command)}`);
  return result;
}

async function waitForBridge(serviceWorker, timeoutMs = 20000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await executeBridgeCommand(serviceWorker, { action: "snapshot" });
    if (last?.ok) return last;
    await wait(400);
  }
  throw new Error(`E2E bridge did not become available. Last=${JSON.stringify(last)}`);
}

async function waitForSnapshot(serviceWorker, predicate, timeoutMs = 30000) {
  const started = Date.now();
  let lastResult = null;
  while (Date.now() - started < timeoutMs) {
    lastResult = await executeBridgeCommand(serviceWorker, { action: "snapshot" });
    const snapshot = lastResult?.snapshot ?? lastResult?.result?.snapshot ?? {};
    if (lastResult?.ok && predicate(snapshot)) return lastResult;
    await wait(350);
  }
  throw new Error(`Timed out waiting for sidepanel snapshot. Last=${JSON.stringify(lastResult)}`);
}

async function collectDomSnapshot(page) {
  return await page.evaluate(() => {
    const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
    const anchors = Array.from(document.querySelectorAll("a[href]")).slice(0, 120).map((anchor) => ({
      text: anchor.textContent?.replace(/\s+/g, " ").trim().slice(0, 100) ?? "",
      href: anchor.href
    }));
    const loginHints = ["登录", "验证码", "安全验证", "请先登录", "滑动验证", "扫码登录"].filter((hint) => bodyText.includes(hint));
    return {
      title: document.title,
      url: location.href,
      bodyTextLength: bodyText.length,
      bodyTextSample: bodyText.slice(0, 600),
      anchorCount: document.querySelectorAll("a[href]").length,
      anchors,
      loginHints,
      hasNaviaSidebar: Boolean(document.querySelector("[data-testid='navia-inpage-sidebar']")),
      hasNaviaLauncher: Boolean(document.querySelector("[data-testid='navia-floating-launcher']"))
    };
  });
}

async function discoverDetailCandidates(page, site) {
  return await page.evaluate((spec) => {
    const seen = new Set();
    const links = [];
    for (const selector of spec.detailSelectors) {
      for (const anchor of Array.from(document.querySelectorAll(selector))) {
        if (!anchor.href || seen.has(anchor.href)) continue;
        seen.add(anchor.href);
        links.push({ href: anchor.href, text: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "" });
      }
    }
    if (!links.length) {
      for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
        const href = anchor.href;
        if (!href || seen.has(href)) continue;
        if (spec.detailPatterns.some((pattern) => href.includes(pattern))) {
          seen.add(href);
          links.push({ href, text: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "" });
        }
      }
    }
    const current = location.href.replace(/#.*$/, "");
    return links
      .filter((link) => link.href.replace(/#.*$/, "") !== current && !/passport|login|account|mall|download|creator|publish/.test(link.href))
      .slice(0, 8);
  }, site);
}

function isUnavailableDetailSample(sample) {
  const finalUrl = String(sample.finalUrl ?? sample.url ?? "").toLowerCase();
  const title = String(sample.dom?.title ?? sample.perception?.activePage?.title ?? "").toLowerCase();
  const warnings = new Set([...(sample.perception?.warnings ?? []), ...(sample.perception?.fatalIssues ?? [])].map(String));
  return finalUrl.includes("/404") || title.includes("404") || title.includes("页面不见了") || warnings.has("NOT_FOUND_PAGE_FAILED");
}

function perceptionSummary(sessionPayload) {
  const sessionData = sessionPayload?.body?.data ?? sessionPayload?.data ?? sessionPayload?.body ?? sessionPayload ?? null;
  const activePage = sessionData?.activePage ?? sessionData?.active_page ?? null;
  const perception = activePage?.perception ?? null;
  const quality = perception?.qualityReport ?? activePage?.qualityReport ?? null;
  const highSignal = perception?.highSignalPage ?? null;
  const digest = perception?.perceptionDigest ?? null;
  const sourceMap = perception?.sourceMap ?? null;
  return {
    activePage: activePage
      ? {
          pageId: activePage.page_id ?? activePage.pageId ?? null,
          title: activePage.title ?? null,
          url: activePage.url ?? null,
          domain: activePage.domain ?? null
        }
      : null,
    readiness: quality?.downstreamReadiness ?? quality?.status ?? "unknown",
    overallScore: quality?.overallScore ?? null,
    warnings: Array.isArray(quality?.warnings) ? quality.warnings.map((item) => item.code ?? item.message ?? String(item)) : [],
    fatalIssues: Array.isArray(quality?.fatalIssues) ? quality.fatalIssues.map((item) => item.code ?? item.message ?? String(item)) : [],
    highSignalBlocks: Array.isArray(highSignal?.highSignalBlocks)
      ? highSignal.highSignalBlocks.length
      : Array.isArray(highSignal?.blocks)
        ? highSignal.blocks.length
        : 0,
    digestItems: Array.isArray(digest?.items) ? digest.items.length : 0,
    sourceRefs: Array.isArray(sourceMap?.sourceRefs) ? sourceMap.sourceRefs.length : 0,
    qualityMetrics: quality?.metrics ?? null
  };
}

async function readRuntimeSession(sessionId) {
  if (!sessionId) return null;
  try {
    const response = await fetch(`${runtimeUrl}/v1/sessions/${encodeURIComponent(sessionId)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function hostFromUrl(value) {
  try {
    return new URL(String(value ?? "")).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function siteContaminationTokens(siteId) {
  const tokens = {
    bilibili: ["小红书", "xiaohongshu", "观察者", "guancha"],
    xiaohongshu: ["哔哩", "bilibili", "观察者", "guancha"],
    guancha: ["哔哩", "bilibili", "小红书", "xiaohongshu"]
  };
  return tokens[siteId] ?? [];
}

function noisyMindmapLabel(label) {
  const text = normalizeText(label);
  if (!text) return true;
  if (text.length <= 2) return true;
  if (/^[\d\s,.:;+\-/，。；：]+$/.test(text)) return true;
  if (/扫码登录|输入手机号|输入验证码|下载客户端|首页\s*番剧\s*直播|会员购|游戏中心|关于我们|隐私政策/.test(text)) return true;
  const signalChars = Array.from(text).filter((char) => /[a-z0-9\u4e00-\u9fff]/i.test(char)).length;
  return signalChars < Math.max(3, Math.floor(text.length / 3));
}

function mindmapQualityDiagnostics({ site, dom, perception, sidepanel, cards }) {
  const fatalIssues = [];
  const majorIssues = [];
  const labels = [
    ...(Array.isArray(cards?.evidenceCardLabels) ? cards.evidenceCardLabels : []),
    ...(Array.isArray(cards?.sourceCards) ? cards.sourceCards.map((card) => card.label) : [])
  ].filter(Boolean);
  const visibleText = normalizeText([
    sidepanel?.pageTitle,
    cards?.readingMapDetailText,
    cards?.sourceEvidenceText,
    labels.join(" ")
  ].join(" "));
  const currentHost = hostFromUrl(dom?.url);
  const activeHost = hostFromUrl(perception?.activePage?.url);
  if (currentHost && activeHost && currentHost !== activeHost && !currentHost.endsWith(activeHost) && !activeHost.endsWith(currentHost)) {
    fatalIssues.push(`Runtime active page URL does not match current tab: current=${currentHost}, active=${activeHost}.`);
  }
  const contamination = siteContaminationTokens(site.siteId).filter((token) => visibleText.includes(token.toLowerCase()));
  if (contamination.length) {
    fatalIssues.push(`Mindmap appears contaminated by another site: ${contamination.join(", ")}.`);
  }
  if (labels.length >= 3) {
    const normalizedLabels = labels.map((label) => normalizeText(label)).filter(Boolean);
    const uniqueRatio = new Set(normalizedLabels).size / normalizedLabels.length;
    const noisyRatio = normalizedLabels.filter(noisyMindmapLabel).length / normalizedLabels.length;
    const averageLabelLength = normalizedLabels.reduce((sum, label) => sum + label.length, 0) / normalizedLabels.length;
    if (uniqueRatio < 0.62) majorIssues.push(`Mindmap labels are too repetitive: uniqueRatio=${uniqueRatio.toFixed(2)}.`);
    if (noisyRatio > 0.28) majorIssues.push(`Mindmap labels contain too much navigation/noise text: noisyRatio=${noisyRatio.toFixed(2)}.`);
    if (averageLabelLength > 28) majorIssues.push(`Mindmap labels are too long for side panel reading: avgLength=${averageLabelLength.toFixed(1)}.`);
    return {
      labelCount: normalizedLabels.length,
      uniqueRatio,
      noisyRatio,
      averageLabelLength,
      fatalIssues,
      majorIssues
    };
  }
  majorIssues.push("Mindmap label sample is too small for quality assessment.");
  return {
    labelCount: labels.length,
    uniqueRatio: labels.length ? 1 : 0,
    noisyRatio: labels.length ? labels.filter(noisyMindmapLabel).length / labels.length : 1,
    averageLabelLength: labels.length ? labels.reduce((sum, label) => sum + normalizeText(label).length, 0) / labels.length : 0,
    fatalIssues,
    majorIssues
  };
}

function classifySample({ site, pageKind, dom, sidepanel, perception, cards, jumpback, error }) {
  const fatalIssues = [];
  const majorIssues = [];
  const knownDegradedCodes = new Set(["AUTH_GATED_DEGRADED", "VERIFICATION_GATED_DEGRADED", "NOT_FOUND_PAGE_FAILED"]);
  const perceptionIsDegraded = perception?.readiness && perception.readiness !== "pass";
  const knownPublicDegrade =
    Boolean(perceptionIsDegraded) &&
    ((Array.isArray(perception?.warnings) && perception.warnings.some((code) => knownDegradedCodes.has(String(code)))) ||
      (Array.isArray(perception?.fatalIssues) && perception.fatalIssues.some((code) => knownDegradedCodes.has(String(code)))));
  const strongEvidence =
    (perception?.sourceRefs ?? 0) >= 6 &&
    (perception?.digestItems ?? 0) >= 6 &&
    Boolean(cards?.containsEvidenceCardMindmap) &&
    Array.isArray(cards?.sourceCards) &&
    cards.sourceCards.length >= 3;
  const hardGateHints = (dom?.loginHints ?? []).filter((hint) => hint !== "登录");
  const pushMissingEvidence = (message) => {
    if (knownPublicDegrade) majorIssues.push(message);
    else fatalIssues.push(message);
  };
  if (error) fatalIssues.push(error);
  if (!dom || dom.bodyTextLength < 80) majorIssues.push("Visible page body text is very short; page may be login-gated, JS-empty, media-heavy, or anti-bot limited.");
  if (hardGateHints.length && (!strongEvidence || knownPublicDegrade)) {
    majorIssues.push(`Login or verification hints visible: ${hardGateHints.join(", ")}`);
  }
  if (!sidepanel?.pageContextState || sidepanel.pageContextState === "failed" || sidepanel.pageContextState === "unsupported") {
    fatalIssues.push(`Page context state is ${sidepanel?.pageContextState ?? "missing"}.`);
  }
  if (!perception?.activePage) fatalIssues.push("Runtime active page perception is missing.");
  if (perception?.readiness !== "pass") majorIssues.push(`Page perception readiness is ${perception?.readiness ?? "unknown"}.`);
  if ((perception?.sourceRefs ?? 0) < 3) majorIssues.push(`SourceRef count below diagnostic threshold: ${perception?.sourceRefs ?? 0}.`);
  if ((perception?.digestItems ?? 0) < 3) majorIssues.push(`Digest item count below diagnostic threshold: ${perception?.digestItems ?? 0}.`);
  if (!cards?.containsEvidenceCardMindmap) pushMissingEvidence("Evidence Card Mindmap is not visible.");
  if (!cards?.containsReadingMap) majorIssues.push("Reading Map is not visible.");
  if (!Array.isArray(cards?.sourceCards) || cards.sourceCards.length === 0) pushMissingEvidence("No source cards are available for jumpback.");
  if (!jumpback || jumpback.status === "blocked") pushMissingEvidence("Source jumpback is blocked.");
  if (jumpback?.status === "fallback_shown") majorIssues.push("Source jumpback only showed fallback evidence.");
  const mindmapQuality = mindmapQualityDiagnostics({ site, dom, perception, sidepanel, cards });
  fatalIssues.push(...mindmapQuality.fatalIssues);
  majorIssues.push(...mindmapQuality.majorIssues);
  const result = fatalIssues.length ? "blocked" : majorIssues.length ? "degraded" : "pass";
  return {
    pageKind,
    result,
    mindmapQuality,
    fatalIssues,
    majorIssues
  };
}

async function diagnosePage({ page, serviceWorker, site, pageKind, url, label }) {
  const sampleId = `${site.siteId}-${label}`;
  const sampleDir = path.join(dataRoot, sampleId);
  fs.mkdirSync(sampleDir, { recursive: true });
  const sample = {
    sampleId,
    siteId: site.siteId,
    siteName: site.siteName,
    pageKind,
    url,
    startedAt: new Date().toISOString(),
    result: "blocked",
    fatalIssues: [],
    majorIssues: []
  };
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
    await wait(5000);
    sample.finalUrl = page.url();
    sample.dom = await collectDomSnapshot(page);
    writeJson(path.join(sampleDir, "dom-snapshot.json"), sample.dom);
    await page.screenshot({ path: path.join(screenshotRoot, `${sampleId}-before.png`), fullPage: false });

    await page.waitForSelector("[data-testid='navia-inpage-sidebar-frame']", { timeout: 20000 });
    await waitForBridge(serviceWorker);
    await runBridgeCommand(serviceWorker, { action: "check_runtime" });
    await runBridgeCommand(serviceWorker, { action: "view", view: "chat" });
    await runBridgeCommand(serviceWorker, { action: "new_session" });
    await wait(500);
    await runBridgeCommand(serviceWorker, { action: "capture" });
    const captured = await waitForSnapshot(
      serviceWorker,
      (snapshot) => snapshot.pageContextState === "capture_ready" || snapshot.pageContextState === "captured" || snapshot.pageContextState === "failed",
      25000
    );
    await runBridgeCommand(serviceWorker, { action: "submit" }).catch(() => undefined);
    const submitted = await waitForSnapshot(
      serviceWorker,
      (snapshot) => ["captured", "failed", "unsupported"].includes(snapshot.pageContextState),
      25000
    );
    const submitSnapshot = submitted.snapshot ?? submitted.result?.snapshot ?? captured.snapshot ?? {};
    sample.sidepanel = {
      runtimeStatus: submitSnapshot.runtimeStatus ?? null,
      pageContextState: submitSnapshot.pageContextState ?? null,
      sessionId: submitSnapshot.sessionId ?? null,
      pageTitle: submitSnapshot.pageTitle ?? null,
      submitStatus: submitSnapshot.submitStatus ?? null,
      domSignalBlockCount: submitSnapshot.domSignalBlockCount ?? null,
      domSignalLinkCount: submitSnapshot.domSignalLinkCount ?? null,
      pageStateHints: submitSnapshot.pageStateHints ?? []
    };

    const sessionPayload = await readRuntimeSession(String(sample.sidepanel.sessionId || ""));
    sample.perception = perceptionSummary(sessionPayload);
    writeJson(path.join(sampleDir, "runtime-session.json"), sessionPayload ?? {});
    writeJson(path.join(sampleDir, "perception-summary.json"), sample.perception);

    await runBridgeCommand(serviceWorker, { action: "mindmap" });
    await waitForSnapshot(serviceWorker, (snapshot) => snapshot.chatTurnState === "done" || snapshot.streamStatus === "done", 35000);
    const cardsResult = await runBridgeCommand(serviceWorker, { action: "source_cards_snapshot" });
    sample.cards = cardsResult.result ?? cardsResult;
    writeJson(path.join(sampleDir, "source-cards.json"), sample.cards);

    if (Array.isArray(sample.cards.sourceCards) && sample.cards.sourceCards.length > 0) {
      const jumpbackResult = await runBridgeCommand(serviceWorker, { action: "jumpback_source_card", index: 0 });
      sample.jumpback = jumpbackResult.result ?? jumpbackResult;
    } else {
      sample.jumpback = { status: "blocked", evidenceText: "No source cards available." };
    }
    writeJson(path.join(sampleDir, "jumpback.json"), sample.jumpback);
    await wait(1200);
    await page.screenshot({ path: path.join(screenshotRoot, `${sampleId}-after.png`), fullPage: false });

    const classification = classifySample({
      site,
      pageKind,
      dom: sample.dom,
      sidepanel: sample.sidepanel,
      perception: sample.perception,
      cards: sample.cards,
      jumpback: sample.jumpback
    });
    Object.assign(sample, classification);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sample.result = "blocked";
    sample.fatalIssues = [message];
    sample.dom = sample.dom ?? (await collectDomSnapshot(page).catch(() => null));
    await page.screenshot({ path: path.join(screenshotRoot, `${sampleId}-blocked.png`), fullPage: false }).catch(() => undefined);
  } finally {
    sample.completedAt = new Date().toISOString();
    writeJson(path.join(sampleDir, "sample-report.json"), sample);
  }
  return sample;
}

function buildReport(samples, browserMode) {
  const passedSamples = samples.filter((sample) => sample.result === "pass").length;
  const degradedSamples = samples.filter((sample) => sample.result === "degraded").length;
  const blockedSamples = samples.filter((sample) => sample.result === "blocked").length;
  const fatalIssues = [];
  const majorIssues = [];
  const environmentNotes = [];
  if (samples.length < 6) fatalIssues.push(`Expected 6 samples, collected ${samples.length}.`);
  if (blockedSamples) fatalIssues.push(`${blockedSamples} sample(s) blocked.`);
  if (degradedSamples) majorIssues.push(`${degradedSamples} sample(s) degraded.`);
  if (browserMode === "launch-temp-public-profile") {
    environmentNotes.push("Login profile was unavailable; diagnostic used a temporary public Chrome profile without login state.");
  }
  if (browserMode === "launch-playwright-chromium") {
    environmentNotes.push("Diagnostic used Playwright Chromium with a temporary public profile because local Chrome stable did not load the unpacked extension through command-line flags.");
  }
  const passed = fatalIssues.length === 0 && majorIssues.length === 0 && samples.length === 6;
  return {
    schemaVersion: "v1-real-site-complex-pages-diagnostic.1",
    generatedAt: new Date().toISOString(),
    browserMode,
    loginStatePolicy:
      browserMode === "launch-temp-public-profile"
        ? "temp-public-profile-no-login"
        : browserMode === "launch-playwright-chromium"
          ? "playwright-chromium-temp-public-profile-no-login"
          : cdpUrl
            ? "attach-cdp"
            : "launch-login-profile",
    chromeUserDataDir: cdpUrl ? null : chromeUserDataDir,
    chromeProfile: cdpUrl ? null : chromeProfile,
    passed,
    summary: {
      samplesTotal: samples.length,
      passedSamples,
      degradedSamples,
      blockedSamples,
      highlightedSamples: samples.filter((sample) => sample.jumpback?.status === "highlighted").length,
      fallbackSamples: samples.filter((sample) => sample.jumpback?.status === "fallback_shown").length
    },
    samples: samples.map((sample) => ({
      sampleId: sample.sampleId,
      siteName: sample.siteName,
      pageKind: sample.pageKind,
      url: sample.url,
      finalUrl: sample.finalUrl ?? null,
      result: sample.result,
      readiness: sample.perception?.readiness ?? "unknown",
      bodyTextLength: sample.dom?.bodyTextLength ?? 0,
      sourceRefs: sample.perception?.sourceRefs ?? 0,
      digestItems: sample.perception?.digestItems ?? 0,
      evidenceCardCount: sample.cards?.evidenceCardCount ?? 0,
      containsReadingMap: Boolean(sample.cards?.containsReadingMap),
      sourceCards: Array.isArray(sample.cards?.sourceCards) ? sample.cards.sourceCards.length : 0,
      jumpbackStatus: sample.jumpback?.status ?? "missing",
      mindmapQuality: sample.mindmapQuality ?? null,
      fatalIssues: sample.fatalIssues ?? [],
      majorIssues: sample.majorIssues ?? []
    })),
    fatalIssues,
    majorIssues,
    environmentNotes,
    claim: passed
      ? "Real-site complex page diagnostic passed for Bilibili, Xiaohongshu, and Guancha homepage/detail samples."
      : "No completion claim. Real-site complex page diagnostic found degraded or blocked samples."
  };
}

function writeMarkdownReports(report) {
  const rows = report.samples
    .map(
      (sample) =>
        `| ${sample.siteName} | ${sample.pageKind} | ${sample.result} | ${sample.readiness} | ${sample.bodyTextLength} | ${sample.sourceRefs} | ${sample.digestItems} | ${sample.jumpbackStatus} | ${sample.mindmapQuality ? `${sample.mindmapQuality.labelCount} labels / noise ${Number(sample.mindmapQuality.noisyRatio ?? 0).toFixed(2)} / unique ${Number(sample.mindmapQuality.uniqueRatio ?? 0).toFixed(2)}` : "n/a"} | ${[...sample.fatalIssues, ...sample.majorIssues].join("; ") || "none"} |`
    )
    .join("\n");
  writeText(
    path.join(evidenceRoot, "acceptance-report.md"),
    `# V1 Real-Site Complex Pages Diagnostic Acceptance Report

Date: ${report.generatedAt}
Result: ${report.passed ? "PASS" : "FAIL"}

## Summary

- Samples: ${report.summary.samplesTotal}
- Passed: ${report.summary.passedSamples}
- Degraded: ${report.summary.degradedSamples}
- Blocked: ${report.summary.blockedSamples}
- DOM highlighted: ${report.summary.highlightedSamples}
- Fallback shown: ${report.summary.fallbackSamples}
- Environment: ${report.environmentNotes.length ? report.environmentNotes.join(" ") : "standard"}

## Claim

\`\`\`text
${report.claim}
\`\`\`

| Site | Page | Result | Readiness | Text length | SourceRefs | Digest | Jumpback | Mindmap quality | Issues |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
${rows}
`
  );
  writeText(
    path.join(evidenceRoot, "prd-review.md"),
    `# V1 Real-Site Complex Pages PRD Review

Result: ${report.passed ? "PASS" : "FAIL"}

Covered:

- B站、小红书、观察者网首页和详情页真实 Chrome 诊断。
- 当前页读取、Debug / runtime perception、Mindmap、Reading Map、source evidence、jumpback / fallback。
- 登录墙、反爬、JS 空壳、媒体主内容和低信号页面按 degraded / blocked 记录。

Not claimed:

- Full V1 complete.
- OCR / VLM / ASR / 视频理解 / 直播理解。
- RAG / Memory / Web Research / PPT / Deep Research / 多 Agent / 浏览器自动操作产品能力。
`
  );
  writeText(
    path.join(evidenceRoot, "false-green-audit.md"),
    `# V1 Real-Site Complex Pages False-Green Audit

Result: ${report.passed ? "PASS" : "FAIL"}

Checks:

- 6 个样本必须全部 pass 才能声明真实复杂站点诊断通过。
- fallback 不被记录为 DOM highlight success。
- 登录墙、验证码、反爬、空壳 DOM 和低信号信息流不被伪装为高质量提取。
- B站 / 小红书媒体内容不通过 OCR、ASR、VLM 或 Web Research 补齐。

Fatal issues:

${report.fatalIssues.length ? report.fatalIssues.map((issue) => `- ${issue}`).join("\n") : "- none"}

Major issues:

${report.majorIssues.length ? report.majorIssues.map((issue) => `- ${issue}`).join("\n") : "- none"}

Environment notes:

${report.environmentNotes.length ? report.environmentNotes.map((issue) => `- ${issue}`).join("\n") : "- none"}
`
  );
}

async function main() {
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
  fs.mkdirSync(screenshotRoot, { recursive: true });
  fs.mkdirSync(dataRoot, { recursive: true });

  const runtime = (await isRuntimeOnline()) ? null : startRuntime();
  let browserHandle = null;
  const samples = [];
  try {
    if (!(await waitForRuntime())) throw new Error("Runtime did not become healthy on http://127.0.0.1:17861.");
    await configureRuntime();
    try {
      browserHandle = await launchBrowser();
    } catch (error) {
      console.warn(`[real-site-diagnostics] login profile launch failed: ${error instanceof Error ? error.message : String(error)}`);
      console.warn("[real-site-diagnostics] falling back to a temporary public Chrome profile without login state.");
      browserHandle = await launchWindowsTempPublicProfile(error);
    }
    const page = await browserHandle.context.newPage();
    const serviceWorker = await waitForServiceWorker(browserHandle.context, 20000);
    if (!serviceWorker) throw new Error("Extension service worker not exposed. Run NAVIA_E2E_BRIDGE=1 npm --prefix apps/chrome-extension run build:e2e first.");

    for (const site of sites) {
      const homeSample = await diagnosePage({ page, serviceWorker, site, pageKind: "homepage", url: site.homeUrl, label: "homepage" });
      samples.push(homeSample);
      const detailCandidates = await discoverDetailCandidates(page, site).catch(() => []);
      if (detailCandidates.length) {
        let selectedDetailSample = null;
        const attemptedDetails = [];
        for (let index = 0; index < detailCandidates.length; index += 1) {
          const detail = detailCandidates[index];
          const detailSample = await diagnosePage({ page, serviceWorker, site, pageKind: site.detailLabel, url: detail.href, label: "detail" });
          detailSample.discoveredFromHome = detail;
          detailSample.detailCandidateIndex = index;
          attemptedDetails.push({
            index,
            href: detail.href,
            text: detail.text,
            result: detailSample.result,
            finalUrl: detailSample.finalUrl,
            unavailable: isUnavailableDetailSample(detailSample)
          });
          selectedDetailSample = detailSample;
          if (!isUnavailableDetailSample(detailSample)) break;
          await page.goto(site.homeUrl, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
          await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
          await wait(2500);
        }
        selectedDetailSample.attemptedDetails = attemptedDetails;
        samples.push(selectedDetailSample);
      } else {
        const blocked = {
          sampleId: `${site.siteId}-detail`,
          siteId: site.siteId,
          siteName: site.siteName,
          pageKind: site.detailLabel,
          url: "",
          result: "blocked",
          fatalIssues: ["No detail URL could be discovered from the homepage DOM."],
          majorIssues: [],
          dom: homeSample.dom ?? null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        };
        writeJson(path.join(dataRoot, blocked.sampleId, "sample-report.json"), blocked);
        samples.push(blocked);
      }
    }
  } catch (error) {
    samples.push({
      sampleId: "diagnostic-run-blocked",
      siteId: "diagnostic",
      siteName: "diagnostic",
      pageKind: "run",
      url: "",
      result: "blocked",
      fatalIssues: [error instanceof Error ? error.stack || error.message : String(error)],
      majorIssues: [],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    });
  } finally {
    if (browserHandle?.ownsBrowser) await browserHandle.close().catch(() => undefined);
    if (!browserHandle?.ownsBrowser && browserHandle?.browser) await browserHandle.browser.close().catch(() => undefined);
    if (runtime) runtime.kill("SIGTERM");
  }

  const report = buildReport(samples, browserHandle?.mode ?? "not-launched");
  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeMarkdownReports(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 2);
}

main().catch((error) => {
  const report = buildReport(
    [
      {
        sampleId: "diagnostic-crash",
        siteId: "diagnostic",
        siteName: "diagnostic",
        pageKind: "run",
        url: "",
        result: "blocked",
        fatalIssues: [error instanceof Error ? error.stack || error.message : String(error)],
        majorIssues: []
      }
    ],
    "crashed"
  );
  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeMarkdownReports(report);
  console.error(report.samples[0].fatalIssues[0]);
  process.exit(2);
});
