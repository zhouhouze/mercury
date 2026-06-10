# A-V1.2 Contract Freeze Readiness Audit

版本：A-V1.2-0 Readiness Audit
日期：2026-06-05
状态：Ready for external audit, no implementation beyond contract freeze

## 1. Audit Conclusion

当前 A-V1.2 文档目标已经收敛为：

```text
高质量网页感知
+ 结构化页面摘要
+ 可反跳证据
+ Debug 可验证 JSON
```

本审计包只申请进入 `A-V1.2-0` 合同冻结复审，不申请进入 `A-V1.2-1+` 实质开发。

A-V1.2 当前文档包已经覆盖本阶段开发所需的 PRD、目标架构、公共合同、模块工作区、开发及验收计划、100-page corpus gate、drawio gap 图谱和 false-green 防线。文档层面可支撑后续自动化开发审计；但在外部审计未确认无 fatal / major risk 前，仍不得进入 `A-V1.2-1+` 代码实现。

A-V1.2 默认组合路线：

```text
DOM baseline
+ extractor ensemble
+ A-owned schema normalization
+ SourceMap / jumpback
+ Quality Evaluator
+ DebugEvidenceBundle
+ 100-page corpus gate
```

阶段判断：

```text
Go for A-V1.2-0 external re-audit.
No-Go for A-V1.2-1+ implementation until external audit returns no fatal or major risk.
```

## 2. Closed P0 Items

| P0 | Closure |
|---|---|
| Public vs module-local schema decision | `HighSignalPageContext`、`PerceptionDigest`、`SourceMap / SourceRef`、`PagePerceptionQualityReport` 是 D/C/B 可消费公共合同，但只能在 `downstreamReadiness = pass` 时作为主上下文。 |
| Full schema freeze | `contracts/a_v1_2_page_perception.schema.json` 定义 A-V1.2 公共合同、Debug evidence、corpus、gold review 和 extractor comparison schema。 |
| Quality formula closure | `overallScore` 权重、compressionScore、denominator-zero behavior、低信号页 fail/degrade 语义已冻结。 |
| Reproducible corpus gate | 最终计入 A-V1.2 验收的页面必须有 `snapshotPath` 或等价可复现 HTML evidence；URL-only 只能 planning。 |
| Gold review gate | 最终计入页面必须 `goldStatus = reviewed` 或 `semi_auto_accepted`；`planned` / `annotated` 不计入通过率。 |
| Extractor selection rule | `ExtractorCandidateScore` 公式、winner selection、tie breaker、rejection rules 和 `dom_baseline` fallback 已冻结。 |
| Dependency audit enforcement | `a-v1.2-extractor-dependency-audit.md` 已存在；第三方 extractor 当前均为 `deferred`，不得安装或作为必需依赖。 |
| Corpus category/schema alignment | Closed. Final counted corpus categories now match `a_v1_2_page_perception.schema.json`; search result semantics remain page metadata only, and multi-column media pages are optional boundary evidence rather than counted categories. |

## 3. PRD Coverage

A-V1.2 覆盖 PRD 中 A 模块作为 `Page Perception / AgentCore Eyes` 的定位：

- 把网页转成结构化事实输入。
- 提高信息密度和页面摘要质量。
- 保留来源证据与反跳 fallback。
- 通过 Debug JSON 和质量报告降低人工判读成本。
- 为 D 的连续对话、C 的可反跳思维导图和 B 的 Debug/证据展示提供输入。

A-V1.2 不覆盖：

- 最终 assistant answer。
- Mindmap 生成。
- Artifact 创建。
- SSE / EventStore / Trace 写入。
- RAG、Notebook、Flashcards、Quiz、Podcast、长期记忆、多 Agent。
- 默认 OCR / VLM / ASR / video / live engine 执行。

## 4. Target Architecture

目标数据流：

```text
Chrome PageContext / reproducible HTML snapshot
-> PageReadingInput
-> DOM baseline candidate
-> optional audited candidate extractor ensemble
-> A-owned block graph
-> noise filter and density ranking
-> StructuredPageContext
-> HighSignalPageContext
-> PerceptionDigest
-> SourceMap / SourceRef
-> PagePerceptionQualityReport
-> DebugEvidenceBundle
```

下游消费规则：

```text
A -> D: quality-ready page context only
A -> C: source-grounded mindmap input only
A -> B: Debug JSON, quality state, source fallback only
```

A 不反向调用 D/C/B，也不写任何 Runtime side effect。

## 5. Development And Acceptance Outline

| Stage | Target | Acceptance |
|---|---|---|
| `A-V1.2-0` | Contract freeze | PRD、架构、公共合同、schema、drawio、100-page corpus、gold review、extractor audit 口径一致；外部审计无 fatal / major risk |
| `A-V1.2-1` | 100-page corpus | 至少 100 个复杂网页或 snapshot；至少 10 类；最终计入页有 snapshotPath 和 reviewed / semi_auto_accepted gold |
| `A-V1.2-2` | Main content detection | 正文、标题、段落、列表、表格、代码、图片 DOM metadata 进入 A-owned block graph |
| `A-V1.2-3` | Noise / density | nav/footer/sidebar/ad/comment/share/cookie 等过滤或降权并记录 evidence |
| `A-V1.2-4` | Structured page summary | TLDR、key facts、entities、terms、procedures、table/code facts 均有 sourceRefs |
| `A-V1.2-5` | SourceMap / jumpback | SourceRef 具备 textQuote 或 fallbackText，selector/domPath 仅为可选增强 |
| `A-V1.2-6` | Quality evaluator | 每个 metric 有 numerator、denominator、method、threshold、passed、denominatorZeroBehavior |
| `A-V1.2-7` | DebugEvidenceBundle | Debug JSON 解释 pass / degraded / fail，且不包含无界网页全文 |
| `A-V1.2-8` | Corpus exit | corpus-level report 通过；失败项映射回对应子阶段并打回 |

## 5.1 External Audit Closure Addendum

ChatGPT external audit P0 closures for A-V1.2-0:

- Extractor scoring contract: `ExtractorCandidateScore.mainTextCoverage` is now required and normalized as `candidate.mainTextChars / max(mainTextChars among available candidates on the same page)`. `mainTextChars` remains a raw tie-breaker only.
- A boundary conflict: A acceptance is limited to page perception contracts and evidence files. Summary `ArtifactRecord`, final answer, Mindmap, SSE, EventStore, and Trace creation belong to D / Integration / Summary Tool acceptance, not A.
- A-V1.2-8 automation hardening: `eval_corpus` is the required corpus exit command. It reads `corpus-manifest.json`, writes `corpus-level-report.json`, and must exit non-zero on category gate, source coverage, grounding, jumpback, low-signal, gold review, snapshot, or debug evidence failure.

Status after this addendum:

```text
Go for external re-audit of A-V1.2-0.
No-Go for A-V1.2-1+ implementation until external audit confirms no fatal or major remaining gaps.
```

## 6. False-Green Gates

以下任一出现则不能进入下一阶段：

- 少于 100 个最终计入网页就声明 A-V1.2 完成。
- URL-only、`planned` 或 `annotated` gold 页面被计入最终通过率。
- 低信号、登录墙、付费墙、空内容页面被标记为 `pass`。
- `quality-report.json` 写死 pass 或修改公式以适配 corpus。
- `PerceptionDigestItem` 缺少 `sourceRefs`。
- DOM selector 成为唯一反跳机制。
- 第三方 extractor 原始输出进入公共合同。
- 未批准依赖审计前安装 `trafilatura/readability-lxml/readabilipy`。
- A 生成回答、Mindmap、Artifact、SSE、EventStore、Trace、RAG、Notebook 或学习产物。

## 7. Validation Commands

```bash
python3 -m json.tool docs/active/project/contracts/a_v1_2_page_perception.schema.json
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests/test_a_v1_2_contract_freeze.py
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
xmllint --noout docs/active/project/design/v1.2-a-page-perception-gap.drawio
git diff --check
```

## 8. External Audit Package

提交 ChatGPT 或等价审计方时，建议使用以下文档，数量小于 20：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/04-acceptance-plan.md
docs/active/project/MODULE_VERSIONING.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/contracts/a_v1_2_page_perception.schema.json
docs/active/project/design/a-v1.2-contract-freeze-readiness-audit.md
docs/active/project/design/v1.2-a-page-perception-gap.md
docs/active/project/design/v1.2-a-page-perception-gap.drawio
docs/active/project/stage-gates/v1.2-a-v1.2-production-page-perception.md
docs/active/modules/runtime/page_reading/docs/public-api.md
docs/active/modules/runtime/page_reading/docs/implementation-plan.md
docs/active/modules/runtime/page_reading/docs/test-and-evidence-plan.md
docs/active/modules/runtime/page_reading/docs/fixture-spec.md
docs/active/modules/runtime/page_reading/docs/a-v1.2-100-page-evaluation-plan.md
docs/active/modules/runtime/page_reading/docs/a-v1.2-0-contract-freeze-acceptance.md
docs/active/modules/runtime/page_reading/docs/a-v1.2-executable-development-spec.md
docs/active/modules/runtime/page_reading/docs/a-v1.2-extractor-dependency-audit.md
```

## 9. Stage Decision

```text
Current decision: A-V1.2-0 audit package ready.
Allowed next action: external audit.
Blocked action: A-V1.2-1+ implementation.
```
