# V1.0.x Post-V1 Hardening Gap Companion

状态：阶段性验收完成

日期：2026-07-04

## 1. 为什么需要本阶段

V1 已经记录为 MVP 当前页伴随阅读范围内的 complete。本阶段不解决“V1 是否完成”的问题，而是把 V1 之后仍然影响用户信任的质量问题收束为可开发、可验收、可审计的 post-V1 hardening 计划：

- Source jumpback 可能技术上触发成功，但落点不准、解释不清或 fallback 缺少 fresh evidence。
- Mindmap / Reading Map 可能在复杂页面上出现噪声节点、重复节点、过长节点或弱证据节点。
- 真实网页回归已经从 QH/CQ 阶段证据扩展为独立 post-V1 baseline：`101` 个真实 candidate、`36` 个 acceptance subset、`3` 个 fresh fallback / blocked 证据样本。
- 窄侧栏中的导图、source card、状态卡和输入区仍需持续防虚影、防遮挡、防截断。

## 2. 当前状态与目标状态

| 领域 | 当前状态 | 目标状态 |
|---|---|---|
| V1 状态 | V1 complete 已由自动化证据和人工核查记录 | 保留 V1 complete 作为历史基线 |
| Source jumpback | 已有 located / fallback / blocked，post-V1 语义校验通过 | 用户能理解为什么跳到这里，或为什么 fallback / blocked |
| Mindmap | Evidence Card / Reading Map 已可用，post-V1 噪声回归和质量指标通过 | 顶层节点优先表达主题、论点、事实、步骤、结论 |
| Sidebar UX | MVP 可接受，post-V1 截图报告覆盖窄侧栏可读性 | source card、状态卡、导图节点、输入区无虚影、无重叠、无截断 |
| Evidence | QH/CQ/V1 complete 证据已存在 | 独立 `v1_post_v1_hardening` 证据包已落盘 |
| 合同 | CQ 已有 schema | post-V1 `sample-manifest` 与 `report` schema 已落盘并通过 semantic validator |
| 范围边界 | V1 排除 V2+ 能力 | 继续排除 RAG、Memory、Web Research、PPT、Deep Research、媒体理解和产品浏览器自动操作 |

## 3. 具体架构实体

- `apps/chrome-extension/src/pageContext.ts`：visible block role hints 和 source candidate metadata 已进入 post-V1 证据链。
- `apps/chrome-extension/src/contentBridge.ts`：source marker、fallback reason、blocked reason 和语义匹配已由 report / HTML / screenshot 交叉验证。
- `apps/chrome-extension/src/runtimeClient.ts`：保持既有 Runtime transport 和诊断边界。
- `apps/chrome-extension/src/modules/chat_renderer/`：source card 解释和 degraded 状态表达已纳入验收。
- `apps/chrome-extension/src/modules/mindmap_renderer/`：短标签、节点布局、证据关系和 degraded nodes 已纳入验收。
- `services/local-runtime/navia_runtime/modules/page_reading/`：SourceRef 质量、低价值文本过滤和页面质量判断已纳入验收。
- `services/local-runtime/navia_runtime/modules/mindmap/`：语义归并、重复抑制、节点压缩、nodeSourceMap 质量和噪声抑制已有回归测试。
- `services/local-runtime/navia_runtime/modules/agent_loop/` 与 `modules/adapters/`：保持 ToolResult / Artifact / Event / Trace 边界。
- `docs/active/project/contracts/v1_post_v1_hardening_sample_manifest.schema.json`：约束样本矩阵。
- `docs/active/project/contracts/v1_post_v1_hardening_report.schema.json`：约束出门报告。

## 4. Drawio 要求

`docs/active/project/design/v1-post-v1-hardening-gap.drawio` 固定不超过 8 页：

1. `01 阶段目标与体验路径`
2. `02 当前架构与目标架构差异`
3. `03 Source Jumpback 精度链路`
4. `04 Mindmap / Reading Map 质量链路`
5. `05 真实网页回归基线与样本矩阵`
6. `06 开发及验收计划`
7. `07 项目里程碑与出门条件`
8. `08 风险路线与 No-Go 边界`

状态色块口径：

- 绿色：已实现 / 保持。
- 黄色：历史待强化状态；本轮验收图中已收敛为绿色或红色边界。
- 蓝色：历史待新增文档、合同或证据实体；本轮验收图中证据和合同已落盘。
- 红色：No-Go 或阻塞边界。

## 5. 开发及验收大纲

| 子阶段 | 开发计划 | 验收计划 |
|---|---|---|
| `V1.0.x-H-0` | 同步 active docs、drawio、schema | PASS：无 fatal / major 文档冲突 |
| `V1.0.x-H-1` | 定义 100+ candidate 和 36+ acceptance subset | PASS：101 个真实 candidate、36 个验收子集 |
| `V1.0.x-H-2` | 定义 source jumpback 精度规则 | PASS：located / fallback_shown / blocked 在报告中区分 |
| `V1.0.x-H-3` | 定义 Mindmap 质量和 source binding 规则 | PASS：顶层节点质量指标和噪声回归通过 |
| `V1.0.x-H-4` | 定义窄侧栏可读性检查 | PASS：截图证据进入 HTML 报告 |
| `V1.0.x-H-5` | 定义自动化报告和人工 review 包 | PASS：HTML 报告可作为人工审查入口 |
| `V1.0.x-H-6` | 出门审计 | PASS：无 fatal / major，仅声明 post-V1 hardening |

## 6. Evidence Package 验收结果

本阶段已写入：

```text
docs/active/project/evidence/v1_post_v1_hardening/
  sample-manifest.json
  report.json
  acceptance-report.html
  prd-review.md
  false-green-audit.md
  ux-review-checklist.md
  screenshots/
```

并使用：

```text
docs/active/project/contracts/v1_post_v1_hardening_sample_manifest.schema.json
docs/active/project/contracts/v1_post_v1_hardening_report.schema.json
```

本阶段已提供并通过固定 semantic validator 命令：

```text
npm --prefix apps/chrome-extension run validate:post-v1-hardening
```

`report.json` 已包含 `sampleDistribution` 和 `fallbackPolicy`，记录类别分布、acceptance subset 覆盖、fresh fallback 样本数以及 blocked replacement 例外原因。当前结果：

- `candidateMatrixSize = 101`
- `acceptanceSubsetSize = 36`
- `freshFallbackSamples = 3`
- `fatalIssues = 0`
- `majorIssues = 0`
- `claim = V1.0.x post-V1 hardening passed source jumpback, Mindmap quality, and real-site regression acceptance.`

## 7. No-Go

- 不声明最终 Monica-like UX complete。
- 不声明复杂站点全量高质量通过。
- 不声明视频、音频、OCR、VLM、ASR 或隐藏媒体内容已被理解。
- 不引入 Memory、RAG、Web Research、PPT、Deep Research、多 Agent、产品浏览器自动操作、语音、桌宠或默认本地文件读取。
- 不覆盖 V1 complete 证据，也不用 QH/CQ 旧报告冒充 post-V1 hardening 证据。
