# V2 Memory / Personal Knowledge Base Gap Companion

本 companion 解释 `v2-memory-personal-knowledge-base-gap.drawio` 的图纸口径。当前图纸用于同步 V2-1..V2-6 mock-first / controlled-boundary 实现基线，并明确 V2-7 真实数据验收仍是出门阻塞。

## 1. 阶段定位

`V2 Memory / Personal Knowledge Base` 承接 V1 当前页伴读基线，把用户主动保存的网页、显式授权导入的本地资料和结构化摘要，规划为可追踪、可删除、可授权的个人知识资产。

允许声明：

```text
V2 Memory implementation baseline reached through V2-6; V2-7 real-data acceptance pending.
```

当前门禁口径：

```text
V2 文档与实现基线同步：Go。
V2-1..V2-6 mock-first / controlled-boundary baseline：已记录。
V2-7 planning-aligned acceptance：No-Go，直到真实数据证据、截图、HTML 报告和 semantic validator 全部通过。
```

不得声明：

```text
V2 implemented。
V2 Memory / RAG ready。
完整个人知识库产品完成。
默认本地文件读取。
Web Research / PPT / Deep Research ready。
```

## 2. 当前架构与目标架构差异

| 状态 | 具体实体 | 当前能力 | V2 目标 |
|---|---|---|---|
| 已实现保持 | `pageContext.ts` | 当前页 DOM / metadata / selection | 保存当前页的输入基线；不读取本地文件 |
| 已实现保持 | `contentBridge.ts` | launcher / sidebar / source marker | 不做自动保存；V2 trace / marker 仍只响应用户触发 |
| 已实现需验收 | B `chat_renderer` / sidepanel shell | 当前页聊天、source card、V2 Knowledge 入口 | 展示 SaveToKnowledgeCard、Ask with Sources、evidence refs |
| 已实现保持 | B `mindmap_renderer` | Mindmap / Reading Map | 继续服务 V1 当前页导图；Knowledge Graph 事实来自服务侧 |
| 已实现需验收 | B `debug_renderer` / Settings | Runtime 和页面调试信息 | 展示 Runtime、V2 Adapter、data_service 和 source build / trace / forget 状态 |
| 已实现保持 | A Page Reading | Digest / SourceRef / QualityReport | 输出 MemoryCandidate 输入材料 |
| 已实现保持 | C Mindmap | tree / nodeSourceMap | 提供候选主题和 source binding |
| 已实现保持 | D Agent Loop / Adapter | ToolResult / Artifact / Event / Trace | V2 Adapter / Governance 必须挂在该边界后 |
| 已实现需验收 | V2 Adapter / Governance | `modules/memory/` mock-first / controlled-boundary 基线 | 权限、映射、trace、错误、删除语义和 data_service 接入 |
| 已实现需验收 | Memory Plane contracts | V2 schema、OpenAPI、错误码和 Runtime contracts 草案已落盘 | `MemoryCandidate`、`KnowledgeSource`、`KnowledgeItem`、`EvidenceRef`、`Workspace`、`PermissionRoot`、`ForgetRequest` |
| 已实现需验收 | Knowledge Workspace | `knowledge_workspace/` 组件基线已落盘 | source library、detail、ask、trace、graph、permission、forget、service status |
| 外部候选 | `/mnt/c/workspace/data_service` | 独立服务 | 候选 Local Knowledge Governance Service，只经 HTTP / MCP / CLI 接入 |

## 2.1 Gap 闭环矩阵

| 层 | 当前实体 | 具体缺口 | 目标实体 | 验收证据 |
|---|---|---|---|---|
| Chrome 入口 | `entrypoints/background/index.ts`、`contentBridge.ts` | V2 不新增自动保存；trace 状态需真实数据验收 | `SaveToKnowledgeCard`、`KnowledgeTraceEntryPoint` | 入口截图、用户点击保存截图、trace 状态截图 |
| 当前页输入 | `pageContext.ts`、A `SourceRef` | 无 MemoryCandidate / workspace / permission / forget 语义 | `MemoryCandidate`、`KnowledgeSourceDraft` | mapping fixture、contract report |
| Runtime client | `runtimeClient.ts` | 已有 V2 knowledge section；需 V2-7 真实路径验收 | `runtimeClient.ts` V2 knowledge section | typecheck、contract tests、network trace |
| B 前端 | `chat_renderer`、`mindmap_renderer`、`debug_renderer`、`knowledge_workspace/` | V2 组件基线已存在；需真实截图和人类可读报告 | Knowledge Workspace 组件组、`ServiceStatusBanner`、`DataServiceStatusCard`、`KnowledgeBuildStatus` | 组件截图、交互报告、服务状态截图 |
| Runtime A/C/D | A Page Reading、C Mindmap、D Agent Loop / Adapter、`modules/memory/` | mock-first V2 adapter 基线已存在；真实 data_service 产品化仍需复验 | V2 Adapter / Governance、Memory Plane contracts | adapter contract tests、PRD review |
| 外部候选 | `/mnt/c/workspace/data_service` | API 与 Navia source / artifact / trace 尚未映射 | Local Knowledge Governance Service adapter | API mapping matrix、adapter spike report |
| 权限治理 | Settings / Debug、`knowledge_workspace/` PermissionRoot、data_service env allowed roots | mock governance UX 已存在；需显式授权真实样本验收 | `PermissionRoot`、`PermissionGrant`、`PermissionRevoke` | 授权 / 撤销截图、scan report |
| 删除 / 遗忘 | data_service `/sources/remove` 候选接口、`knowledge_workspace/` ForgetSource | mock forget UX 已存在；需证明 query / graph / trace 不再命中 | `ForgetRequest`、`ForgetVerification` | before / after query、graph、trace evidence |
| Evidence | V1 evidence packages、V2-1..V2-6 子阶段 evidence | 缺 V2-7 独立 manifest/report/HTML/screenshots | `v2_memory_personal_knowledge_base` evidence | report.json、HTML、screenshots、false-green audit |

## 2.2 data_service 候选 API 映射

| data_service 候选边界 | Navia V2 目标动作 | 文档结论 |
|---|---|---|
| `/knowledge/workspaces/create`、`/workspaces/list`、`/workspaces/describe` | workspace 创建、切换、摘要 | 可作为候选；需要 Navia workspace view model |
| `/knowledge/sources/import`、`/sources/list`、`/sources/remove` | source 导入、列表、删除 | 可作为候选；删除必须追加 before / after query 验证 |
| `/knowledge/build/start`、`/build/status`、`/build/cancel` | ingest / build 状态 | 可作为候选；需要映射为用户可读状态 |
| `/knowledge/query` | Ask with Sources | 可作为候选；必须强制 evidence refs 或 degraded |
| `/knowledge/graph` | Knowledge Graph | 可作为候选；B 不能凭空生成 graph facts |
| `/knowledge/source/trace` | Evidence Trace | 可作为候选；必须脱敏路径并保持状态一致 |

## 2.3 架构平面和具体修改位置

| 平面 | 当前项目实体 | 未来修改 / 新增位置 | 说明 |
|---|---|---|---|
| P0 Browser Host | 普通网页 DOM、用户选区、用户显式授权动作 | 不新增默认读取；只作为用户触发输入 | 不能默认读取本地文件 |
| P1 Extension Shell | `entrypoints/background/index.ts`、`entrypoints/content/index.ts`、`src/contentBridge.ts` | 修改 `contentBridge.ts` 保存入口和 trace 状态 | 不调用 data_service |
| P2 Side Panel UI | `entrypoints/sidepanel/main.tsx`、`src/modules/chat_renderer/`、`mindmap_renderer/`、`debug_renderer/` | 新增 `src/modules/knowledge_workspace/`；修改 sidepanel 挂载入口 | B 只展示 view model |
| P3 Runtime Client | `src/runtimeClient.ts` | 已有 V2 knowledge section；V2-7 需验证真实状态和错误路径 | 调用 Navia Runtime `/v1/knowledge/*` 和 `/v1/knowledge/status` |
| P4 Local Runtime API | `services/local-runtime/navia_runtime/app.py` | 已有 `/v1/knowledge/*` 与 `/v1/knowledge/status` 基线；避免误用历史 `navia_runtime/v2/` evidence 工具目录 | 产品 V2 不强制 Runtime API 切 `/v2` |
| P5 V2 Adapter / Governance | `services/local-runtime/navia_runtime/modules/memory/` | 已有 mock-first / controlled-boundary 基线；V2-7 需真实数据验收 | 负责 MemoryCandidate、权限、trace、forget、data_service adapter、服务状态聚合 |
| P6 data_service Candidate | `/mnt/c/workspace/data_service/backend/app/api/v1/data_service.py` 等 | Navia 仓不直接修改；只经 HTTP / MCP / CLI 调用 | console 不是 Navia UI |
| P7 Evidence | `apps/chrome-extension/e2e/*`、`docs/active/project/evidence/` | 新增 V2 E2E、reporter、validator 和 evidence 包 | 证明用户路径和 No-Go |

建议未来实现文件：

```text
apps/chrome-extension/src/runtimeClient.ts V2 knowledge section
apps/chrome-extension/src/modules/knowledge_workspace/
apps/chrome-extension/entrypoints/sidepanel/main.tsx
apps/chrome-extension/src/contentBridge.ts
services/local-runtime/navia_runtime/app.py
services/local-runtime/navia_runtime/modules/memory/
apps/chrome-extension/e2e/chrome-v2-memory-personal-knowledge.mjs or equivalent headless runner
apps/chrome-extension/e2e/generate-v2-memory-personal-knowledge-report.mjs or equivalent reporter
docs/active/project/evidence/v2_memory_personal_knowledge_base/
```

建议未来前端服务状态组件：

```text
apps/chrome-extension/src/modules/knowledge_workspace/ServiceStatusBanner.tsx
apps/chrome-extension/src/modules/knowledge_workspace/DataServiceStatusCard.tsx
apps/chrome-extension/src/modules/knowledge_workspace/KnowledgeBuildStatus.tsx
```

状态链路：

```text
ServiceStatusBanner / DataServiceStatusCard / KnowledgeBuildStatus
-> runtimeClient.ts V2 knowledge section
-> Navia Runtime `/v1/knowledge/status`
-> V2 Adapter / Governance status aggregator
-> data_service HTTP / MCP / CLI health probe
```

必须区分：

- `runtimeStatus`: `checking` / `online` / `offline`
- `adapterStatus`: `ready` / `degraded` / `blocked` / `not_configured`
- `dataServiceStatus`: `unchecked` / `connected` / `auth_required` / `unreachable` / `version_mismatch` / `blocked_by_policy`
- `sourceBuildStatus`: `not_saved` / `queued` / `ingesting` / `building` / `trace_ready` / `degraded` / `failed` / `forgotten`

B 前端不得直接探测 data_service；所有状态必须来自 Runtime / Adapter 聚合后的 view model。

Runtime offline 修正：

- Runtime 离线时 `/v1/knowledge/status` 不可达。
- `runtimeClient.ts` V2 knowledge section 必须通过 transport failure / timeout 本地推导 Runtime offline。
- Runtime 在线后，`/v1/knowledge/status` 才返回 Adapter、data_service、source build 和 capability 状态。

V2-0 必须冻结的合同与验收文件：

```text
docs/active/project/contracts/v2_memory_contracts.schema.json
docs/active/project/contracts/v2_knowledge_status.schema.json
docs/active/project/contracts/v2_knowledge_api.openapi.yaml
docs/active/project/contracts/v2_knowledge_error_codes.md
docs/active/project/contracts/v2_memory_sample_manifest.schema.json
docs/active/project/contracts/v2_memory_report.schema.json
docs/active/project/design/v2-memory-personal-knowledge-semantic-validator.md
docs/active/project/design/v2-memory-personal-knowledge-lifecycle-adr.md
docs/active/project/design/v2-data-service-adapter-spike-plan.md
```

V2 Workspace 承载形态：

| 容器 | 规划职责 |
|---|---|
| Side Panel | SaveToKnowledgeCard、ServiceStatusBanner、当前 source build / trace 状态、Ask current workspace 快捷入口、Trace 快捷入口 |
| Extension Workspace Page | WorkspaceSwitcher、SourceLibrary、SourceDetail、Ask with Sources、KnowledgeGraph、PermissionRoot、ForgetSource、DataServiceStatusCard |
| Localhost Web Workspace | 备选，不是默认承诺；若 V2-0 选择该路线，必须更新 PRD / 架构 / drawio / 原型 / 验收 |

## 3. Drawio 页面说明

| 页 | 标题 | 审查重点 |
|---|---|---|
| 01 | 阶段目标与当前结论 | V1 基线、V2 目标、V2-1..V2-6 已完成、V2-7 pending |
| 02 | 当前架构与目标架构差异 | P0-P7 架构平面、当前实体、已实现需验收、待补齐和 No-Go |
| 03 | 代码实体与调用链路 | 具体当前文件、Runtime / B / memory module / data_service / evidence 的调用方向 |
| 04 | data_service 受控边界 | mock-first 默认路径、controlled HTTP client、真实 data_service 默认禁用 |
| 05 | 前端体验与服务状态 UX | Save、Workspace、Ask、Graph、Permission、Forget 和服务状态组件 |
| 06 | 权限删除与证据链 | PermissionRoot、EvidenceRef、ForgetRequest、before / after query |
| 07 | 开发计划与里程碑 | V2-0..V2-6 标绿，V2-7 标黄 pending |
| 08 | 验收门槛与出门条件 | 24 source、38 scenario、HTML 报告、No-Go 和允许声明 |

## 4. False-Green 风险

- 用 V2 原型图冒充当前实现截图。
- 用 data_service console 冒充 Navia Knowledge Workspace。
- B 前端直接读写 data_service workspace。
- 默认扫描本地目录。
- 跨来源问答没有 evidence refs 却显示成功。
- 删除 / 遗忘只隐藏 UI 卡片，查询仍能命中。
- 把 V2 文档基线写成 V2 implemented 或 V2 ready。
- 用 V2-1..V2-6 mock-first evidence 替代 V2-7 真实数据验收。
- 把 cross-source query 计入 source corpus，导致验收分母虚假达标。
- 只检查 evidence_refs 非空，不验证 evidence 是否支撑回答。
- 把 Runtime offline 设计成 Runtime 在线返回的 status 字段。

## 5. 审计结论

当前文档包完成后，应支持：

```text
Go for V2 Memory / Personal Knowledge Base implementation-baseline record through V2-6.
No-Go for V2 planning-aligned acceptance claim until V2-7 real-data acceptance passes.
```

不支持：

```text
V2 implemented。
V2 Memory / RAG ready。
最终 Monica-like UX complete。
Web Research / PPT / Deep Research ready。
```
