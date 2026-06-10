# ADR: V1.2 Agent Core Provider 采用 piAgent 优先、Core 可替换

状态：Accepted for documentation baseline
日期：2026-06-04

## Context

V1.2 将聊天页签拆成 A/B/C/D 四个模块。原 D 模块文档把 D 描述为完整 AgenticLoop 实现者，这会导致两个问题：

- 团队已经初步选型 piAgent 作为当前项目 Core 部分，不希望从零硬编码完整 AgenticLoop。
- 后续可能需要快速切换不同 Core，例如 mock core、piAgent core 或 custom core。

因此 D 不应等同于某个固定 Core 实现。D 应成为 Navia Runtime 和 Core Provider 之间的稳定适配层。

## Decision

Navia V1.2 引入 `CoreProvider` 抽象：

```text
CoreProvider.run_turn(CoreTurnInput) -> CoreTurnResult
```

默认策略：

- `piAgentProvider`：V1.2 首选 Core Provider。
- `MockCoreProvider`：本地测试和合同测试 fallback。
- `FutureCoreProvider`：后续替换其他 Core 的扩展点。

D 模块职责调整为：

- CoreProvider adapter。
- Core config loading。
- AdapterRegistry。
- GovernanceBridge。
- ToolResult mapping。
- Artifact mapping。
- Event/SSE mapping。
- Trace mapping。

D 不再被描述为从零实现完整 AgenticLoop 的模块。piAgent 也不得直接写 `ArtifactRecord`、SSE、EventStore 或前端 UI。所有 Core 输出必须经 D Adapter Layer 映射为 Navia 合同。

## Consequences

变得更容易：

- 快速替换 Core。
- 使用 piAgent 承接复杂 AgenticLoop 能力。
- 让 A/B/C 不依赖具体 Core。
- 用 mock core 做自动化测试。

变得更难：

- 需要维护 `CoreProvider` 合同。
- 需要维护 piAgent 到 Navia ToolResult/Event/Artifact 的映射。
- 需要处理 piAgent 状态模型和 Navia 单 Session / Trace 合同的差异。

风险：

- piAgent 输出格式、工具调用模型、状态模型可能与 Navia 合同不一致。
- piAgent 具体仓库、版本、license 尚需在实质开发前锁定。
- 如果适配层过薄，piAgent 可能绕过 Governance 或 Trace。

防线：

- D Adapter Layer 是唯一映射出口。
- GovernanceBridge 必须在 Core 请求工具前执行。
- Core 输出不得直接进入 B、EventStore 或 ArtifactStore。
- piAgent 具体依赖接入前必须完成版本与 license 审计。

