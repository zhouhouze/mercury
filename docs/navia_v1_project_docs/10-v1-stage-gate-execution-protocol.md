# Navia / 伴航 V1 阶段门禁执行协议

版本：V1.0 Stage Gate Baseline
日期：2026-06-01

---

## 1. 目标

本协议约束 V1 后续所有子阶段的执行方式，避免出现：

- 只完成代码但没有端到端验收。
- 只用 mock 数据通过验收。
- PRD 规格偏差没有被发现。
- 验收结果看似通过但 trace、事件、状态机或治理实际不可审计。
- 在重大风险未闭环时继续进入下一阶段。

V1 后续阶段默认由 Codex 自动推进：开发、测试、验收、审计、文档同步都由 Codex 完成。人类只处理高风险确认、范围变更确认和外部权限确认。

---

## 2. 阶段范围

本协议适用于：

```text
V1.0-0：Contracts & Runtime Skeleton
V1.0-A：AgentCore Baseline
V1.0-B：状态机与可观测
V1.0-C：Governance / Budget Supervisor
V1.0-D：Chrome 插件页面内交互壳与 PageContext
V1.0-E：网页内 AI 双轨面板与伴读工具
V1.0-F：PRD A-F 布局状态与 Resize
V1.0-G：Session 质量与恢复
V1.0-H：V1 Closure / Regression / Documentation
V1.1：Frontend Fidelity / Figma Visual Alignment
V1.2：AI 伴读合同、工作区与 Adapter 架构扩展
```

其中 V1 complete 的硬门槛仍是：

```text
Chrome 插件可安装
-> 页面边缘悬浮球可出现
-> hover 小长条可出现
-> 网页内 AI 双轨面板可打开
-> 窄距/半屏挤压、宽覆盖、resize、收起恢复可验收
-> 连接 127.0.0.1 Local Runtime
-> 当前网页 PageContext 进入 Runtime
-> 用户可完成基础文字对话
-> Session / Turn / Tool / Event / Trace 可审计
```

V1.1 不重新定义 V1 complete。V1.1 的硬门槛是：

```text
V1.0 功能闭环保持不回退
-> Figma 视觉规格有可验收基线
-> 页面内悬浮球与双轨面板按 Figma 语义重构表现层
-> PRD A-F 状态全部截图验收
-> 真实 Chrome 复验通过
-> Runtime / Trace / Session 链路保持可审计
```

---

## 3. 每个子阶段的固定流程

每个子阶段必须按以下顺序执行。

### 3.1 阶段启动前：PRD 规格检视

Codex 必须重新读取：

```text
README.md
PRD/窗口交互_PRD.md
01-prd.md
02-architecture.md
03-development-plan.md
04-acceptance-plan.md
05-codex-alignment-checklist.md
06-api-contract.md
07-data-models.md
10-v1-stage-gate-execution-protocol.md
```

并输出阶段 PRD 规格检视：

- 本阶段对应的 PRD 目标。
- 如果涉及前端页面体验，必须逐项对照 `PRD/窗口交互_PRD.md`。
- 本阶段不得触碰的非目标。
- 本阶段依赖的 API / Event / Data / State / Tool 合同。
- 本阶段必须保留的 V1 complete 用户可见目标。
- 与上一阶段相比是否出现范围漂移。

### 3.2 阶段启动前：单独制定开发计划与验收标准

在进入实质开发前，必须为当前阶段单独生成一份文档：

```text
docs/navia_v1_project_docs/stage-gates/v1.0-x-<stage-name>.md
```

文档必须包含：

- 阶段目标。
- PRD 规格检视。
- 开发任务拆分。
- API / 数据 / 事件 / 状态 / 工具合同影响。
- 真实数据验收方案。
- 自动化测试计划。
- 手工或浏览器 E2E 验收计划。
- false-green 风险清单。
- 预审计意见。
- 是否允许进入实质开发的结论。

### 3.3 阶段启动前：审计意见闭环

预审计结论分为四级：

| 级别 | 含义 | 处理 |
|---|---|---|
| 致命 | 与 PRD 或 V1 硬边界冲突，或无法验收 | 必须停止，修正文档或找人类确认 |
| 重大 | 可能导致返工、虚假验收、数据不可追踪、安全风险 | 必须闭环后才能开发 |
| 一般 | 不阻塞，但需要在阶段内跟踪 | 可进入开发，必须记录 |
| 通过 | 未发现新增致命或重大风险 | 可进入开发 |

只有当审计结论为：

```text
Go: no unresolved fatal or major issue.
```

才允许进入实质开发。

### 3.4 阶段开发中：自动执行与自动回归

Codex 必须自动完成：

- 代码实现。
- 单元测试。
- 合同测试。
- 回归测试。
- 文档同步。
- 真实数据验收脚本或手工验收步骤。

如果开发过程中发现以下情况，必须停止并请求人类确认：

- 需要扩大 V1 范围。
- 需要接入 MCP / Skill / RAG / 多 Agent / 浏览器自动操作。
- 需要默认读取本地文件。
- 需要外部账号、付费服务、云端部署或敏感权限。
- 需要放宽 Runtime 安全约束。
- 真实数据验收无法实现，必须降级为 mock。

V1.2 例外：

- 文档阶段允许定义轻量 MCP / Skill / API Adapter 合同。
- 只有当实质开发要调用真实 MCP / Skill 服务、执行 side effect、联网搜索、读取本地文件或绕过 D 模块 governance 时，才视为高风险流程并必须停止确认。
- Adapter 合同本身不得被解释为 V2 长期记忆、RAG 或多 Agent 放行。

### 3.5 阶段完成后：端到端验收

每个阶段完成后必须执行端到端验收。验收报告必须写入同一个 stage-gate 文档，包含：

- 测试环境。
- 真实数据来源。
- 执行命令。
- 关键输出。
- 截图或 trace 证据路径。
- 通过项。
- 失败项。
- 与 PRD 的偏差。
- false-green 风险复核。
- 最终结论。

如果验收不通过，必须打回开发计划阶段：

```text
验收失败
-> 分析失败原因
-> 更新阶段计划
-> 更新审计意见
-> 修复实现
-> 重新跑真实数据验收
-> 直到通过或出现需要人类确认的高风险问题
```

### 3.6 阶段完成后：PRD 规格复检

验收通过后，还必须做一次 PRD 规格复检：

- 已实现内容是否满足本阶段 PRD 目标。
- 是否误删或弱化了 V1 complete 目标。
- 是否新增未授权能力。
- 是否存在只对测试数据有效的实现。
- 是否存在不可审计事件、不可恢复 session、不可追踪 artifact。

只有通过 PRD 规格复检，才允许进入下一阶段。

---

## 4. 真实数据验收要求

V1 不允许只靠 mock 或空数据声明阶段完成。

### 4.1 真实数据定义

真实数据必须至少包含一种非人工硬编码的输入：

- 本地真实 HTML fixture，内容来自真实网页并保留标题、段落、标题层级、链接结构。
- 当前 Chrome tab 的实际 PageContext。
- 本地 Runtime 实际产生的 SSE event stream。
- 实际 SQLite / JSONL event log。
- 实际 Mermaid 渲染结果。
- 实际 Chrome unpacked extension 安装和网页内悬浮球 / AI 面板交互。

### 4.2 可接受的 fixture

V1 允许使用本地 fixture，但必须满足：

- fixture 不能只包含为测试定制的极简文本。
- fixture 至少覆盖普通文章、技术文档、GitHub README 类页面。
- fixture 必须进入 PageContext 抽取链路，而不是绕过 content script 或 runtime 合同。
- 验收报告必须列出 fixture 文件路径和来源说明。

### 4.3 不可接受的验收

以下情况不得判定通过：

- 只断言函数返回非空。
- 只用 mock PageContext，不跑真实 HTML 或真实 tab。
- 只看前端有文字，不检查 turn_id、tool_call_id、EventStore、Trace。
- 只看 SSE 有输出，不检查事件 schema。
- 只看摘要生成，不检查是否来自当前网页。
- Mermaid 源码存在但无法渲染。
- Runtime 未启动时插件空白或静默失败。
- 用 Chrome Side Panel、普通 extension page 或 debug page 替代网页内交互验收。
- `PRD/窗口交互_PRD.md` 的 A-F 状态没有全部覆盖。

---

## 5. 阶段门禁产物

每个当前激活阶段必须形成以下产物：

```text
stage-gates/v1.2-<module-or-stage>.md
```

当前 A-V1.2 阶段使用：

```text
stage-gates/v1.2-a-v1.2-production-page-perception.md
```

其中至少包含：

```text
1. 阶段目标
2. PRD 规格检视
3. 开发计划
4. 验收标准
5. 真实数据验收设计
6. 审计意见
7. 审计意见闭环记录
8. 实施摘要
9. E2E 验收报告
10. PRD 规格复检
11. 最终结论
```

V1.0-H 完成时，还必须形成：

```text
Final V1 report
Known limitations
Developer setup guide
Chrome extension installation guide
V2 readiness review
```

V1.1 完成时，还必须形成：

```text
Figma visual baseline reference
Playwright screenshot baseline and current evidence
Real Chrome PRD A-F visual acceptance report
V1.1 gap drawio updated and openable
Frontend fidelity exit review
```

---

## 6. 人类确认边界

Codex 自动处理：

- 阶段计划。
- 阶段审计。
- 开发实现。
- 测试修复。
- 真实数据验收。
- 文档同步。
- 失败后回到计划阶段重新思考并执行。

必须找人类确认：

- 新增或扩大 V1 范围。
- 需要开放本地文件读取、shell、浏览器自动操作。
- 需要云端服务、外部账号、付费 API、敏感 token。
- 需要降低安全约束，例如监听 `0.0.0.0` 或放宽 Origin allowlist。
- 真实数据验收无法完成，需要降级为 mock 或跳过。
- 审计出现未闭环的致命或重大风险。

---

## 7. 总体执行结论

V1 后续执行采用：

```text
阶段计划
-> PRD 规格检视
-> 预审计
-> 闭环致命/重大审计意见
-> 实质开发
-> 真实数据端到端验收
-> PRD 规格复检
-> 阶段放行或打回重做
```

默认不需要人类介入。只有高风险流程、人为权限、范围变更或无法自动闭环的重大偏差才停止并请求确认。
