# Navia / 伴航 V1 项目文档包

本文档包用于将前期讨论沉淀为 Codex 可对齐、可拆解、可验收的工程基线。

## 项目命名

- 英文名：Navia
- 中文名：伴航
- 桌宠 / 角色名建议：小航
- V1 产品形态：Chrome Extension Side Panel + Local Headless Runtime
- V1 核心能力：可安装 Chrome Side Panel Chatbox、网页伴读、单 Session 高质量文字对话、摘要、问答、Mermaid 思维导图、本地意图识别、可观测 AgentCore、预算与权限监督

## 当前规划决策

截至 2026-05-31，V1 规划阶段已锁定以下工程决策：

- V1 Local Runtime 使用 Python 快速原型实现，优先服务 MVP 基础功能 Demo 验证。
- V1 AgentCore 后端采用可分工的模块化结构，方便团队内按 API、AgentCore、Governance、Session、ModelAdapter 等边界拆分。
- Chrome 插件优先采用 WXT + React + TypeScript。
- 第一轮底座落地范围限定为 V1.0-0/A/B/C：Contracts & Runtime Skeleton、AgentCore Baseline、状态机与可观测、Governance / Budget Supervisor。
- V1 complete 的用户可见门槛是：开发者能在 Chrome 中安装 unpacked extension，打开 Side Panel Chatbox，并基于当前网页完成基础文字对话。
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
| `design/` | 子阶段目标架构设计文档 |
| `stage-gates/` | 每个 V1 子阶段的独立开发计划、验收标准、审计意见和验收报告 |
| `remote-mercury/` | 从 `github.com/zhouhouze/mercury` 并入的远端原始文档副本 |

## 使用建议

1. 先让 Codex 读取 `01-prd.md` 和 `02-architecture.md`，确认范围边界。
2. 再读取 `03-development-plan.md`，按 V1.0-0 → V1.0-H 顺序拆任务。
3. 每个阶段开始前，先按 `10-v1-stage-gate-execution-protocol.md` 生成 `stage-gates/v1.0-x-*.md`。
4. 每完成一个阶段，用 `04-acceptance-plan.md` 对齐验收，并把真实数据验收报告写回 stage-gate 文档。
5. 每个 PR 结束前，用 `05-codex-alignment-checklist.md` 做防膨胀检查。
6. API、事件、数据结构发生改动时，同步更新 `06-api-contract.md` 与 `07-data-models.md`。

## V1 硬边界

V1 必须保持克制：

- 不接 MCP。
- 不接 Skill 系统。
- 不做长期记忆管理。
- 不做完整个人知识库。
- 不做多 Agent。
- 不做浏览器自动操作。
- 不做深度研究。
- 不做 PPT 生成。
- 不做桌面宠物。
- 不默认读取本地文件。

V1 的目标是把“Chrome 插件安装 → 当前网页 → Side Panel 文字对话 → 单 Session AgentCore → 受控工具调用 → 摘要/问答/mindmap → 可观测/可验收”打穿。
