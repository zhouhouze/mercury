import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = "docs/active/project/evidence/v2_memory_personal_knowledge_base";

const requiredFiles = [
  "docs/active/project/contracts/v2_memory_contracts.schema.json",
  "docs/active/project/contracts/v2_knowledge_status.schema.json",
  "docs/active/project/contracts/v2_knowledge_api.openapi.yaml",
  "docs/active/project/contracts/v2_knowledge_error_codes.md",
  "docs/active/project/contracts/v2_memory_sample_manifest.schema.json",
  "docs/active/project/contracts/v2_memory_report.schema.json",
  "docs/active/project/design/v2-memory-personal-knowledge-semantic-validator.md",
  "docs/active/project/design/v2-memory-personal-knowledge-lifecycle-adr.md",
  "docs/active/project/design/v2-data-service-adapter-spike-report.md",
  "docs/active/project/design/v2-memory-personal-knowledge-base-gap.drawio",
  "docs/active/project/design/v2-memory-personal-knowledge-prototype-review/index.html",
  "docs/active/project/stage-gates/v2-memory-personal-knowledge-base.md",
  `${evidenceRoot}/sample-manifest.json`,
  `${evidenceRoot}/run-results.json`,
  `${evidenceRoot}/report.json`,
  `${evidenceRoot}/acceptance-report.html`,
  `${evidenceRoot}/prd-review.md`,
  `${evidenceRoot}/false-green-audit.md`
];

const schemaFiles = [
  "docs/active/project/contracts/v2_memory_contracts.schema.json",
  "docs/active/project/contracts/v2_knowledge_status.schema.json",
  "docs/active/project/contracts/v2_memory_sample_manifest.schema.json",
  "docs/active/project/contracts/v2_memory_report.schema.json"
];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(repoPath(relativePath), "utf-8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function runPython(script) {
  const result = spawnSync("python3", ["-c", script], { cwd: repoRoot, encoding: "utf-8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}

function validateSchemaFile(relativePath) {
  const script = [
    "import json, pathlib, jsonschema",
    `schema=json.loads(pathlib.Path(${JSON.stringify(repoPath(relativePath))}).read_text(encoding='utf-8'))`,
    "jsonschema.Draft202012Validator.check_schema(schema)"
  ].join("\n");
  runPython(script);
}

function validateJsonAgainstSchema(jsonPath, schemaPath) {
  const script = [
    "import json, pathlib, jsonschema",
    `schema=json.loads(pathlib.Path(${JSON.stringify(repoPath(schemaPath))}).read_text(encoding='utf-8'))`,
    `data=json.loads(pathlib.Path(${JSON.stringify(repoPath(jsonPath))}).read_text(encoding='utf-8'))`,
    "jsonschema.Draft202012Validator(schema).validate(data)"
  ].join("\n");
  runPython(script);
}

function requireIncludes(issues, relativePath, terms) {
  const text = read(relativePath);
  for (const term of terms) {
    if (!text.includes(term)) issues.push(`${relativePath} missing required term: ${term}`);
  }
}

function validateDocs(issues) {
  requireIncludes(issues, "docs/active/project/contracts/v2_knowledge_api.openapi.yaml", [
    "openapi: 3.1.0",
    "/v1/knowledge/status:",
    "operationId: saveKnowledgeSource",
    "operationId: forgetKnowledgeSource",
    "Idempotency-Key"
  ]);

  requireIncludes(issues, "docs/active/project/design/v2-data-service-adapter-spike-report.md", [
    "MockKnowledgeServiceAdapter",
    "data_service",
    "No-Go"
  ]);

  requireIncludes(issues, "docs/active/project/design/v2-memory-personal-knowledge-prototype-review/index.html", [
    "ServiceStatusBanner",
    "DataServiceStatusCard",
    "KnowledgeBuildStatus",
    "queued",
    "ingesting",
    "building",
    "trace_ready"
  ]);

  const prototype = read("docs/active/project/design/v2-memory-personal-knowledge-prototype-review/index.html");
  for (const stale of ["build_pending", "继续：构建", "继续：生成", "当前还没有完整 active stage gate"]) {
    if (prototype.includes(stale)) issues.push(`prototype contains stale term: ${stale}`);
  }

  const drawio = read("docs/active/project/design/v2-memory-personal-knowledge-base-gap.drawio");
  const pageCount = (drawio.match(/<diagram\b/g) || []).length;
  if (pageCount !== 8) issues.push(`drawio page count must be 8, got ${pageCount}`);
  for (const term of [
    "data_service",
    "ServiceStatusBanner",
    "KnowledgeBuildStatus",
    "V2 Adapter",
    "V2-7",
    "No-Go"
  ]) {
    if (!drawio.includes(term)) issues.push(`drawio missing required term: ${term}`);
  }

  for (const file of [
    "docs/active/project/01-prd.md",
    "docs/active/project/02-architecture.md",
    "docs/active/project/03-development-plan.md",
    "docs/active/project/04-acceptance-plan.md",
    "docs/active/project/stage-gates/v2-memory-personal-knowledge-base.md"
  ]) {
    requireIncludes(issues, file, [
      "V2 Memory / Personal Knowledge Base passed planning-aligned local knowledge acceptance.",
      "No-Go for V2 ready / RAG ready claims",
      "data_service",
      "semantic validator"
    ]);
  }
}

function validateEvidence(issues) {
  validateJsonAgainstSchema(`${evidenceRoot}/sample-manifest.json`, "docs/active/project/contracts/v2_memory_sample_manifest.schema.json");
  validateJsonAgainstSchema(`${evidenceRoot}/report.json`, "docs/active/project/contracts/v2_memory_report.schema.json");

  const manifest = readJson(`${evidenceRoot}/sample-manifest.json`);
  const report = readJson(`${evidenceRoot}/report.json`);
  const html = read(`${evidenceRoot}/acceptance-report.html`);

  if (report.passed !== true) issues.push("report.passed must be true");
  if (report.fatalIssues.length !== 0) issues.push("fatalIssues must be empty");
  if (report.majorIssues.length !== 0) issues.push("majorIssues must be empty");
  if (manifest.sourceCorpus.length !== report.summary.totalSources) {
    issues.push(`manifest/report source count mismatch: ${manifest.sourceCorpus.length} vs ${report.summary.totalSources}`);
  }

  const sourceById = new Map(manifest.sourceCorpus.map((source) => [source.sampleId, source]));
  for (const result of report.sourceResults) {
    if (!sourceById.has(result.sampleId)) issues.push(`report sourceResult missing from manifest: ${result.sampleId}`);
    if (!result.screenshotPaths?.length) issues.push(`sourceResult missing screenshot: ${result.sampleId}`);
    for (const screenshot of result.screenshotPaths || []) {
      if (!fs.existsSync(repoPath(screenshot))) issues.push(`source screenshot path does not exist: ${screenshot}`);
    }
  }

  const scenarioById = new Map(manifest.operationScenarios.map((scenario) => [scenario.scenarioId, scenario]));
  for (const result of report.scenarioResults) {
    if (!scenarioById.has(result.scenarioId)) issues.push(`report scenarioResult missing from manifest: ${result.scenarioId}`);
    if (result.passed !== true) issues.push(`scenario did not pass: ${result.scenarioId}`);
    if (result.operator !== "gte") issues.push(`scenario operator must be gte for this report: ${result.scenarioId}`);
    if (result.numerator < result.threshold) issues.push(`scenario threshold failed: ${result.scenarioId}`);
    for (const evidence of result.evidencePaths || []) {
      if (!fs.existsSync(repoPath(evidence))) issues.push(`scenario evidence path does not exist: ${evidence}`);
    }
  }

  const summaryGates = [
    ["totalSources", 24],
    ["webPageSources", 12],
    ["authorizedLocalDocumentSources", 6],
    ["noteOrOtherSources", 6],
    ["sourcePasses", 20],
    ["queryScenarios", 18],
    ["serviceStatusScenarios", 4],
    ["forgetScenarios", 6]
  ];
  for (const [field, threshold] of summaryGates) {
    if (report.summary[field] < threshold) issues.push(`summary.${field} ${report.summary[field]} < ${threshold}`);
  }

  const serviceStatuses = manifest.operationScenarios
    .filter((scenario) => scenario.scenarioType === "service_status")
    .map((scenario) => String(scenario.expectedStatus || ""));
  const serviceStatusGates = [
    ["runtime_offline", (status) => status.includes("runtime_offline")],
    ["adapter blocked/degraded", (status) => status.includes("adapter_blocked") || status.includes("adapter_degraded")],
    ["data_service unavailable/auth/version", (status) =>
      status.includes("data_service_unreachable") ||
      status.includes("data_service_auth_required") ||
      status.includes("data_service_version_mismatch")],
    ["source build failed/degraded", (status) => status.includes("source_build_failed") || status.includes("source_build_degraded")]
  ];
  for (const [label, predicate] of serviceStatusGates) {
    if (!serviceStatuses.some(predicate)) issues.push(`service_status coverage missing: ${label}`);
  }

  for (const term of [
    "目标架构与当前实现",
    "V2-7",
    "截图证据",
    "PRD / False-Green",
    "不声明 V2 implemented"
  ]) {
    if (!html.includes(term)) issues.push(`acceptance-report.html missing required term: ${term}`);
  }
}

function main() {
  const issues = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(repoPath(file))) issues.push(`required file missing: ${file}`);
  }
  const screenshotDir = repoPath(`${evidenceRoot}/screenshots`);
  if (!fs.existsSync(screenshotDir)) issues.push("screenshots directory missing");

  if (issues.length) {
    console.error(JSON.stringify({ passed: false, stage: "v2-7-real-data-acceptance", issues }, null, 2));
    process.exit(2);
  }

  try {
    for (const file of schemaFiles) validateSchemaFile(file);
    validateDocs(issues);
    validateEvidence(issues);
  } catch (error) {
    issues.push(error.message);
  }

  if (issues.length) {
    console.error(JSON.stringify({ passed: false, stage: "v2-7-real-data-acceptance", issues }, null, 2));
    process.exit(2);
  }

  console.log(JSON.stringify({
    passed: true,
    stage: "v2-7-real-data-acceptance",
    claim: "V2 Memory / Personal Knowledge Base passed planning-aligned local knowledge acceptance.",
    evidenceRoot
  }, null, 2));
}

main();
