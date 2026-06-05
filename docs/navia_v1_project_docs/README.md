# Navia / 伴航 V1 项目文档包

本文档包用于将前期讨论沉淀为 Codex 可对齐、可拆解、可验收的工程基线。

## 项目命名

- 英文名：Navia
- 中文名：伴航
- 桌宠 / 角色名建议：小航
- V1 产品形态：Chrome Extension 页面内悬浮球 + 网页内 AI 双轨面板 + Local Headless Runtime
- V1 核心能力：可安装 Chrome 插件、网页贴边悬浮球、hover 小长条、网页内 AI 双轨聊天面板、窄距/半屏挤压网页、宽工作区覆盖网页、网页伴读、单 Session 高质量文字对话、摘要、问答、Mermaid 思维导图、本地意图识别、可观测 AgentCore、预算与权限监督

## 当前规划决策

截至 2026-05-31，V1 规划阶段已锁定以下工程决策：

- V1 Local Runtime 使用 Python 快速原型实现，优先服务 MVP 基础功能 Demo 验证。
- V1 AgentCore 后端采用可分工的模块化结构，方便团队内按 API、AgentCore、Governance、Session、ModelAdapter 等边界拆分。
- Chrome 插件优先采用 WXT + React + TypeScript。
- 所有前端页面体验、插件入口、悬浮球、网页内面板、挤压/覆盖/resize 交互，全部以仓库根目录 `PRD/窗口交互_PRD.md` 为准。
- 第一轮底座落地范围限定为 V1.0-0/A/B/C：Contracts & Runtime Skeleton、AgentCore Baseline、状态机与可观测、Governance / Budget Supervisor。
- 既有 Chrome Side Panel 只作为工程调试入口 / 兼容承载 / 过渡实现，不再作为 V1 前端体验验收口径。
- V1 complete 的用户可见门槛是：开发者能在 Chrome 中安装 unpacked extension，在普通网页内看到贴边悬浮球，完成 hover 预展开、网页内 AI 双轨面板展开、挤压/覆盖/resize、收起恢复，并基于当前网页完成基础文字对话。
- V1.1 阶段目标是前端体验高保真：在不重开 Runtime / AgentCore / API 合同的前提下，将 V1.0 页面内交互骨架升级为可对照 Figma 原型、可截图回归、可真实 Chrome 复验的产品级界面。
- V1.2 阶段当前仍是文档开发阶段：先冻结 AI 伴读 A/B/C/D 模块分工、工作区边界、Adapter 合同和独立 Codex 终端开发规则，再进入实质开发。
- V1.2 D 模块采用 CoreProvider 可替换策略：piAgentProvider 为首选实现目标，MockCoreProvider 用于测试 fallback，D 重点开发适配层、治理桥、ToolResult / Artifact / Event / Trace 映射。
- 审计后采用 `Go, but contract-first`：先冻结 API/Event/State/Tool/Budget/Error/ID/SSE 合同，再写 AgentCore。
- 后续 V1 子阶段采用阶段门禁执行：每阶段开发前必须单独形成开发计划、验收标准和审计意见；闭环所有致命或重大风险后才能进入实质开发；阶段完成后必须使用真实数据完成端到端验收和 PRD 规格复检。
- V1 结束后，在进入 V2 研讨前重新评估 Runtime 语言栈、插件框架和长期架构是否需要调整。

## 文档列表

| 文件 | 用途 |
|---|---|
| `01-prd.md` | 完整 PRD：产品定位、用户、范围、功能、非功能、版本路线 |
| `02-architecture.md` | 架构设计：设计平面、组件、AgentCore、状态机、数据/API、治理与观测 |
| `03-development-plan.md` | 开发计划大纲：V1.0-0 到 V1.0-H 分阶段任务、边界和交付物 |
| `04-acceptance-plan.md` | 目标验收文档：每个模块的验收标准、测试清单、Go/No-Go gate |
| `05-codex-alignment-checklist.md` | 给 Codex 终端使用的逐项对齐清单 |
| `06-api-contract.md` | V1 API 与事件合同草案 |
| `07-data-models.md` | V1 核心数据模型与存储建议 |
| `08-open-questions.md` | 当前已决策、待复盘和仍未完全确定的问题 |
| `09-project-onboarding-map.md` | 面向新开发者的项目上手总览与 Draw.io 图谱说明 |
| `09-project-onboarding-map.drawio` | 目标架构、开发计划、验收路标、V1-V5 里程碑多页图谱 |
| `10-v1-stage-gate-execution-protocol.md` | V1 阶段门禁执行协议：阶段计划、审计、真实数据验收、PRD 复检和人类确认边界 |
| `11-mercury-remote-doc-merge-report.md` | Mercury 远端 README / PRD 与本地 Navia 文档的合并报告 |
| `12-interaction-prd-authority-and-revised-plan.md` | 交互 PRD 权威口径：声明 `PRD/窗口交互_PRD.md` 为前端体验 P0 来源，并给出修订后开发与验收计划 |
| `MODULE_VERSIONING.md` | 模块内部编号规则：`A-V1.0-1` 等编号、项目阶段与模块内部路线关系 |
| `AGENT_ONBOARDING.md` | 外部 Agent 上手指南：环境、阅读顺序、模块选择、停止条件和证据要求 |
| `V1_2_AGENT_WORKPACKS.md` | V1.2 A/B/C/D/Integration 可复制任务包 |
| `MODULE_HANDOFF_TEMPLATE.md` | 模块完成后交给审计或 Integration 的交接模板 |
| `design/` | 子阶段目标架构设计文档 |
| `stage-gates/` | 每个 V1 子阶段的独立开发计划、验收标准、审计意见和验收报告 |
| `remote-mercury/` | 从 `github.com/zhouhouze/mercury` 并入的远端原始文档副本 |

V1.1 新增文档：

| 文件 | 用途 |
|---|---|
| `design/v1.1-frontend-fidelity-architecture.md` | V1.1 前端高保真目标架构：当前实现、目标组件语义、差异、数据流、验收口径 |
| `design/v1.1-frontend-fidelity-implementation-spec.md` | V1.1 前端高保真实现规格：token、组件结构、状态矩阵、文件级计划、截图验收 |
| `design/v1.1-figma-baseline/README.md` | V1.1 Figma Make 截图硬切协议：Chrome CLI 捕获、人工复核、reviewed 基线冻结规则 |
| `design/v1.1-figma-baseline/capture-matrix.md` | V1.1 必须补齐的 Figma / screenshot required state 矩阵 |
| `design/v1.1-figma-baseline/capture-manifest.json` | V1.1 视觉基线登记表；当前自动捕获结果为 WebGL unsupported error page，不能作为实现基线 |
| `design/v1.1-figma-baseline/manual-capture-runbook.md` | 已登录 Chrome 手工补采 Figma Make 状态截图的流程 |
| `design/v1.1-doc-readiness-audit.md` | V1.1 文档就绪度审计：当前是否足以进入 V1.1-B/C/D/E |
| `stage-gates/v1.1-frontend-fidelity.md` | V1.1 阶段门禁：开发计划、验收标准、预审计、Go / No-Go |
| `stage-gates/v1.1-a-visual-baseline-freeze.md` | V1.1-A：视觉基线冻结；V1.1 实质开发前必须先通过 |
| `stage-gates/v1.1-b-ui-structure-token-refactor.md` | V1.1-B：UI 结构和 token 重构门禁 |
| `stage-gates/v1.1-c-high-fidelity-states.md` | V1.1-C：高保真状态实现门禁 |
| `stage-gates/v1.1-d-visual-e2e-regression.md` | V1.1-D：视觉 E2E 回归门禁 |
| `stage-gates/v1.1-e-exit-review.md` | V1.1-E：出门评审门禁 |
| `design/v1.1-frontend-fidelity-gap.drawio` | V1.1 gap 图谱：当前/目标架构差异、开发及验收计划、里程碑、验收门槛、出门条件 |

V1.2 新增文档：

| 文件 | 用途 |
|---|---|
| `design/v1.2-ai-reading-modular-architecture.md` | V1.2 AI 伴读四模块目标架构：A/B/C/D 职责、数据流、验收和 No-Go |
| `design/v1.2-ai-reading-workspace-partition.md` | V1.2 工作区划分：A/C/D service 工作区、B app 工作区、Integration Codex、输入输出和跨模块变更规则 |
| `design/v1.2-module-local-design-package.md` | V1.2 模块内深度设计文档包：各工作区 architecture / implementation / mock validation / PRD coverage / integration boundary 索引与审计结论 |
| `design/v1.2-automation-readiness-gap.md` | V1.2 自动化开发就绪度 Gap：P0/P1/P2 缺口、Go / No-Go 和审计意见 |
| `design/v1.2-prd-coverage-matrix.md` | V1.2 PRD 覆盖矩阵：需求、模块、合同、测试和证据路径映射 |
| `design/v1.2-integration-contract-matrix.md` | V1.2 Integration 合同矩阵：A→D、D→C、D→B、B→Debug 字段所有权和接线规则 |
| `design/v1.2-ai-reading-automation-gap.md` | V1.2 Draw.io companion：图谱页面说明、架构口径和验收口径 |
| `design/v1.2-ai-reading-automation-gap.drawio` | V1.2 自动化开发 gap 图谱：当前/目标架构差异、模块内部架构、公共 API、关键体验路径、开发验收、里程碑和出门条件 |
| `design/v1.2-a-page-perception-gap.md` | A 模块 Draw.io companion：Page Perception / AgentCore Eyes 当前差异、目标架构、合同、里程碑和验收说明 |
| `design/v1.2-a-page-perception-gap.drawio` | A 模块专属 gap 图谱：当前/目标差异、A 内部架构、A 与 B/C/D 调用关系、关键路径、开发验收和出门条件 |
| `design/v1.2-readiness-closure-audit.md` | V1.2-0R readiness 收口审计：当前文档是否足以支撑全量 V1.2 开发、剩余开发验收计划和 ChatGPT 审计路径 |
| `design/adr-v1.2-agent-core-provider-piagent.md` | V1.2 ADR：piAgent 作为首选 CoreProvider，D 以可替换 Core 适配层为主 |
| `contracts/v1_2_adapter_contracts.md` | V1.2 Adapter 与结构化上下文合同：StructuredPageContext、ParagraphAnnotation、AdapterSpec、AdapterResult、MindmapNodeSourceMap |
| `stage-gates/v1.2-0-ai-reading-contract-and-workspace-freeze.md` | V1.2-0 文档冻结门禁：进入 A/B/C/D 实质开发前必须通过 |
| `stage-gates/v1.2-a-v1.1-high-signal-page-perception.md` | A-V1.1 高信号网页感知门禁：Hybrid Extraction、正文降噪、sourceMap、digest、质量评估和 OCR/视频合同规划 |

V1.2 代码工作区：

| 目录 | 用途 |
|---|---|
| `services/local-runtime/navia_runtime/modules/page_reading/` | A 模块 service 工作区：Page Perception / AgentCore Eyes，网页、OCR 与未来媒体感知规划 |
| `apps/chrome-extension/src/modules/*_renderer/` | B 模块 app 工作区：结构化数据、流式文本和 Mindmap 前端实时渲染 |
| `services/local-runtime/navia_runtime/modules/mindmap/` | C 模块 service 工作区：基于结构化网页 JSON 的 Mindmap 生成与反跳来源 |
| `services/local-runtime/navia_runtime/modules/agent_loop/` | D 模块 service 工作区：CoreProvider 适配层、AgenticLoop 边界与 piAgentProvider / MockCoreProvider |
| `services/local-runtime/navia_runtime/modules/adapters/` | D 模块 service 工作区：MCP / Skill / API Adapter 编排 |
| `apps/` 与 `services/` 既有入口文件 | Integration Codex 工作区：既有入口 wiring、E2E、trace 与 PRD 复检 |

## 使用建议

1. 先让 Codex 读取 `01-prd.md` 和 `02-architecture.md`，确认范围边界。
2. 再读取 `03-development-plan.md`，按 V1.0-0 → V1.0-H 顺序拆任务。
3. 每个阶段开始前，先按 `10-v1-stage-gate-execution-protocol.md` 生成 `stage-gates/v1.0-x-*.md`。
4. 每完成一个阶段，用 `04-acceptance-plan.md` 对齐验收，并把真实数据验收报告写回 stage-gate 文档。
5. 每个 PR 结束前，用 `05-codex-alignment-checklist.md` 做防膨胀检查。
6. API、事件、数据结构发生改动时，同步更新 `06-api-contract.md` 与 `07-data-models.md`。
7. 进入 V1.1 前端高保真阶段前，先读 `design/v1.1-frontend-fidelity-architecture.md`、`design/v1.1-frontend-fidelity-implementation-spec.md`、`design/v1.1-figma-baseline/README.md`、`design/v1.1-figma-baseline/capture-matrix.md`、`design/v1.1-figma-baseline/capture-manifest.json`、`design/v1.1-doc-readiness-audit.md` 和 `stage-gates/v1.1-frontend-fidelity.md`；本轮 V1.1 证据策略以用户提供 Image #1/#2、PRD 硬约束、runtime-offline 独立设计和 mindmap 后续专项为准。
8. V1.1-B 开工前必须执行 `node scripts/validate_v1_1_doc_readiness.mjs`，只有输出 `canStartV11B=true` 才允许进入实质前端开发。
9. 外部 Agent 进入仓库后先读根目录 `AGENTS.md`、`AGENT_ONBOARDING.md` 和 `V1_2_AGENT_WORKPACKS.md`，再选择 A/B/C/D/Integration 工作包。
10. 进入 V1.2 实质开发前，必须先读 `design/v1.2-ai-reading-workspace-partition.md`、`design/v1.2-module-local-design-package.md`、`design/v1.2-automation-readiness-gap.md`、`design/v1.2-prd-coverage-matrix.md`、`design/v1.2-integration-contract-matrix.md`、`design/v1.2-ai-reading-automation-gap.drawio`、`contracts/v1_2_adapter_contracts.md` 和 `stage-gates/v1.2-0-ai-reading-contract-and-workspace-freeze.md`；只有 V1.2-0 Go 后，A/B/C/D Codex 终端才能按各自工作区独立开发。
11. A 模块单独开工前，还必须读取 `design/v1.2-a-page-perception-gap.drawio`、`design/v1.2-a-page-perception-gap.md`、`stage-gates/v1.2-a-page-reading.md` 和 `stage-gates/v1.2-a-v1.1-high-signal-page-perception.md`，确认 A 只做 AgentCore Eyes 感知事实，不直接实现 OCR / 视觉 / 视频 / 直播 engine。
12. V1.2 全量开工前必须读取 `design/v1.2-readiness-closure-audit.md`。ChatGPT 审计文档路径以该文件第 5 节为准，且审计无致命或重大规格偏差后才能进入 staged mock-first implementation。

## V1 硬边界

V1 必须保持克制。V1.2 扩展允许轻量 MCP / Skill / API Adapter 合同，但只作为 D 模块的受控接入方式，不允许绕过 D Adapter Layer 和治理钩子。

- 不直接接 MCP；V1.2 只允许通过 D 模块定义受控 Adapter 合同。
- 不直接接 Skill 系统；V1.2 只允许通过 D 模块定义受控 Adapter 合同。
- 不做长期记忆管理。
- 不做完整个人知识库。
- 不做多 Agent。
- 不做浏览器自动操作。
- 不做深度研究。
- 不做 PPT 生成。
- 不做桌面宠物。
- 不默认读取本地文件。

V1 的目标是把“Chrome 插件安装 → 当前网页贴边悬浮球 → hover 小长条 → 网页内 AI 双轨面板 → 当前网页文字对话 → 单 Session AgentCore → 受控工具调用 → 摘要/问答/mindmap → 可观测/可验收”打穿。
