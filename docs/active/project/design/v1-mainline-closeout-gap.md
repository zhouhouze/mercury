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
- `V1-MC-SJ-0` 到 `V1-MC-SJ-5` 的复杂站点 Source Jumpback Hardening 质量硬化计划。
- 当前 V1-MC 自动化候选通过事实、cookie-injected 真实站点复验口径，以及仍需人工产品体验核查的边界。
- 验收门槛、No-Go 和允许声明。
- 固定验证命令 `testCommands`、上游 evidence 路径逐个校验、fallback coverage 来源和人工核查状态字段。

## 分页

分页固定为 8 页，不超过 8 页：

| 页面 | 目的 |
|---|---|
| `01 阶段目标与体验路径` | 展示从普通网页、默认贴边 launcher、hover / focus 弹出、点击展开右侧 sidebar、读取当前页、总结 / 问答 / Mindmap 到 source evidence 的目标体验路径。 |
| `02 当前架构与目标架构差异` | 展示当前真实实现实体与目标差异：网页 DOM、`contentBridge.ts`、注入的 `aside / iframe / launcher / resize handle`、`sidepanel/main.tsx`、B Renderer、`runtimeClient.ts`、background proxy、Local Runtime A/C/D/C Mindmap、source jumpback 的分层和交互方向。 |
| `03 目标架构交互链路` | 展示 Content Script、Floating Launcher、SidebarInteractionState、Resize Handle、iframe sidepanel、B Renderer、Runtime A/C/D、Source Jumpback 的端到端关系。 |
| `04 复杂站点质量链路` | 展示 B站 / 小红书 / 观察者网 public no-login、cookie-injected 与 logged-in 验收分流，特别标注 B站详情页主内容抽取、噪声过滤、source jumpback 和 fallback 路径复核目标。 |
| `05 开发及验收计划` | 在旧版闭环布局上展示 `V1-HR-0` 到 `V1-HR-5` 的文档基线、人工核查材料、场景清单、证据一致性、complete candidate 准备和人工结论落盘产物。 |
| `06 项目里程碑与证据矩阵` | 区分 V1.3、V1.4、complex-site、Gemini style、docked launcher closeout、UX hardening 等已完成、候选完成或待人工核查内容，以及人工核查 / 登录态复验边界。 |
| `07 验收门槛与出门条件` | 列出用户可体验到的功能、证据要求、No-Go 和允许声明。 |
| `08 风险路线与备选技术` | 展示登录态 CDP、专用 profile / cookie 注入、public no-login headless、blocker + 人工截图补位四条路线，以及小红书 / 观察者 / B站 / E2E false-green 风险。 |

## 色块图例

- 绿色：已实现并已有 active evidence，可作为后续候选态输入；当前若被上游 blocked 阻断，必须在证据矩阵中单独标注。
- 黄色：已实现或已修复，但仍需 fresh evidence 或截图复核。
- 蓝色：待执行的文档、验收、报告或人工核查动作。
- 红色：false-green 风险、禁止声明或未来 fresh validation 失败时的打回路径，不能被包装成通过。
- 灰色：保留入口、历史证据或非主完成声明。

## 当前证据边界

当前 `v1_mainline_closeout` 总报告支持自动化候选通过：

```text
docs/active/project/evidence/v1_mainline_closeout/report.json
passed = true
claim = V1 mainline closeout candidate passed automated acceptance.
```

当前 active evidence 基线：

| 证据 | 当前状态 | 边界 |
|---|---|---|---|
| `v1_real_site_complex_pages/report.json` | 6 samples / 6 passed / 0 degraded / 0 blocked / 6 highlighted / 0 fallback | 使用临时 Chrome profile 注入授权 cookie；不能冒充用户主 profile logged-in 全站质量 |
| `v1_external_visual_acceptance/report.json` | 5 commands passed / 6 visual samples passed | 自动化可视化链路为 pass；仍不能替代人工产品体验核查 |
| `v1_mainline_closeout/report.json` | upstream 5/5 passed / candidate automated acceptance claim | 支持进入人工产品体验核查准备；不能替代人工核查或支持完整 V1 complete |

本图中的红色节点必须表示 false-green 风险、禁止声明或 future fresh validation 失败时的打回路径，不能把自动化候选通过事实写成完整 V1 complete。

## 02 页阅读方式

`02 当前架构与目标架构差异` 页不是抽象目标图，而是当前实现实体图：

- `1 宿主网页层`：说明 Navia 运行在真实网页 DOM 上，并区分用户主内容、推荐区、弹幕 / 评论、广告、登录态差异和页面布局影响。
- `2 Content Script 注入交互壳`：对应 `apps/chrome-extension/src/contentBridge.ts`，包括 `aside#navia-inpage-sidebar`、`iframe sidepanel.html?naviaInPage=1`、`button#navia-floating-launcher`、resize handle、collapse handle 和 `SidebarInteractionState`。
- `3 iframe React + B Renderer`：对应 `entrypoints/sidepanel/main.tsx`、`chat_renderer`、`mindmap_renderer`、`artifact_renderer`、`debug_renderer`、Reading Map 和 Source Evidence UI。B 只消费 Artifact / SSE，不生成事实内容。
- `4 Chrome 扩展桥接层`：对应 `runtimeClient.ts` 和 `entrypoints/background/index.ts`，包括 `navia.runtimeFetch`、`navia.runtimeStream`、Chrome CDP / 专用 profile / public no-login / blocker 四种验收路线。
- `5 Local Runtime A/C/D`：对应 `127.0.0.1:17861` 下 API Gateway、A Page Reading、D Adapter Boundary、C Mindmap。A/C/D 不因 launcher、resize 或视觉收口新增 public API。

底部黄色区域是 V1 主线目标差异闭环：自动化截图链路、Side Panel / iframe / native side panel 分层标注、复杂站点 public no-login / logged-in 边界、B站指定详情页 fresh validation、旧失败证据处理、不新增 Runtime public API、人工产品体验核查。

`02` 页必须拒绝不明确架构描述：不得只画“前端”“后端”“AI 模块”这类抽象节点；必须使用具体代码实体、DOM 实体、Runtime 模块或 evidence report。

## 2026-06-25 可读性修订

本轮根据人工反馈修订 drawio，重点修复“架构细致程度退化”和“页面可读性不足”：

- `02 当前架构与目标架构差异` 从单链路图改为五层实体图，明确宿主网页、Content Script、iframe React、Chrome 扩展桥接、Local Runtime A/C/D 的分层和交互方向。
- `03 目标架构交互链路` 补充用户动作、Runtime 请求、Artifact 返回、Source Jumpback、状态回写和禁止越界边界。
- `04 复杂站点质量链路` 补充 B站详情页主内容 signals、噪声黑名单、A Page Reading 质量层、Mindmap / Reading Map 可读性、source jumpback、Chrome 路线与 evidence 输出。
- `05 开发及验收计划` 补充“先审计、再开发、再端到端验收，失败即打回”的闭环，并把 Chrome 路线、B站详情页、复杂站点矩阵、导图 UI、总报告拆成独立阶段。

## 2026-06-26 Source Jumpback Hardening 修订

本轮根据 Source Jumpback Hardening 风险和复杂站点复验要求修订 drawio 和 companion：

- `01` 页增加当前自动化候选通过、完整 V1 complete No-Go 和人工 review pending 入口。
- `02` 页把 `pageContext.ts`、A Page Reading、C Mindmap、B Renderer、`sidepanel/main.tsx`、`contentBridge.ts` source jumpback、E2E/report 作为强关联实现实体展示。
- `04` 页明确 B站 / 小红书 / 观察者网复杂站点主内容提权、噪声过滤、source jumpback 和 No-Go。
- `05` 页加入 `V1-MC-SJ-0` 到 `V1-MC-SJ-5`，并保留失败打回规则。
- `06` 页把 real-site 与 V1 mainline 标为自动化候选通过，把 external visual 标为旧可视化 pass，并保留人工核查和 cookie-injected / logged-in 复验边界。
- `07` 页加入 6/6 real-site pass、headless-first、mute-audio、E2E source card 选择原因、fallback coverage 引用来源等出门条件。

后续自动化报告如果恢复通过，只允许进入人工产品体验核查：

```text
V1 mainline closeout candidate passed automated acceptance.
```

当前 active 报告允许声明：

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

当前 B站详情页专项质量目标：

- 摘要和 Mindmap 主节点来自视频标题、简介、UP主 / 发布信息、播放 / 弹幕等主内容。
- 推荐列表、弹幕设置、活动横幅、QQ群 / 微信、自动连播、订阅合集、版权提示不得主导输出。
- 如果真实 Chrome 登录态 profile 被锁定、unpacked extension 未加载或只能使用 public no-login 临时配置，必须写成 blocked / degraded，不得作为登录态通过证据。
- Mindmap / Reading Map / 状态卡截图必须证明无文本虚影、节点重叠、输入框遮挡和状态卡截断。

如果当前 V1-MC real-site / external 样本没有 fallback sample，报告必须明确 fallback path 由 V1.3 / V1.4 或其他 active 阶段证据继承；不得把“当前样本全部 DOM highlight 成功”写成“当前总验收已抽样覆盖 fallback”。人工核查清单只能由自动化生成 `reviewStatus: pending`，不能替代人工结论。

## 2026-06-26 外部文档审查补强

本轮外部文档审查后的结论：

- active 文档可以支撑 `V1-MC-SJ` 完成后的自动化候选通过、人工核查准备和 candidate-only 声明边界；当前不能声明完整 V1 complete。
- 文档不能把自动化候选态升级为完整 V1 complete，因为人工产品体验核查、登录态复杂站点和视觉质量复核仍受真实 DOM、虚拟列表、cookie、风控和页面模板变化影响。
- 风险已经转化为 drawio `08 风险路线与备选技术` 页和执行审计文档中的路线矩阵。
- 默认技术路线为 B 专用测试 profile / cookie 注入 -> A 登录态 Chrome CDP -> C public no-login headless -> D blocker + 人工截图补位；路线 B 出错时再走路线 A 进行登录态 CDP 复验。
- 任何低等级路线通过都不能覆盖高等级路线失败事实；fresh validation 如果出现 fallback-only，仍不能作为复杂站点矩阵 pass。

## 2026-06-30 V1-HR/CC 人工产品核查准备修订

前一阶段审查报告已确认通过。本轮 drawio 和 companion 的目标从“恢复自动化候选通过”转为“支撑人工产品体验核查与完整 V1 complete 候选审计准备”。

新增表达要求：

- `01` 页必须明确当前事实：自动化候选通过、人工核查 pending、完整 V1 complete 仍 No-Go。
- `02` 页继续使用具体实现实体，不得退化为“前端 / 后端 / AI 模块”抽象图。
- `03` 页继续展示目标架构交互链路和责任边界，避免退化为只有体验步骤的浅层流程图。
- `04` 页继续展示复杂站点质量链路，并标注 temporary cookie profile、public no-login、用户主 Profile logged-in 的差异，避免复杂站点证据被误读。
- `05` 页必须在旧版闭环版式上展示 `V1-HR-0` 到 `V1-HR-5` 的文档、人工核查和 complete candidate 准备流程。
- `06` 页必须把 V1.3、V1.4、Gemini style、launcher closeout、complex-site、external visual、mainline closeout、人类 review 串成证据链。
- `07` 页必须列出人类实际能体验到的功能门槛和报告门槛。
- `08` 页必须保留旧版风险路线与备选技术矩阵，并补充 V1-HR/CC 不支撑完整 V1 complete 的出门判断。

本轮 drawio 的允许声明：

```text
Ready for V1 human product review and complete-candidate audit preparation.
```

本轮 drawio 仍不得支持：

```text
完整 V1 complete。
最终 Monica-like UX complete。
用户主 Profile 登录态全站高质量通过。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

如果人工核查清单仍是 `reviewStatus: pending`，drawio 和任何 active 文档都不能把项目状态升级为完整 V1 complete。

## 关联 active 文档

- `docs/active/project/01-prd.md`
- `docs/active/project/02-architecture.md`
- `docs/active/project/03-development-plan.md`
- `docs/active/project/04-acceptance-plan.md`
- `docs/active/project/stage-gates/v1-mainline-closeout.md`
- `docs/active/project/stage-gates/v1-launcher-resize-interaction.md`
