# Navia Active Stage Gates

本目录只保留当前仍然激活的 V1.2 / A-V1.2 stage gate。

已完成或不再激活的 V1.0、V1.1、A-V1.1 stage gate 已移动到：

```text
docs/history/
```

## 当前激活门禁

| 文件 | 状态 | 用途 |
|---|---|---|
| `v1.2-0-ai-reading-contract-and-workspace-freeze.md` | 当前 V1.2 基础门禁 | 冻结 A/B/C/D/Integration 工作区、公共合同和跨模块变更规则 |
| `v1.2-a-page-reading.md` | 当前 A 模块工作区门禁 | A Page Perception / AgentCore Eyes 的工作区、边界和交接规则 |
| `v1.2-a-v1.2-production-page-perception.md` | 当前 A-V1.2 主门禁 | 高质量网页感知、结构化页面摘要、可反跳证据、Debug JSON、100-page corpus gate |
| `v1.2-ac-page-perception-mindmap-bridge.md` | 当前 AC 联动门禁 | A high-signal 主链路、C digest-first Mindmap、SourceRef 反跳和 Debug 验收 |
| `v1.2-b-chat-renderer.md` | V1.2 B 模块门禁 | 前端结构化渲染、流式输出、Debug 和 Mindmap 展示 |
| `v1.2-c-mindmap.md` | V1.2 C 模块门禁 | Mermaid / Mindmap 生成、source map 和反跳来源 |
| `v1.2-d-agentic-loop.md` | V1.2 D 模块门禁 | CoreProvider / Adapter Layer、治理桥和 ToolResult / Artifact / Event / Trace 映射 |
| `v1.2-e-integration.md` | V1.2 Integration 门禁 | A/B/C/D wiring、真实 Chrome E2E、trace 和 PRD 复检 |

## 当前执行规则

每个阶段都必须按以下顺序执行：

```text
PRD 规格检视
-> 开发计划和验收标准
-> 预审计
-> 闭环 fatal / major 风险
-> 实质开发
-> 真实数据或真实浏览器 E2E 验收
-> PRD 规格复检
-> 放行或打回
```

## A-V1.2 特别门槛

`A-V1.2-1+` 进入实质实现前必须满足：

- 外部审计确认 `A-V1.2-0` 合同冻结无 fatal / major risk。
- `HighSignalPageContext`、`PerceptionDigest`、`SourceMap / SourceRef`、`PagePerceptionQualityReport` 和 `DebugEvidenceBundle` 公共合同冻结。
- 质量公式、extractor selection、corpus gate、gold review gate、dependency audit 均冻结。
- `trafilatura`、`readability-lxml`、`readabilipy` 等 extractor 依赖未获 `decision=approved` 前不得安装。
- 少于 100 个最终计入的复杂网页或 snapshot，不得声明 A-V1.2 完成。

## 历史门禁

历史门禁只用于追溯，不作为当前开发验收依据：

```text
docs/history/V1.0/stage-gates/
docs/history/V1.1/stage-gates/
docs/history/A-V1.1/stage-gates/
docs/history/V1.13-V1.16/stage-gates/
```
