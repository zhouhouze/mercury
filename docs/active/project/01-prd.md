# Navia / 伴航 V1 PRD

版本：V1.0 PRD Baseline
日期：2026-05-31
产品名：Navia / 伴航
角色名建议：小航
阶段目标：Chrome 插件页面内交互优先的 Headless 伴随式 AI MVP

---

## 1. 产品背景

用户在浏览网页、阅读文章、查看技术文档、调研产品、整理资料时，经常需要即时理解当前页面内容，并进一步提问、总结、结构化整理、生成思维导图。传统 Chatbot 需要复制粘贴内容，缺乏当前页面上下文，也很难沉淀为后续个人知识库和个人 Agent 的底层能力。

Navia / 伴航的目标是构建一个伴随式 AI 系统：前端可以是 Chrome 插件、Web、App、未来桌面宠物，但核心能力必须是 Headless、可复用、可观测、可监督的本地 AI Runtime。

V1 的重点不是“大而全”，而是完成一个稳定闭环：

```text
当前网页上下文
  -> 单 Session AgentCore
  -> 本地意图识别
  -> 受控工具调用
  -> 摘要 / 问答 / Mermaid 思维导图
  -> Session 持久化与事件追踪
```

---

## 2. 一句话定位

Navia / 伴航是一个常驻在网页边缘的本地伴随式 AI 助手。V1 前端页面体验以当前 active 文档 `docs/active/project/interaction-prd/窗口交互_PRD.md` 和后续用户确认的 `V1 Launcher / Collapse / Resize` 阶段为准；较早的“无悬浮球、默认右侧侧边栏聊天面板”只代表历史 baseline，不再作为当前 V1 主线收口目标。系统能够理解当前网页，提供伴读问答、摘要生成、Mermaid / Evidence Card / Reading Map 思维导图，并以可观测、可监督的 Headless AgentCore 为后续个人知识库、观影观赛陪伴、个人秘书与多端产品化打基础。

---

## 3. 产品命名与品牌方向

### 3.1 英文名

Navia

语义方向：navigation、companion、AI、voyage。它代表在信息流、网页、知识和任务中陪用户一起航行。

### 3.2 中文名

伴航

语义方向：陪伴 + 导航。既适合 V1 网页伴读，也适合 V2 知识库、V3 观影观赛、V4 个人秘书和 V5 桌宠。

### 3.3 桌宠 / 角色名

小航

后续可以设计成一个小星舟、小导航精灵、小兽或小 AI 伙伴。

---

## 4. 总体产品路线

```text
V1：网页伴读 Companion + Headless Local AgentCore
V2：本地备忘 / 个人知识库 / 标签化总结 / 类 RAG 蒸馏
V3：伴随式观赛 / 观影 / 看直播体验
V4：个人秘书 / 深度研究 / PPT 生成 / Manus-like Agent 能力
V5：移动端迁移 / 云化部署 / 产品化改造 / 桌面宠物情绪价值
```

### 4.1 V1 定位

V1 是底座阶段：

- Chrome 插件的主前端体验是网页内悬浮球与双轨聊天面板；既有 Side Panel 只作为调试入口、兼容承载或过渡实现。
- Local Headless Runtime 是真正核心。
- AgentCore 是一个可控、可观测的单 Session 状态机。
- 本地模型是能力插件，不进入业务层。
- Session 质量优先于长期记忆。
- 监督机制优先于复杂智能。

---

## 5. V1 目标

V1 必须实现：

0. Contract-first Runtime Skeleton：API / Event / State / Tool / Budget / Error / ID / SSE 合同先于 AgentCore 实现。
1. 可在 Chrome 中安装的页面内 AI 助手插件。
2. 当前网页上下文识别与提取。
3. 基于当前网页的摘要生成。
4. 基于当前网页的问答。
5. Mermaid 思维导图生成与前端预览。
6. 本地小参数模型实现用户意图识别。
7. 网页内 AI 双轨面板支持基础文字对话，不依赖语音即可完成 V1 主流程。
8. 本地可微调模型用于思维导图生成。
9. AgentCore 采用可替换 CoreProvider 策略，V1.2 首选 `piAgentProvider`，并以 `MockCoreProvider` 支撑合同测试和 fallback。
10. 不直接接 MCP / Skill / 长期记忆管理；V1.2 只允许通过 D 模块定义轻量 Adapter 合同，不允许绕过 D Adapter Layer 和治理钩子。
11. 单 Session 聊天历史高质量持久化。
12. Agent 状态机可视化、可验证、可观测、可扩展。
13. Agent 具备预算、权限、上下文和本地文件访问监督机制。

V1 前端交互必须实现：

- 页面边缘可移动悬浮球。
- 悬浮球 hover 高亮与伸出小长条。
- 点击小长条后展开网页内 AI 双轨聊天面板。
- 窄距展开态默认约 `440px`，网页内容向左挤压。
- 半屏展开态约 `50vw`，网页继续被挤压。
- 超过 `52vw` 后进入覆盖式显示，最大覆盖宽度不超过 `80vw`。
- 拖回 `<48vw` 后恢复挤压式。
- 点击悬浮球或收起按钮后，面板收起，网页恢复原始布局。

V1.x 可选增强：

- 已部署 FunASR 后端语音识别接入。
- 语音 transcript 作为普通 user message 进入 AgentCore。

### 5.1 V1.1 前端体验高保真目标

V1.1 是 V1.0 之后的体验质量阶段，不改变 Runtime / AgentCore / API / Event / ToolResult / PageContext 合同。V1.1 的目标是把 V1.0 已打通的页面内悬浮球与 AI 双轨面板，从“功能闭环 + 交互骨架”升级为可对照 Figma 原型验收的高保真前端体验。

V1.1 必须实现的体验目标：

- 高保真还原 Figma Make 原型表达的“浏览器页面 + 浮动球 + 侧边插件面板 + 聊天区域”样式。
- 将当前工程型注入面板升级为设计系统化、组件语义清晰、可截图验收的前端界面。
- 保留 V1.0 已完成的 PageContext、Runtime 连接、SSE Chat、Mermaid Artifact、Session restore、push / overlay / resize / collapse recovery 行为。
- 引入视觉验收口径：Figma 对照、真实 Chrome、Playwright 截图基线、PRD A-F 状态截图。

V1.1 明确不做：

- 不新增 Runtime API。
- 不修改 AgentEvent / ToolResult / PageContext 合同。
- 不引入 MCP、Skill、RAG、多 Agent、浏览器自动操作。
- 不用 Chrome Side Panel 替代页面内悬浮球与网页内面板验收。
- 不在缺少 Figma 截图或普通 Figma `/design/` 节点基线时声明“视觉高保真通过”。

### 5.2 V1.2 AI 伴读架构分工目标

V1.2 仍处于文档开发阶段，目标是冻结“聊天”页签的 A/B/C/D 模块分工、工作区边界和 Adapter 合同，使后续多个 Codex 终端可以独立开发：

- A：网页信息提取、过滤、蒸馏与结构化总结。
- B：结构化数据、流式文本和 Mindmap 前端实时渲染。
- C：基于结构化网页 JSON 的 Mindmap 生成与反跳来源。
- D：CoreProvider + Adapter Layer，负责可替换 Agent Core 适配、MCP / Skill / API Adapter 编排、治理桥和 ToolResult / Artifact / Event / Trace 映射。

其中 A 模块定位为 `Page Perception / AgentCore Eyes`，即 AgentCore 的眼睛。A 负责识别网页和未来媒体环境中的可读事实，并把它们转成可追踪结构化上下文；A 不负责推理、最终回答、AgenticLoop、Artifact 创建、SSE 或外部工具执行。

V1.2 允许：

- 定义轻量 MCP / Skill / API Adapter 合同。
- 单 Session 连续上下文和 checkpoint。
- 结构化网页 JSON、段落标注和 source map。
- Mindmap 节点反跳到源 paragraph/chunk。
- 规划图文网页识别、OCR、表格/代码块识别、未来视频/直播识别的合同和路线。
- 使用 `MockCoreProvider` 做合同测试和自动化 fallback。
- 将 `piAgentProvider` 作为首选 Agent Core Provider，但真实接入前必须锁定 piAgent 仓库、版本或 commit、license、运行时和工具调用模型。

V1.2 明确不做：

- 真实高风险 MCP / Skill side effect 默认执行。
- 长期记忆。
- RAG。
- 多 Agent。
- 浏览器自动操作。
- 默认本地文件读取。
- 前端绕过 D 直接调用外部服务。
- piAgent 或其他 CoreProvider 直接写 `ArtifactRecord`、SSE、EventStore、Trace 或 UI。
- A 模块默认调用 OCR、视觉模型、视频流分析、直播流分析、MCP、Skill 或外部 API。

### 5.3 A 模块感知能力路线

A 模块内部能力统一使用 `A-Vx.y-z` 编号，编号规则见 `MODULE_VERSIONING.md`。

V1.2 阶段的 A 模块规划口径：

```text
A-V1.0-0：感知合同冻结
A-V1.0-1：文本 / DOM 结构识别
A-V1.0-2：图文网页识别
A-V1.0-3：OCR 识别规划
A-V1.0-4：表格 / 列表 / 代码块识别
A-V1.0-5：页面区域与信息密度识别
```

后续媒体感知规划：

```text
A-V1.12+：视频 / 直播等未来媒体感知规划
```

OCR 规划原则：

- OCR 是感知能力，但 OCR engine 执行必须作为受控 Adapter 接入，不能由 A 模块直接绕过治理调用。
- OCR 输出必须带来源、置信度、时间或区域信息。
- 无 OCR 或视觉能力时，A 只能基于 DOM 中的 `alt`、`caption`、`title`、`aria-label`、nearby text 描述图片相关事实。
- 不得把无法识别的图片内容伪装成已理解。

视频 / 直播规划原则：

- 视频和直播识别不进入当前 V1.2 实现，只做未来合同和架构路线规划。
- 视频/直播感知必须有采样策略、延迟预算、用户授权、隐私边界和 EventStore 追踪。
- 实时识别输出不能只存在 EventStream，必须可按时间轴和 session trace 回放。

### 5.4 A-V1.2 高质量网页感知层目标

A-V1.2 的阶段定位收敛为网页感知层，不做学习产物生成。本阶段目标是让 A 模块稳定成为 AgentCore 的“眼睛”，为 B/C/D 提供高密度、可验证、可反跳的页面事实输入。

A-V1.2 必须聚焦：

```text
高质量网页感知
+ 结构化页面摘要
+ 可反跳证据
+ Debug 可验证 JSON
```

A-V1.2 采用的产品技术组合路线：

```text
DOM baseline
+ extractor ensemble
+ A-owned schema normalization
+ SourceMap / jumpback
+ Quality Evaluator
+ DebugEvidenceBundle
+ 100-page corpus gate
```

该组合路线的产品含义是：A 不是“把网页原文塞给 D/C/B”，而是先把网页转换成高信号、低噪声、可追踪来源、可机器评估的事实输入。用户在 Debug 页看到的 JSON 必须能解释“系统读到了什么、过滤了什么、为什么认为可用或不可用”；下游 D/C/B 只能消费通过质量门槛的高信号结果。

A-V1.2 必须输出或规划输出：

- `StructuredPageContext`：当前页面的结构化上下文。
- `HighSignalPageContext`：过滤噪声后的高信号页面视图。
- `PerceptionDigest`：面向下游消费的结构化页面摘要，不是最终 assistant answer。
- `SourceMap / SourceRef`：每个关键内容项的来源证据和反跳 fallback。
- `PagePerceptionQualityReport`：机器可测的质量评估。
- `DebugEvidenceBundle`：用于 Debug 页和自动验收的可解释 JSON 证据包。

A-V1.2 明确不做：

- 不生成最终回答。
- 不生成 Flashcards、Quiz、Podcast、Notebook 或学习工作台产物。
- 不生成 Mindmap；C 模块基于 A 输出生成 Mindmap。
- 不创建 `ArtifactRecord`。
- 不发 SSE。
- 不写 EventStore / Trace。
- 不做 RAG、长期记忆、多 Agent、浏览器自动操作。
- 不直接调用 MCP、Skill、外部 API、OCR、VLM、ASR、视频或直播 engine。

A-V1.2 的最终验收必须使用至少 `100` 个复杂真实网页或可复现 HTML snapshot，覆盖新闻、博客、技术文档、GitHub README、产品文档、电商页、论坛页、表格页、代码页、图片富集页、中文页和低信号页等类别。低信号页必须正确 fail/degrade，不得为了通过率伪装为 pass。

A-V1.2 的公共合同消费规则：

- `HighSignalPageContext`、`PerceptionDigest`、`SourceMap / SourceRef` 和 `PagePerceptionQualityReport` 是 D/C/B 可消费的公共合同。
- 只有 `PagePerceptionQualityReport.downstreamReadiness = "pass"` 时，D/C 才能把 high-signal 输出作为主上下文。
- `degraded` 只能作为 fallback 或 Debug evidence。
- `fail` 必须回退到 `StructuredPageContext` 或返回 `PAGE_CONTEXT_REQUIRED`，不得伪造摘要、问答或思维导图输入。

A-V1.2 的最终 corpus 验收规则：

- 最终计入的页面必须有 `snapshotPath` 或等价可复现 HTML evidence；URL-only 记录只能用于 planning。
- 最终计入的页面必须有 `goldStatus = "reviewed"` 或 `goldStatus = "semi_auto_accepted"`。
- `planned`、`annotated` 或未审阅页面不得计入最终通过率。
- 第三方 extractor 依赖在 license、体积、性能、隐私、fallback 审计未批准前不得安装或成为必需依赖。

A-V1.2 用户验收场景：

- 普通文章页：Debug JSON 能显示主要段落、关键事实、sourceRefs 和 pass 质量原因。
- 技术文档页：列表、代码块、表格或 API 参数不被压成纯文本噪声，摘要项能回指来源。
- 电商 / 论坛 / 新闻页：推荐、广告、评论、导航和 cookie banner 被过滤或降级，并在 filtered evidence 中可见。
- 图片富集页：只能基于 DOM metadata 形成图片相关事实；没有 alt/caption/nearby text 时必须标记 unknown。
- 低信号 / 登录墙 / 付费墙：必须 fail 或 degraded，不能产出看似正常的高信号摘要。

### 5.5 当前阶段：A 高信号主链路与 C Mindmap 补强

当前阶段在已存在的 A-V1.2 和 C-V1.0 基线之上继续推进，不扩大到 V2。阶段目标是：

```text
先优化 A
-> 再补强 C
-> 最后完成 AC 联动并在 Debug/侧边栏中可验收
```

本阶段必须解决的产品问题：

- A 已有 HighSignal / Digest / QualityReport 证据，但主链路仍主要消费 `StructuredPageContext`；用户难以判断“系统到底读懂了什么”。
- C 已能生成 Mermaid，但节点选择主要来自 heading / paragraph fallback，没有优先使用 A 的高信号 digest 和 SourceRef。
- Debug 体验需要能同时查看 A 的结构化感知结果和 C 的思维导图来源，形成可人工快速验收的阅读证据链。

本阶段用户可见目标：

- 用户读取网页后，Debug 页能展示 A 的 `StructuredPageContext`、`HighSignalPageContext`、`PerceptionDigest`、`SourceMap` 和 `PagePerceptionQualityReport`。
- 用户点击 Mindmap 后，C 优先使用 A 的 `PerceptionDigest` 和 `SourceMap / SourceRef` 生成节点，而不是只依赖标题树。
- Mindmap 每个主要节点都能回指 A 的 `sourceRefs`；DOM 跳转失败时仍可展示 `textQuote` 或 `fallbackText`。
- 缺少页面上下文、A 质量为 `fail` 或来源证据不足时，不生成假摘要、假回答或假思维导图。

本阶段明确不做：

- 不新增 RAG、长期记忆、多 Agent、浏览器自动操作、联网搜索、OCR/VLM/ASR/video/live engine。
- 不让 A 创建 `ArtifactRecord`、SSE、EventStore 或 Trace。
- 不让 C 自行抽取网页正文；C 只能消费 A/Runtime 提供的结构化页面事实。
- 不把 piAgent 真实接入质量作为本阶段完成条件；D 只负责保持 CoreProvider / Adapter Layer 边界不被 A/C 绕过。

### 5.6 V1.2-AC-Native 原生侧边栏体验稳定化目标

V1.2-AC-Native 是当前 AC 联动之后的体验验收补强阶段。它不重开 A/C/D 功能范围，目标是把已经在 direct extension page 中跑通的 A/C/D/B 功能链路，稳定落到真实 Chrome 原生 Side Panel 用户体验中。

本阶段的产品目标：

```text
真实网页标签页
  + Chrome 原生右侧 Side Panel
  + Navia 聊天 / Debug / Mindmap
  + 读取当前页面、提交上下文、总结、问答、Mindmap、刷新恢复
```

V1.2-AC-Native 必须解决：

- 用户通过 Chrome 扩展 action 或快捷键稳定打开 Navia 原生 Side Panel。
- 截图证据必须同时显示真实网页与右侧 Navia Side Panel。
- Side Panel 窄宽度下，`读取当前页面`、`提交上下文`、`总结`、`Mindmap` 等入口必须可见、可滚动、可操作。
- Debug 页必须能在原生 Side Panel 中展示页面读取状态、A perception 状态和必要的 source / quality 信息。
- 摘要、页面问答、Mindmap 必须在原生 Side Panel 容器内完成，而不是在全屏 `chrome-extension://.../sidepanel.html` 页面中完成。
- 刷新或重开 Side Panel 后，Runtime session / activePage 状态必须可恢复或给出明确失败提示。

本阶段明确不声明：

- 不声明完整 V1.2 complete。
- 不声明完整 V1 complete。
- 不声明 A-V1.2 100-page production gate 已完成。
- 不以 direct extension page 代替原生 Side Panel 用户体验验收。
- 不引入 RAG、长期记忆、多 Agent、浏览器自动操作、语音、桌宠、PPT 或深度研究。

V1.2-AC-Native 的成功定义：

```text
用户能在真实网页右侧打开 Navia 原生 Side Panel，
并在同一个 Side Panel 中完成读取、Debug、总结、问答、Mindmap 与恢复的核心路径；
所有通过声明都有截图、截图 metadata、Runtime API、native-ux 测试或结构化 blocker 支撑。
```

### 5.7 V1.2-AC-Quality A/C 质量深化目标

V1.2-AC-Quality 是 V1.2-AC-Native 之后的 A/C 质量深化阶段。它不重做原生 Side Panel 容器，不扩大 D/B 职责，目标是把当前已能在原生 Side Panel 中跑通的 A/C 功能链路，提升为更稳定、可解释、可反跳、可扩展验收的真实网页伴读能力。

本阶段目标：

- A 模块继续作为 AgentCore 的“眼睛”，聚焦高质量网页感知、结构化页面摘取、可反跳证据和 Debug 可验证 JSON。
- C 模块继续作为思维导图生成服务，优先消费 A 的 `PerceptionDigest`、`SourceRef` 和 `QualityReport`，生成 digest-first Mermaid mindmap。
- AC 联动必须在 Runtime 主链路中可见，不得只停留在离线 evidence。
- Debug 必须让开发者和验收者快速判断 A 是否提取出高质量内容、C 是否真正使用 A 的 digest/source，而不是 heading-only fallback。
- 真实网页验收样本必须继续扩展，覆盖中文复杂页、图文混排页、技术文档、README、低信号页和长内容页。

本阶段用户可见体验目标：

- 用户在真实网页右侧打开 Navia 原生 Side Panel 后，可以读取当前页面。
- Debug 能用摘要卡片说明 A 的页面质量状态、digest 质量、sourceRef 覆盖和低信号降级原因。
- 用户触发 Mindmap 后，C 输出的 Mermaid 能在 Side Panel 中展示；如果降级，则能看到 fallback 原因和可读 source fallback。
- 验收者能通过 HTML 报告快速看到每个网页的截图、URL、A quality、C nodeSourceMap、source fallback 和最终结论。

本阶段样本要求：

- 至少 `12` 个真实网页或可复现 snapshot 进入样本矩阵。
- 至少覆盖 `6` 类页面：中文复杂页、图文混排页、技术文档、GitHub README、低信号页、长内容页。
- 至少 `5` 个页面必须在真实 Chrome 原生 Side Panel 中完成读取 -> Debug -> Mindmap -> source fallback 验收。
- 每个计入通过的页面必须有 URL 或 `snapshotPath`、category、expectedRisk、runtime evidence、截图、metadata 和结论。

本阶段成功定义：

```text
真实网页 / snapshot
-> A StructuredPage + HighSignal + PerceptionDigest + SourceMap + QualityReport
-> D ToolResult / Artifact / Event / Trace 映射
-> C digest-first Mermaid + nodeSourceMap
-> B Debug / Mindmap / Source fallback 可复核
-> HTML 验收报告和 false-green audit 可追溯
```

本阶段不得声明：

- 完整 V1.2 complete。
- A-V1.2 100-page production gate complete，除非单独跑完 A-V1.2 100-page gate。
- 最终网页内悬浮球 / 双轨面板体验 complete。
- RAG、长期记忆、多 Agent、浏览器自动操作、OCR/VLM/ASR/video/live engine ready。

本阶段完成后只能声明：

```text
V1.2-AC-Quality 阶段 A/C 质量深化与真实网页扩展通过。
```

### 5.8 V1.2-AC-Jumpback MVP 来源反跳最小闭环目标

V1.2-AC-Jumpback MVP 是 V1.2-AC-Quality 之后的 C/B/Integration 体验补强阶段。它不重做 A 的感知质量，也不扩大 D 的 CoreProvider 范围，目标是把 C 已生成的 `nodeSourceMap`、`sourceRefIds`、`fallbackText` 和 `jumpback` 元数据变成用户可操作的最小反跳闭环。

本阶段目标：

- C 模块生成稳定 Mermaid node id，并能与 `MindmapNodeSourceMap` key 一一对应。
- B 模块在用户点击 Mindmap 节点时展示来源证据卡片。
- Content script 在用户触发后尝试基于 `selector`、`domPath` 或 `textQuote` 定位网页来源。
- DOM 定位成功时滚动并临时高亮来源；失败时展示 `fallbackText` / `textQuote` 和结构化失败原因。
- Debug / HTML 报告能让验收者看清每次点击使用了什么定位方式、是否成功、失败时如何降级。

本阶段用户可见体验目标：

- 用户打开真实网页右侧的 Navia Side Panel。
- 用户生成 Mindmap。
- 用户点击一个 Mindmap 节点。
- Side Panel 展示该节点的来源证据卡片。
- 如果来源 DOM 可定位，网页滚动并高亮到对应内容；如果不可定位，Side Panel 展示可读 fallback evidence。

本阶段不得声明：

- Monica 级复杂网页精准反跳完成。
- 完整 V1.2 complete。
- 完整 V1 complete。
- PDF / OCR / 视频 / 直播反跳完成。
- RAG、Memory、Web Research、PPT 或浏览器自动操作 ready。

本阶段完成后只能声明：

```text
V1.2 Mindmap source fallback and basic jumpback MVP complete.
```

---

## 6. V1 非目标

V1 明确不做：

- 完整个人知识库。
- 自动保存所有网页。
- 多网页 RAG。
- 长期记忆管理。
- MCP 直连；V1.2 仅允许通过 D 模块定义受控 Adapter 合同。
- Skills 直连；V1.2 仅允许通过 D 模块定义受控 Adapter 合同。
- 多 Agent 编排。
- 浏览器自动点击和自动操作。
- 深度研究。
- PPT 生成。
- 观赛 / 观影 / 直播实时理解。
- 桌面宠物。
- 云端账号系统。
- 移动端同步。
- 默认读取本地文件。
- 划词菜单、网页内右键菜单、全局搜索框、多窗口停靠等复杂入口。

---

## 7. 用户画像

### 7.1 研究型阅读用户

经常阅读文章、论文、技术博客、产品文档，希望快速理解并追问细节。

典型问题：

- 这篇文章讲了什么？
- 核心观点有哪些？
- 这段话什么意思？
- 能不能生成一张思维导图？
- 这篇文章对我的项目有什么启发？

### 7.2 开发者 / 产品经理

经常浏览技术文档、GitHub README、产品说明、竞品页面。

典型问题：

- 总结这个项目的架构。
- 这个 API 怎么用？
- 帮我把这篇文档整理成开发计划。
- 生成 Mermaid mindmap。

### 7.3 知识管理用户

希望将浏览内容逐步沉淀为个人知识资产。V1 先关注 Session 质量，V2 再做长期知识库。

典型需求：

- 保存这次阅读上下文。
- 下次打开还能看到这次 Session。
- 保留生成的摘要和思维导图。

---

## 8. 核心用户故事

### 8.1 网页伴读摘要

作为用户，我打开一篇文章后，希望通过网页边缘悬浮球展开 AI 面板并点击“总结”，AI 能基于当前网页生成结构化摘要，而不需要我复制粘贴正文。

验收：

- 能显示当前网页 title / url / domain。
- 能抽取正文或可用文本。
- 能生成 TL;DR / 结构化摘要 / 要点式摘要。
- 摘要 Artifact 写入 Session。

### 8.2 当前网页问答

作为用户，我希望直接问“这篇文章里的主要论点是什么”，系统能基于当前网页回答。

验收：

- 用户输入进入 AgentCore。
- IntentRouter 识别 `ask_page`。
- 调用 `answer_from_page` 工具。
- 回答能追踪到 pageRef / chunkRef。
- 当前网页没有足够信息时，应明确说明不足。

### 8.3 选区解释

作为用户，我希望选中网页中的一段内容并让 Navia 解释。

验收：

- Content Script 能读取 selectedText。
- IntentRouter 识别 `explain_selection`。
- 回答优先基于选区和附近上下文。

### 8.4 Mermaid 思维导图

作为用户，我希望一键把当前网页转成 Mermaid mindmap 并预览。

验收：

- 后端生成 Mermaid mindmap 源码。
- Mermaid 语法可渲染。
- 节点层级和数量受限。
- 校验失败自动修复一次。
- 修复失败返回可读错误。

### 8.5 语音输入

语音输入是 V1.x 增强能力，不阻塞 V1 complete 的 Chrome 文字对话验收。

作为用户，我希望点击麦克风，用语音提问当前网页。

验收：

- 浏览器采集音频。
- 后端调用 FunASR 返回 transcript。
- transcript 作为 user message 进入 Session。
- AgentCore 按普通文本输入处理。

### 8.6 可观测 Agent

作为开发者，我希望看到 Agent 当前状态、工具调用、预算消耗和事件流。

验收：

- 前端或调试面板能看到状态流。
- 每次状态迁移写 EventLog。
- `/v1/agent/state-machine/mermaid` 输出状态图。
- `/v1/sessions/{session_id}/trace` 输出本次 Session 追踪。

---

## 9. 功能需求

### 9.1 Chrome Extension

#### 页面内交互 Shell

前端页面体验必须完全对齐 `docs/active/project/interaction-prd/窗口交互_PRD.md`。

必须支持：

- 页面边缘 AI 悬浮球。
- 悬浮球上下拖动与贴边。
- hover 高亮和伸出小长条。
- 点击小长条展开网页内 AI 面板。
- 左轨悬浮球 / avatar。
- 右轨 Chatbox。
- 窄距 `440px` 挤压网页。
- 半屏 `50vw` 挤压网页。
- 超过 `52vw` 覆盖网页，最大 `80vw`。
- 拖回 `<48vw` 恢复挤压式。
- 面板左边界 resize handle。
- 点击悬浮球或收起按钮关闭面板并恢复网页布局。
- Chatbox。
- 当前页面信息。
- 摘要卡片。
- Mermaid mindmap 预览。
- 语音输入按钮。
- Agent 状态。
- 当前预算消耗。
- 错误与重试入口。

Chrome Side Panel 允许保留为内部调试或兼容入口，但不得替代 V1 页面内交互验收。

约束：

- UI 不直接调用模型。
- UI 不保存 Agent 核心状态。
- UI 只调用 Local Runtime API。
- 网页内面板通过 SSE 消费 `/v1/chat/stream`；Agent events 后续可复用 SSE 或扩展 WebSocket。

#### Content Script

必须支持：

- 读取 title / url / domain。
- 抽取 headings。
- 抽取 visibleText。
- 抽取 selectedText。
- 生成 cleanedText。
- 计算 contentHash。
- 发送 PageContext 到 Local Runtime。

V1 优先支持：

- 普通文章页。
- 博客页。
- 新闻页。
- 技术文档页。
- GitHub README 类页面。
- 产品介绍页。

暂不保证：

- PDF 完整解析。
- Canvas 渲染内容。
- 视频字幕。
- iframe-heavy 页面。
- 登录态复杂应用。

### 9.2 Local Headless Runtime

必须提供：

- HTTP API。
- `/v1/chat/stream` 使用 SSE；Agent events 可先用 SSE，ASR 保留 WebSocket 扩展点。
- SessionStore。
- EventLog。
- AgentCore。
- ToolRegistry。
- ModelAdapter。
- Governance Plane。
- Observability Plane。

基础 API：

```text
GET  /v1/health
GET  /v1/models/status
POST /v1/sessions
GET  /v1/sessions/{session_id}
POST /v1/page/context
POST /v1/chat/stream
POST /v1/page/summarize
POST /v1/page/mindmap
WS   /v1/asr/stream
WS   /v1/agent/events
GET  /v1/agent/state
GET  /v1/agent/state-machine/mermaid
GET  /v1/sessions/{session_id}/trace
```

运行约束：

- 默认只监听 localhost。
- 默认只绑定 `127.0.0.1`，不得监听 `0.0.0.0`。
- CORS / Origin allowlist 只允许 Chrome extension origin 和明确配置的 localhost dev origin。
- 普通日志不得打印完整网页正文、选区全文或 transcript 全文。
- 默认不暴露公网。
- 默认不读取本地文件。
- 默认不调用远程模型，除非显式配置。
- 所有工具调用必须通过 Governance Plane。

### 9.3 AgentCore

V1 AgentCore 采用可替换 CoreProvider 策略。V1.2 首选 `piAgentProvider`，但 piAgent 不得直接写 Navia 的 Artifact、SSE、EventStore、Trace 或 UI；所有 Core 输出必须经 D Adapter Layer 映射为 Navia 合同。真实接入前必须完成 piAgent 仓库、版本或 commit、license、运行时和工具调用模型锁定。

保留：

- Agentic Loop。
- Tool Registry。
- Message History。
- Event Stream。
- State Management。
- PreToolUse / PostToolUse Hook。
- Budget Control。
- Permission Gate。
- Trace。

不接入：

- MCP。
- Skills。
- 长期记忆。
- 多 Agent。
- Shell 执行。
- 自动文件系统搜索。
- 自动浏览器操作。

### 9.4 Intent Router

支持意图：

```text
summarize_page
ask_page
explain_selection
generate_mindmap
extract_key_points
voice_command
unknown
```

输出格式：

```json
{
  "intent": "summarize_page",
  "confidence": 0.91,
  "requires_page_context": true,
  "requires_selection": false,
  "tool": "summarize_page",
  "arguments": {
    "style": "structured"
  }
}
```

策略：

- V1 可先用 rule-based + local small model。
- JSON schema 校验必须存在。
- confidence 低时进入 fallback，不应盲目调用高成本工具。

### 9.5 工具清单

V1 默认允许：

```text
read_current_page
summarize_page
answer_from_page
explain_selection
generate_mindmap
asr_transcribe
```

V1 默认禁用：

```text
read_local_file
search_local_workspace
shell
browser_click
browser_automation
network_crawl
```

### 9.6 单 Session 管理

V1 不做长期记忆，但必须把单 Session 做实。

质量要求：

- 刷新网页或重新展开网页内面板后 Session 不丢。
- 每轮问答能追溯到 PageContext。
- 每次工具调用可追踪。
- 每个 Artifact 可追溯到来源网页。
- 长对话支持 checkpoint 压缩。
- 预算消耗进入 budget ledger。
- EventLog 可重建一次 turn。

---

## 10. 非功能需求

### 10.1 隐私

- 默认本地运行。
- 默认不读取本地文件。
- 默认不自动保存所有网页。
- 页面内容只在用户打开插件或触发操作时进入 Runtime。
- 外部模型调用必须明确配置。
- 用户可清空 Session。

### 10.2 性能目标

- 悬浮球首次注入时间 < 1s。
- 网页内 AI 面板展开时间 < 1s。
- 普通文章 PageContext 抽取 < 2s。
- Intent 检测 < 1s。
- 摘要首 token 延迟 < 5s。
- Mindmap 生成 < 20s。
- ASR 短语音转写 < 5s。

### 10.3 可用性

- Local Runtime 不可用时，插件提示启动本地服务。
- 模型不可用时，展示模型状态。
- FunASR 不可用时，禁用语音按钮。
- Mermaid 渲染失败时展示源码和错误。

### 10.4 可扩展性

- Chrome Extension、Web、App 共用 Runtime API。
- AgentCore 与模型解耦。
- AgentCore 与工具解耦。
- Session Plane 可升级为 V2 Memory Plane。
- Governance Plane 可升级为 V4 Approval / Task Safety Gate。

### 10.5 可测试性

- 状态机 transition table 可测试。
- Tool call 可 mock。
- Model adapter 可 mock。
- Session replay 可测试。
- Event schema 可测试。
- Budget exhaustion 可测试。
- Permission denial 可测试。

---

## 11. 成功指标

V1 成功不是功能数量，而是底座质量。

### 用户价值指标

- 用户可在当前网页内嵌 AI 面板完成摘要、问答、mindmap。
- 用户不需要复制粘贴正文。
- 用户能看到 Agent 正在做什么。
- 用户能控制是否继续高成本操作。

### 工程质量指标

- 状态机可视化。
- 事件流可追踪。
- 单 Session 可恢复。
- 工具调用有预算和权限监督。
- Runtime API 可被 Chrome/Web/App 复用。

---

## 12. V1 结论

## 13. V1.2 Closeout 收关目标

`V1.2-Closeout` 是 V1.2-AC-Jumpback MVP 之后的生产级完成声明前收关阶段。它不新增产品大能力，不把 V1.2 扩大为 RAG、长期记忆、Web Research、浏览器自动操作、PPT 或 Deep Research；它只把已完成的 A/C/D/B 主链路从“阶段性可用”推进到“可用真实证据声明 V1.2 完成”。

### 13.1 用户体验目标

用户在真实 Chrome 原生 Side Panel 中可以完成：

```text
打开真实网页
-> 读取当前页面
-> 查看 Debug JSON / A quality / sourceRefs
-> 生成摘要或问答
-> 生成 Mindmap
-> 点击 Mindmap 节点或来源入口
-> 网页正文滚动 / 高亮到对应来源
-> 定位失败时看到清晰 fallback evidence 和失败原因
```

### 13.2 收关范围

必须补强：

- 真实 Chrome 中的 Jumpback 截图级验收。
- A SourceRef / selector / textQuote / fallbackText 质量提升。
- 更多真实网页 Jumpback 样本覆盖。
- Mindmap 节点点击、hover / selected 状态、证据面板和失败提示细化。
- V1.2 complete 声明前的 PRD 复检、false-green audit 和出门报告。

不得声明：

- Monica 级所有网页精准反跳。
- OCR / 视频 / 直播 / PDF / iframe / shadow DOM / 虚拟列表完整反跳。
- RAG、长期记忆、Web Research、PPT、Deep Research、桌宠或多 Agent ready。
- 完整 V1 网页内双轨交互体验完成。

### 13.3 完成声明

只有 `V1.2-Closeout` 通过后，才允许声明：

```text
V1.2 AI Reading mock-first product path complete.
```

即便通过，也仍不得声明完整 V1 complete；V1 complete 仍依赖最终网页内交互体验与全量 PRD A-F 状态验收。

---

## 14. V1.3 Evidence Card Mindmap 体验升级目标

`V1.3` 是 V1.2 AI Reading mock-first product path 完成后的思维导图体验升级阶段。本阶段不新增 RAG、长期记忆、Web Research、PPT、Deep Research、多 Agent 或浏览器自动操作；它只把当前偏 Mermaid 默认渲染的 Mindmap 升级为 Navia 自有的 `Evidence Card Mindmap` 主体验。

### 14.1 用户体验目标

用户在真实 Chrome 原生 Side Panel 中可以完成：

```text
读取当前网页
-> 生成 Mindmap
-> 看到 Evidence Card 风格的结构化导图
-> 点击节点
-> 节点进入 selected 状态，相关边线 / 邻接节点高亮
-> source evidence panel 展示 textQuote / fallbackText / sourceRefIds
-> 用户触发定位时，网页正文 DOM highlight 或显示 fallback evidence
```

### 14.2 节点体验要求

每个主要节点应是可读的证据卡片，而不是单纯 Mermaid 文本节点。卡片至少表达：

- 节点标题。
- 一句话摘要或 note。
- 来源数量。
- 置信度 / quality 提示。
- 标签或节点类型。
- hover / focus / selected 状态。
- 来源缺失或降级原因。

### 14.3 渲染策略

V1.3 采用双轨渲染：

```text
主视图：Evidence Card Mindmap
降级：Mermaid visual / Mermaid source / source fallback
```

Mermaid 继续作为可审计 source 和 fallback，不再作为 V1.3 的体验上限。

### 14.4 边界

V1.3 不改变 A/C/D 的核心职责：

- A 仍只负责 page perception / digest / sourceRefs / qualityReport。
- C 仍只负责 mindmap tree、Mermaid source、nodeSourceMap 和 validation。
- D 仍是 ToolResult / Artifact / Event / Trace 唯一出口。
- B 只负责 Evidence Card Mindmap 渲染和用户触发的 source interaction。

V1.3 完成后只允许声明：

```text
V1.3 Evidence Card Mindmap experience complete.
```

不得声明完整 V1 complete、Canvas Knowledge Map complete、V2 Memory / RAG ready 或 V4 Web Research / PPT / Deep Research ready。

### 14.5 本阶段开发目标和验收计划

用户已确认 V1.3 作为当前阶段目标。本阶段开发和验收以 `docs/active/project/stage-gates/v1.3-evidence-card-mindmap.md` 为门禁入口，并以以下六个子阶段组织：

| 子阶段 | 产品目标 | 出门条件 |
|---|---|---|
| `V1.3-0` | 冻结 Evidence Card view model、schema、截图证据、No-Go 和报告口径 | PRD / 架构 / 验收计划 / gap 图完成一致性审计，无 fatal / major |
| `V1.3-1` | B 从既有 Mindmap Artifact 和 `nodeSourceMap` 派生 EvidenceCardViewModel | normal、missing source、duplicate label、long text fixture 通过 |
| `V1.3-2` | Evidence Card 卡片树、视觉 token、边线层级和窄 Side Panel 可读性 | 截图证明无文本溢出、遮挡、节点重叠或不可读 |
| `V1.3-3` | hover、focus、selected、neighbor highlight 和 source evidence panel | 点击任一主要节点后来源证据可稳定展示 |
| `V1.3-4` | 复用 V1.2 Jumpback / fallback，区分 DOM success、fallback shown、blocked | UI、截图 metadata 和 report.json 三处状态一致 |
| `V1.3-5` | 真实网页 / snapshot 验收矩阵、PRD 复检、false-green audit、HTML 报告 | 至少 8 页矩阵，至少 3 个真实 Chrome 原生 Side Panel 截图级样本 |

本阶段必须优先补齐的体验质量问题：

- C 语义标签压缩：长 digest 句子必须变成卡片可读标签，原始证据仍保留在 source / fallback 字段。
- C 主题归并质量：digest 节点应归入可解释主题，避免大量平级长节点。
- B Mindmap 可读性：窄 Side Panel 中保持两级结构、密度提示、折叠和来源证据可读。
- Source interaction 可信度：DOM highlight 成功、fallback、blocked 必须严格区分，不能把 fallback 伪装成成功。
- 验收证据可信度：截图、HTML 报告、JSON 结论和 PRD 复检必须相互一致。

当前已有实现可作为 V1.3 基线，但不能替代出门验收。只有 `V1.3-0` 到 `V1.3-5` 全部证据闭环后，才能声明 `V1.3 Evidence Card Mindmap experience complete`。

### 14.6 长期规划

长期 Mindmap / Knowledge Map 路线：

```text
V1.3：Evidence Card Mindmap，提高当前单页导图质感、可读性和可验证性。
V1.4 / V1.x：双栏阅读地图，把 Mindmap 变成 Side Panel 伴读导航。
V2：Canvas Knowledge Map，承接多网页知识卡、会话沉淀和本地知识库。
V4：研究任务图谱 / PPT Agent 图谱，承接深度研究和个人秘书能力。
```

### 14.7 V1.4 Reading Map Side Panel Navigation

V1.4 承接 V1.3 Evidence Card Mindmap，不改变 A/C/D 合同，不引入 Canvas / Memory / RAG / Web Research / PPT / Deep Research。阶段目标是把 Evidence Card Mindmap 从“会话中的一张导图结果”升级为 Side Panel 内可连续使用的阅读地图导航。

目标用户路径：

```text
读取当前网页
-> 生成 Mindmap
-> Side Panel 显示 Reading Map 双栏视图
-> 左栏选择主题 / 节点
-> 右栏展示节点摘要、来源数量、质量状态、textQuote / fallbackText
-> 用户触发 source jumpback
-> UI 明确区分 located / fallback shown / blocked
```

V1.4 只允许声明：

```text
V1.4 Reading Map Side Panel navigation experience complete.
```

不得声明完整 V1 complete、Canvas Knowledge Map complete、V2 Memory / RAG ready 或 V4 Web Research / PPT / Deep Research ready。

V1 的核心原则：

```text
先做可控 Agent，再做聪明 Agent。
先做单 Session 质量，再做长期记忆。
先做 Headless Runtime，再做多端 UI。
先做状态机和监督，再做复杂任务执行。
```

### 14.8 V1 Gemini Style Pass 当前侧边栏体验优化

`V1 Gemini Style Pass` 是 V1.3 / V1.4 体验闭环后的当前前端体验质量阶段。它把 Gemini 审查原型中已认可的视觉语言、按钮设计、状态反馈和当前网页上下文呈现迁移到真实 Chrome extension sidepanel，但不扩大产品交互范围。

本阶段目标体验：

```text
用户打开当前右侧 Navia sidepanel
-> 看到清晰的 Navia 品牌、Runtime 状态、历史会话入口和当前网页上下文状态
-> 使用现有按钮完成读取网页、提交上下文、总结、问答、Mindmap、解释选区
-> 在 Chat artifact 中查看 Evidence Card Mindmap、Reading Map 和 Source Evidence
-> 能清楚区分 located、fallback shown、blocked 等来源证据状态
-> Debug / Settings 仍可用但不抢占主阅读流程
```

本阶段必须保持：

- 当前真实产品页面结构仍是 `Chat / Agent / Debug / Settings`。
- Mindmap、Reading Map、Source Evidence 仍属于 Chat artifact 内体验。
- Agent 仍是能力边界占位，不声明多 Agent 能力。
- Runtime public API、Artifact 合同、EvidenceCardViewModel、ReadingMapViewModel 不变。
- Chrome content script 当前右侧 iframe sidebar 行为不变。

本阶段不得引入：

- 新的真实 Map / Sources 顶层产品页。
- 真实 floating ball、hover strip、collapse handle、drag resize、overlay breakpoint。
- RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作产品能力或默认本地文件读取。

本阶段允许声明：

```text
V1 Gemini style pass for current sidebar baseline complete.
```

不得声明：

```text
完整 V1 complete。
最终 Monica-like floating ball / collapse / resize UX complete。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

### 14.9 V1 Launcher / Collapse / Resize 交互基线

用户已确认将 Gemini 原型中的 launcher、折叠、resize、拖拽和状态机提升为当前真实前端体验目标。本阶段在 content script 页面层实现交互外壳，sidepanel iframe 内的 Chat / Agent / Debug / Settings、Mindmap、Reading Map、Source Evidence 体验保持不变。

目标用户路径：

```text
普通网页打开
-> Navia 默认只显示贴边 launcher，不展开 sidebar，不挤压正文
-> 用户 hover 或键盘 focus 后 launcher 从边缘弹出为完整悬浮球
-> 用户点击 floating launcher 展开右侧 sidebar
-> 展开后再次点击 launcher 收起 sidebar，页面恢复可用宽度
-> 用户拖拽 launcher 调整位置并贴边
-> 用户拖拽 sidebar 左边界调整宽度
-> 宽工作区或窄视口进入 overlay，不继续挤压正文
```

不得引入 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作产品能力或默认本地文件读取。

### 14.10 V1 Mainline Closeout Candidate 主线收口目标

`V1 Mainline Closeout Candidate` 是当前 V1 主线的总收口阶段。它不新增 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作产品能力或默认本地文件读取；它把已经规划或已实现的 V1.3、V1.4、复杂站点读取 hardening、Gemini 样式、Launcher / Collapse / Resize 统一到一个可审计的用户体验和出门证据链。

目标用户路径：

```text
普通网页打开
-> Navia floating launcher 以贴边低打扰形态可见
-> 用户 hover / focus 后 launcher 弹出
-> 用户点击 launcher 展开右侧 Navia sidebar
-> 用户再次点击 launcher 折叠 sidebar，页面恢复宽度
-> 用户可拖拽 launcher 调整位置，拖拽 sidebar 左边界 resize
-> 用户读取当前网页
-> Chat 中完成总结、页面问答、Mindmap
-> Mindmap 以 Evidence Card / Reading Map 为主体验
-> 用户点击节点或来源
-> 当前网页 DOM 可定位则高亮，失败则展示 fallback evidence，blocked 则明确说明
-> Debug / Settings 仍可用于诊断和配置
```

本阶段必须整合的已有阶段能力：

| 能力 | 当前完成口径 | V1 主线收口要求 |
|---|---|---|
| `V1.3 Evidence Card Mindmap` | 可声明 V1.3 experience complete 时，只代表 Mindmap 主体验闭环 | 作为 V1 Chat artifact 的主导图体验进入总验收 |
| `V1.4 Reading Map` | 可声明 V1.4 Side Panel navigation complete 时，只代表阅读地图闭环 | 作为 Mindmap 的连续伴读导航进入总验收 |
| `V1 Complex Site Reading Hardening` | scoped matrix 通过只代表限定站点矩阵 | public no-login 与登录态边界必须写清，不得冒充全站高质量 |
| `V1 Gemini Style Pass` | 只代表当前 sidebar 视觉和按钮系统完成 | 作为统一视觉语言进入总体验收，不扩大产品范围 |
| `V1 Launcher / Collapse / Resize` | 只代表外层 content script 交互壳完成 | 必须完成正式 closeout 证据，证明不破坏读取、问答、导图和 source jumpback |

本阶段允许声明：

```text
V1 mainline closeout candidate passed automated acceptance.
```

只有在自动化验收、PRD 复检、false-green audit、复杂站点边界说明和人工产品体验核查全部通过后，才允许进入完整 V1 complete 候选审计。

本阶段完成后的用户可见效果必须是：

- 普通网页中 Navia 以插件伴随形态出现，而不是独立营销页或只存在于 Chrome 原生 Side Panel。
- 用户可以通过默认贴边的 floating launcher 感知 Navia 状态，hover / focus 后弹出完整入口，并完成展开、折叠、拖拽、resize 后继续阅读原网页。
- 右侧 sidebar 内的 Chat / Agent / Debug / Settings 入口仍然可发现，不能被视觉优化或布局状态遮挡。
- 用户可以在同一条体验链中完成读取当前页、提交上下文、总结、问答、生成 Mindmap、查看 Evidence Card / Reading Map。
- source evidence 必须给用户明确反馈：能定位时高亮网页正文，不能定位时展示 fallback evidence，被页面或策略阻止时说明 blocked。
- B站 / 小红书 / 观察者网等复杂中文站点的验收结果必须让人类能看出是 public no-login 还是 logged-in，不允许把公开态样本解释成登录态质量通过。

本阶段不得声明：

```text
完整 V1 complete。
最终 Monica-like UX complete。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

完整 V1 complete 的剩余硬门槛：

- Launcher / collapse / resize 必须有正式验收报告，而不是仅有视觉 probe。
- 真实 Chrome 截图必须覆盖普通网页中的 launcher、展开、折叠、resize、overlay 或 push、Chat、Debug、Settings、Evidence Card、Reading Map、source evidence。
- B站 / 小红书 / 观察者网等复杂中文站点必须区分 public no-login 验收和登录态体验核查。
- 旧的失败 closeout 证据必须被重新生成、明确废止或在总报告中解释，不能与新的完成声明并存。
- V1 结束前必须安排人工产品体验核查。

当前自动化证据如果通过，只能进入人工产品体验核查；人工核查未完成时，项目状态仍是 `V1 mainline closeout candidate`，不是 `完整 V1 complete`。
