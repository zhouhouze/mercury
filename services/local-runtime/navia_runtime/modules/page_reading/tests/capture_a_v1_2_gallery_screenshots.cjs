const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const scriptDir = __dirname;
const evidenceDir = path.join(scriptDir, "evidence", "a_v1_2");
const root = path.resolve(scriptDir, "../../../../../..");
const screenshotDir = path.join(root, "docs", "navia_v1_project_docs", "evidence", "a_v1_2_acceptance", "screenshots", "all");
const manifestPath = path.join(evidenceDir, "corpus-manifest.json");
const reportPath = path.join(root, "docs", "navia_v1_project_docs", "evidence", "a_v1_2_acceptance", "a-v1.2-screenshot-capture-report.json");

function resolvePlaywright() {
  const npxRoot = path.join(os.homedir(), ".npm", "_npx");
  for (const entry of fs.readdirSync(npxRoot)) {
    const candidate = path.join(npxRoot, entry, "node_modules", "playwright");
    if (fs.existsSync(candidate)) {
      return require(candidate);
    }
  }
  throw new Error("Cannot locate playwright in ~/.npm/_npx. Run `npx playwright --version` first.");
}

const { chromium } = resolvePlaywright();
fs.mkdirSync(screenshotDir, { recursive: true });

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("file:") || url.startsWith("data:")) {
      await route.continue();
      return;
    }
    await route.abort();
  });
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(12000);
  const captured = [];
  const failed = [];

  for (const item of manifest.pages) {
    const pageKey = item.pageKey;
    const snapshotPath = path.resolve(evidenceDir, item.snapshotPath);
    const outputPath = path.join(screenshotDir, `${pageKey}.png`);
    try {
      await page.goto(pathToFileURL(snapshotPath).href, { waitUntil: "domcontentloaded", timeout: 12000 });
      await page.waitForTimeout(100);
      await page.addStyleTag({
        content: "* { font-family: Arial, Helvetica, sans-serif !important; }",
      });
      await page.screenshot({ path: outputPath, fullPage: false });
      const stat = fs.statSync(outputPath);
      captured.push({ pageKey, screenshotPath: outputPath, bytes: stat.size });
    } catch (error) {
      failed.push({ pageKey, snapshotPath, error: String(error) });
    }
  }

  await browser.close();
  captured.sort((a, b) => a.pageKey.localeCompare(b.pageKey));
  failed.sort((a, b) => a.pageKey.localeCompare(b.pageKey));
  const report = {
    schemaVersion: "a-v1.2-gallery-screenshot-capture-2026-06-09",
    requested: manifest.pages.length,
    captured: captured.length,
    failed: failed.length,
    capturedPages: captured,
    failures: failed,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(reportPath);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
