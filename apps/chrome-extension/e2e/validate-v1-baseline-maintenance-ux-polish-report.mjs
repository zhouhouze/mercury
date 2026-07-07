import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_baseline_maintenance_ux_polish");
const reportPath = path.join(evidenceRoot, "report.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function main() {
  const issues = [];
  if (!fs.existsSync(reportPath)) issues.push("report.json is missing.");
  const report = fs.existsSync(reportPath) ? readJson(reportPath) : {};
  if (!report.passed) issues.push("report.passed is not true.");
  if (report.claim !== "V1.0.x baseline maintenance and scoped UX polish passed regression acceptance.") {
    issues.push("claim is not the allowed BM/UX completion claim.");
  }
  if (report.frozenBaselineReference !== "docs/active/project/evidence/v1_post_v1_hardening") {
    issues.push("frozen baseline reference is missing or incorrect.");
  }
  if (report.summary?.buildPassed !== true) issues.push("summary.buildPassed must be true.");
  if (report.summary?.postV1ValidatorPassed !== true) issues.push("summary.postV1ValidatorPassed must be true.");
  if (report.summary?.runtimeHealthStatus !== "ok") issues.push("summary.runtimeHealthStatus must be ok.");
  if (report.summary?.sensitiveInfoScanPassed !== true) issues.push("summary.sensitiveInfoScanPassed must be true.");
  const requiredCommands = [
    "npm --prefix apps/chrome-extension run build",
    "npm --prefix apps/chrome-extension run validate:post-v1-hardening",
    "curl --noproxy '*' -sS http://127.0.0.1:17861/v1/health",
    "BM/UX evidence sensitive information scan",
    "git diff --check"
  ];
  for (const command of requiredCommands) {
    const entry = Array.isArray(report.testCommands) ? report.testCommands.find((item) => item.command === command) : null;
    if (!entry) issues.push(`test command missing: ${command}`);
    else if (entry.passed !== true) issues.push(`test command failed: ${command}`);
  }
  if (!Array.isArray(report.prototypeMappings) || report.prototypeMappings.length < 9) {
    issues.push("prototypeMappings must cover at least 9 target paths.");
  }
  for (const mapping of report.prototypeMappings || []) {
    if (mapping.status === "missing") issues.push(`prototype mapping missing: ${mapping.target}`);
    if (mapping.screenshotPath && !fs.existsSync(path.join(evidenceRoot, mapping.screenshotPath))) {
      issues.push(`prototype mapping screenshot missing: ${mapping.screenshotPath}`);
    }
  }
  if (!Array.isArray(report.screenshots) || report.screenshots.length < 6) {
    issues.push("screenshot samples must be at least 6.");
  }
  for (const shot of report.screenshots || []) {
    if (!fs.existsSync(path.join(evidenceRoot, shot.path))) issues.push(`screenshot missing: ${shot.path}`);
  }
  for (const file of ["acceptance-report.html", "prd-review.md", "false-green-audit.md", "human-spot-check.md", "evidence-manifest.json"]) {
    if (!fs.existsSync(path.join(evidenceRoot, file))) issues.push(`${file} is missing.`);
  }
  const html = fs.existsSync(path.join(evidenceRoot, "acceptance-report.html"))
    ? fs.readFileSync(path.join(evidenceRoot, "acceptance-report.html"), "utf-8")
    : "";
  for (const term of ["目标架构与当前实现", "Prototype Review 到真实截图映射", "PRD / False-Green 边界", "Monica-like"]) {
    if (!html.includes(term)) issues.push(`acceptance-report.html missing: ${term}`);
  }
  if (issues.length) {
    console.error(JSON.stringify({ passed: false, issues }, null, 2));
    process.exit(2);
  }
  console.log(JSON.stringify({ passed: true, screenshots: report.screenshots.length, mappings: report.prototypeMappings.length }, null, 2));
}

main();
