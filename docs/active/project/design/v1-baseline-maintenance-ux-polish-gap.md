# V1.0.x Baseline Maintenance + UX Polish Gap Companion

状态：文档基线

日期：2026-07-07

## 1. 为什么需要本阶段

`V1.0.x Post-V1 Hardening` 已被人工验收确认并冻结为基线。下一阶段不解决“V1 是否完成”的问题，而是把基线维护和当前 V1 范围内的体验摩擦收束为可开发、可验收、可审计的计划。

本阶段关注：

- frozen baseline 能否被稳定复验。
- Runtime 启动、离线和 reconnect 诊断是否清楚。
- launcher / sidebar 是否低打扰、可恢复、可操作。
- Chat / Mindmap / Source Evidence / Debug / Settings 是否在窄侧栏内保持可读。
- 原型审查页中的目标总体设计、详细模块设计和用户路径是否能转化为后续实现验收项。
- 新证据是否独立，避免把 post-V1 frozen evidence 冒充本阶段输出。

## 2. 当前状态与目标状态

| 领域 | 当前状态 | 目标状态 |
|---|---|---|
| Frozen baseline | `v1_post_v1_hardening` 已冻结 | 只读引用，不重写、不降级 |
| Build / Runtime | 可构建，可启动 Runtime | build、Runtime health、validator 可重复验证 |
| Startup diagnostics | Runtime 离线已有提示 | 离线 / reconnect / report 入口更清楚 |
| Launcher / sidebar | MVP 可用 | 默认贴边低打扰，hover / focus / click / collapse / resize / drag 稳定 |
| Chat / Mindmap | 基础体验可用 | 按钮层级、状态卡、导图、source evidence、输入区更少遮挡和截断 |
| Evidence | 上一阶段报告已存在 | 新阶段独立 `v1_baseline_maintenance_ux_polish` evidence |
| Prototype review | 目标图和真实基线截图已落盘 | 作为设计输入；后续实现必须用真实截图对照，不能冒充完成证据 |
| 范围边界 | V1 排除 V2+ 能力 | 继续排除 RAG、Memory、Web Research、PPT、Deep Research 等 |

## 3. 具体架构实体

- `apps/chrome-extension/entrypoints/content/index.ts`：launcher、collapse、drag、resize 的外层交互壳。
- `apps/chrome-extension/entrypoints/sidepanel/main.tsx`：React side panel 主入口，承载 Chat、Mindmap、Debug、Settings。
- `apps/chrome-extension/entrypoints/sidepanel/style.css`：按钮、状态卡、输入区、窄侧栏视觉样式。
- `apps/chrome-extension/src/runtimeClient.ts`：Runtime health、offline、reconnect 诊断边界。
- `apps/chrome-extension/src/pageContext.ts`：当前页 DOM / metadata / selection 输入，不扩展到 Web Research。
- `apps/chrome-extension/src/contentBridge.ts`：source marker、fallback、blocked 用户触发桥接。
- `apps/chrome-extension/src/modules/chat_renderer/`：消息、source card、status、degraded 文案。
- `apps/chrome-extension/src/modules/mindmap_renderer/`：Evidence Card Mindmap / Reading Map 展示。
- `apps/chrome-extension/src/modules/debug_renderer/`：Debug JSON / handoff 诊断展示。
- `services/local-runtime/navia_runtime/app.py`：Local Runtime `/v1/health` 和既有 routes。
- `services/local-runtime/navia_runtime/modules/page_reading/`：A Page Reading 回归依赖。
- `services/local-runtime/navia_runtime/modules/mindmap/`：C Mindmap 回归依赖。
- `services/local-runtime/navia_runtime/modules/agent_loop/` 与 `modules/adapters/`：D ToolResult / Artifact / Event / Trace 边界。
- `docs/active/project/design/v1-baseline-maintenance-ux-polish-prototype-review/index.html`：本阶段 UX 目标说明和实现验收映射输入，不是当前实现证据。

## 4. Drawio 要求

`docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio` 固定不超过 8 页：

1. `01 阶段目标与目标体验`
2. `02 当前架构与目标架构差异`
3. `03 Baseline Maintenance 维护链路`
4. `04 V1 UX Polish 交互链路`
5. `05 启动与诊断链路`
6. `06 开发及验收计划`
7. `07 项目里程碑与出门条件`
8. `08 风险路线与 No-Go 边界`

状态色块口径：

- 绿色：已实现已验证 / 已新增已验证 / 冻结保持。
- 黄色：已实现需修改。
- 蓝色：阶段证据 / 报告 / 设计输入。
- 红色：No-Go 或阻塞边界。
- 灰色：历史基线 / 只读引用。

## 5. 开发及验收大纲

| 子阶段 | 开发计划 | 验收计划 |
|---|---|---|
| `V1.0.x-BM-0` | 同步 active docs、stage gate、gap companion、drawio、readiness audit | PASS：无 fatal / major 文档冲突，已验证 |
| `V1.0.x-BM-1` | 维护 build、Runtime health、post-V1 validator、报告和敏感信息扫描 | PASS：构建、validator、Runtime health、敏感扫描均通过，已验证 |
| `V1.0.x-BM-2` | 优化启动说明、Runtime offline / reconnect、报告入口 | PASS：Runtime health 为 ok，诊断和报告入口可审计，已验证 |
| `V1.0.x-BM-3` | 优化 launcher、sidebar、按钮、状态卡、Mindmap、source evidence | PASS：9 个 prototype target 映射到真实截图，无新能力越界，已验证 |
| `V1.0.x-BM-4` | 做视觉与交互回归截图 | PASS：18 张截图，无遮挡、截断、虚影、焦点抢占和 source 状态混淆的 fatal / major，已验证 |
| `V1.0.x-BM-5` | 输出 HTML 报告、PRD review、false-green audit、人工 spot-check | PASS：无 fatal / major，仅声明 scoped UX polish，已验证 |

## 6. Evidence Package 目标

本阶段已写入独立 evidence package：

```text
docs/active/project/evidence/v1_baseline_maintenance_ux_polish/
  report.json
  acceptance-report.html
  prd-review.md
  false-green-audit.md
  human-spot-check.md
  screenshots/
```

必须继续引用但不得重写：

```text
docs/active/project/evidence/v1_post_v1_hardening/
```

必须作为设计输入但不得作为通过证据：

```text
docs/active/project/design/v1-baseline-maintenance-ux-polish-prototype-review/index.html
```

## 7. No-Go

- 不声明最终 Monica-like UX complete。
- 不声明复杂站点全量高质量通过。
- 不声明视频、音频、OCR、VLM、ASR 或隐藏媒体内容已被理解。
- 不引入 Memory、RAG、Web Research、PPT、Deep Research、多 Agent、产品浏览器自动操作、语音、桌宠或默认本地文件读取。
- 不覆盖 V1 complete 证据，也不用 post-V1 frozen evidence 冒充 BM / UX evidence。
