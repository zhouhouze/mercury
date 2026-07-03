# V1.0.x Post-V1 Hardening Readiness Audit

状态：PASS for documentation baseline

日期：2026-07-03

## 1. 审计结论

```text
Go for V1.0.x Post-V1 Hardening documentation baseline.

Conditional Go for staged implementation after V1.0.x-H-0 is reviewed
and no new fatal / major documentation issue is introduced.
```

本审计只支持 post-V1 hardening 的文档基线和后续分阶段实现准备，不重新打开 V1 complete，也不授权 V2 能力。

## 2. 审查对象

- `docs/active/project/evidence/v1_mainline_closeout/v1-complete-ux-product-review-2026-07-03.md`
- `docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md`
- `docs/active/project/evidence/v1_mvp_content_quality/report.json`
- `docs/active/project/evidence/v1_mvp_quality_hardening/report.json`
- `docs/active/project/01-prd.md`
- `docs/active/project/02-architecture.md`
- `docs/active/project/03-development-plan.md`
- `docs/active/project/04-acceptance-plan.md`
- `docs/active/project/stage-gates/v1-post-v1-hardening.md`
- `docs/active/project/contracts/v1_post_v1_hardening_sample_manifest.schema.json`
- `docs/active/project/contracts/v1_post_v1_hardening_report.schema.json`
- `docs/active/project/design/v1-post-v1-hardening-gap.drawio`
- `docs/active/project/design/v1-post-v1-hardening-chatgpt-audit.md`

## 3. 发现

Fatal issues:

- none

Major issues:

- none

已闭环的审计意见：

- 新阶段不再只描述 report 字段，已补充 `sample-manifest.json` 与 `report.json` 的独立 JSON schema。
- 新增阶段文档主体已调整为中文，便于当前中文审查链路。
- drawio 仍保持 8 页，页面名称和内容覆盖目标架构差异、开发验收计划、项目里程碑、验收门槛及出门条件。
- 旧 QH/CQ/V1 complete 证据被保留为 baseline，不被改写为新阶段 evidence。
- 已补充 semantic validator 门禁，避免只依赖 JSON Schema 导致跨字段关系 false-green。
- 已采纳外部审计 P1 建议：固定未来 semantic validator 命令、明确类别分布由 semantic validator 校验、将 fresh fallback 例外口径结构化写入 report schema。

Minor notes:

- 真实网站执行风险仍存在，尤其是登录墙、反爬、虚拟列表、动态 DOM 和页面模板变化。这是未来实现风险，不是当前文档缺口。

## 4. 多轮独立审计记录

### Round 1：产品 / PRD 审计

审计问题：

- 阶段目标是否仍然围绕 V1 complete 后的用户可感知质量问题。
- 是否把 post-V1 hardening 错写为重新判定 V1 complete。
- 是否过度承诺最终 Monica-like UX、全站高质量或 V2 能力。

结论：

- PASS。阶段目标已明确为 source jumpback、Mindmap 质量、窄侧栏 UX 和真实网页回归硬化。
- PASS。V1 complete 被保留为历史基线，没有被降级。
- PASS。No-Go 已覆盖最终 Monica-like UX、媒体理解、RAG、Memory、Web Research、PPT、Deep Research。

### Round 2：目标架构 / 代码实体审计

审计问题：

- 是否用具体代码实体而不是“前端 / 后端 / AI”抽象描述架构。
- 是否呈现当前架构与目标架构的关联关系和分层结构。
- 是否有不必要的新 Runtime public contract 或 A/C/D/B 边界污染。

结论：

- PASS。文档和 drawio 已列出 `pageContext.ts`、`contentBridge.ts`、`runtimeClient.ts`、B Renderer、A Page Reading、C Mindmap、D Adapter / Agent Loop、post-V1 evidence、post-V1 schema。
- PASS。架构链路从 Host Page DOM 到 evidence package 可追踪。
- PASS。D / Adapter 边界保持，未新增 Runtime public API。

### Round 3：验收 / False-green 审计

审计问题：

- 是否有独立 evidence package，而不是复用 V1 complete / QH / CQ 报告。
- 是否有 schema 防止 `sample-manifest.json` 和 `report.json` 字段漂移。
- 是否覆盖 located / fallback_shown / blocked、fresh fallback、Mindmap 噪声、窄侧栏截图和人工 UX checklist。

修复：

- 已新增 `v1_post_v1_hardening_sample_manifest.schema.json`。
- 已新增 `v1_post_v1_hardening_report.schema.json`。
- 已在 PRD、架构、验收计划、stage gate、gap companion 中同步 schema validation 门禁。
- 已在验收计划、stage gate 和开发验收计划中补充 semantic validator 门禁，覆盖 `passed=true`、样本分布、截图证据、metric 阈值方向、fresh fallback / blocked replacement 和 located / fallback / blocked 一致性。
- 已固定未来实现验收命令：`npm --prefix apps/chrome-extension run validate:post-v1-hardening`。该命令在文档阶段不要求存在，进入实际开发后必须补齐。
- 已在 `v1_post_v1_hardening_report.schema.json` 中新增 `sampleDistribution` 和 `fallbackPolicy`，用于记录类别分布、fresh fallback 样本数和 blocked replacement 例外原因。

结论：

- PASS。当前文档可支撑后续自动化开发、分阶段验收、PRD 复检和 false-green audit。

### Round 4：Drawio 审计

审计问题：

- drawio 是否不超过 8 页。
- 是否中文书写。
- 是否覆盖目标架构与当前架构差异、开发及验收计划、项目里程碑、验收门槛及出门条件。
- 是否呈现实体状态：已实现、已实现需修改、待新增、保持边界、No-Go。

结论：

- PASS。drawio 共 8 页。
- PASS。页面标题和主体内容均为中文。
- PASS。第 2 页展示具体架构实体与状态；第 6/7 页展示开发验收计划、里程碑和出门条件；第 8 页展示风险路线与 No-Go。

### Round 5：外部审计建议核查

审计问题：

- semantic validator 是否只停留在描述层。
- sample manifest schema 是否被误用为类别分布的完整证明。
- fresh fallback 的例外口径是否会导致 `freshFallbackSamples = 0` 但 `passed = true` 的 false-green。

修复：

- 已固定未来实现验收命令：`npm --prefix apps/chrome-extension run validate:post-v1-hardening`。
- 已明确类别分布、acceptance subset 数量和替代样本关系由 semantic validator 校验。
- 已新增 `sampleDistribution` 与 `fallbackPolicy` report 字段。
- 已落盘外部审计记录：`docs/active/project/design/v1-post-v1-hardening-chatgpt-audit.md`。

结论：

- PASS。外部审计 P1 已闭环，无新增 fatal / major。

## 5. Readiness Checks

| 检查项 | 结果 |
|---|---|
| V1 complete 证据存在且人工核查 passed | PASS |
| post-V1 hardening 和 V1 complete 边界清楚 | PASS |
| PRD、架构、开发计划、验收计划、stage gate 阶段名一致 | PASS |
| 具体实现实体已命名 | PASS |
| drawio 不超过 8 页 | PASS |
| drawio 为中文，并使用状态色块 | PASS |
| `sample-manifest.json` schema 已定义 | PASS |
| `report.json` schema 已定义 | PASS |
| semantic validator 门禁已定义 | PASS |
| 外部审计 P1 已闭环 | PASS |
| fresh fallback / blocked 语义已纳入验收 | PASS |
| Mindmap 质量、source evidence 质量和窄侧栏 UX 已纳入验收 | PASS |
| V2/RAG/Memory/Web Research/PPT/Deep Research 未纳入范围 | PASS |

## 6. 风险判断

当前文档可以支撑下一阶段自动化开发、分阶段验收、PRD 复检和 false-green audit。

剩余风险是执行风险：

- 复杂真实网站可能因为登录、地区、反爬、虚拟列表或 DOM 变化导致样本 blocked。
- source jumpback 的高精度目标可能需要多轮实现和验收。
- Mindmap 质量指标虽然已定义，但真实页面文本噪声仍可能导致局部 degraded。

这些风险已有 degraded / blocked / replacement / false-green 机制，不构成文档阶段 fatal / major 阻塞。

## 7. 审计结论

```text
V1.0.x-H-0 documentation gate: PASS.
V1.0.x-H-1+ staged implementation: Conditional Go after human review of drawio direction.
Full V2 or final Monica-like UX claim: No-Go.
```
