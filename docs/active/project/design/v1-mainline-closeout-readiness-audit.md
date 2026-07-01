# V1 Mainline Closeout Documentation Readiness Audit

Date: 2026-06-25
Status: Active documentation audit

## 1. 结论

当前 active 文档可以支撑 V1 Mainline Closeout Candidate 后续开发、自动化验收和人工产品体验核查准备。

结论边界：

- Go for V1-MC staged development / verification and automated acceptance.
- Conditional Go for full V1 complete candidate audit only after:
  1. V1-MC-4 人工产品体验核查完成。
  2. V1-MC-5 PRD review + false-green audit 无 fatal / major issue。
  3. 旧 failed / superseded evidence 已被解释、废止或重新生成。
  4. 自动化报告、截图和人工核查结论一致。
- No-Go for claiming full V1 complete from documentation, drawio, or automated reports alone.

## 2. 已复核文档

- `docs/active/project/01-prd.md`
- `docs/active/project/02-architecture.md`
- `docs/active/project/03-development-plan.md`
- `docs/active/project/04-acceptance-plan.md`
- `docs/active/project/stage-gates/v1-mainline-closeout.md`
- `docs/active/project/stage-gates/v1-launcher-resize-interaction.md`
- `docs/active/project/design/v1-mainline-closeout-gap.md`
- `docs/active/project/design/v1-mainline-closeout-gap.drawio`

## 3. 支撑范围

当前文档可以支撑：

- 默认贴边 launcher、hover / focus 弹出、点击展开 / 收起、拖拽、resize、push / overlay 的开发和验收。
- Chat / Agent / Debug / Settings 在 `sidepanel.html` React App 内继续作为主体验。
- 读取当前页、Debug JSON、总结、问答、Evidence Card Mindmap、Reading Map、Source Evidence 的总体验收。
- B站、小红书、观察者网公开态复杂站点样本的自动化证据整理。
- public no-login、logged-in、fallback、blocked、failed / superseded evidence 的语义区分。
- V1-MC-0 到 V1-MC-5 的分阶段开发、验收、PRD 复检和 false-green audit。

当前文档不能支撑：

- 自动化通过后直接声明完整 V1 complete。
- 把 public no-login 复杂站点样本解释成登录态高质量通过。
- 把 Chrome 原生 Side Panel、in-page iframe、visual probe 混写成同一类证据。
- 引入 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作产品能力或默认本地文件读取。
- 改变 Runtime public API，或把 `SidebarInteractionState` 反向写入 A/C/D/B 公共合同。

## 4. 本轮补齐项

本轮发现的 P1 缺口是：drawio `02 当前架构与目标架构差异` 已经细化到真实实现实体，但 `02-architecture.md`、开发计划和验收计划没有同等粒度的实体映射要求。

已补齐：

- `02-architecture.md` 增加当前实现实体映射，覆盖 `contentBridge.ts`、注入 DOM、iframe React App、B Renderer、`runtimeClient.ts`、background proxy、Local Runtime、A/D/C 和 source jumpback。
- `03-development-plan.md` 将 V1-MC-0 的产物扩展为当前实现实体与目标架构差异映射。
- `04-acceptance-plan.md` 增加 drawio 02 页的真实实体、分层结构和交互方向验收项。
- `stage-gates/v1-mainline-closeout.md` 增加 V1-MC-0 出门条件：02 页必须能看出真实实现实体、分层结构和交互方向。
- `design/v1-mainline-closeout-gap.md` 增加 02 页阅读方式说明。
- `design/v1-mainline-closeout-gap.drawio` 的 02 页已改为五层实现实体图。

## 5. 仍需守住的风险

| 风险 | 等级 | 处理方式 |
|---|---|---|
| 人工产品体验核查未完成时误声明完整 V1 complete | Major | 所有 active 文档均保留 candidate / human review 边界 |
| public no-login 复杂站点证据被误读为登录态通过 | Major | 验收计划、stage gate、gap 图和报告要求保留原始语义 |
| launcher 视觉截图替代行为验收 | Major | V1-MC-1 要求真实 Chrome 行为截图和 JSON report |
| 旧 failed / superseded evidence 与新报告并存造成 false-green | Major | V1-MC-5 要求解释、废止或重新生成冲突证据 |
| 外层交互壳状态污染 Runtime public contract | Major | 架构文档明确 `SidebarInteractionState` 只属于 content script |

## 6. 审计意见

2026-06-25 P1 复核更新：

- `report.json` 必须记录固定验证命令 `testCommands`，避免只凭生成器摘要判断通过。
- V1-MC-3 必须逐个校验上游 evidence 路径、`passed`、fatal / major issues 和允许声明边界，避免合并报告引用不存在或不合格的上游报告。
- 如果当前 V1-MC real-site / external 样本 `fallbackSamples = 0`，必须引用 V1.3 / V1.4 或其他 active 阶段 fallback evidence；否则不得声明 fallback path 已被当前总体验收覆盖。
- `human-review-checklist.md` 必须包含 `reviewStatus`、`reviewer`、`reviewedAt`、`blockingIssues` 字段；自动化阶段只能生成 `pending`，不能冒充人工核查通过。

2026-06-25 B站详情页质量与 Chrome 验收阻塞复核更新：

- PRD、目标架构、开发计划、验收计划、stage gate 和 drawio 已补充 B站详情页 fresh evidence 要求。
- 文档已明确：摘要和 Mindmap 主节点必须来自视频标题、简介、UP主 / 发布信息、播放 / 弹幕等主内容；推荐、弹幕设置、活动广告、QQ群 / 微信、自动连播、订阅合集不得主导输出。
- 文档已明确：Mindmap / Reading Map / 状态卡必须通过真实截图复核，不得出现文本虚影、节点重叠、输入框遮挡或状态卡截断。
- 文档已明确：Chrome profile locked、extension not loaded、public no-login fallback 必须记录为 blocked / degraded，不得冒充登录态通过。
- `03-development-plan.md` 已增加 Chrome 验收技术路线矩阵，默认执行顺序为 B 专用测试 profile / cookie 注入 -> A 用户登录态 Chrome CDP -> C public no-login 临时 profile -> D structured blocker + 人工截图补位。

当前文档水平可以支撑本阶段 V1 Mainline Closeout Candidate 的剩余开发计划、自动化验收和人工验收准备，但存在一个无法仅靠文档完全消除的外部环境风险：

| 风险 | 等级 | 文档是否已覆盖 | 剩余处理方式 |
|---|---|---|---|
| Windows Chrome 不加载 unpacked Navia extension，或用户主 profile 被锁定 | Major | 已覆盖 blocker 记录和 A/B/C/D 技术路线 | 执行阶段必须选择可行 Chrome 验收路线；无法加载扩展时不得声明通过 |
| B站登录态需要人工授权或站点风控 | Major | 已覆盖 logged-in 与 public no-login 分流 | 使用专用测试 profile 或人工 CDP；失败时只能 blocked / degraded |
| Mindmap 视觉质量只能由真实截图最终判断 | Major | 已覆盖截图门槛和 No-Go | 执行阶段必须重新截图，不得只用单测 / build |

因此当前审计结论是：

```text
Go for V1-MC-DOC-0 documentation baseline closure.
Conditional Go for V1-MC-QA-1+ automated verification.
No-Go for full V1 complete until Chrome / manual evidence closes.
```

下一步可进入：

```text
V1-MC-QA-1 Chrome automation route verification
```

但完整 V1 complete 仍必须等待：

```text
V1-MC-4 人工产品体验核查完成
V1-MC-5 PRD review + false-green audit 无 fatal / major issue
```

## 7. 2026-06-29 Active Evidence Baseline Sync

本轮文档基线同步以当前 active evidence 为事实来源：

| Evidence | Current status | Documentation meaning |
|---|---|---|
| `docs/active/project/evidence/v1_real_site_complex_pages/report.json` | `passed=true`, 6 samples / 6 passed / 0 degraded / 0 blocked / 6 highlighted / 0 fallback | 当前复杂站点矩阵已通过自动化复验；本轮为 temporary Chrome profile + injected auth cookies |
| `docs/active/project/evidence/v1_external_visual_acceptance/report.json` | `passed=true`, 5 commands passed / 6 visual samples passed | 支持自动化可视化验收通过；仍不替代人工产品体验核查 |
| `docs/active/project/evidence/v1_mainline_closeout/report.json` | `passed=true`, claim 为 `V1 mainline closeout candidate passed automated acceptance.` | 当前支持进入人工产品体验核查准备；不能声明完整 V1 complete |

本轮修订必须将 PRD、目标架构、开发计划、stage gate、gap companion 和 drawio 中的旧 no-completion / blocked 当前事实口径改为自动化候选通过，同时保留 `fallbackSamples = 0` 的上游 fallback 继承说明和人工产品体验核查 pending 边界。

当前结论：

```text
Go for V1-MC-SJ documentation baseline after passed evidence sync.
Go for V1-MC automated candidate acceptance verification.
Conditional Go for full V1 complete candidate audit only after human product review.
No-Go for full V1 complete from automated reports or drawio alone.
```

## 8. 2026-06-30 V1-HR/CC Documentation Baseline Audit

前一阶段审查报告已由人类确认通过。本轮审计对象是下一阶段文档基线：人工产品体验核查与完整 V1 complete 候选审计准备。

结论：

```text
Go for V1-HR/CC documentation baseline.
Go for human product review preparation.
Conditional Go for full V1 complete candidate audit only after human review passes and fresh PRD/false-green audit remains clean.
No-Go for full V1 complete from documentation, drawio, or automated candidate reports alone.
```

本轮文档必须支撑：

- 人工核查普通网页中的贴边 launcher、hover / focus、展开、折叠、拖拽、resize、push / overlay。
- 人工核查 Chat / Agent / Debug / Settings 可发现性。
- 人工核查读取当前页、总结、问答、Evidence Card Mindmap、Reading Map 和 Source Evidence。
- 人工核查 B站、小红书、观察者网真实页面体验，并理解 temporary cookie profile、public no-login、用户主 Profile logged-in 的差异。
- 人工核查 source evidence 的 `located`、`fallback_shown`、`blocked` 是否可理解。
- 人工核查当前 `fallbackSamples = 0` 是否在总报告中正确引用上游 fallback evidence。

本轮文档不能支撑：

- 在 `human-review-checklist.md` 仍为 `reviewStatus: pending` 时声明完整 V1 complete。
- 将 Cookie-injected 证据升级为用户主 Profile 登录态全站高质量通过。
- 将当前 V1-MC 全部 highlighted 写成当前 fresh fallback 抽样覆盖。
- 任何 V2+ 或禁用能力承诺。

剩余风险：

| 风险 | 等级 | 文档处理 |
|---|---|---|
| 人工核查通过前误声明完整 V1 | Major | 所有 active 文档保留 candidate-only 和 pending review 边界 |
| drawio 架构抽象化导致审查者看不到实现实体 | Major | drawio 02 页必须列出代码实体、DOM 实体、Runtime 模块和 evidence 实体 |
| 复杂站点 Cookie-injected 证据被误读 | Major | PRD、验收计划、drawio 04 页和 No-Go 均保留边界 |
| fallback coverage 被误写成本轮 fresh 样本覆盖 | Major | 总报告和文档继续引用 V1.3 / V1.4 upstream fallback evidence |

## 9. 2026-06-30 Final Documentation Sufficiency Review

本轮自审结论：

```text
Go for V1-HR/CC documentation baseline.
Current active documents fully support this documentation-only stage.
No additional product-code development is required for this stage.
No unresolved fatal / major documentation gap remains.
```

支撑完整性判断：

| 维度 | 结论 | 依据 |
|---|---|---|
| 阶段目标 | Pass | PRD、stage gate、acceptance plan 均把本阶段限定为人工产品核查与 complete candidate 准备 |
| 架构清晰度 | Pass | 架构文档和 drawio 02 页列出具体代码实体、DOM 实体、Runtime 模块、evidence 实体和交互方向 |
| 开发及验收计划 | Pass | `V1-HR-0` 到 `V1-HR-5` 已覆盖文档同步、人工核查材料、场景清单、证据一致性、candidate 审计准备和人工结论落盘 |
| 出门条件 | Pass | 允许声明固定为 `Ready for V1 human product review and complete-candidate audit preparation.` |
| No-Go | Pass | 完整 V1 complete、用户主 Profile 登录态全站高质量通过、V2+ 能力和 fresh fallback 误声明均被列为禁止 |
| drawio | Pass | 固定 8 页，中文书写，包含目标架构差异、体验路径、复杂站点、计划、里程碑、验收门槛和打回路径 |

本阶段开发完成后可以完整达成的目标：

- 让人类审查者快速理解当前 V1 自动化候选通过后的下一步。
- 支撑人工产品体验核查执行。
- 支撑完整 V1 complete 候选审计的准备工作。
- 保持自动化候选态、人工核查 pending 和完整 V1 complete No-Go 的边界清晰。

本阶段仍不能直接达成的目标：

- 完整 V1 complete。
- 最终 Monica-like UX complete。
- 用户主 Profile 登录态全站高质量通过。
- V2 / V3 / V4 / V5 能力 ready。

因此本轮没有需要用户在技术路线中选择的不可消减风险。后续如果进入产品体验修复或完整 V1 candidate audit，风险会重新来自真实浏览器、人工体验判断、复杂站点登录态和截图质量，而不是当前文档基线不足。

## 10. External ChatGPT Audit Decision

本轮已经完成两类独立自审：

1. Technical Writer 审计：检查 PRD、目标架构、开发计划、验收计划、stage gate、gap companion、drawio 和 human checklist 是否能指导本阶段文档开发与人工核查准备。
2. Reality Checker 审计：检查是否存在自动化候选态冒充完整 V1 complete、Cookie-injected 冒充用户主 Profile 登录态、fallback coverage 被误写成 fresh 覆盖、drawio 抽象化或 V2+ 过度承诺。

结论：

```text
No mandatory external ChatGPT audit is required before V1-HR/CC documentation exit.
Optional external review is acceptable if the human reviewer wants a second opinion on direction drift or over-commitment.
```

如果需要外部 ChatGPT 审计，建议审计包控制在以下 10 个 active 文档内：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/stage-gates/v1-mainline-closeout.md
docs/active/project/design/v1-mainline-closeout-gap.md
docs/active/project/design/v1-mainline-closeout-gap.drawio
docs/active/project/design/v1-mainline-closeout-readiness-audit.md
docs/active/project/design/v1-mainline-closeout-execution-plan-and-audit.md
docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md
```

待外部审计确认的问题：

- 是否同意当前阶段只支持 `Ready for V1 human product review and complete-candidate audit preparation`。
- 是否同意完整 V1 complete 仍需要人工产品体验核查通过、PRD review 和 false-green audit clean。
- 是否同意 drawio 已恢复旧版细粒度架构和风险路线表达，且没有过度承诺产品能力。
- 是否同意当前文档不需要进入产品代码实现即可完成本阶段目标。

## 11. 2026-06-30 V1-MVP-QH Documentation Sufficiency Review

本轮审计对象是基础 MVP 体验确认后的质量硬化阶段：`V1-MVP-QH`。该阶段只支撑 Source Jumpback 和 Mindmap Quality 的 scoped hardening，不支撑完整 V1 complete。

当前事实：

```text
基础 MVP 体验已由人工确认 OK。
已知缺陷仍包括：Source Jumpback 识别失败 / 定位不准、Mindmap 不准确、复杂站点噪声、窄屏可读性问题。
```

结论：

```text
Go for V1-MVP-QH documentation baseline.
Conditional Go for V1-MVP-QH staged implementation only after QH-0 audit closure.
No-Go for full V1 complete, final Monica-like UX complete, or complex-site full high-quality claim.
```

文档支撑性评估：

| 维度 | 结论 | 依据 |
|---|---|---|
| PRD 目标 | Pass | `01-prd.md` 已明确基础 MVP accepted、剩余质量问题、允许声明和 No-Go |
| 目标架构 | Pass | `02-architecture.md` 已列出 `pageContext.ts`、A Page Reading、C Mindmap、B Renderer、`contentBridge.ts`、evidence report 的目标链路和边界 |
| 开发计划 | Pass | `03-development-plan.md` 已拆分 `V1-MVP-QH-0` 到 `V1-MVP-QH-5`，并给出每阶段打回规则 |
| 验收计划 | Pass | `04-acceptance-plan.md` 已要求 B站、小红书、观察者网首页 / 详情页真实数据、截图证据、source 三态、解释选中内容、独立 QH evidence 和 false-green audit |
| Stage gate | Pass | `stage-gates/v1-mainline-closeout.md` 已新增 V1-MVP-QH 门禁和固定验证命令 |
| Drawio | Pass | `v1-mainline-closeout-gap.drawio` 固定 8 页，05 页已切换为 V1-MVP-QH 质量硬化闭环，07 / 08 页保留 No-Go 与风险路线 |
| Human checklist | Pass with boundary | `human-review-checklist.md` 记录基础 MVP accepted，但 `reviewStatus` 仍为 pending，不支持完整 V1 complete |

本阶段文档可以完整指导的开发内容：

- A Page Reading 主内容抽取、噪声过滤和 SourceRef 质量硬化。
- C Mindmap 主题归并、节点文本压缩和 nodeSourceMap 绑定硬化。
- B Renderer 导图可读性、source card 排序和三态 source evidence 展示硬化。
- Content Script Source Jumpback 多 sourceRef / selector / domPath / textQuote / href-card 线索定位。
- B站、小红书、观察者网首页与详情页真实数据复验。
- 解释选中内容的噪声过滤和 source grounding 复验。
- 可选图片证据展示，但仅限当前页已有图片 URL、alt、caption 或媒体 metadata，不引入 OCR/VLM。
- 独立 QH scoped evidence、PRD review、false-green audit、HTML / JSON / screenshot 证据闭环，再聚合到 mainline closeout。

本阶段完成后可以达成的目标：

```text
V1 MVP quality hardening passed scoped real-site acceptance.
```

本阶段完成后仍不能达成的目标：

```text
完整 V1 complete。
最终 Monica-like UX complete。
复杂站点全量高质量通过。
用户主 Profile 登录态全站高质量通过。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

仍无法仅靠文档消除的执行风险：

| 风险 | 等级 | 可选路线 | 优点 | 缺点 | 当前建议 |
|---|---|---|---|---|---|
| 复杂站点 DOM / 登录态 / 风控变化导致 source jumpback 失败 | Major | B 专用测试 profile / cookie 注入 | 可重复，不接管用户主 profile | cookie 会过期，不能代表全站登录态 | 默认路线 |
| 专用 profile 或 cookie 失效 | Major | A 用户登录态 Chrome CDP | 最接近真实体验 | 需要人工配合，可能抢焦点 | B 失败后使用 |
| 登录态不可用 | Major | C public no-login headless | 自动化程度高、低打扰 | 不能证明登录态质量 | 只能作为 degraded/public 证据 |
| 浏览器或扩展加载失败 | Major | D structured blocker + 人工截图补位 | 不做虚假验收 | 不能自动化通过 | 只作为阻塞记录 |
| Mindmap 可读性仍需人工判断 | Major | 真实截图 + Reality Checker 审计 | 能看到虚影、截断、遮挡 | 无法完全量化 | 必须执行 |
| QH evidence 与 mainline closeout 聚合报告混淆 | Major | 独立 `v1_mvp_quality_hardening` 证据包，再聚合到 `v1_mainline_closeout` | 防止 false-green 和路径复用误读 | 需要新增 reporter / manifest 输出 | 必须执行 |

Reality Checker 结论：

```text
当前文档足够支撑 V1-MVP-QH 自动化开发和出门验收准备。
风险没有被消除，但已被转换为明确技术路线、打回规则和 No-Go。
不需要继续做文档开发才能进入 QH-0 审计闭环。
如果执行阶段出现 degraded / blocked，必须打回对应子阶段，不能靠文档声明通过。
```

Technical Writer 结论：

```text
当前 active 文档已经形成 PRD -> Architecture -> Development Plan -> Acceptance Plan -> Stage Gate -> Gap Drawio -> Checklist 的闭环。
文档粒度足够让后续实现者知道改哪些实体、不能改哪些合同、用哪些真实数据验收、证据落到哪里、什么情况下打回。
```

第三轮一致性修订结论：

```text
P1 gap closed: QH scoped evidence now has an independent evidence package.
P1 gap closed: explain-selection quality is now explicitly covered by PRD, architecture, development plan, acceptance plan, and stage gate.
No new fatal / major documentation gap remains.
```

外部 ChatGPT 审计判断：

```text
Not mandatory before V1-MVP-QH implementation.
Optional if human reviewer wants another over-commitment check.
```

如需外部审计，建议审计包控制在以下 9 个 active 文档内：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/stage-gates/v1-mainline-closeout.md
docs/active/project/design/v1-mainline-closeout-gap.md
docs/active/project/design/v1-mainline-closeout-gap.drawio
docs/active/project/design/v1-mainline-closeout-readiness-audit.md
docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md
```
