# V1 Mainline Closeout Remaining Execution Plan And Audit

Date: 2026-06-26
Status: Active execution record

## 1. Scope

This execution loop covers only the remaining V1 Mainline Closeout Candidate work:

- Revalidate current active PRD / architecture / stage-gate alignment.
- Re-aggregate the latest upstream evidence into `v1_mainline_closeout`.
- Run automated verification with real project data where feasible.
- Keep full V1 complete blocked until human product review is completed.

Allowed claim:

```text
V1 mainline closeout candidate passed automated acceptance.
```

Not allowed:

```text
Full V1 complete.
Final Monica-like UX complete.
V2 Memory / RAG ready.
Web Research / PPT / Deep Research ready.
```

## 2. Development Plan

| Substage | Work | Output |
|---|---|---|
| V1-MC-R1 | Documentation and audit baseline | This file, updated PRD review, updated false-green audit |
| V1-MC-R2 | Latest evidence aggregation | `report.json`, `acceptance-report.html`, copied screenshots |
| V1-MC-R3 | Automated verification | Typecheck, focused tests, build, real-site report validation |
| V1-MC-R4 | PRD specification review | `prd-review.md` states covered / not claimed scope |
| V1-MC-R5 | Human review handoff | `human-review-checklist.md` remains `reviewStatus: pending` |

## 3. Acceptance Plan

Required automated acceptance:

- `npm --prefix apps/chrome-extension run typecheck`
- `npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard pageContext`
- `PYTHONPATH=services/local-runtime .venv/bin/pytest services/local-runtime/navia_runtime/modules/page_reading/tests/test_high_signal_page.py services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py services/local-runtime/tests/test_adapter_summary_quality.py -q`
- `npm --prefix apps/chrome-extension run build`
- Latest real-site complex page report must show 6 samples, 6 passed, 0 fatal, 0 major.
- Latest V1 mainline closeout report must show all required upstream reports present and passed.

Required semantic acceptance:

- Current report must not claim full V1 complete.
- Current report must not claim logged-in quality from public/no-login samples.
- If current V1-MC samples have `fallbackSamples = 0`, fallback coverage must cite V1.3 / V1.4 upstream evidence.
- Old failed / superseded evidence must remain explained.
- Human product review must remain pending until a human reviewer completes it.

## 4. Audit Closure Before Execution

| Audit Item | Result | Closure |
|---|---|---|
| PRD and architecture allow V1-MC automated candidate only | Pass | Claim boundary remains candidate-only |
| Active stage gate requires human review before full V1 complete | Pass | Human checklist remains pending |
| Latest real-site evidence exists | Major open | `v1_real_site_complex_pages/report.json` is current upstream evidence and currently blocks candidate pass if it remains degraded |
| Fallback path risk | Major open | Current real-site samples include fallback-only jumpback; report must distinguish fallback from DOM highlight and must not claim full complex-site pass |
| Forbidden capability risk | Pass | No RAG, Memory, Web Research, PPT, Deep Research, multi-agent, voice, desktop pet, OCR/VLM/ASR, or default local file access is introduced |
| Browser automation as product feature risk | Pass | Chrome automation is test-only evidence collection, not product capability |

Current documentation supports execution, but the latest real-site evidence is not a pass baseline. V1-MC-R2/R3 must regenerate evidence from the current code and preserve a failed or degraded conclusion if any sample remains degraded.

## 5. Execution Results

Executed on 2026-06-26:

| Check | Result | Evidence |
|---|---|---|
| Frontend typecheck | Pass | `npm --prefix apps/chrome-extension run typecheck` |
| Frontend focused tests | Pass | `npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard pageContext` -> 4 files / 38 tests passed |
| Runtime A/C/Adapter regression | Pass | `PYTHONPATH=services/local-runtime .venv/bin/pytest services/local-runtime/navia_runtime/modules/page_reading/tests/test_high_signal_page.py services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py services/local-runtime/tests/test_adapter_summary_quality.py -q` -> 29 passed |
| E2E extension build | Pass | `npm --prefix apps/chrome-extension run build:e2e` |
| Chrome audio / focus policy | Pass with note | Real-site automation uses `NAVIA_REAL_SITE_HEADLESS=1`; Chrome launch args include `--mute-audio`; launcher behavior script still requires visible Chrome screenshots and was announced before execution |
| Launcher / resize behavior | Pass | `npm --prefix apps/chrome-extension run e2e:chrome:launcher-resize-closeout` -> 6 screenshots, report passed |
| External visual acceptance | Fail | `npm --prefix apps/chrome-extension run e2e:chrome:external-visual-acceptance` -> 5 commands, 4 passed; real-site diagnostics failed |
| Latest real-site report semantic check | Fail | `v1_real_site_complex_pages/report.json` shows 6 samples, 4 passed, 2 degraded, 0 blocked, 4 highlighted, 2 fallback |
| Current blocking samples | Major open | `xiaohongshu-homepage` and `guancha-detail` only showed fallback evidence in the final headless aggregation run |
| Candidate claim boundary | Pass | Any regenerated V1 mainline report must use no-completion claim if the real-site report remains failed |
| Human review boundary | Pass | Human product review remains pending and cannot be replaced by automation |
| V1 mainline aggregation | Fail as expected | `node apps/chrome-extension/e2e/generate-v1-mainline-closeout-report.mjs` generated `passed=false` and no-completion claim |

This loop must regenerate or update:

- `docs/active/project/evidence/v1_mainline_closeout/report.json`
- `docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html`
- `docs/active/project/evidence/v1_mainline_closeout/prd-review.md`
- `docs/active/project/evidence/v1_mainline_closeout/false-green-audit.md`
- `docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md`
- `docs/active/project/evidence/v1_mainline_closeout/screenshots/`

Allowed automated claim only if all gates pass:

```text
V1 mainline closeout candidate passed automated acceptance.
```

Required no-completion claim if any current gate fails:

```text
No completion claim. V1 mainline closeout candidate has blocking issues.
```

Current report uses the required no-completion claim.

## 6. Stop Conditions

Stop and request human confirmation if any of the following appears:

- A report tries to claim full V1 complete.
- A blocked / degraded real-site sample is hidden or rewritten as pass.
- Source fallback is merged into DOM highlight success.
- Public/no-login evidence is represented as logged-in validation.
- New Runtime public contract fields are introduced for launcher, visual style, or report-only needs.
- Any forbidden V2+ capability is added.

## 7. Next Stage: V1-MC-SJ Source Jumpback Hardening

当前 V1-MC 自动化总报告未通过，下一阶段固定为 `V1-MC-SJ`，只处理复杂站点 source jumpback 和相关验收报告问题。

当前阻塞基线：

| Report | Result | Blocking detail |
|---|---|---|
| `docs/active/project/evidence/v1_real_site_complex_pages/report.json` | fail | 6 samples, 4 passed, 2 degraded, 2 fallback |
| `docs/active/project/evidence/v1_external_visual_acceptance/report.json` | fail | upstream real-site diagnostic failed |
| `docs/active/project/evidence/v1_mainline_closeout/report.json` | fail | no-completion claim required |

V1-MC-SJ 子阶段：

| Substage | Work | Acceptance |
|---|---|---|
| `V1-MC-SJ-0` | 文档与 drawio 同步，冻结当前失败基线和目标架构 | active 文档无 fatal / major；drawio 8 页可读且不扩大声明 |
| `V1-MC-SJ-1` | A Page Reading 主内容和 SourceRef 质量计划 | 小红书 feed card、观察者 article 正文、B站视频主内容有明确 sourceRef 目标 |
| `V1-MC-SJ-2` | C/B source card 排序计划 | 高层 Mindmap 和 source cards 不默认指向评论、推荐、最新视频或站点壳 |
| `V1-MC-SJ-3` | content script 多线索 jumpback 计划 | located / fallback_shown / blocked 保持严格区分 |
| `V1-MC-SJ-4` | E2E source card 选择和报告语义计划 | headless-first、mute-audio、selectedSourceCardIndex 和选择原因进入报告 |
| `V1-MC-SJ-5` | 真实站点复验和 V1-MC 总报告再聚合计划 | 6/6 pass 才允许 candidate pass；否则继续 no-completion |

V1-MC-SJ 文档审计结论：

```text
Go for V1-MC-SJ documentation baseline.
Conditional Go for implementation after active docs and drawio remain consistent.
No-Go for V1-MC automated candidate pass while real-site/external visual reports fail.
```

## 8. Residual Risk Review and Route Decision

本轮外部文档审查后的结论是：active 文档已经可以支撑 `V1-MC-SJ` 分阶段自动化开发，但不能保证本阶段开发后必然顺利出门。当前高失败风险来自真实复杂网页本身，而不是文档缺口。风险必须在实现和验收报告中被显式保留，不能通过改写验收口径消除。

| 风险 | 当前判断 | 可消减方式 | 仍可能失败的原因 | 允许声明 |
|---|---|---|---|---|
| 小红书首页虚拟列表 / 风控 / 动态卡片导致 DOM source 不稳定 | Major open | A 输出 feed card 级 sourceRef；content script 用 card text / href / textQuote 多线索定位；E2E 记录 public no-login / cookie-injected / logged-in | 站点反爬、滚动虚拟化、登录态过期或 DOM 变体导致无法稳定定位 | 仅在真实截图和 report 证明 located 后声明该样本 pass；否则 degraded / blocked |
| 观察者详情页正文与评论 / 推荐 / 最新视频混排 | Major open | A/C 对 article title、author、time、body 段落提权；B source card 正文优先；E2E 记录选择理由 | 页面模板变化或正文 selector 缺失时可能仍 fallback | 正文 located 才能 pass；fallback-only 不得通过复杂站点矩阵 |
| B站详情页登录态和播放页噪声 | Medium open | 使用登录态或 cookie-injected profile 做 fresh validation；过滤推荐、活动、弹幕设置、自动连播、QQ群 / 微信 | 登录态 profile locked、cookie 失效、视频页 DOM 改版 | 可声明实际路线：logged-in / cookie-injected / public no-login，不得互相冒充 |
| Mindmap / Reading Map 窄屏视觉质量 | Medium open | 真实截图检查文本虚影、节点重叠、输入框遮挡和状态卡截断 | 复杂内容过长、卡片布局在窄宽度下仍需二次 UI 修复 | 只有截图通过后才能作为视觉 pass |
| E2E 选择更容易定位的 source card 掩盖产品 UI 排序问题 | Major false-green risk | 报告记录 `selectedSourceCardIndex`、`reason`、候选 source card 列表和 UI 排序；产品 UI 仍需把主内容卡片排前 | 如果 E2E 与 UI 排序不一致，自动化可能通过但产品体验仍差 | E2E 可作为诊断通过；不能替代产品 UI 排序验收 |

技术路线选择固定为：

| 路线 | 适用条件 | 优点 | 缺点 | 出门影响 |
|---|---|---|---|---|
| A. 登录态 Chrome CDP | 用户主动提供可连接的登录态 Chrome，扩展已加载 | 最接近真实体验，可验证 B站 / 小红书登录态 | 需要人工配合，不能自动接管用户主 profile | 通过后可声明 logged-in validation，仅限覆盖页面 |
| B. 专用测试 profile + 手动登录 / cookie 注入 | 可创建隔离 profile，cookie 有效，扩展可加载 | 可重复，不污染用户主 profile | cookie 过期或站点风控时仍会降级 | 通过后可声明 cookie-injected / dedicated-profile validation |
| C. public no-login headless | 登录态不可用但公开页面可访问 | 自动化稳定、低打扰、可静音 | 不能证明登录态体验，高风险站点可能降级 | 只能声明 public no-login evidence |
| D. blocker + 人工截图补位 | A/B/C 均不可用或结果不可信 | 不做虚假验收，保留事实 | 不能自动化出门，会阻塞 candidate pass | 只能声明 blocked / manual review required |

当前不需要用户选择新技术路线。默认执行顺序保持 A -> B -> C -> D；任何低等级路线通过都不能覆盖高等级路线的失败事实。若 A/B/C 均无法让 `xiaohongshu-homepage` 或 `guancha-detail` 从 fallback-only 变为 located，必须停止 candidate pass，保留 degraded / blocked，并回到产品目标或验收口径重新评估。

最终文档支撑性结论：

```text
Documentation supports V1-MC-SJ staged implementation and automated verification.
Documentation does not guarantee V1-MC-SJ exit success because two real-site blockers remain environment- and DOM-dependent.
No further documentation expansion is required before implementation unless the product goal changes.
```
