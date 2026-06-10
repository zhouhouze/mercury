const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const scriptDir = __dirname;
const root = path.resolve(scriptDir, "../../../../../..");
const outputDir = path.join(root, "docs", "navia_v1_project_docs", "evidence", "a_v1_2_acceptance", "chinese-visual");
const screenshotDir = path.join(outputDir, "screenshots");
const snapshotDir = path.join(outputDir, "snapshots");
const manifestPath = path.join(outputDir, "chinese-visual-manifest.json");
const reportPath = path.join(outputDir, "chinese-visual-capture-report.json");

const pages = [
  {
    pageKey: "cn_bilibili_home",
    label: "B站首页",
    url: "https://www.bilibili.com/",
    category: "bilibili_home",
    requirement: "必须覆盖：B站首页、复杂中文视频社区布局",
  },
  {
    pageKey: "cn_bilibili_video",
    label: "B站视频页",
    url: "https://www.bilibili.com/video/BV1jz7y6KESY",
    category: "bilibili_video",
    requirement: "必须覆盖：B站视频页面、播放器/评论/推荐复杂布局；优先从 B站首页点击真实视频卡片进入",
  },
  {
    pageKey: "cn_36kr_home",
    label: "36氪首页",
    url: "https://36kr.com/",
    category: "chinese_news_graphic",
    requirement: "中文商业资讯、图文卡片、复杂信息流",
  },
  {
    pageKey: "cn_huxiu_home",
    label: "虎嗅首页",
    url: "https://www.huxiu.com/",
    category: "chinese_news_graphic",
    requirement: "中文图文资讯、栏目与推荐流",
  },
  {
    pageKey: "cn_ifanr_home",
    label: "爱范儿首页",
    url: "https://www.ifanr.com/",
    category: "chinese_news_graphic",
    requirement: "中文科技媒体、图文混排",
  },
  {
    pageKey: "cn_geekpark_home",
    label: "极客公园首页",
    url: "https://www.geekpark.net/",
    category: "chinese_news_graphic",
    requirement: "中文科技媒体、复杂首页布局",
  },
  {
    pageKey: "cn_juejin_home",
    label: "掘金首页",
    url: "https://juejin.cn/",
    category: "chinese_tech_community",
    requirement: "中文技术社区、信息流布局",
  },
  {
    pageKey: "cn_ruanyifeng_blog",
    label: "阮一峰博客首页",
    url: "https://www.ruanyifeng.com/blog/",
    category: "chinese_blog",
    requirement: "中文长文博客、文本密度高",
  },
];

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
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(snapshotDir, { recursive: true });

async function main() {
  const headed = process.argv.includes("--headed");
  const launchOptions = headed ? { headless: false } : { headless: true };
  const browser = await chromium.launch(launchOptions);
  const captured = [];
  const failed = [];

  for (const item of pages) {
    const screenshotPath = path.join(screenshotDir, `${item.pageKey}.png`);
    const snapshotPath = path.join(snapshotDir, `${item.pageKey}.html`);
    for (const stalePath of [screenshotPath, snapshotPath]) {
      if (fs.existsSync(stalePath)) {
        fs.unlinkSync(stalePath);
      }
    }
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 NaviaA-V1.2VisualAcceptance/1.0",
      locale: "zh-CN",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    try {
      if (item.pageKey === "cn_bilibili_video") {
        await page.goto("https://www.bilibili.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(5000);
        const homeVideoUrl = await page
          .locator('a[href*="/video/BV"]')
          .evaluateAll((links) => {
            for (const link of links) {
              const href = link.href || link.getAttribute("href") || "";
              if (href.includes("/video/BV")) {
                return href.split("?")[0];
              }
            }
            return "";
          })
          .catch(() => "");
        await page.goto(homeVideoUrl || item.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      } else {
        await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      }
      await page.waitForTimeout(item.pageKey.includes("bilibili") ? 5000 : 2500);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const renderedHtml = await page.content();
      fs.writeFileSync(
        snapshotPath,
        `<!-- captured_url: ${item.url} -->\n<!-- visual_acceptance_page_key: ${item.pageKey} -->\n${renderedHtml}\n`,
        "utf8",
      );
      const title = await page.title();
      const textLength = await page.locator("body").innerText({ timeout: 3000 }).then((text) => text.length).catch(() => 0);
      captured.push({
        ...item,
        title,
        textLength,
        screenshotPath: path.relative(outputDir, screenshotPath),
        snapshotPath: path.relative(outputDir, snapshotPath),
        screenshotBytes: fs.statSync(screenshotPath).size,
        snapshotBytes: fs.statSync(snapshotPath).size,
        status: "captured",
      });
    } catch (error) {
      failed.push({ ...item, status: "failed", error: String(error) });
    } finally {
      await context.close().catch(() => {});
    }
  }

  await browser.close();
  const manifest = {
    schemaVersion: "a-v1.2-chinese-visual-manifest-2026-06-09",
    purpose: "Chinese complex visual acceptance supplement. It does not replace the reproducible 107-page A corpus gate.",
    pages: [...captured, ...failed],
  };
  const report = {
    schemaVersion: "a-v1.2-chinese-visual-capture-report-2026-06-09",
    requested: pages.length,
    captured: captured.length,
    failed: failed.length,
    mustHaveBilibiliHome: captured.some((item) => item.pageKey === "cn_bilibili_home"),
    mustHaveBilibiliVideo: captured.some((item) => item.pageKey === "cn_bilibili_video"),
    mustHaveBilibiliHomeVisual: captured.some((item) => item.pageKey === "cn_bilibili_home" && item.screenshotBytes >= 50000 && item.textLength >= 500),
    mustHaveBilibiliVideoVisual: captured.some((item) => item.pageKey === "cn_bilibili_video" && item.screenshotBytes >= 50000 && item.textLength >= 500),
    capturedPages: captured,
    failures: failed,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(reportPath);
  if (!report.mustHaveBilibiliHomeVisual || !report.mustHaveBilibiliVideoVisual || captured.length < 4) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
