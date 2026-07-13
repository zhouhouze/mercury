# V2 Memory / Personal Knowledge Base Readiness Audit

Audit date: 2026-07-09

Updated: 2026-07-10

Resynced: 2026-07-13

## 1. 结论

```text
Go for V2 Memory / Personal Knowledge Base implementation-baseline record through V2-6.

No-Go for V2 planning-aligned acceptance claim until V2-7 real-data evidence passes.
```

当前文档已经同步到最新实现事实：V2-1..V2-6 在 mock-first / controlled-boundary 范围内已有子阶段 evidence；V2-7 真实数据验收、截图证据、HTML 报告和最终 `report.json` 未完成。当前不能声明 V2 已实现、V2 ready、完整 RAG ready 或完整个人知识库产品完成。

## 2. 审计范围

本审计覆盖：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/stage-gates/v2-memory-personal-knowledge-base.md
docs/active/project/design/v2-memory-personal-knowledge-base-gap.md
docs/active/project/design/v2-memory-personal-knowledge-base-gap.drawio
docs/active/project/design/v2-memory-personal-knowledge-base-development-acceptance-plan.md
docs/active/project/design/v2-memory-personal-knowledge-prototype-review/index.html
docs/active/project/contracts/v2_memory_contracts.schema.json
docs/active/project/contracts/v2_knowledge_status.schema.json
docs/active/project/contracts/v2_knowledge_api.openapi.yaml
docs/active/project/contracts/v2_knowledge_error_codes.md
docs/active/project/contracts/v2_memory_sample_manifest.schema.json
docs/active/project/contracts/v2_memory_report.schema.json
docs/active/project/design/v2-memory-personal-knowledge-semantic-validator.md
docs/active/project/design/v2-memory-personal-knowledge-lifecycle-adr.md
docs/active/project/design/v2-data-service-adapter-spike-plan.md
docs/active/project/evidence/v2_memory_personal_knowledge_base/v2-1-development-acceptance-plan.md
docs/active/project/evidence/v2_memory_personal_knowledge_base/v2-1-prd-review.md
docs/active/project/evidence/v2_memory_personal_knowledge_base/v2-1-false-green-audit.md
docs/active/project/evidence/v2_memory_personal_knowledge_base/v2-6-development-acceptance-plan.md
docs/active/project/evidence/v2_memory_personal_knowledge_base/v2-6-prd-review.md
docs/active/project/evidence/v2_memory_personal_knowledge_base/v2-6-false-green-audit.md
docs/active/project/evidence/v2_memory_personal_knowledge_base/v2-7-acceptance-blocked-audit.md
```

## 3. 审计发现

| 项目 | 结论 |
|---|---|
| 阶段名一致性 | PASS。统一为 `V2 Memory / Personal Knowledge Base`。 |
| 阶段状态边界 | PASS。明确 V2-1..V2-6 是 mock-first / controlled-boundary 实现基线，V2-7 真实数据验收未完成。 |
| 原型页引用 | PASS。原型页是设计输入，不是实现截图或通过证据。 |
| data_service 边界 | PASS。只作为候选 Local Knowledge Governance Service；必须经 HTTP / MCP / CLI 接入。 |
| 架构实体具体性 | PASS。列出 V1 已实现实体、V2 待新增实体、外部候选实体，并补充当前实体、缺口、目标实体、验收证据的 Gap 闭环矩阵。 |
| 当前架构与目标架构 gap 可读性 | PASS。drawio 02 页展示 P0-P7 架构平面关系；drawio 03 页展示具体代码实体、调用方向和 V2-7 缺口。 |
| 当前项目与 data_service 关联关系 | PASS。文档明确 data_service 是 P6 外部候选服务，Navia 只能由 P5 V2 Adapter / Governance 经 HTTP / MCP / CLI 调用。 |
| 具体修改位置 | PASS。文档列出 `runtimeClient.ts` V2 knowledge section、`knowledge_workspace/`、`contentBridge.ts`、`sidepanel/main.tsx`、`app.py`、`modules/memory/`、V2 e2e / validator 和 evidence 目标位置。 |
| 前端服务状态感知 | PASS。文档新增 `ServiceStatusBanner`、`DataServiceStatusCard`、`KnowledgeBuildStatus`，并要求经 `runtimeClient.ts` V2 knowledge section -> `/v1/knowledge/status` -> V2 Adapter status aggregator 展示 Runtime / Adapter / data_service / source build 状态。 |
| Runtime offline 语义 | PASS。已修订为前端通过 transport failure / timeout 推导；Runtime 离线时 `/v1/knowledge/status` 不可达。 |
| V2-0 P0 合同包 | PASS。合同 schema、status schema、OpenAPI 草案、错误码、manifest/report schema、semantic validator、lifecycle ADR 和 data_service spike 计划已作为实现基线输入。 |
| V2-1..V2-6 evidence | PASS。子阶段 development plan、PRD review、false-green audit 已存在并被文档引用。 |
| V2-7 自动化验收门禁 | PASS。已明确 No-Go，直到真实数据 manifest、report、HTML、screenshots 和 semantic validator 通过。 |
| 权限治理 | PASS。默认不读取本地文件，显式授权 root 才能进入 source ingest。 |
| 删除 / 遗忘 | PASS。必须通过 before / after query 验证，不允许只隐藏 UI。 |
| No-Go | PASS。覆盖 V2 ready、默认本地读取、Web Research、PPT、Deep Research、多 Agent、产品浏览器自动操作、媒体理解。 |

Fatal issues: none.

Major issues for implementation-baseline synchronization: none.

Major issues blocking V2 planning-aligned acceptance claim: V2-7 real-data evidence package missing by design and recorded in `v2-7-acceptance-blocked-audit.md`.

已闭环问题：

| 问题 | 修复 |
|---|---|
| drawio 02 页过于概念化，看不出当前架构与目标架构 gap | 改为当前实体、缺口、目标实体、验收证据四列矩阵 |
| 架构图未明确 data_service 候选 API 与 Navia V2 动作关系 | 在架构文档、gap companion 和 drawio 03 页补充 API mapping |
| 文档没有清楚说明哪些开发目标仍有实现失败风险 | 在 readiness audit 保留 P1 风险，并要求未来 V2-0 做 adapter spike |
| 用户反馈仍看不出架构平面和具体修改点 | 将 drawio 02 页升级为 P0-P7 平面图，将 03 页升级为代码实体修改地图，并补充具体目标路径 |
| 用户要求前端开发阶段能感知后端服务状态 | 在 PRD、架构、开发计划、验收计划、stage gate、gap companion、开发验收计划和 drawio 中补充 Runtime / Adapter / data_service / source build 状态链路、组件和验收样本 |
| 外部审计指出“文档基线通过”不等于“V2-1+ 可直接编码” | 已通过 V2-0 和 V2-1..V2-6 mock-first 子阶段实现基线闭环；当前口径改为 V2-7 真实数据验收 pending |
| 合同只有名称没有字段级定义 | 新增 V2 合同 schema、status schema、OpenAPI、错误码，并要求 V2-0 复核冻结 |
| data_service 仍是候选假设 | 新增 data_service Adapter spike plan，要求 repository / commit / auth / API snapshot / capability matrix / unsupported list / fallback decision |
| 原型未覆盖服务状态和单次保存 | 将原型同步列为 V2-0 P0，要求补齐服务状态组件、单次保存异步流程和 canonical status |
| Workspace 承载形态未冻结 | 在 PRD / 架构中规划 Side Panel 与 Extension Workspace Page 职责，要求 V2-0 冻结入口 |
| 验收矩阵统计混淆 source 与 query | 将 source corpus 与 query / operation scenarios 分开，并新增 manifest/report schema 与 semantic validator |

## 4. 剩余风险

| 风险 | 等级 | 处理方式 |
|---|---|---|
| data_service 真实 API 与 Navia V2 目标合同存在差异 | P1 | 真实 data_service 产品化前必须重新锁定 commit / version / auth / API snapshot，并复核 adapter spike。 |
| Knowledge Workspace 可能过大，超出插件窄侧栏承载 | P1 | 文档已规定侧栏只做保存和 trace 入口，长期管理进入 Extension Workspace Page；V2-0 必须冻结入口。 |
| 多后端状态过多导致 UI 混乱 | P1 | 文档要求用 ServiceStatusBanner 展示摘要状态，用 DataServiceStatusCard 进入 Debug / Settings 细节，用 KnowledgeBuildStatus 绑定单个 source，避免所有状态堆在一级页面。 |
| 类 RAG 蒸馏容易被误读为完整 RAG ready | P1 | 文档和 No-Go 均禁止声明 V2 Memory / RAG ready。 |
| 删除 / 遗忘涉及索引、缓存和图谱多处状态 | P1 | 验收要求 before / after query，并覆盖 Source Library、Ask、Graph、Trace。 |

## 5. 出门判断

当前文档足以支撑下一步：

```text
V2 implementation-baseline record through V2-6
V2-7 real-data acceptance planning and execution
```

不支持直接进入：

```text
V2 complete claim
V2 Memory / RAG ready claim
default local file import
Web Research / PPT / Deep Research
```
