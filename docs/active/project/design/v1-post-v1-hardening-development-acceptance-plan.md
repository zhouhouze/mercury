# V1.0.x Post-V1 Hardening 开发及验收计划

状态：文档基线

日期：2026-07-03

## 1. 阶段目标

本阶段为 V1 complete 之后的下一轮质量硬化准备完整开发和验收口径。它只聚焦 source jumpback 精度、Mindmap / Reading Map 质量、窄侧栏 UX 和真实网页回归证据。

目标体验：

```text
用户打开普通网页或复杂真实网页
-> Navia 读取当前页
-> Summary / Q&A / Mindmap 优先表达主内容
-> Source card 解释自己支撑的节点或答案
-> Jumpback 准确落到证据位置，或清晰展示 fallback / blocked
-> 窄侧栏保持可读
-> 自动化报告展示质量指标、截图证据和 false-green 边界
```

## 2. 开发计划

| 子阶段 | 开发意图 | 必须交付 |
|---|---|---|
| `V1.0.x-H-0` | 文档门禁 | PRD、架构、开发计划、验收计划、stage gate、gap companion、drawio、schema、readiness audit |
| `V1.0.x-H-1` | 真实网页矩阵和证据包形状 | 100+ candidate、36+ acceptance subset、类别规则、替代规则、登录边界、低信号规则 |
| `V1.0.x-H-2` | Source jumpback 选择和解释 | source card order、selected source reason、located marker、fallback reason、blocked reason |
| `V1.0.x-H-3` | Mindmap 质量 | 语义顶层节点、短标签、去重、噪声过滤、nodeSourceMap 质量 |
| `V1.0.x-H-4` | B Renderer UX | 窄侧栏截图、source card 解释、状态卡层级、无虚影 / 截断 / 遮挡 |
| `V1.0.x-H-5` | 自动化验收包 | HTML 报告、截图、`report.json`、PRD review、false-green audit、schema validation |
| `V1.0.x-H-6` | 出门审计 | 无 fatal / major；仅允许 post-V1 hardening 声明 |

## 3. 验收计划

未来实现必须验证：

- V1 complete 证据仍为基线，不被重写为 post-V1 hardening 证据。
- 独立 `v1_post_v1_hardening` evidence package 存在。
- `sample-manifest.json` 通过 `v1_post_v1_hardening_sample_manifest.schema.json`。
- `report.json` 通过 `v1_post_v1_hardening_report.schema.json`。
- semantic validator 通过，用于校验 schema 无法表达的跨字段关系：`passed=true`、样本分布、截图证据、metric 阈值方向、fresh fallback / blocked replacement 和 located / fallback / blocked 一致性。
- semantic validator 固定命令为 `npm --prefix apps/chrome-extension run validate:post-v1-hardening`；实现时可由该 npm script 调用 `node apps/chrome-extension/e2e/validate-post-v1-hardening-report.mjs`。
- `report.json` 必须结构化记录 `sampleDistribution` 和 `fallbackPolicy`，其中 `fallbackPolicy` 必须解释 `freshFallbackSamples < 3` 时的 blocked replacement 原因。
- Source jumpback 有 fresh `located`、`fallback_shown`、`blocked` 样本，或记录 replacement / blocked reason。
- Source marker 解释被点击 source card 或节点与 DOM 高亮之间的关系。
- Mindmap 高层节点短、语义明确、非重复，并绑定证据或明确 degraded。
- Mindmap 顶层节点不得由导航、推荐、广告、版权提示、登录提示、时间戳、图片序号或重复卡片主导。
- 窄侧栏截图显示 Chat、Mindmap、source evidence、状态卡和输入区可读。
- HTML 报告可作为人工审查入口，包含架构、实现状态、截图、逐页结果、质量指标和 No-Go。

## 4. 最低指标

| 指标 | 方向 | 门槛 |
|---|---|---|
| `candidateMatrixSize` | `gte` | `100` |
| `acceptanceSubsetSize` | `gte` | `36` |
| `jumpbackLocatedSemanticMatchRate` | `gte` | `0.9` |
| `freshFallbackSamples` | `gte` | `3`，除非样本被 blocked 且替代路径已记录 |
| `blockedReasonCompletenessRate` | `eq` | `1.0` |
| `mindmapTopNodeNoiseRate` | `lte` | `0.08` |
| `mindmapDuplicateTopNodeRate` | `lte` | `0.05` |
| `mindmapOverlongTopNodeRate` | `lte` | `0.12` |
| `sidebarVisualPassRate` | `gte` | `0.95` |

## 5. Report 要求

未来 `report.json` 必须记录：

- `claim`
- `passed`
- `generatedAt`
- `candidateMatrixSize`
- `acceptanceSubsetSize`
- `locatedSamples`
- `freshFallbackSamples`
- `blockedSamples`
- `degradedSamples`
- `jumpbackQualityMetrics`
- `mindmapQualityMetrics`
- `sidebarVisualMetrics`
- `samples`
- `screenshots`
- `testCommands`
- `prdReview`
- `falseGreenAudit`
- `humanReviewChecklist`
- `fatalIssues`
- `majorIssues`

## 6. 允许声明

```text
V1.0.x post-V1 hardening passed source jumpback, Mindmap quality, and real-site regression acceptance.
```

## 7. No-Go

- 最终 Monica-like UX complete。
- 复杂站点全量高质量通过。
- 视频 / 音频 / 图片像素内容已被理解。
- Memory / RAG / Web Research / PPT / Deep Research ready。
- 浏览器自动操作产品能力、OCR/VLM/ASR、语音、桌宠或默认本地文件读取。
