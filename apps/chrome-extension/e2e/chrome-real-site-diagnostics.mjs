import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionRoot = path.resolve(__dirname, "../chrome-mv3-unpacked");
const evidenceRootRelative = process.env.NAVIA_REAL_SITE_EVIDENCE_ROOT || "docs/active/project/evidence/v1_real_site_complex_pages";
const evidenceRoot = path.join(repoRoot, evidenceRootRelative);
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const dataRoot = path.join(evidenceRoot, "pages");
const runtimeUrl = "http://127.0.0.1:17861";
const acceptanceMode = process.env.NAVIA_REAL_SITE_ACCEPTANCE_MODE || (evidenceRootRelative.includes("v1_mvp_quality_hardening") ? "v1_mvp_quality_hardening" : "real_site_complex_pages");
const isQualityHardeningMode = acceptanceMode === "v1_mvp_quality_hardening";
const isContentQualityMode = acceptanceMode === "v1_mvp_content_quality";
const isMatrixAcceptanceMode = isQualityHardeningMode || isContentQualityMode;
const sampleManifestRelative =
  process.env.NAVIA_REAL_SITE_SAMPLE_MANIFEST ||
  (isMatrixAcceptanceMode ? `${evidenceRootRelative}/sample-manifest.json` : "");
const sampleManifestPath = sampleManifestRelative ? path.join(repoRoot, sampleManifestRelative) : "";
const sampleLimit = Math.max(0, Number.parseInt(process.env.NAVIA_REAL_SITE_SAMPLE_LIMIT || "0", 10) || 0);
const sampleIdsFilter = new Set(
  String(process.env.NAVIA_REAL_SITE_SAMPLE_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);
const appendEvidence = process.env.NAVIA_REAL_SITE_APPEND === "1";

const browserExecutable = process.env.NAVIA_BROWSER_EXECUTABLE || detectWindowsChromeExecutable();
const browserModeOverride = process.env.NAVIA_BROWSER_MODE || "";
const cdpUrl = process.env.NAVIA_CDP_URL || "";
const chromeUserDataDir =
  process.env.NAVIA_CHROME_USER_DATA_DIR || "/mnt/c/Users/Administrator/AppData/Local/Google/Chrome/User Data";
const chromeProfile = process.env.NAVIA_CHROME_PROFILE || "Default";
const realSiteOnly = process.env.NAVIA_REAL_SITE_ONLY || "";
const realSiteHeadless = process.env.NAVIA_REAL_SITE_HEADLESS === "1";
const cookieDir = process.env.NAVIA_REAL_SITE_COOKIE_DIR || path.join(repoRoot, ".tmp/navia-real-site-cookies");
const detailUrlOverrides = {
  bilibili: process.env.NAVIA_REAL_SITE_BILIBILI_DETAIL_URL || "",
  xiaohongshu: process.env.NAVIA_REAL_SITE_XIAOHONGSHU_DETAIL_URL || "",
  guancha: process.env.NAVIA_REAL_SITE_GUANCHA_DETAIL_URL || ""
};
const homeUrlOverrides = {
  bilibili: process.env.NAVIA_REAL_SITE_BILIBILI_HOME_URL || "",
  xiaohongshu: process.env.NAVIA_REAL_SITE_XIAOHONGSHU_HOME_URL || "",
  guancha: process.env.NAVIA_REAL_SITE_GUANCHA_HOME_URL || ""
};
const maxDetailAttempts = Math.max(1, Number.parseInt(process.env.NAVIA_REAL_SITE_MAX_DETAIL_ATTEMPTS || "3", 10) || 3);
const cookieSiteDomains = {
  bilibili: "https://www.bilibili.com/",
  xiaohongshu: "https://www.xiaohongshu.com/",
  guancha: "https://www.guancha.cn/"
};

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

async function startWakeFixtureServer() {
  const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>Navia wake fixture</title></head>
<body>
  <main style="max-width:760px;margin:40px auto;font:18px/1.7 system-ui,sans-serif">
    <h1>Navia 扩展唤醒页</h1>
    <p>这个本地页面只用于真实站点自动化验收前唤醒 MV3 service worker，不作为产品验收样本。</p>
    <p>后续验收仍然会进入 B站、小红书、观察者网的真实页面并采集截图和来源反跳证据。</p>
  </main>
</body>
</html>`;
  const server = http.createServer((_, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/wake.html` };
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
    path.join(repoRoot, ".tmp/chrome-for-testing/chrome-win64/chrome.exe"),
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
  fs.writeFileSync(filePath, JSON.stringify(sanitizeEvidenceValue(value), null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sanitizeEvidenceString(value));
}

function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shouldRedactQueryKey(key) {
  return /(?:token|session|cookie|auth|secret|password|sessdata|bili_jct|dedeuserid|vd_source)/i.test(String(key));
}

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function siteIdFromSample(sample) {
  const host = hostFromUrl(sample?.url);
  if (/bilibili\.com$/.test(host)) return "bilibili";
  if (/xiaohongshu\.com$/.test(host)) return "xiaohongshu";
  if (/guancha\.cn$/.test(host)) return "guancha";
  return slug(sample?.site || host || sample?.pageId || "sample");
}

function siteSpecFromManifestSample(sample) {
  const siteId = siteIdFromSample(sample);
  const host = hostFromUrl(sample.url);
  return {
    siteId,
    siteName: sample.site || siteId,
    homeUrl: sample.url,
    detailLabel: sample.pageType || "page",
    detailPatterns: ["/"],
    detailSelectors: [
      "article a[href]",
      "main a[href]",
      "[role='main'] a[href]",
      "a[href*='/news/']",
      "a[href*='/article/']",
      "a[href*='/world/']",
      "a[href*='/technology/']",
      "a[href*='/video/']",
      "a[href*='/explore/']",
      "a[href$='.shtml']"
    ],
    expectedHost: host,
    manifestSample: sample
  };
}

function loadSampleManifest({ applyLimit = true } = {}) {
  if (!sampleManifestPath || !fs.existsSync(sampleManifestPath)) return null;
  const manifest = readJsonFile(sampleManifestPath);
  if (!manifest || !Array.isArray(manifest.samples)) {
    throw new Error(`Sample manifest is invalid or missing samples: ${sampleManifestRelative}`);
  }
  let samples = manifest.samples;
  if (applyLimit && sampleIdsFilter.size) {
    samples = samples.filter((sample) => sampleIdsFilter.has(sample.pageId));
  }
  if (applyLimit && sampleLimit) {
    samples = samples.slice(0, sampleLimit);
  }
  return { ...manifest, samples };
}

function sanitizeEvidenceString(value) {
  let text = String(value ?? "");
  text = text.replace(
    /([?&](?:xsec_token|access_token|refresh_token|web_session|session|token|auth|cookie|SESSDATA|bili_jct|DedeUserID|vd_source)=)[^&#\s"'<>()]+/gi,
    "$1[redacted]"
  );
  try {
    const parsed = new URL(text);
    let changed = false;
    for (const key of [...parsed.searchParams.keys()]) {
      if (shouldRedactQueryKey(key)) {
        parsed.searchParams.set(key, "[redacted]");
        changed = true;
      }
    }
    if (changed) text = parsed.toString();
  } catch {
    // Not a standalone URL; regex redaction above still handles embedded URLs.
  }
  return text;
}

function sanitizeEvidenceValue(value) {
  if (typeof value === "string") return sanitizeEvidenceString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeEvidenceValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeEvidenceValue(item)]));
  }
  return value;
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
  const venvPython = path.join(repoRoot, ".venv/bin/python");
  const runtimeCommand = fs.existsSync(venvPython) ? venvPython : "python3";
  const child = spawn(
    runtimeCommand,
    ["-m", "uvicorn", "navia_runtime.app:app", "--host", "127.0.0.1", "--port", "17861", "--app-dir", "services/local-runtime"],
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

function normalizeSameSite(value) {
  const text = String(value ?? "").toLowerCase();
  if (text === "strict") return "Strict";
  if (text === "none" || text === "no_restriction") return "None";
  return "Lax";
}

function normalizeCookie(siteId, cookie) {
  if (!cookie || typeof cookie !== "object" || !cookie.name || cookie.value == null) return null;
  const normalized = {
    name: String(cookie.name),
    value: String(cookie.value),
    path: String(cookie.path || "/"),
    httpOnly: Boolean(cookie.httpOnly ?? cookie.http_only),
    secure: Boolean(cookie.secure),
    sameSite: normalizeSameSite(cookie.sameSite ?? cookie.same_site)
  };
  if (cookie.domain) normalized.domain = String(cookie.domain);
  else normalized.url = cookieSiteDomains[siteId];
  const expires = Number(cookie.expires ?? cookie.expirationDate ?? cookie.expiry ?? -1);
  if (Number.isFinite(expires) && expires > 0) normalized.expires = Math.floor(expires);
  return normalized;
}

function readCookieFile(siteId) {
  const filePath = process.env[`NAVIA_REAL_SITE_${siteId.toUpperCase()}_COOKIE_FILE`] || path.join(cookieDir, `${siteId}.json`);
  if (!fs.existsSync(filePath)) return { siteId, filePath, cookies: [] };
  const text = fs.readFileSync(filePath, "utf-8").trim();
  if (!text) return { siteId, filePath, cookies: [] };
  let rawCookies = [];
  try {
    const payload = JSON.parse(text);
    rawCookies = Array.isArray(payload) ? payload : Array.isArray(payload?.cookies) ? payload.cookies : [];
  } catch {
    rawCookies = text
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator <= 0) return null;
        return {
          name: part.slice(0, separator).trim(),
          value: part.slice(separator + 1).trim(),
          url: cookieSiteDomains[siteId],
          path: "/",
          secure: true,
          sameSite: "None"
        };
      })
      .filter(Boolean);
  }
  const cookies = rawCookies.map((cookie) => normalizeCookie(siteId, cookie)).filter(Boolean);
  return { siteId, filePath, cookies };
}

async function applyAuthCookies(context, targetSites) {
  const loaded = [];
  for (const site of targetSites) {
    const { siteId, filePath, cookies } = readCookieFile(site.siteId);
    if (!cookies.length) continue;
    await context.addCookies(cookies);
    loaded.push({ siteId, filePath, count: cookies.length });
  }
  return loaded;
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
      headless: realSiteHeadless,
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        "--no-first-run",
        "--no-default-browser-check",
        "--mute-audio",
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
      "--mute-audio",
      "--disable-popup-blocking",
      "--disable-sync",
      realSiteHeadless ? "--headless=new" : "--window-position=40,40",
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
    headless: realSiteHeadless,
    viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--mute-audio",
      realSiteHeadless ? "--headless=new" : "--window-position=40,40",
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
  const profileRoot = path.join(repoRoot, ".tmp");
  fs.mkdirSync(profileRoot, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(profileRoot, "navia-real-site-public-profile-"));
  const port = 10400 + Math.floor(Math.random() * 500);
  const args = [
    "--no-first-run",
    "--no-default-browser-check",
    "--mute-audio",
    "--disable-popup-blocking",
    "--disable-sync",
    realSiteHeadless ? "--headless=new" : "--window-position=40,40",
    "--window-size=1280,900",
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--enable-unsafe-extension-debugging",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${await toWindowsChromeArgPath(userDataDir)}`,
    `--disable-extensions-except=${await toWindowsChromeArgPath(extensionRoot)}`,
    `--load-extension=${await toWindowsChromeArgPath(extensionRoot)}`,
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

async function wakeExtensionAndWaitForServiceWorker(page, context, timeoutMs = 25000) {
  const selectors = [
    "[data-testid='navia-inpage-sidebar-frame']",
    "[data-testid='navia-inpage-sidebar']",
    "[data-testid='navia-floating-launcher']"
  ];
  for (const selector of selectors) {
    const found = await page.locator(selector).count().catch(() => 0);
    if (found > 0) break;
    await page.waitForSelector(selector, { timeout: 5000 }).catch(() => undefined);
  }
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const worker = await waitForServiceWorker(context, 3000);
    if (worker) return worker;
    await page.evaluate(() => document.documentElement?.dispatchEvent(new Event("mousemove", { bubbles: true }))).catch(() => undefined);
    await wait(500);
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
      .filter(
        (link) =>
          link.href.replace(/#.*$/, "") !== current &&
          !/passport|login|account|mall|download|creator|publish|member\.bilibili\.com|platform\/upload|studio|creator-center/.test(link.href)
      )
      .map((link, index) => {
        const text = link.text.replace(/\s+/g, " ").trim();
        let score = 0;
        if (text.length >= 5) score += 8;
        if (!text || /^(\[?全文\]?|阅读\s*\d+|评论\s*\d+)$/i.test(text)) score -= 20;
        if (/#comment|javascript:|void\(0\)/i.test(link.href)) score -= 20;
        if (spec.siteId === "bilibili" && /\/video\/BV/i.test(link.href)) score += 12;
        if (spec.siteId === "xiaohongshu" && /\/explore\/[a-z0-9]+/i.test(link.href)) score += 12;
        if (spec.siteId === "guancha") {
          if (/\/politics\//i.test(link.href)) score -= 12;
          if (/\.shtml(?:[?#].*)?$/i.test(link.href) && !/\/politics\//i.test(link.href)) score += 14;
        }
        return { ...link, text, score, index };
      })
      .filter((link) => link.score > -20)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 12)
      .map(({ href, text, score }) => ({ href, text, score }));
  }, site);
}

function routeValidationIssues(site, pageKind, originalUrl, finalUrl) {
  const issues = [];
  let parsed;
  try {
    parsed = new URL(String(finalUrl || originalUrl || ""));
  } catch {
    return [`Final URL is not parseable: ${finalUrl || originalUrl || "missing"}.`];
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const pathName = parsed.pathname.toLowerCase();
  const detailKind = !["homepage", "channel", "feed", "blog", "docs", "wiki"].includes(String(pageKind));
  if (site.expectedHost) {
    const expectedHost = String(site.expectedHost).replace(/^www\./, "").toLowerCase();
    if (expectedHost && host !== expectedHost && !host.endsWith(`.${expectedHost}`) && !expectedHost.endsWith(`.${host}`)) {
      issues.push(`Manifest sample reached unexpected host: expected=${expectedHost}, actual=${parsed.hostname}.`);
    }
  }
  if (site.siteId === "bilibili") {
    if (!host.endsWith("bilibili.com")) issues.push(`Bilibili sample reached unexpected host: ${parsed.hostname}.`);
    if (/^member\.bilibili\.com$/i.test(parsed.hostname) || /\/platform\/upload|creator|studio/.test(pathName)) {
      issues.push(`Bilibili sample reached creator/upload backend instead of public reading target: ${parsed.href}.`);
    }
    if (detailKind && !/^\/(video|read)\//.test(pathName)) {
      issues.push(`Bilibili detail sample did not reach /video/ or /read/: ${parsed.href}.`);
    }
  }
  if (site.siteId === "xiaohongshu") {
    if (!host.endsWith("xiaohongshu.com")) issues.push(`Xiaohongshu sample reached unexpected host: ${parsed.hostname}.`);
    if (/creator|publish|login|passport/.test(`${host}${pathName}`)) {
      issues.push(`Xiaohongshu sample reached non-reading backend/login path: ${parsed.href}.`);
    }
    if (detailKind && !/^\/(explore|discovery\/item)\//.test(pathName)) {
      issues.push(`Xiaohongshu detail sample did not reach /explore/ or /discovery/item/: ${parsed.href}.`);
    }
  }
  if (site.siteId === "guancha") {
    if (!host.endsWith("guancha.cn")) issues.push(`Guancha sample reached unexpected host: ${parsed.hostname}.`);
    if (detailKind && !pathName.endsWith(".shtml")) {
      issues.push(`Guancha detail sample did not reach an article .shtml path: ${parsed.href}.`);
    }
  }
  return issues;
}

function isUnavailableDetailSample(sample) {
  const finalUrl = String(sample.finalUrl ?? sample.url ?? "").toLowerCase();
  const title = String(sample.dom?.title ?? sample.perception?.activePage?.title ?? "").toLowerCase();
  const warnings = new Set([...(sample.perception?.warnings ?? []), ...(sample.perception?.fatalIssues ?? [])].map(String));
  const verificationOrAuthGated =
    warnings.has("AUTH_GATED_DEGRADED") ||
    warnings.has("VERIFICATION_GATED_DEGRADED") ||
    (Array.isArray(sample.majorIssues) && sample.majorIssues.some((issue) => /登录|验证码|verification|auth/i.test(String(issue))));
  const noUsableMindmap = !sample.cards?.containsEvidenceCardMindmap || !Array.isArray(sample.cards?.sourceCards) || sample.cards.sourceCards.length === 0;
  return (
    (Array.isArray(sample.routeValidation?.fatalIssues) && sample.routeValidation.fatalIssues.length > 0) ||
    finalUrl.includes("/404") ||
    title.includes("404") ||
    title.includes("页面不见了") ||
    warnings.has("NOT_FOUND_PAGE_FAILED") ||
    (verificationOrAuthGated && noUsableMindmap)
  );
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

function canonicalMindmapLabel(value) {
  return normalizeText(value)
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\bhttps?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function sourceCardSelectionScore(card, siteId) {
  const label = normalizeText(card?.label ?? "");
  const excerpt = normalizeText(card?.excerpt ?? "");
  const text = `${label} ${excerpt}`;
  let score = 0;
  if (label.length >= 4) score += 6;
  if (excerpt.length >= 12) score += 8;
  if (Array.isArray(card?.sourceRefIds) && card.sourceRefIds.length > 0) score += Math.min(10, card.sourceRefIds.length * 2);
  if (/^(核心要点|视频与内容|主要内容|内容概览)$/.test(label)) score -= 18;
  if (Array.isArray(card?.sourceRefIds) && card.sourceRefIds.length >= 4) score -= 8;
  if (/正文|标题|作者|发布时间|来源|文\/|视频简介|up主|播放|弹幕|笔记|note|explore|article/.test(text)) score += 24;
  if (siteId === "xiaohongshu" && /xiaohongshu\.com\/explore|笔记|note|feed|card|小红书/.test(text)) score += 18;
  if (siteId === "guancha" && /观察者网|guancha\.cn\/.+\.shtml|来源：|文\/|article|正文/.test(text)) score += 22;
  if (siteId === "bilibili" && /bili_feed_card|bilibili\.com\/video|视频|up主|简介/.test(text)) score += 24;
  if (/首页|频道|动态|热门|投稿|消息|推荐\s+穿搭\s+美食\s+彩妆/.test(text)) score -= 30;
  if (/^description\b|^keywords\b|^canonical\b|^referrer\b|^server_render\b|description:|keywords:|canonical:|referrer:|server_render:/.test(text)) score -= 44;
  if (/评论|回复|热评|举报|分享|踩\d*|赞\d*|收藏|最新视频|查看全部|推荐列表|相关推荐|自动连播|订阅合集|侧栏|footer|沪icp|营业执照|隐私政策|活动横幅|qq群|微信|防挡字幕|弹幕设置/.test(text)) score -= 40;
  if (/https?:\/\/cm\.bilibili\.com|\/cm\/api\/fees/.test(text)) score -= 18;
  if (/blackboard\/era|sourceType=adPut|广告|活动抽|抽测试资格/.test(text)) score -= 28;
  if (/^(og\s+(url|image)|.*site-verification|360-site-verification|google-site-verification|shenma-site-verification)$/i.test(label)) score -= 34;
  if (/og:(url|image)|site-verification|xhscdn\.com/.test(text)) score -= 18;
  if (String(card?.nodeId ?? "") === "root") score -= 16;
  if (excerpt.length > 520) score -= 8;
  return score;
}

function selectSourceCardForJumpback(sourceCards, siteId) {
  const candidates = Array.isArray(sourceCards) ? sourceCards : [];
  const scored = candidates
    .map((card, fallbackIndex) => ({
      index: typeof card.index === "number" ? card.index : fallbackIndex,
      label: card.label ?? "",
      excerpt: card.excerpt ?? "",
      score: sourceCardSelectionScore(card, siteId)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const selected = scored[0] ?? null;
  return {
    selectedSourceCardIndex: selected?.index ?? 0,
    selectedSourceCardReason: selected
      ? `selected highest main-content score ${selected.score} for ${siteId}; label=${String(selected.label).slice(0, 80)}`
      : "no source card candidates; fallback index 0",
    sourceCardCandidates: scored.slice(0, 6)
  };
}

function mindmapQualityDiagnostics({ site, dom, perception, sidepanel, cards }) {
  const fatalIssues = [];
  const majorIssues = [];
  const evidenceCardLabels = Array.isArray(cards?.evidenceCardLabels) ? cards.evidenceCardLabels.filter(Boolean) : [];
  const sourceCardLabels = Array.isArray(cards?.sourceCards) ? cards.sourceCards.map((card) => card.label).filter(Boolean) : [];
  const labels = evidenceCardLabels.length >= 3 ? evidenceCardLabels : [...evidenceCardLabels, ...sourceCardLabels];
  const visibleText = normalizeText([
    sidepanel?.pageTitle,
    cards?.readingMapDetailText,
    cards?.sourceEvidenceText,
    evidenceCardLabels.join(" "),
    sourceCardLabels.join(" ")
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
    const normalizedLabels = labels.map((label) => canonicalMindmapLabel(label)).filter(Boolean);
    const uniqueRatio = new Set(normalizedLabels).size / normalizedLabels.length;
    const noisyRatio = normalizedLabels.filter(noisyMindmapLabel).length / normalizedLabels.length;
    const averageLabelLength = normalizedLabels.reduce((sum, label) => sum + label.length, 0) / normalizedLabels.length;
    if (uniqueRatio < 0.62) majorIssues.push(`Mindmap labels are too repetitive: uniqueRatio=${uniqueRatio.toFixed(2)}.`);
    if (noisyRatio > 0.28) majorIssues.push(`Mindmap labels contain too much navigation/noise text: noisyRatio=${noisyRatio.toFixed(2)}.`);
    if (averageLabelLength > 28) majorIssues.push(`Mindmap labels are too long for side panel reading: avgLength=${averageLabelLength.toFixed(1)}.`);
    return {
      labelCount: normalizedLabels.length,
      evidenceCardLabelCount: evidenceCardLabels.length,
      sourceCardLabelCount: sourceCardLabels.length,
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
    evidenceCardLabelCount: evidenceCardLabels.length,
    sourceCardLabelCount: sourceCardLabels.length,
    uniqueRatio: labels.length ? 1 : 0,
    noisyRatio: labels.length ? labels.filter(noisyMindmapLabel).length / labels.length : 1,
    averageLabelLength: labels.length ? labels.reduce((sum, label) => sum + normalizeText(label).length, 0) / labels.length : 0,
    fatalIssues,
    majorIssues
  };
}

function classifySample({ site, pageKind, routeValidation, dom, sidepanel, perception, cards, jumpback, error }) {
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
  if (Array.isArray(routeValidation?.fatalIssues) && routeValidation.fatalIssues.length > 0) {
    fatalIssues.push(...routeValidation.fatalIssues);
  }
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
  const fallbackEvidenceVisible =
    jumpback?.status === "fallback_shown" &&
    Boolean(jumpback?.sourceEvidenceVisible) &&
    normalizeText(jumpback?.evidenceText ?? "").includes("fallback_shown");
  const scopedHomepageFallbackAllowed =
    isMatrixAcceptanceMode &&
    pageKind === "homepage" &&
    fallbackEvidenceVisible &&
    Array.isArray(cards?.sourceCards) &&
    cards.sourceCards.length >= 3;
  if (jumpback?.status === "fallback_shown" && !scopedHomepageFallbackAllowed) {
    majorIssues.push("Source jumpback only showed fallback evidence.");
  }
  const mindmapQuality = mindmapQualityDiagnostics({ site, dom, perception, sidepanel, cards });
  fatalIssues.push(...mindmapQuality.fatalIssues);
  majorIssues.push(...mindmapQuality.majorIssues);
  const result = fatalIssues.length ? "blocked" : majorIssues.length ? "degraded" : "pass";
  return {
    pageKind,
    result,
    mindmapQuality,
    fallbackPolicy: jumpback?.status === "fallback_shown" ? (scopedHomepageFallbackAllowed ? "accepted_homepage_dynamic_feed_fallback" : "degraded_fallback_only") : "not_fallback",
    fatalIssues,
    majorIssues
  };
}

async function diagnosePage({ page, serviceWorker, site, pageKind, url, label, manifestSample = null }) {
  const sampleId = manifestSample?.pageId || `${site.siteId}-${label}`;
  const sampleDir = path.join(dataRoot, sampleId);
  fs.mkdirSync(sampleDir, { recursive: true });
  const sample = {
    sampleId,
    siteId: site.siteId,
    siteName: site.siteName,
    manifest: manifestSample
      ? {
          pageId: manifestSample.pageId,
          contentCategory: manifestSample.contentCategory,
          countryRegion: manifestSample.countryRegion,
          pageType: manifestSample.pageType,
          loginStatePolicy: manifestSample.loginStatePolicy,
          expectedMainContentSignals: manifestSample.expectedMainContentSignals ?? [],
          prohibitedNoiseSignals: manifestSample.prohibitedNoiseSignals ?? []
        }
      : null,
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
    sample.routeValidation = {
      fatalIssues: routeValidationIssues(site, pageKind, url, sample.finalUrl || sample.dom?.url || "")
    };
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
      const selection = selectSourceCardForJumpback(sample.cards.sourceCards, site.siteId);
      const attempts = [];
      let selectedAttempt = null;
      for (const candidate of selection.sourceCardCandidates) {
        const jumpbackResult = await runBridgeCommand(serviceWorker, { action: "jumpback_source_card", index: candidate.index });
        const result = jumpbackResult.result ?? jumpbackResult;
        const attempt = {
          ...result,
          selectedSourceCardIndex: candidate.index,
          selectedSourceCardReason: `candidate score ${candidate.score} for ${site.siteId}; label=${String(candidate.label).slice(0, 80)}`
        };
        attempts.push(attempt);
        selectedAttempt = attempt;
        if (result.status === "highlighted") break;
      }
      sample.jumpback = {
        ...(selectedAttempt ?? { status: "blocked", evidenceText: "No source card candidate could be attempted." }),
        selectedSourceCardIndex: selectedAttempt?.selectedSourceCardIndex ?? selection.selectedSourceCardIndex,
        selectedSourceCardReason: selectedAttempt?.selectedSourceCardReason ?? selection.selectedSourceCardReason,
        sourceCardAttemptCount: attempts.length,
        sourceCardAttempts: attempts.map((attempt) => ({
          index: attempt.selectedSourceCardIndex,
          status: attempt.status,
          reason: attempt.selectedSourceCardReason,
          failureReason: attempt.failureReason ?? null
        })),
        sourceCardCandidates: selection.sourceCardCandidates
      };
    } else {
      sample.jumpback = { status: "blocked", evidenceText: "No source cards available." };
    }
    writeJson(path.join(sampleDir, "jumpback.json"), sample.jumpback);
    await wait(1200);
    await page.screenshot({ path: path.join(screenshotRoot, `${sampleId}-after.png`), fullPage: false });

    const classification = classifySample({
      site,
      pageKind,
      routeValidation: sample.routeValidation,
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

function buildReport(samples, browserMode, authCookies = []) {
  const passedSamples = samples.filter((sample) => sample.result === "pass").length;
  const degradedSamples = samples.filter((sample) => sample.result === "degraded").length;
  const blockedSamples = samples.filter((sample) => sample.result === "blocked").length;
  const fatalIssues = [];
  const majorIssues = [];
  const environmentNotes = [];
  const expandedSamples = samples.filter((sample) => sample.manifest?.contentCategory);
  const expandedMode = isMatrixAcceptanceMode && expandedSamples.length > 0;
  const categoryResults = expandedMode
    ? [...new Set(expandedSamples.map((sample) => sample.manifest.contentCategory))]
        .sort()
        .map((categoryId) => {
          const categorySamples = expandedSamples.filter((sample) => sample.manifest.contentCategory === categoryId);
          return {
            categoryId,
            samples: categorySamples.length,
            passedSamples: categorySamples.filter((sample) => sample.result === "pass").length,
            distinctSites: new Set(categorySamples.map((sample) => sample.siteName)).size
          };
        })
    : [];
  if (expandedMode) {
    const domesticSamples = expandedSamples.filter((sample) => sample.manifest.countryRegion === "domestic").length;
    const internationalSamples = expandedSamples.filter((sample) => sample.manifest.countryRegion === "international").length;
    const minSamples = isContentQualityMode ? 36 : 48;
    const minDomestic = isContentQualityMode ? 18 : 24;
    const minInternational = isContentQualityMode ? 18 : 24;
    const minPassed = isContentQualityMode ? 34 : 44;
    const minCategorySamples = isContentQualityMode ? 6 : 8;
    const minCategoryPassed = isContentQualityMode ? 5 : 7;
    const minDistinctSites = isContentQualityMode ? 1 : 4;
    if (expandedSamples.length < minSamples) fatalIssues.push(`Expected at least ${minSamples} expanded samples, collected ${expandedSamples.length}.`);
    if (domesticSamples < minDomestic) fatalIssues.push(`Expected at least ${minDomestic} domestic samples, collected ${domesticSamples}.`);
    if (internationalSamples < minInternational) fatalIssues.push(`Expected at least ${minInternational} international samples, collected ${internationalSamples}.`);
    if (passedSamples < minPassed) fatalIssues.push(`Expected at least ${minPassed} passed samples, collected ${passedSamples}.`);
    for (const result of categoryResults) {
      if (result.samples < minCategorySamples) fatalIssues.push(`Category ${result.categoryId} has fewer than ${minCategorySamples} samples.`);
      if (result.passedSamples < minCategoryPassed) fatalIssues.push(`Category ${result.categoryId} has fewer than ${minCategoryPassed} passed samples.`);
      if (result.distinctSites < minDistinctSites) fatalIssues.push(`Category ${result.categoryId} has fewer than ${minDistinctSites} distinct sites.`);
    }
    if (degradedSamples || blockedSamples) {
      environmentNotes.push(`${degradedSamples} sample(s) degraded and ${blockedSamples} sample(s) blocked were retained as honest evidence.`);
    }
  } else {
    if (samples.length < 6) fatalIssues.push(`Expected 6 samples, collected ${samples.length}.`);
    if (blockedSamples) fatalIssues.push(`${blockedSamples} sample(s) blocked.`);
    if (degradedSamples) majorIssues.push(`${degradedSamples} sample(s) degraded.`);
  }
  if (browserMode === "launch-temp-public-profile") {
    environmentNotes.push(
      authCookies.length
        ? "Login profile was unavailable; diagnostic used a temporary Chrome profile with injected auth cookies."
        : "Login profile was unavailable; diagnostic used a temporary public Chrome profile without login state."
    );
  }
  if (browserMode === "launch-playwright-chromium") {
    environmentNotes.push("Diagnostic used Playwright Chromium with a temporary public profile because local Chrome stable did not load the unpacked extension through command-line flags.");
  }
  if (authCookies.length) {
    environmentNotes.push(`Auth cookies were injected for: ${authCookies.map((item) => `${item.siteId}(${item.count})`).join(", ")}. Cookie values are intentionally omitted from evidence.`);
  }
  const passed = expandedMode
    ? fatalIssues.length === 0 && expandedSamples.length >= (isContentQualityMode ? 36 : 48) && passedSamples >= (isContentQualityMode ? 34 : 44)
    : fatalIssues.length === 0 && majorIssues.length === 0 && samples.length === 6;
  return {
    schemaVersion: expandedMode
      ? isContentQualityMode
        ? "v1-mvp-content-quality.raw-diagnostic.1"
        : "v1-mvp-quality-hardening.raw-diagnostic.1"
      : isQualityHardeningMode
        ? "v1-mvp-quality-hardening.1"
        : isContentQualityMode
          ? "v1-mvp-content-quality.1"
        : "v1-real-site-complex-pages-diagnostic.1",
    generatedAt: new Date().toISOString(),
    acceptanceMode,
    evidenceRoot: evidenceRootRelative,
    browserMode,
    authCookieSites: authCookies.map((item) => ({ siteId: item.siteId, count: item.count })),
    loginStatePolicy:
      browserMode === "launch-temp-public-profile"
        ? authCookies.length
          ? "temp-profile-with-injected-auth-cookies"
          : "temp-public-profile-no-login"
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
      fallbackSamples: samples.filter((sample) => sample.jumpback?.status === "fallback_shown").length,
      expandedMode,
      categoryResults
    },
    samples: samples.map((sample) => ({
      sampleId: sample.sampleId,
      siteName: sample.siteName,
      pageKind: sample.pageKind,
      url: sample.url,
      finalUrl: sample.finalUrl ?? null,
      countryRegion: sample.manifest?.countryRegion ?? null,
      contentCategory: sample.manifest?.contentCategory ?? null,
      loginStatePolicy: sample.manifest?.loginStatePolicy ?? null,
      result: sample.result,
      readiness: sample.perception?.readiness ?? "unknown",
      bodyTextLength: sample.dom?.bodyTextLength ?? 0,
      sourceRefs: sample.perception?.sourceRefs ?? 0,
      digestItems: sample.perception?.digestItems ?? 0,
      evidenceCardCount: sample.cards?.evidenceCardCount ?? 0,
      containsReadingMap: Boolean(sample.cards?.containsReadingMap),
      sourceCards: Array.isArray(sample.cards?.sourceCards) ? sample.cards.sourceCards.length : 0,
      jumpbackStatus: sample.jumpback?.status ?? "missing",
      selectedSourceCardIndex: sample.jumpback?.selectedSourceCardIndex ?? null,
      selectedSourceCardReason: sample.jumpback?.selectedSourceCardReason ?? null,
      mindmapQuality: sample.mindmapQuality ?? null,
      fallbackPolicy: sample.fallbackPolicy ?? "not_fallback",
      fatalIssues: sample.fatalIssues ?? [],
      majorIssues: sample.majorIssues ?? []
    })),
    fatalIssues,
    majorIssues,
    environmentNotes,
    claim: passed
      ? isContentQualityMode
        ? expandedMode
          ? "V1 MVP content quality diagnostic collected strict real-site evidence. Run generate-v1-mvp-content-quality-report.mjs for the final schema report."
          : "V1 MVP content quality passed scoped real-site acceptance."
      : isQualityHardeningMode
        ? expandedMode
          ? "V1 MVP quality hardening diagnostic collected expanded real-site evidence. Run generate-v1-mvp-quality-hardening-report.mjs for the final schema report."
          : "V1 MVP quality hardening passed scoped real-site acceptance."
        : "Real-site complex page diagnostic passed for Bilibili, Xiaohongshu, and Guancha homepage/detail samples."
      : isContentQualityMode
        ? "No completion claim. V1 MVP content quality remains degraded or blocked."
      : isQualityHardeningMode
        ? "No completion claim. V1 MVP quality hardening remains degraded or blocked."
        : "No completion claim. Real-site complex page diagnostic found degraded or blocked samples."
  };
}

function writeMarkdownReports(report) {
  const rows = report.samples
    .map(
      (sample) =>
        `| ${sample.siteName} | ${sample.pageKind} | ${sample.result} | ${sample.readiness} | ${sample.bodyTextLength} | ${sample.sourceRefs} | ${sample.digestItems} | ${sample.jumpbackStatus} | ${sample.selectedSourceCardIndex ?? "n/a"} | ${sample.mindmapQuality ? `${sample.mindmapQuality.labelCount} labels / noise ${Number(sample.mindmapQuality.noisyRatio ?? 0).toFixed(2)} / unique ${Number(sample.mindmapQuality.uniqueRatio ?? 0).toFixed(2)}` : "n/a"} | ${[...sample.fatalIssues, ...sample.majorIssues].join("; ") || "none"} |`
    )
    .join("\n");
  const reportTitle =
    report.acceptanceMode === "v1_mvp_quality_hardening"
      ? "V1-MVP-QH 质量硬化真实站点验收报告"
      : "V1 Real-Site Complex Pages Diagnostic Acceptance Report";
  writeText(
    path.join(evidenceRoot, "acceptance-report.md"),
    `# ${reportTitle}

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

| Site | Page | Result | Readiness | Text length | SourceRefs | Digest | Jumpback | Selected source card | Mindmap quality | Issues |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
${rows}
`
  );
  writeText(
    path.join(evidenceRoot, "prd-review.md"),
    `# ${report.acceptanceMode === "v1_mvp_content_quality" ? "V1-MVP-CQ PRD 规格检视" : report.acceptanceMode === "v1_mvp_quality_hardening" ? "V1-MVP-QH PRD 规格检视" : "V1 Real-Site Complex Pages PRD Review"}

Result: ${report.passed ? "PASS" : "FAIL"}

Covered:

- B站、小红书、观察者网首页和详情页真实 Chrome 诊断。
- 当前页读取、Debug / runtime perception、Mindmap、Reading Map、source evidence、jumpback / fallback。
- V1-MVP-QH / CQ 重点：主内容抽取、Mindmap 去噪、source jumpback 三态和可视化证据。
- 登录墙、反爬、JS 空壳、媒体主内容和低信号页面按 degraded / blocked 记录。

Not claimed:

- Full V1 complete.
- OCR / VLM / ASR / 视频理解 / 直播理解。
- RAG / Memory / Web Research / PPT / Deep Research / 多 Agent / 浏览器自动操作产品能力。
`
  );
  writeText(
    path.join(evidenceRoot, "false-green-audit.md"),
    `# ${report.acceptanceMode === "v1_mvp_content_quality" ? "V1-MVP-CQ False-Green Audit" : report.acceptanceMode === "v1_mvp_quality_hardening" ? "V1-MVP-QH False-Green Audit" : "V1 Real-Site Complex Pages False-Green Audit"}

Result: ${report.passed ? "PASS" : "FAIL"}

Checks:

- 6 个样本必须全部 pass 才能声明真实复杂站点诊断通过。
- fallback 不被记录为 DOM highlight success。
- blocked 不被记录为 fallback 或 DOM highlight success。
- V1-MVP-QH / CQ 允许动态首页 feed 出现少量 fallback evidence，但必须在 report.json 中保留 fallbackPolicy；详情页 fallback 仍为 major。
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
  writeHtmlReport(report);
  writeJson(path.join(evidenceRoot, "evidence-manifest.json"), {
    schemaVersion: `${report.schemaVersion}.manifest`,
    generatedAt: report.generatedAt,
    evidenceRoot: report.evidenceRoot,
    reportJson: `${report.evidenceRoot}/report.json`,
    acceptanceHtml: `${report.evidenceRoot}/acceptance-report.html`,
    prdReview: `${report.evidenceRoot}/prd-review.md`,
    falseGreenAudit: `${report.evidenceRoot}/false-green-audit.md`,
    screenshots: report.samples.flatMap((sample) => [
      `${report.evidenceRoot}/screenshots/${sample.sampleId}-before.png`,
      `${report.evidenceRoot}/screenshots/${sample.sampleId}-after.png`,
      `${report.evidenceRoot}/screenshots/${sample.sampleId}-blocked.png`
    ]).filter((relativePath) => fs.existsSync(path.join(repoRoot, relativePath))),
    claim: report.claim,
    passed: report.passed
  });
}

function writeHtmlReport(report) {
  const cards = report.samples
    .map((sample) => {
      const beforePath = `screenshots/${sample.sampleId}-before.png`;
      const afterPath = `screenshots/${sample.sampleId}-after.png`;
      const blockedPath = `screenshots/${sample.sampleId}-blocked.png`;
      const visibleShots = [beforePath, afterPath, blockedPath].filter((relativePath) => fs.existsSync(path.join(evidenceRoot, relativePath)));
      return `<section class="sample ${escapeHtml(sample.result)}">
        <h3>${escapeHtml(sample.siteName)} / ${escapeHtml(sample.pageKind)} / ${escapeHtml(sample.result)}</h3>
        <p><strong>URL:</strong> ${escapeHtml(sample.finalUrl || sample.url)}</p>
        <p><strong>读取:</strong> readiness=${escapeHtml(sample.readiness)} sourceRefs=${escapeHtml(sample.sourceRefs)} digest=${escapeHtml(sample.digestItems)} sourceCards=${escapeHtml(sample.sourceCards)}</p>
        <p><strong>反跳:</strong> ${escapeHtml(sample.jumpbackStatus)}，source card=${escapeHtml(sample.selectedSourceCardIndex ?? "n/a")}</p>
        <p><strong>Fallback 口径:</strong> ${escapeHtml(sample.fallbackPolicy ?? "not_fallback")}</p>
        <p><strong>导图质量:</strong> ${sample.mindmapQuality ? `labels=${escapeHtml(sample.mindmapQuality.labelCount)} noise=${escapeHtml(Number(sample.mindmapQuality.noisyRatio ?? 0).toFixed(2))} unique=${escapeHtml(Number(sample.mindmapQuality.uniqueRatio ?? 0).toFixed(2))}` : "n/a"}</p>
        <p><strong>问题:</strong> ${escapeHtml([...sample.fatalIssues, ...sample.majorIssues].join("; ") || "none")}</p>
        <div class="shots">${visibleShots.map((shot) => `<figure><img src="${escapeHtml(shot)}" alt="${escapeHtml(sample.sampleId)} screenshot"><figcaption>${escapeHtml(shot)}</figcaption></figure>`).join("")}</div>
      </section>`;
    })
    .join("\n");
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(report.acceptanceMode === "v1_mvp_content_quality" ? "V1-MVP-CQ 验收报告" : report.acceptanceMode === "v1_mvp_quality_hardening" ? "V1-MVP-QH 验收报告" : "真实站点验收报告")}</title>
  <style>
    body { margin: 0; background: #f6f8f6; color: #14201e; font: 14px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px; }
    h1 { margin: 0 0 10px; color: #064c45; font-size: 28px; }
    h2 { margin-top: 28px; color: #064c45; font-size: 20px; }
    .summary, .sample { border: 1px solid #cfe0dc; border-radius: 14px; background: #fff; box-shadow: 0 18px 44px rgba(6, 76, 69, 0.08); padding: 18px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 12px; }
    .metric { border-radius: 10px; background: #eff7f4; padding: 10px 12px; }
    .metric strong { display: block; color: #064c45; font-size: 22px; }
    .sample { margin-top: 16px; }
    .sample h3 { margin: 0 0 8px; font-size: 17px; }
    .pass { border-left: 6px solid #05735f; }
    .degraded { border-left: 6px solid #bf7b17; }
    .blocked { border-left: 6px solid #a23b3b; }
    .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 12px; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #d8e5e1; border-radius: 10px; background: #f8faf9; }
    figcaption { color: #51625f; font-size: 12px; word-break: break-all; }
    code, pre { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
<main>
  <h1>${escapeHtml(report.acceptanceMode === "v1_mvp_content_quality" ? "V1-MVP-CQ 内容理解质量真实站点验收报告" : report.acceptanceMode === "v1_mvp_quality_hardening" ? "V1-MVP-QH 质量硬化真实站点验收报告" : "V1 真实站点诊断验收报告")}</h1>
  <section class="summary">
    <p><strong>结论:</strong> ${escapeHtml(report.passed ? "PASS" : "FAIL")}</p>
    <p><strong>声明:</strong> <code>${escapeHtml(report.claim)}</code></p>
    <p><strong>证据路径:</strong> ${escapeHtml(report.evidenceRoot)}</p>
    <p><strong>运行方式:</strong> ${escapeHtml(report.browserMode)} / ${escapeHtml(report.loginStatePolicy)}</p>
    <div class="summary-grid">
      <div class="metric"><strong>${escapeHtml(report.summary.samplesTotal)}</strong>样本</div>
      <div class="metric"><strong>${escapeHtml(report.summary.passedSamples)}</strong>通过</div>
      <div class="metric"><strong>${escapeHtml(report.summary.degradedSamples)}</strong>降级</div>
      <div class="metric"><strong>${escapeHtml(report.summary.blockedSamples)}</strong>阻塞</div>
      <div class="metric"><strong>${escapeHtml(report.summary.highlightedSamples)}</strong>DOM 高亮</div>
      <div class="metric"><strong>${escapeHtml(report.summary.fallbackSamples)}</strong>Fallback</div>
    </div>
  </section>
  <h2>目标架构与当前实现</h2>
  <section class="summary">
    <p>当前实现链路：contentBridge.ts 注入 launcher/sidebar 并读取当前页 DOM signals，sidepanel React App 调用 Runtime，A Page Reading 产出 PerceptionDigest / SourceRef，C Mindmap 产出 nodeSourceMap，B Renderer 展示 Evidence Card Mindmap 和 Source Evidence，用户触发 source jumpback 后 contentBridge 执行定位、高亮、fallback 或 blocked。</p>
    <p>本报告只验收 V1-MVP-QH / CQ scoped quality hardening：主内容抽取、Mindmap 去噪、source jumpback 三态和真实站点截图证据。</p>
  </section>
  <h2>用户场景截图证据</h2>
  ${cards}
</main>
</body>
</html>`;
  writeText(path.join(evidenceRoot, "acceptance-report.html"), html);
}

async function main() {
  const manifestBeforeCleanup = loadSampleManifest({ applyLimit: false });
  const runtimeManifest =
    manifestBeforeCleanup
      ? loadSampleManifest({ applyLimit: true })
      : null;
  if (!appendEvidence) {
    fs.rmSync(evidenceRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(screenshotRoot, { recursive: true });
  fs.mkdirSync(dataRoot, { recursive: true });
  if (manifestBeforeCleanup) {
    writeJson(path.join(evidenceRoot, "sample-manifest.json"), manifestBeforeCleanup);
  }

  const runtime = (await isRuntimeOnline()) ? null : startRuntime();
  let browserHandle = null;
  let wakeFixture = null;
  let authCookies = [];
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
    const manifest = runtimeManifest;
    const manifestSites = manifest
      ? manifest.samples.map((sample) => siteSpecFromManifestSample(sample))
      : null;
    const targetSites = manifestSites ?? (realSiteOnly ? sites.filter((site) => site.siteId === realSiteOnly) : sites);
    authCookies = await applyAuthCookies(browserHandle.context, targetSites);
    wakeFixture = await startWakeFixtureServer();
    const wakeUrl = wakeFixture.url;
    await page.goto(wakeUrl, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
    await wait(2500);
    const serviceWorker = await wakeExtensionAndWaitForServiceWorker(page, browserHandle.context, 25000);
    if (!serviceWorker) throw new Error("Extension service worker not exposed. Run NAVIA_E2E_BRIDGE=1 npm --prefix apps/chrome-extension run build:e2e first.");

    if (manifest) {
      writeJson(path.join(evidenceRoot, "sample-manifest.resolved.json"), manifest);
      for (const sampleSpec of manifest.samples) {
        const site = siteSpecFromManifestSample(sampleSpec);
        const sample = await diagnosePage({
          page,
          serviceWorker,
          site,
          pageKind: sampleSpec.pageType || "page",
          url: sampleSpec.url,
          label: sampleSpec.pageId,
          manifestSample: sampleSpec
        });
        samples.push(sample);
      }
    } else {
      for (const site of targetSites) {
        const homeUrl = homeUrlOverrides[site.siteId] || site.homeUrl;
        const homeSample = await diagnosePage({ page, serviceWorker, site, pageKind: "homepage", url: homeUrl, label: "homepage" });
        samples.push(homeSample);
        const overrideUrl = detailUrlOverrides[site.siteId] || "";
        const detailCandidates = overrideUrl
          ? [{ href: overrideUrl, text: "explicit detail URL from NAVIA_REAL_SITE_*_DETAIL_URL" }]
          : await discoverDetailCandidates(page, site).catch(() => []);
        if (detailCandidates.length) {
          let selectedDetailSample = null;
          const attemptedDetails = [];
          const limitedDetailCandidates = detailCandidates.slice(0, maxDetailAttempts);
          for (let index = 0; index < limitedDetailCandidates.length; index += 1) {
            const detail = limitedDetailCandidates[index];
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
            await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined);
            await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
            await wait(2500);
          }
          selectedDetailSample.attemptedDetails = attemptedDetails;
          writeJson(path.join(dataRoot, selectedDetailSample.sampleId, "sample-report.json"), selectedDetailSample);
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
    if (wakeFixture) await new Promise((resolve) => wakeFixture.server.close(resolve)).catch(() => undefined);
    if (runtime) runtime.kill("SIGTERM");
  }

  const reportSamples =
    appendEvidence && manifestBeforeCleanup
      ? manifestBeforeCleanup.samples
          .map((sample) => readJsonFile(path.join(dataRoot, sample.pageId, "sample-report.json")))
          .filter(Boolean)
      : samples;
  const report = buildReport(reportSamples, browserHandle?.mode ?? "not-launched", authCookies);
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
