# V1 Mainline Closeout Candidate Stage Gate

Date: 2026-06-25
Status: Active documentation and closeout gate

## 1. 阶段目标

本阶段把已被认可的 V1 主线目标收束为一个可审计的 closeout candidate：

```text
普通网页
-> Navia floating launcher 以贴边低打扰形态可见
-> 用户 hover / focus 后 launcher 弹出
-> 用户点击后右侧 Navia sidebar 展开
-> 用户可折叠、恢复、拖拽 launcher、resize sidebar
-> 用户读取当前网页
-> 总结 / 问答 / Mindmap
-> Evidence Card Mindmap / Reading Map
-> source highlight 或 fallback evidence
-> Debug / Settings 可用于诊断和配置
```

本阶段整合 V1.3 Evidence Card Mindmap、V1.4 Reading Map、复杂站点读取 hardening、Gemini style pass 和 Launcher / Collapse / Resize。它不新增这些目标之外的产品能力。

允许声明：

```text
V1 mainline closeout candidate passed automated acceptance.
```

不得声明：

```text
完整 V1 complete。
最终 Monica-like UX complete。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

## 2. 范围

允许：

- 完成当前 V1 主线的文档、审计和 closeout 证据闭环。
- 对 launcher / collapse / resize / push / overlay 做正式验收。
- 汇总 V1.3、V1.4、复杂站点诊断、Gemini 样式和 launcher 视觉 / 行为证据。
- 生成 V1 主线总体验收报告和人工产品体验核查清单。
- 解释、废止或重新生成旧 failed / superseded closeout 证据。

不允许：

- 在自动化验收和人工产品体验核查都通过前声明完整 V1 complete。
- 只使用 Chrome 原生 Side Panel 作为最终 V1 网页内伴随交互证明。
- 把 public no-login B站 / 小红书样本写成 logged-in 高质量通过。
- 新增 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作产品能力、OCR / VLM / ASR 或默认本地文件读取。
- 修改 Runtime public API、Artifact contracts、EvidenceCardViewModel 或 ReadingMapViewModel。

## 3. 架构边界

目标架构：

```text
Chrome Web Page
  -> Content Script Interaction Shell
       -> Floating Launcher
       -> SidebarInteractionState
       -> Resize Handle
       -> Push / Overlay layout
       -> iframe sidepanel.html
            -> Chat / Agent / Debug / Settings
            -> Evidence Card Mindmap
            -> Reading Map
            -> Source Evidence
  -> Content Script Source Jumpback
       -> located | fallback_shown | blocked

Local Runtime
  -> A Page Reading
  -> D Adapter / Artifact / Event / Trace
  -> C Mindmap
  -> B Renderer consumes artifacts only
```

边界规则：

- Launcher、collapse、resize、push / overlay 和本地 UI 状态持久化只属于 content script 外层交互壳。
- `sidepanel.html` 继续承载现有 React app；本门禁不新增未验收的顶层 Map / Sources 页面。
- B frontend 不得直接调用 A/C/D 服务，不得生成事实内容。
- A/C/D 不得只为视觉布局新增公共字段。
- Source jumpback 结果必须区分 `located`、`fallback_shown`、`blocked`。
- public no-login、logged-in、fallback、blocked 不得在报告中合并成一个 success。

## 4. 子阶段

| 子阶段 | 目标 | 出门条件 |
|---|---|---|
| `V1-MC-0` | PRD、目标架构、开发计划、验收计划、stage gate、gap drawio 同步；当前实现实体映射补齐 | 无 fatal / major 文档冲突；drawio 不超过 8 页；02 页能看出真实实现实体、分层结构和交互方向 |
| `V1-MC-1` | Launcher / Collapse / Resize closeout | 真实 Chrome 证据覆盖默认贴边、hover / focus 弹出、点击展开、点击收起、拖拽、resize、push / overlay |
| `V1-MC-2` | 复杂站点证据整理 | B站 / 小红书 / 观察者网报告明确 public no-login 或 logged-in |
| `V1-MC-3` | 自动化总体验收 | HTML / JSON 报告覆盖读取、Debug、总结、问答、Evidence Card、Reading Map、source evidence；`report.json` 记录 `testCommands`，逐个校验上游 evidence 的路径、passed、fatal / major 和允许声明 |
| `V1-MC-4` | 人工产品体验核查准备 | human checklist 和证据路径已生成，可指导人类快速核查；checklist 初始包含 `reviewStatus: pending`、`reviewer`、`reviewedAt`、`blockingIssues` |
| `V1-MC-5` | V1 complete 候选审计 | PRD review 和 false-green audit 无 fatal / major issue；旧 failed / superseded evidence 已解释、废止或重跑；fallback coverage 来源已说明；仍需人工核查后才能进入完整 V1 complete 候选声明 |

当前剩余专项闭环：

| 专项 | 目标 | 出门条件 |
|---|---|---|
| `V1-MC-QA-1` Chrome 自动化环境 | 明确真实登录态、CDP 连接、unpacked extension load 和 service worker 暴露路径 | profile locked、extension not loaded 或 public no-login fallback 必须写入 report，不得冒充登录态通过 |
| `V1-MC-QA-2` B站指定详情页 | 对固定 B站视频详情页完成 fresh validation | 摘要 / Mindmap 主节点来自标题、简介、UP主 / 发布信息、播放 / 弹幕等主内容；推荐、弹幕设置、活动横幅、QQ群 / 微信、自动连播不得主导 |
| `V1-MC-QA-3` 复杂站点 fresh evidence | B站 / 小红书 / 观察者网首页与详情页重新验收 | 每个样本明确 public no-login / logged-in / degraded；旧证据不能覆盖新代码质量结论 |
| `V1-MC-QA-4` 可读性与反跳 | Mindmap、Reading Map、状态卡和 source jumpback 截图级复核 | 无文本虚影、重叠、遮挡；located / fallback_shown / blocked 三态一致 |

当前质量硬化专项：

| 专项 | 目标 | 出门条件 |
|---|---|---|
| `V1-MC-SJ-0` 文档与审计冻结 | 将当前 real-site 6/6 pass、0 degraded、0 blocked、`fallbackSamples = 0`、人工核查 pending、cookie-injected 复核边界、目标架构、开发计划、验收门槛和 drawio 同步 | active 文档无 fatal / major；自动化候选通过事实不得写成完整 V1 complete |
| `V1-MC-SJ-1` A SourceRef 质量 | 小红书 feed card、观察者 article 正文、B站视频主内容的 sourceRef 更稳定 | `perception-summary.json` 和 sourceRefs 证明主内容进入 digest，不被评论 / 推荐 / 站点壳主导 |
| `V1-MC-SJ-2` C/B source card 排序 | Mindmap 节点和 source card 优先主内容、可定位来源 | `source-cards.json` 前置卡片不默认指向评论、推荐、最新视频或侧栏 |
| `V1-MC-SJ-3` Content Script jumpback | 用户触发后尝试多个 sourceRef / selector / domPath / textQuote / href-card 线索 | 成功时有 Navia source marker；失败时 fallback_shown；blocked 单独记录 |
| `V1-MC-SJ-4` E2E 与报告语义 | 自动化选择主内容 source card，记录选择原因；真实站点 headless-first 和 mute-audio | `jumpback.json` / report 记录 selected source card、原因和状态；不抢焦点、不发声 |
| `V1-MC-SJ-5` 真实站点复验 | B站、小红书、观察者网首页与详情页 6 样本重新验收 | 当前已恢复 6/6 pass、0 degraded、0 blocked 和 V1-MC 自动化候选态；后续若任一样本 degraded / blocked，V1-MC 总报告必须恢复 no-completion claim |

## 5. 必需证据

总证据包：

```text
docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html
docs/active/project/evidence/v1_mainline_closeout/report.json
docs/active/project/evidence/v1_mainline_closeout/prd-review.md
docs/active/project/evidence/v1_mainline_closeout/false-green-audit.md
docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md
docs/active/project/evidence/v1_mainline_closeout/screenshots/
```

总报告必须引用：

- V1.3 Evidence Card Mindmap evidence。
- V1.4 Reading Map evidence。
- V1 complex-site current-page reading evidence。
- Launcher / collapse / resize evidence。
- Gemini style 或当前 sidebar visual evidence。
- 旧 failed / superseded closeout evidence 及其处理方式。

## 6. 验收门槛

必须通过：

- [ ] 普通网页中默认只显示贴边 Navia floating launcher，不挤压正文。
- [ ] launcher hover / focus 可从边缘弹出完整悬浮球。
- [ ] launcher click 可从 collapsed 展开 sidebar，并可再次收起。
- [ ] collapsed 状态能恢复页面 margin，或在证据中明确说明 overlay 行为。
- [ ] resize handle 可在安全宽度范围内改变 sidebar 宽度。
- [ ] launcher drag 可更新垂直位置和左右贴边。
- [ ] push / overlay 行为在证据中可见。
- [ ] Chat / Agent / Debug / Settings 仍然可访问。
- [ ] 当前页读取、总结、问答、Mindmap、Evidence Card、Reading Map 和 Source Evidence 仍然可用。
- [ ] DOM highlight success、fallback shown、blocked 没有混淆。
- [ ] B站指定详情页 fresh evidence 证明视频主内容进入摘要和 Mindmap，站点壳、推荐、弹幕设置和活动广告没有主导输出。
- [ ] 小红书首页 source evidence 不得仅 fallback；若只能 fallback，必须保留 degraded / blocked，不能声明复杂站点矩阵通过。
- [ ] 观察者网详情页 source evidence 不得默认定位评论、推荐、最新视频、头条侧栏或站点壳；正文来源必须优先。
- [ ] E2E source card 选择必须记录选择原因，不能用“点更容易通过的卡片”掩盖产品 UI 中 source card 排序错误。
- [ ] Mindmap / Reading Map / 当前页面状态卡截图没有文本虚影、节点重叠、聊天输入框遮挡或状态卡截断。
- [ ] Chrome 自动化环境问题被准确标记；真实登录态 profile 被锁定或 unpacked extension 未加载时，报告不得通过登录态验收。
- [ ] 自动化测试优先 headless；Chrome 自动化必须静音。必须可见 Chrome 的 launcher 行为截图需要提前告知并在结束后关闭实例。
- [ ] 如果当前 V1-MC 样本 `fallbackSamples = 0`，报告必须引用 V1.3 / V1.4 或其他 active 阶段 fallback evidence；不得把“全部 highlight 成功”写成“当前阶段 fallback 已抽样通过”。
- [ ] 复杂站点证据区分 public no-login 与 logged-in validation。
- [ ] `report.json` 记录固定验证命令 `testCommands`，并逐个检查上游 evidence 路径、`passed`、fatal / major issues 和 claim 边界。
- [ ] PRD review 和 false-green audit 无 fatal / major issue。
- [ ] 人工产品体验核查清单已生成，包含 review status 字段，且未被自动化报告替代。

固定验证命令：

```bash
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard
npm --prefix apps/chrome-extension run build
npm --prefix apps/chrome-extension run e2e:chrome:launcher-resize-closeout
npm --prefix apps/chrome-extension run e2e:chrome:external-visual-acceptance
npm --prefix apps/chrome-extension run e2e:chrome:v1-mainline-closeout
```

Source Jumpback Hardening 复验命令：

```bash
NAVIA_REAL_SITE_HEADLESS=1 npm --prefix apps/chrome-extension run e2e:chrome:real-site-diagnostics
NAVIA_REAL_SITE_HEADLESS=1 npm --prefix apps/chrome-extension run e2e:chrome:external-visual-acceptance
node apps/chrome-extension/e2e/generate-v1-mainline-closeout-report.mjs
```

## 7. No-Go

- 在人工产品体验核查前声明完整 V1 complete。
- 使用 V1.3 或 V1.4 单阶段 evidence 冒充完整 V1 evidence。
- 只有 launcher 视觉截图，没有行为证据。
- public no-login 复杂站点样本被报告为 logged-in 高质量通过。
- Chrome 自动化环境 blocked 被包装成真实登录态验收通过。
- B站详情页 Mindmap 被推荐列表、弹幕设置、活动广告、QQ群 / 微信或自动连播主导，却声明高质量通过。
- 真实截图存在 Mindmap 文本虚影、节点覆盖或状态卡截断，却只用单元测试 / build 结果替代视觉验收。
- 小红书首页或观察者详情页仍为 fallback-only，却声明复杂站点矩阵通过。
- E2E source card 选择策略没有记录选择原因。
- 当前 V1-MC 样本无 fallback sample，也无上游 fallback evidence 引用，却声明 fallback path 已覆盖。
- 旧 failed closeout evidence 被忽略。
- Runtime public contracts 因本阶段发生变更。
- 引入任何禁用的 V2+ 能力。

## 8. 当前证据状态口径

如果 `docs/active/project/evidence/v1_mainline_closeout/report.json` 通过，只代表自动化候选态通过。当前 active 总报告已通过，且 real-site complex page matrix 为 6/6 pass、0 degraded、0 blocked；这支持进入人工产品体验核查准备。自动化报告仍不能替代人工核查，也不能单独支持完整 V1 complete 声明。

## 9. V1-HR/CC 人工产品核查与 Complete Candidate 准备门禁

本门禁在 V1-MC 自动化候选通过之后执行，只做文档和验收材料准备，不进入产品代码实现。

阶段目标：

```text
Ready for V1 human product review and complete-candidate audit preparation.
```

子阶段：

| 子阶段 | 目标 | 出门条件 |
|---|---|---|
| `V1-HR-0` | PRD、目标架构、开发计划、验收计划、stage gate、gap drawio 同步 | 当前状态仍是自动化候选通过，未被升级为完整 V1 complete |
| `V1-HR-1` | 人工核查材料整理 | 总报告、截图、JSON、PRD review、false-green audit、checklist 路径完整 |
| `V1-HR-2` | 体验场景清单固化 | 覆盖普通网页、复杂站点、launcher、sidebar、Chat、Mindmap、Reading Map、source evidence |
| `V1-HR-3` | 证据一致性复核 | Cookie-injected、public no-login、logged-in、fallback coverage 继承口径清楚 |
| `V1-HR-4` | Complete candidate 审计准备 | 明确人工 passed 后必须复跑自动化验收并重新生成 PRD review / false-green audit |
| `V1-HR-5` | 人工结论落盘前置 | `human-review-checklist.md` 仍为 pending，除非人类明确给出 passed / failed |

必需文档：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/design/v1-mainline-closeout-gap.md
docs/active/project/design/v1-mainline-closeout-gap.drawio
docs/active/project/design/v1-mainline-closeout-readiness-audit.md
docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md
```

No-Go：

- drawio 超过 8 页。
- drawio 架构页只写抽象模块，看不到 `contentBridge.ts`、iframe sidepanel、B Renderer、Runtime A/C/D、source jumpback、evidence report、human review checklist。
- 文档把自动化候选态写成完整 V1 complete。
- 文档把 temporary cookie profile 证据写成用户主 Profile 登录态全站高质量通过。
- 文档把当前 `fallbackSamples = 0` 写成当前 fresh fallback 抽样已覆盖。
- 文档新增 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作产品能力或默认本地文件读取。
