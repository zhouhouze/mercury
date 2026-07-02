# V1-MVP-CQ 内容理解质量增强文档就绪审计

Date: 2026-07-03

Status: active documentation audit.

## 1. 审计结论

```text
Go for V1-MVP-CQ documentation baseline.

Conditional Go for staged automated implementation
after CQ-0 document gate is referenced by the implementation kickoff
and no new fatal / major documentation issue is introduced.

No-Go for full V1 complete, final Monica-like UX complete,
all complex sites high-quality complete, or media-content understanding claims.
```

当前 active 文档已经可以支撑 `V1-MVP-CQ 内容理解质量增强` 的后续分阶段自动化开发、真实网页 strict 验收、PRD 复检和 false-green audit。文档支撑范围限定为：

```text
V1 MVP content quality prove-out ready for staged implementation.
```

后续实现和验收全部通过后，最多允许声明：

```text
V1 MVP content quality prove-out passed strict real-site acceptance.
```

不得声明：

```text
完整 V1 complete。
最终 Monica-like UX complete。
复杂站点全量高质量通过。
视频 / 音频 / 图片内容已被理解。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

## 2. 审计轮次

### 第一轮：PRD / 架构 / 开发计划一致性

结论：通过。

- PRD 明确 CQ 是 QH 之后的新阶段，目标是用户可感知的主内容理解质量，而不是重开 V1 complete 声明。
- 目标架构明确 `pageContext.ts -> A Page Reading -> D Adapter / Agent Loop -> C Mindmap -> B Renderer -> contentBridge.ts -> CQ evidence` 链路。
- 开发计划已拆成 `V1-MVP-CQ-0` 到 `V1-MVP-CQ-7`，并为每个阶段给出开发重点、验收重点和打回规则。
- A / C / B / D / Content Script 的责任边界清楚，不新增 Runtime public contract，不引入 RAG、Memory、Web Research、OCR/VLM/ASR 或浏览器自动操作产品能力。

### 第二轮：验收计划 / stage gate / drawio / schema 可审计性

结论：发现并修复文档缺口。

已修复：

- 新增 `v1_mvp_content_quality_sample_manifest.schema.json`。
- 新增 `v1_mvp_content_quality_gold_notes.schema.json`。
- 新增 `v1_mvp_content_quality_report.schema.json`。
- PRD、架构、开发计划、验收计划、stage gate、drawio companion 均已引用上述三份合同。
- drawio 已补充 manifest / gold-notes / report schema 节点，仍保持 8 页。

修复后的文档要求：

- `CQ-1` 必须验证 `sample-manifest.json` 和每个 `gold-notes/*.json`。
- `CQ-7` 必须验证独立 CQ `report.json`，不能只验证 HTML 报告或 `v1_mainline_closeout` 聚合报告。
- 独立 CQ evidence 通过后，`v1_mainline_closeout` 才能聚合引用。

### 第三轮：false-green 与结构一致性

结论：发现并修复一处验收计划结构问题。

已修复：

- `04-acceptance-plan.md` 中 CQ 段落原先位于 `8.14` 和 `8.15` 之前，且残留 V1-MC 的 `6/6 real-site` 允许声明，容易造成 CQ 出门口径混乱。
- 现已调整为 `8.13 V1-MC -> 8.14 HR/CC -> 8.15 QH -> 8.16 CQ` 的顺序。
- CQ 段落只保留 `V1 MVP content quality prove-out passed strict real-site acceptance.`，不再混入 V1-MC 候选态声明。

### 第四轮：外部审计建议与 P1 补强

结论：外部审计支持当前文档基线，P1 建议已闭环为文档和 schema 约束。

已修复：

- `report.schema` 的 metric 增加 `operator = gte | lte | eq`，避免 `noiseLeakageRate <= 0.08` 与其他 `>=` 指标被报告器误读。
- `report.schema` 增加 `summary.categoryResults[]`，强制每类 `samples >= 6`、`strictPassedSamples >= 5`、`passed=true`。
- `sample_manifest.schema` 将每类 `minSamples` / `minPassed` 收紧到 6 / 5。
- `gold_notes.schema` 增加 `finalStrictEligible=true`，只有符合该条件的 gold notes 可以计入最终 strict pass。
- 新增外部审计记录 `docs/active/project/design/v1-mvp-content-quality-chatgpt-audit.md`。

## 3. 当前文档能否支撑本阶段全部开发

判断：可以支撑。

文档已经覆盖：

- 阶段目标：从 QH 矩阵达标提升到用户可感知的主内容理解质量。
- 用户路径：读取当前页、总结、问答、解释选区、Mindmap、Source Evidence、jumpback / fallback / blocked。
- 架构实体：`pageContext.ts`、A Page Reading、D Adapter / Agent Loop、C Mindmap、B Renderer、`contentBridge.ts`、CQ evidence 和 CQ contracts。
- 阶段拆分：`CQ-0` 到 `CQ-7`。
- 样本矩阵：36+ strict 样本，其中 24 页 QH 核心回归、12 页高风险真实样本。
- gold notes：`expectedMainClaims`、`expectedMindmapThemes`、`prohibitedNoiseThemes`、`requiredEvidenceTargets`。
- 质量阈值：content understanding、summary grounding、QA grounding、Mindmap semantic coverage、noise leakage、evidence explainability、jumpback semantic match。
- 证据包：manifest、gold notes、report、HTML、screenshots、PRD review、false-green audit、evidence manifest。
- 机器合同：manifest schema、gold notes schema、report schema。
- No-Go：完整 V1 complete、最终 Monica-like UX、媒体内容理解、RAG / Memory / Web Research / PPT / Deep Research、多 Agent、语音、桌宠、浏览器自动操作产品能力、默认本地文件读取。

## 4. 本阶段完成后能否达成 PRD 体验与目标架构

判断：条件成立。

如果后续自动化开发严格执行 `CQ-0` 到 `CQ-7`，并且 strict evidence 满足以下条件，则可以支撑 PRD 中 CQ 相关体验，并达成目标架构中定义的内容质量增强路径：

- 36+ strict 样本全部进入独立 CQ evidence。
- 至少 34/36 strict pass。
- 每类至少 5/6 strict pass。
- manifest、gold notes、report 均通过 schema validation。
- summary / QA / explain-selection / Mindmap / Source Evidence 的指标达到阈值。
- located / fallback_shown / blocked 在 UI、JSON、HTML 和截图中一致。
- PRD review 与 false-green audit 无 fatal / major。

该结论不保证真实网站一次性通过。真实网站登录墙、地区限制、反爬、页面模板变化和低信号页面仍是执行风险，但文档已经给出 degraded / blocked、低信号控制页和打回规则。

## 5. 剩余风险

| 风险 | 类型 | 当前处理 |
|---|---|---|
| 真实网站 DOM 变化导致样本不稳定 | 执行风险 | manifest 固定样本，blocked / degraded 必须保留，不能删除失败样本 |
| gold notes 质量不稳定 | 执行风险 | gold notes schema 强制 expected claims / themes / prohibited noise / evidence targets，并要求 `finalStrictEligible=true` 才能计入最终 strict pass |
| 指标被报告器主观打分 | 执行风险 | report schema 要求页面级 metric 记录 value / threshold / operator / passed / numerator / denominator |
| 类别分布被总数掩盖 | false-green 风险 | report schema 要求 `summary.categoryResults[]`，每类至少 6 页且至少 5 页 strict pass |
| QH passed 被复用为 CQ strict passed | false-green 风险 | PRD、验收计划、stage gate、drawio 均明确禁止 |
| 视频 / 图片 / 音频理解被越界声明 | 范围风险 | 只允许 DOM 可见文本、alt、caption、metadata、字幕文本或评论 |

没有发现无法通过文档继续消减的高风险设计问题。剩余主要是实现与真实站点执行风险，不是当前文档不足。

## 6. 建议执行顺序

```text
CQ-0 文档门禁引用与启动审计
CQ-1 strict sample manifest + gold notes + schema validation
CQ-2 A Page Reading 内容角色识别与噪声惩罚
CQ-3 summary / QA / explain-selection grounding
CQ-4 C Mindmap 语义节点与 evidence binding
CQ-5 B Renderer 证据解释与窄侧栏可读性
CQ-6 Content Script semantic jumpback
CQ-7 strict real-site acceptance + HTML report + PRD review + false-green audit
```

## 7. 是否需要 ChatGPT 外部审计

判断：非必须。

当前文档已经完成三轮独立审计并修复 fatal / major 文档缺口。可以直接进入后续 `CQ-0` 实施前文档门禁引用。

如果仍希望做外部抽查，建议只审查以下文件，数量小于 20：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/stage-gates/v1-mvp-content-quality.md
docs/active/project/design/v1-mvp-content-quality-gap.md
docs/active/project/design/v1-mvp-content-quality-gap.drawio
docs/active/project/design/v1-mvp-content-quality-readiness-audit.md
docs/active/project/design/v1-mvp-content-quality-chatgpt-audit.md
docs/active/project/contracts/v1_mvp_content_quality_sample_manifest.schema.json
docs/active/project/contracts/v1_mvp_content_quality_gold_notes.schema.json
docs/active/project/contracts/v1_mvp_content_quality_report.schema.json
```
