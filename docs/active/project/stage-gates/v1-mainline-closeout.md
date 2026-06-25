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

## 7. No-Go

- 在人工产品体验核查前声明完整 V1 complete。
- 使用 V1.3 或 V1.4 单阶段 evidence 冒充完整 V1 evidence。
- 只有 launcher 视觉截图，没有行为证据。
- public no-login 复杂站点样本被报告为 logged-in 高质量通过。
- 当前 V1-MC 样本无 fallback sample，也无上游 fallback evidence 引用，却声明 fallback path 已覆盖。
- 旧 failed closeout evidence 被忽略。
- Runtime public contracts 因本阶段发生变更。
- 引入任何禁用的 V2+ 能力。

## 8. 当前证据状态口径

如果 `docs/active/project/evidence/v1_mainline_closeout/report.json` 通过，只代表自动化候选态通过。它可以支持进入人工产品体验核查，但不能替代人工核查，也不能单独支持完整 V1 complete 声明。
