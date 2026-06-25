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

当前文档水平可以完整支撑本阶段 V1 Mainline Closeout Candidate 的剩余开发计划和自动化验收。

下一步可进入：

```text
V1-MC-1+ staged implementation / verification
```

但完整 V1 complete 仍必须等待：

```text
V1-MC-4 人工产品体验核查完成
V1-MC-5 PRD review + false-green audit 无 fatal / major issue
```
