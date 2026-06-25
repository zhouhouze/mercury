# V1 Mainline Closeout Gap Companion

Date: 2026-06-25

## 目的

`v1-mainline-closeout-gap.drawio` 是当前 V1 主线收口候选阶段的 active gap 图。它是人类快速审查目标体验、目标架构、开发计划、验收门槛和出门条件的入口。

本图替代较早的 V1 baseline / V1.2 automation 图作为当前阶段审查入口。旧图仍可作为历史理解材料，但不能覆盖本阶段的完成声明。

本图必须表达：

- 目标用户体验。
- 当前架构与目标架构差异。
- Content Script、iframe sidepanel、B Renderer、Runtime A/C/D、source jumpback 的责任边界。
- `V1-MC-0` 到 `V1-MC-5` 的开发及验收计划。
- 已完成自动化候选态与仍需人工产品体验核查的边界。
- 验收门槛、No-Go 和允许声明。
- 固定验证命令 `testCommands`、上游 evidence 路径逐个校验、fallback coverage 来源和人工核查状态字段。

## 分页

分页固定为 6 页，不超过 8 页：

| 页面 | 目的 |
|---|---|
| `01 目标体验总览` | 展示从普通网页、默认贴边 launcher、hover / focus 弹出、点击展开右侧 sidebar、读取当前页、总结 / 问答 / Mindmap 到 source evidence 的目标体验路径。 |
| `02 当前架构与目标架构差异` | 展示当前真实实现实体与目标差异：网页 DOM、`contentBridge.ts`、注入的 `aside / iframe / launcher / resize handle`、`sidepanel/main.tsx`、B Renderer、`runtimeClient.ts`、background proxy、Local Runtime A/C/D/C Mindmap、source jumpback 的分层和交互方向。 |
| `03 目标架构细化` | 展示 Content Script、Floating Launcher、SidebarInteractionState、Resize Handle、iframe sidepanel、B Renderer、Runtime A/C/D、Source Jumpback 的关系。 |
| `04 开发及验收计划` | 展示 `V1-MC-0` 到 `V1-MC-5`，以及每个阶段的验收产物。 |
| `05 项目里程碑` | 区分 V1.3、V1.4、complex-site、Gemini style、docked launcher closeout 等已完成或候选完成内容，以及人工核查 / 登录态复验边界。 |
| `06 验收门槛与出门条件` | 列出用户可体验到的功能、证据要求、No-Go 和允许声明。 |

## 当前证据边界

## 02 页阅读方式

`02 当前架构与目标架构差异` 页不是抽象目标图，而是当前实现实体图：

- `1 当前真实网页层`：说明 Navia 运行在真实网页 DOM 上，并通过 content script 初始化。
- `2 当前 Content Script 交互壳`：对应 `apps/chrome-extension/src/contentBridge.ts`，包括 `aside#navia-inpage-sidebar`、`iframe sidepanel.html?naviaInPage=1`、`button#navia-floating-launcher`、resize handle 和 `SidebarInteractionState`。
- `3 当前 iframe React 与 B 渲染层`：对应 `entrypoints/sidepanel/main.tsx`、`runtimeClient.ts`、`chat_renderer`、`mindmap_renderer`、Reading Map 和 Source Evidence UI。
- `4 Chrome 扩展桥接层`：对应 `entrypoints/background/index.ts`，包括 content script 注入、原生 Side Panel 过渡入口、`navia.runtimeFetch` 和 `navia.runtimeStream`。
- `5 本地 Runtime 模块层`：对应 `127.0.0.1:17861` 下 A Page Reading、D Adapter Boundary、C Mindmap。B 只消费 Artifact / SSE，不生成事实。

底部黄色区域是 V1 主线目标差异闭环：自动化截图链路、Side Panel / iframe / native side panel 分层标注、复杂站点 public no-login 边界、旧失败证据处理、不新增 Runtime public API、人工产品体验核查。

当前自动化报告如果通过，只允许进入人工产品体验核查：

```text
V1 mainline closeout candidate passed automated acceptance.
```

本图和当前自动化报告不得单独支持：

```text
完整 V1 complete。
最终 Monica-like UX complete。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

复杂站点证据必须标注 `public no-login` 或 `logged-in`。public no-login 证据不能被解释成登录态高质量通过。

如果当前 V1-MC real-site / external 样本没有 fallback sample，报告必须明确 fallback path 由 V1.3 / V1.4 或其他 active 阶段证据继承；不得把“当前样本全部 DOM highlight 成功”写成“当前总验收已抽样覆盖 fallback”。人工核查清单只能由自动化生成 `reviewStatus: pending`，不能替代人工结论。

## 关联 active 文档

- `docs/active/project/01-prd.md`
- `docs/active/project/02-architecture.md`
- `docs/active/project/03-development-plan.md`
- `docs/active/project/04-acceptance-plan.md`
- `docs/active/project/stage-gates/v1-mainline-closeout.md`
- `docs/active/project/stage-gates/v1-launcher-resize-interaction.md`
