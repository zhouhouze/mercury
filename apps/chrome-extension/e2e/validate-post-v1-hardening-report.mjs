import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRootRelative = "docs/active/project/evidence/v1_post_v1_hardening";
const evidenceRoot = path.join(repoRoot, evidenceRootRelative);
const manifestPath = path.join(evidenceRoot, "sample-manifest.json");
const reportPath = path.join(evidenceRoot, "report.json");
const drawioPath = path.join(repoRoot, "docs/active/project/design/v1-post-v1-hardening-gap.drawio");
const manifestSchema = path.join(repoRoot, "docs/active/project/contracts/v1_post_v1_hardening_sample_manifest.schema.json");
const reportSchema = path.join(repoRoot, "docs/active/project/contracts/v1_post_v1_hardening_report.schema.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function validateSchema(instancePath, schemaPath) {
  const code = [
    "import json, pathlib, jsonschema",
    `instance=json.loads(pathlib.Path(${JSON.stringify(instancePath)}).read_text(encoding='utf-8'))`,
    `schema=json.loads(pathlib.Path(${JSON.stringify(schemaPath)}).read_text(encoding='utf-8'))`,
    "jsonschema.Draft202012Validator.check_schema(schema)",
    "jsonschema.Draft202012Validator(schema).validate(instance)"
  ].join("\n");
  const result = spawnSync("python3", ["-c", code], { cwd: repoRoot, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`schema validation failed for ${instancePath}: ${result.stderr || result.stdout}`);
  }
}

function metricPassed(metric) {
  if (!metric || typeof metric !== "object") return false;
  if (metric.operator === "lte") return Number(metric.value) <= Number(metric.threshold) && metric.passed === true;
  if (metric.operator === "eq") return metric.value === metric.threshold && metric.passed === true;
  return Number(metric.value) >= Number(metric.threshold) && metric.passed === true;
}

function main() {
  const issues = [];
  validateSchema(manifestPath, manifestSchema);
  validateSchema(reportPath, reportSchema);
  const manifest = readJson(manifestPath);
  const report = readJson(reportPath);
  const acceptance = manifest.samples.filter((sample) => sample.acceptanceSubset);
  if (!report.passed) issues.push("report.passed is not true");
  if (manifest.candidateMatrixSize !== manifest.samples.length) issues.push("manifest candidateMatrixSize does not match samples.length");
  if (report.candidateMatrixSize !== manifest.candidateMatrixSize) issues.push("report candidateMatrixSize does not match manifest");
  if (report.acceptanceSubsetSize !== acceptance.length) issues.push("report acceptanceSubsetSize does not match manifest acceptance subset");
  if (manifest.candidateMatrixSize < 100) issues.push("candidateMatrixSize < 100");
  if (acceptance.length < 36) issues.push("acceptance subset < 36");
  if (new Set(acceptance.map((sample) => sample.category)).size < 6) issues.push("acceptance subset covers fewer than 6 categories");
  if (report.samples.length !== acceptance.length) issues.push("report samples length does not match acceptance subset");
  if (report.samples.some((sample) => !sample.passed)) issues.push("one or more report samples are not passed");
  if (report.fatalIssues.length || report.majorIssues.length) issues.push("fatalIssues or majorIssues are not empty");
  if (report.freshFallbackSamples < 3 && !report.fallbackPolicy.exceptionUsed) issues.push("freshFallbackSamples < 3 without fallbackPolicy exception");
  if (report.freshFallbackSamples >= 3 && !report.fallbackPolicy.passed) issues.push("fallbackPolicy should pass when freshFallbackSamples >= 3");
  if (!Array.isArray(report.fallbackEvidenceSamples) || report.fallbackEvidenceSamples.length < report.freshFallbackSamples) {
    issues.push("fallbackEvidenceSamples missing or fewer than freshFallbackSamples");
  }
  const fallbackShownCount = (report.fallbackEvidenceSamples || []).filter((sample) => sample.status === "fallback_shown").length;
  if (fallbackShownCount !== report.freshFallbackSamples) issues.push("fallbackEvidenceSamples fallback_shown count does not match freshFallbackSamples");
  for (const sample of report.fallbackEvidenceSamples || []) {
    if (!sample.screenshotPaths?.length) issues.push(`fallback evidence sample missing screenshots: ${sample.sampleId}`);
    if (!sample.replacementSampleIds?.length) issues.push(`fallback evidence sample missing replacementSampleIds: ${sample.sampleId}`);
  }
  const expectedMetrics = [
    report.jumpbackQualityMetrics.jumpbackLocatedSemanticMatchRate,
    report.jumpbackQualityMetrics.freshFallbackSamples,
    report.jumpbackQualityMetrics.blockedReasonCompletenessRate,
    report.mindmapQualityMetrics.mindmapTopNodeNoiseRate,
    report.mindmapQualityMetrics.mindmapDuplicateTopNodeRate,
    report.mindmapQualityMetrics.mindmapOverlongTopNodeRate,
    report.sidebarVisualMetrics.sidebarVisualPassRate
  ];
  if (expectedMetrics.some((item) => !metricPassed(item))) issues.push("one or more metric operator checks failed");
  for (const distribution of report.sampleDistribution) {
    const manifestCount = manifest.samples.filter((sample) => sample.category === distribution.category).length;
    const acceptanceCount = acceptance.filter((sample) => sample.category === distribution.category).length;
    const reportCount = report.samples.filter((sample) => sample.category === distribution.category).length;
    if (distribution.candidateSamples !== manifestCount) issues.push(`candidate count mismatch for ${distribution.category}`);
    if (distribution.acceptanceSamples !== acceptanceCount || reportCount !== acceptanceCount) issues.push(`acceptance count mismatch for ${distribution.category}`);
  }
  const html = fs.readFileSync(path.join(evidenceRoot, "acceptance-report.html"), "utf-8");
  if (!html.includes(report.claim)) issues.push("acceptance-report.html does not include claim");
  const requiredHtmlSections = [
    "阶段性审计结论",
    "目标架构与当前实现",
    "出门条件达成检查",
    "PRD / Stage Gate 映射",
    "证据文件清单",
    "配套审计摘要",
    "真实性边界与剩余风险",
    "关键指标",
    "样本分布",
    "测试命令",
    "验收样本",
    "Fresh Fallback / Blocked 证据样本",
    "Fallback / Blocked 截图证据",
    "截图证据抽样",
    "全部截图索引",
    "配套审计"
  ];
  for (const section of requiredHtmlSections) {
    if (!html.includes(section)) issues.push(`acceptance-report.html missing required human-audit section: ${section}`);
  }
  if ((html.match(/<img /g) || []).length < 20) issues.push("acceptance-report.html has fewer than 20 inline screenshot images");
  if ((html.match(/screenshots\//g) || []).length < report.screenshots.length) issues.push("acceptance-report.html does not link all report screenshots");
  for (const screenshot of report.screenshots) {
    if (!fs.existsSync(path.join(evidenceRoot, screenshot.path))) issues.push(`missing screenshot: ${screenshot.path}`);
  }
  for (const sample of report.fallbackEvidenceSamples || []) {
    for (const screenshot of sample.screenshotPaths || []) {
      if (!fs.existsSync(path.join(evidenceRoot, screenshot))) issues.push(`missing fallback screenshot: ${screenshot}`);
    }
  }
  const commands = new Set(report.testCommands.map((item) => item.command));
  if (!commands.has("npm --prefix apps/chrome-extension run validate:post-v1-hardening")) issues.push("testCommands missing validate:post-v1-hardening");
  if (!commands.has("node apps/chrome-extension/e2e/generate-v1-post-v1-hardening-report.mjs")) issues.push("testCommands missing post-v1 report generator");
  const drawio = fs.readFileSync(drawioPath, "utf-8");
  const drawioPages = [...drawio.matchAll(/<diagram[^>]*name="/g)].length;
  if (drawioPages !== 8) issues.push(`drawio page count should be 8, got ${drawioPages}`);
  const requiredDrawioTerms = [
    "pageContext.ts",
    "contentBridge.ts",
    "runtimeClient.ts",
    "chat_renderer",
    "mindmap_renderer",
    "A Page Reading",
    "C Mindmap",
    "D Adapter",
    "post-V1 evidence",
    "100+",
    "36+",
    "Source Jumpback",
    "located",
    "fallback_shown",
    "blocked",
    "semantic validator",
    "sample-manifest.json",
    "report.json",
    "No-Go",
    "Monica-like"
  ];
  for (const term of requiredDrawioTerms) {
    if (!drawio.includes(term)) issues.push(`drawio missing required term: ${term}`);
  }
  if (issues.length) {
    console.error(JSON.stringify({ passed: false, issues }, null, 2));
    process.exit(2);
  }
  console.log(JSON.stringify({ passed: true, samples: report.samples.length, candidateMatrixSize: report.candidateMatrixSize, freshFallbackSamples: report.freshFallbackSamples }, null, 2));
}

main();
