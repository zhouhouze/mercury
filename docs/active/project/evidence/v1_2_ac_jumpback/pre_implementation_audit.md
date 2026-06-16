# V1.2-AC-Jumpback MVP Pre-Implementation Audit

## 审计结论

Conditional Go for V1.2-AC-Jumpback MVP staged implementation.

当前合同、PRD、架构、开发计划和验收门槛已覆盖本阶段最小目标：

- C 生成稳定 `nodeBindings` 与 `nodeSourceMap`。
- B 在 Mindmap artifact 内展示来源证据卡片。
- 用户点击 Mindmap 节点或节点来源入口后，触发当前网页内的定位请求。
- Content Script 按 `selector -> domPath -> textQuote` 尝试定位并高亮。
- 定位失败时展示 `fallbackText/textQuote`，不得伪装为 DOM 成功。

## 范围边界

本阶段只实现 Jumpback MVP，不声明完整 V1.2 完成，不声明 Monica 级精确回跳，不实现历史轨迹拖拽、OCR/video/live/PDF 回跳、RAG、Memory、Web Research、浏览器自动操作、PPT 或深度研究。

A/C 不写 `ArtifactRecord`、SSE、EventStore 或 Trace。D 仍是唯一 ToolResult / Artifact / Event / Trace 映射边界。B 只渲染 Artifact metadata 并通过 Chrome extension message 请求 content script 执行当前页定位。

## 进入实现前审计项

| 项目 | 结论 | 说明 |
|---|---|---|
| 公共合同 | Pass | `v1_2_adapter_contracts.md` 已定义 `MindmapNodeBinding`、`SourceEvidenceCard`、`JumpbackRequest`、`JumpbackResult`。 |
| PRD 目标 | Pass | `01-prd.md` 已限定 Jumpback MVP 的用户目标和不声明能力。 |
| 目标架构 | Pass | `02-architecture.md` 已明确 C/B/content script/D 边界。 |
| 开发计划 | Pass | `03-development-plan.md` 已拆分 AC-Jumpback-0 到 AC-Jumpback-5。 |
| 验收门槛 | Pass | `04-acceptance-plan.md` 已要求真实页面、降级态和 false-green 审计。 |
| Drawio | Pass | `v1.2-ac-jumpback-mvp-gap.drawio` 已覆盖目标架构、差异、计划、门槛和出门条件。 |

## No-Go 防线

- 只有 Mermaid source 或全屏调试页面，不得声明 Jumpback 通过。
- 只有 `nodeSourceMap` 但无可点击绑定，不得声明通过。
- DOM 定位失败但仍显示 success/highlighted，不得声明通过。
- fallback evidence 缺失或不可读，不得声明通过。
- B/C 绕过 D 创建 Artifact、Event、Trace，不得声明通过。

## 下一步

进入 V1.2-AC-Jumpback-1+ 最小实现：

1. C 输出 `metadata.nodeBindings`。
2. B 从 artifact metadata 生成来源证据卡片与 Jumpback request。
3. Content Script 支持 `navia.jumpToSource` 消息。
4. 运行单元测试、前端测试、后端测试与真实数据 fixture 验收。
