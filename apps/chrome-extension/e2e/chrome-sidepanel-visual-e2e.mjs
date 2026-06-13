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
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_2_ac/visual-chrome-cli");
const browserMode = process.env.NAVIA_VISUAL_BROWSER || "chromium";

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
  const dbPath = path.join(os.tmpdir(), `navia-visual-e2e-${Date.now()}.sqlite3`);
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
    throw new Error(`Runtime visual E2E setup failed: ${response.status} ${await response.text()}`);
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
    const pages = context.pages().map((page) => page.url());
    const workers = context.serviceWorkers().map((worker) => worker.url());
    throw new Error(`Extension service worker was not exposed. pages=${JSON.stringify(pages)} workers=${JSON.stringify(workers)}`);
  }
}

async function findTabIdByUrl(serviceWorker, fixtureUrl) {
  return serviceWorker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => tab.url === url)?.id ?? null;
  }, fixtureUrl);
}

async function openDirectSidePanel(context, extensionId, fixtureTabId) {
  const sidePanel = await context.newPage();
  const tabParam = fixtureTabId ? `?naviaE2ETabId=${fixtureTabId}` : "";
  await sidePanel.goto(`chrome-extension://${extensionId}/sidepanel.html${tabParam}`);
  return sidePanel;
}

async function switchView(sidePanel, name) {
  await sidePanel.getByRole("button", { name }).last().click();
}

async function capture(page, name, title, description, captures) {
  await wait(350);
  const file = `${String(captures.length + 1).padStart(2, "0")}-${name}.png`;
  const absPath = path.join(evidenceRoot, file);
  await page.screenshot({ path: absPath, fullPage: true });
  captures.push({ file, title, description });
}

async function captureLocator(locator, name, title, description, captures) {
  await locator.scrollIntoViewIfNeeded();
  await wait(350);
  const file = `${String(captures.length + 1).padStart(2, "0")}-${name}.png`;
  const absPath = path.join(evidenceRoot, file);
  await locator.screenshot({ path: absPath });
  captures.push({ file, title, description });
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function writeReport({ captures, summary }) {
  const cards = captures
    .map(
      (capture) => `
        <section class="card">
          <div class="meta">
            <h2>${htmlEscape(capture.title)}</h2>
            <p>${htmlEscape(capture.description)}</p>
          </div>
          <a href="${htmlEscape(capture.file)}" target="_blank">
            <img src="${htmlEscape(capture.file)}" alt="${htmlEscape(capture.title)}" />
          </a>
        </section>`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>V1.2-AC Chrome 可见截图验收报告</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #172033; }
    header { padding: 28px 36px; background: #111827; color: white; }
    header h1 { margin: 0 0 8px; font-size: 28px; }
    header p { margin: 0; color: #d1d5db; }
    main { padding: 24px 36px 48px; display: grid; gap: 18px; }
    .summary, .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
    .summary { padding: 18px 20px; }
    .summary pre { white-space: pre-wrap; background: #f3f4f6; padding: 12px; border-radius: 6px; overflow: auto; }
    .card { overflow: hidden; }
    .meta { padding: 16px 18px 10px; }
    .meta h2 { margin: 0 0 6px; font-size: 18px; }
    .meta p { margin: 0; color: #4b5563; line-height: 1.5; }
    img { display: block; width: 100%; border-top: 1px solid #e5e7eb; background: #fff; }
  </style>
</head>
<body>
  <header>
    <h1>V1.2-AC Chrome 可见截图验收报告</h1>
    <p>覆盖读取页面、Debug 状态、提交 Runtime、摘要、页面问答、Mindmap 与刷新恢复。</p>
  </header>
  <main>
    <section class="summary">
      <h2>自动化结论</h2>
      <pre>${htmlEscape(JSON.stringify(summary, null, 2))}</pre>
    </section>
    ${cards}
  </main>
</body>
</html>`;

  fs.writeFileSync(path.join(evidenceRoot, "index.html"), html);
}

async function main() {
  if (!fs.existsSync(path.join(extensionRoot, "manifest.json"))) {
    throw new Error(`Extension build not found: ${extensionRoot}`);
  }
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
  fs.mkdirSync(evidenceRoot, { recursive: true });

  let runtimeProcess = null;
  if (!(await isRuntimeOnline())) {
    runtimeProcess = startRuntime();
    if (!(await waitForRuntime())) throw new Error("Runtime did not become healthy on 127.0.0.1:17861.");
  }
  await configureRuntime();

  const { server, url: fixtureUrl } = await startFixtureServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-visual-chrome-profile-"));
  let context = null;
  const captures = [];

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      ...(browserMode === "chrome" ? { channel: "chrome" } : {}),
      headless: false,
      viewport: { width: 1360, height: 920 },
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
    await capture(
      fixturePage,
      "fixture-page",
      "真实网页标签页",
      "隔离浏览器中打开真实 HTML fixture，后续扩展会读取这个 active tab。",
      captures
    );

    const fixtureTabId = await findTabIdByUrl(serviceWorker, fixtureUrl);
    if (!fixtureTabId) throw new Error(`Fixture tab id was not found for ${fixtureUrl}.`);
    const sidePanel = await openDirectSidePanel(context, extensionId, fixtureTabId);
    await sidePanel.waitForLoadState("domcontentloaded");
    await sidePanel.getByRole("button", { name: "读取当前页面" }).waitFor({ timeout: 15000 });
    await capture(sidePanel, "chat-initial", "聊天页初始态", "Runtime online 后，聊天页显示读取页面、提交、总结、Mindmap 等主操作。", captures);

    await sidePanel.getByRole("button", { name: "读取当前页面" }).click();
    await switchView(sidePanel, "Debug");
    await sidePanel.getByText("capture_ready · Browser extension - derived article fixture").waitFor({ timeout: 15000 });
    await capture(sidePanel, "debug-after-read", "Debug：已读取页面", "Debug 页显示 Page 状态为 capture_ready，并展示已读取页面标题。", captures);

    await switchView(sidePanel, "聊天");
    await sidePanel.getByRole("button", { name: "提交上下文" }).click();
    await switchView(sidePanel, "Debug");
    await sidePanel.getByText("captured · Browser extension - derived article fixture").waitFor({ timeout: 15000 });
    await sidePanel.getByText("已提交：").waitFor({ timeout: 15000 });
    await capture(sidePanel, "debug-after-submit", "Debug：已提交 Runtime", "Runtime session 已创建，页面上下文进入 captured 状态。", captures);

    await switchView(sidePanel, "聊天");
    await sidePanel.getByRole("button", { name: "总结" }).click();
    await sidePanel.getByText("关键要点").first().waitFor({ timeout: 20000 });
    await capture(sidePanel, "summary", "聊天：网页摘要", "点击总结后，Runtime 通过阅读工具返回包含关键要点的摘要。", captures);

    await sidePanel.locator("textarea").fill("这个页面的核心目标是什么？");
    await sidePanel.getByRole("button", { name: "发送" }).click();
    await sidePanel.getByText("基于当前页面").first().waitFor({ timeout: 20000 });
    await capture(sidePanel, "page-question", "聊天：基于当前页面问答", "用户提问后，回答明确基于当前页面内容生成。", captures);

    await sidePanel.getByRole("button", { name: "Mindmap" }).click();
    const mindmapArtifact = sidePanel.locator(".mermaid-render, .mermaid-fallback").first();
    await mindmapArtifact.waitFor({ timeout: 20000 });
    await captureLocator(
      mindmapArtifact,
      "mindmap-artifact",
      "聊天：Mindmap 渲染",
      "C 模块生成 Mermaid mindmap，B 侧完成可见渲染；此截图直接截取 Mindmap artifact 区域。",
      captures
    );

    await sidePanel.reload();
    await sidePanel.getByRole("button", { name: "读取当前页面" }).waitFor({ timeout: 15000 });
    await switchView(sidePanel, "Debug");
    await sidePanel.getByText("captured · Browser extension - derived article fixture").waitFor({ timeout: 20000 });
    await capture(sidePanel, "refresh-recovery", "刷新恢复", "刷新扩展页后，session 与 activePage 状态可恢复。", captures);

    const summary = {
      status: "passed",
      browserMode,
      sidePanelMode: "direct_extension_page",
      runtimeUrl,
      fixtureUrl,
      extensionId,
      report: path.join(evidenceRoot, "index.html"),
      screenshots: captures.map((capture) => capture.file),
      checks: ["fixture tab", "chat initial", "read page", "submit runtime", "summary", "page question", "mindmap", "refresh recovery"]
    };
    fs.writeFileSync(path.join(evidenceRoot, "result.json"), JSON.stringify(summary, null, 2));
    writeReport({ captures, summary });
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
