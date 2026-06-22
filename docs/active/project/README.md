# Navia V1 Active Project Documentation

本目录只保留当前仍然激活的项目级 V1 / V1.2 / V1.3 / A-V1.2 开发入口、公共合同、工作区说明和验收门禁。

模块级开发文档已统一移动到：

```text
docs/active/modules/
```

过期、已完成、未继续激活或仅作历史追溯的文档已移动到：

```text
docs/history/
```

## 当前阶段

当前项目焦点已从 `V1.2-Closeout 收关阶段` 转入 `V1.3 Evidence Card Mindmap 体验升级阶段`，并保留 `A-V1.2 Production Page Perception` 作为 A 模块长期质量门槛：

```text
真实网页
+ Chrome 原生右侧 Side Panel
+ A 高质量网页感知 / QualityReport / SourceRef
+ C digest-first Mindmap / nodeSourceMap / source fallback
+ D Artifact / Event / Trace 映射
+ B Evidence Card Mindmap 主渲染
+ source evidence panel
+ selected / hover / neighbor highlight
+ selector / domPath / textQuote 定位
+ 真实 Chrome 截图级 DOM highlight 或 fallback evidence
```

`V1.2-AC-Native`、`V1.2-AC-Quality`、`V1.2-AC-Jumpback MVP` 与 `V1.2-Closeout` 已形成阶段证据。当前 V1.3 通过后只允许声明 `V1.3 Evidence Card Mindmap experience complete`。不得声明完整 V1 complete、Canvas Knowledge Map complete、V2 Memory / RAG ready 或 V4 Web Research / PPT / Deep Research ready。`A-V1.2-1+` 若继续推进，仍必须遵守 `A-V1.2-0` 合同冻结门槛。

## 激活文档

| 文件 | 用途 |
|---|---|
| `01-prd.md` | 当前 PRD：产品定位、V1/V1.2/A-V1.2 目标和边界 |
| `02-architecture.md` | 当前目标架构：Runtime、Chrome Extension、A/B/C/D 模块和 A-V1.2 感知层架构 |
| `03-development-plan.md` | 当前开发计划：V1.2 模块化开发和 A-V1.2 子阶段计划 |
| `04-acceptance-plan.md` | 当前验收计划：V1/V1.2/A-V1.2 验收门槛和 No-Go |
| `05-codex-alignment-checklist.md` | Codex 开工、PR、验收前的对齐清单 |
| `06-api-contract.md` | V1 API 与事件合同 |
| `07-data-models.md` | V1 / V1.2 核心数据模型 |
| `10-v1-stage-gate-execution-protocol.md` | 阶段门禁执行协议 |
| `12-interaction-prd-authority-and-revised-plan.md` | 前端交互 PRD 权威口径 |
| `interaction-prd/` | 当前前端交互 PRD 包：窗口、输入框、设置、思维导图 |
| `AGENT_ONBOARDING.md` | 外部 Agent 上手指南 |
| `V1_2_AGENT_WORKPACKS.md` | V1.2 A/B/C/D/Integration 工作包 |
| `MODULE_VERSIONING.md` | 模块内部编号规则，当前 A 模块阶段为 `A-V1.2` |
| `MODULE_HANDOFF_TEMPLATE.md` | 模块交接模板 |
| `HANDOFF_2026-06-22_CROSS_MACHINE_RECOVERY.md` | 跨机器恢复手册：远端仓、最小恢复步骤、当前阶段上下文和新 Codex 接手提示词 |

## 当前合同

| 文件 | 用途 |
|---|---|
| `contracts/v1_2_adapter_contracts.md` | V1.2 Adapter、结构化上下文、A-V1.2 公共输出合同 |
| `contracts/a_v1_2_page_perception.schema.json` | A-V1.2 网页感知 JSON Schema |
| `contracts/a_v1_1_high_signal.schema.json` | 仍被当前 runtime/tests 使用的 A 高信号兼容合同；不要归档或删除 |
| `contracts/agent-event.schema.json` | AgentEvent Schema |
| `contracts/api-response.schema.json` | API response envelope Schema |
| `contracts/page-context.schema.json` | PageContext Schema |
| `contracts/tool-result.schema.json` | ToolResult Schema |
| `contracts/v1_2_closeout_report.schema.json` | V1.2-Closeout 最终验收报告 Schema |
| `contracts/samples/` | 当前合同样例 |

## 当前设计文档

| 文件 | 用途 |
|---|---|
| `design/v1.2-ai-reading-modular-architecture.md` | V1.2 AI 伴读 A/B/C/D 模块目标架构 |
| `design/v1.2-ai-reading-workspace-partition.md` | V1.2 工作区划分与跨模块变更规则 |
| `design/v1.2-module-local-design-package.md` | 模块内深度设计文档包索引 |
| `design/v1.2-automation-readiness-gap.md` | V1.2 自动化开发就绪度 Gap |
| `design/v1.2-prd-coverage-matrix.md` | V1.2 PRD 覆盖矩阵 |
| `design/v1.2-integration-contract-matrix.md` | V1.2 Integration 合同矩阵 |
| `design/v1.2-ai-reading-automation-gap.md` | V1.2 项目级 drawio companion：当前实现、目标架构、目标功能形态、阶段划分和最终用户体验路径 |
| `design/v1.2-ai-reading-automation-gap.drawio` | V1.2 项目级目标架构总图：A/B/C/D、Runtime、Side Panel、最终网页内体验，以及 Memory Plane、Tool / Skill / MCP Plane、Cloud Plane 预留位置 |
| `design/v1.2-a-page-perception-gap.md` | A-V1.2 Draw.io companion |
| `design/v1.2-a-page-perception-gap.drawio` | A-V1.2 专属 gap 图谱 |
| `design/v1.2-ac-native-sidepanel-gap.md` | V1.2-AC-Native 原生 Side Panel gap 图谱说明 |
| `design/v1.2-ac-native-sidepanel-gap.drawio` | V1.2-AC-Native 目标架构、差异、计划和验收图谱 |
| `design/v1.2-ac-native-sidepanel-readiness-audit.md` | V1.2-AC-Native 开发前 readiness 审计 |
| `design/v1.2-ac-quality-hardening-gap.md` | V1.2-AC-Quality A/C 质量深化 drawio 说明 |
| `design/v1.2-ac-quality-hardening-gap.drawio` | V1.2-AC-Quality 目标架构、差异、计划和出门门槛图谱 |
| `design/v1.2-ac-jumpback-mvp-gap.md` | V1.2-AC-Jumpback MVP 来源反跳 drawio 说明 |
| `design/v1.2-ac-jumpback-mvp-gap.drawio` | V1.2-AC-Jumpback MVP 目标架构、差异、计划和出门门槛图谱 |
| `design/v1.2-closeout-gap.md` | V1.2-Closeout 收关 drawio 说明 |
| `design/v1.3-evidence-card-mindmap-gap.md` | V1.3 Evidence Card Mindmap drawio 说明 |
| `design/v1.3-evidence-card-mindmap-gap.drawio` | V1.3 Evidence Card Mindmap 目标架构、差异、开发计划、验收门槛、长期规划图谱 |
| `design/v1.3-evidence-card-mindmap-readiness-audit.md` | V1.3 Evidence Card Mindmap 开发前 readiness 审计 |
| `design/a-v1.2-contract-freeze-readiness-audit.md` | A-V1.2-0 合同冻结 readiness 审计 |
| `design/v1.2-readiness-closure-audit.md` | V1.2 readiness 收口审计 |
| `design/adr-v1.2-agent-core-provider-piagent.md` | D 模块 CoreProvider / piAgent ADR |

## 当前 Stage Gates

| 文件 | 用途 |
|---|---|
| `stage-gates/v1.2-0-ai-reading-contract-and-workspace-freeze.md` | V1.2-0 合同与工作区冻结 |
| `stage-gates/v1.2-a-page-reading.md` | A 模块工作区门禁 |
| `stage-gates/v1.2-a-v1.2-production-page-perception.md` | A-V1.2 高质量网页感知层门禁 |
| `stage-gates/v1.2-ac-page-perception-mindmap-bridge.md` | V1.2-AC A 高信号主链路与 C Mindmap 联动门禁 |
| `stage-gates/v1.2-ac-native-sidepanel.md` | V1.2-AC-Native 原生 Side Panel 体验稳定化门禁 |
| `stage-gates/v1.2-ac-quality-hardening.md` | V1.2-AC-Quality A/C 质量深化与真实网页扩展门禁 |
| `stage-gates/v1.2-ac-jumpback-mvp.md` | V1.2-AC-Jumpback MVP 来源反跳最小闭环门禁 |
| `stage-gates/v1.2-closeout.md` | V1.2-Closeout 收关与生产级完成声明门禁 |
| `stage-gates/v1.3-evidence-card-mindmap.md` | V1.3 Evidence Card Mindmap 体验升级门禁 |
| `stage-gates/v1.2-b-chat-renderer.md` | B Renderer 门禁 |
| `stage-gates/v1.2-c-mindmap.md` | C Mindmap 门禁 |
| `stage-gates/v1.2-d-agentic-loop.md` | D CoreProvider / Adapter 门禁 |
| `stage-gates/v1.2-e-integration.md` | Integration 门禁 |

## 当前 Evidence / Fixtures

| 路径 | 用途 |
|---|---|
| `fixtures/real_pages/` | V1 / A 模块真实页面 fixture |
| `evidence/v1.2-e-chrome-inpage-e2e.json` | V1.2 Integration 历史 E2E evidence，当前仅作参考 |
| `evidence/v1_2_ac/native-sidepanel-ux/report.json` | V1.2-AC-Native 原生 Side Panel 自动化验收 JSON |
| `evidence/v1_2_ac/native-sidepanel-ux/acceptance-report.html` | V1.2-AC-Native 人类可读验收报告 |
| `evidence/v1_2_ac/native-sidepanel-ux/false-green-audit.md` | V1.2-AC-Native false-green 审计 |
| `evidence/v1_2_ac/native-sidepanel-ux/chatgpt-audit-closure.md` | V1.2-AC-Native ChatGPT 审计意见闭环与阶段声明边界 |

V1.3 验收证据目标路径：

```text
docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json
docs/active/project/evidence/v1_3_evidence_card_mindmap/acceptance-report.html
docs/active/project/evidence/v1_3_evidence_card_mindmap/prd-review.md
docs/active/project/evidence/v1_3_evidence_card_mindmap/false-green-audit.md
docs/active/project/evidence/v1_3_evidence_card_mindmap/screenshots/
```

## A 模块当前必读

进入 A-V1.2 开发或审计前，至少读取：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/contracts/a_v1_2_page_perception.schema.json
docs/active/project/design/v1.2-a-page-perception-gap.md
docs/active/project/design/v1.2-a-page-perception-gap.drawio
docs/active/project/design/a-v1.2-contract-freeze-readiness-audit.md
docs/active/project/stage-gates/v1.2-a-page-reading.md
docs/active/project/stage-gates/v1.2-a-v1.2-production-page-perception.md
docs/active/modules/runtime/page_reading/docs/a-v1.2-executable-development-spec.md
docs/active/modules/runtime/page_reading/docs/a-v1.2-100-page-evaluation-plan.md
docs/active/modules/runtime/page_reading/docs/a-v1.2-extractor-dependency-audit.md
```

## 模块文档入口

| 模块 | 文档入口 |
|---|---|
| A Page Reading | `docs/active/modules/runtime/page_reading/README.md` |
| B Chat Renderer | `docs/active/modules/frontend/chat_renderer/README.md` |
| B Artifact Renderer | `docs/active/modules/frontend/artifact_renderer/README.md` |
| B Debug Renderer | `docs/active/modules/frontend/debug_renderer/README.md` |
| B Mindmap Renderer | `docs/active/modules/frontend/mindmap_renderer/README.md` |
| C Mindmap | `docs/active/modules/runtime/mindmap/README.md` |
| D AgentCore / Agent Loop | `docs/active/modules/runtime/agent_loop/README.md` |
| D Adapter Layer | `docs/active/modules/runtime/adapters/README.md` |

## 历史文档

历史文档按阶段归档在 `docs/history/`：

```text
docs/history/V1.0/
docs/history/V1.1/
docs/history/A-V1.1/
docs/history/V1.13-V1.16/
docs/history/remote-mercury/
docs/history/legacy/
docs/history/backups/
```

历史文档只用于追溯决策，不作为当前开发验收依据。若需要重新激活某个历史阶段，必须先把对应文档从 history 中升级回当前文档包，并完成新的规格审计。
