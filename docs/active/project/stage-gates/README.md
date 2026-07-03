# Navia Active Stage Gates

本目录只保留当前仍然激活或仍需作为 active 口径引用的 V1.2 / V1.3 / V1.4 / V1 mainline / A-V1.2 stage gate。

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
| `v1.2-ac-native-sidepanel.md` | Closeout evidence passed for AC-Native only | 真实 Chrome 原生 Side Panel 打开、截图证据、读取、Debug、总结、问答、Mindmap 和恢复验收；不得声明完整 V1 / V1.2 complete |
| `v1.2-ac-quality-hardening.md` | 当前 AC-Quality 门禁 | A/C 质量深化、真实网页扩展、digest-first Mindmap、Debug 可读性和 false-green audit |
| `v1.2-ac-jumpback-mvp.md` | 当前 AC-Jumpback MVP 门禁 | Mindmap 节点点击、来源证据卡片、基础 DOM 定位、失败 fallback 和反跳 false-green audit |
| `v1.2-closeout.md` | 当前 V1.2 收关门禁 | 将 Jumpback P1 补强项固化为 V1.2 完成声明前的截图级验收、20 页矩阵、PRD 复检和出门条件 |
| `v1.3-evidence-card-mindmap.md` | V1.3 规划门禁 | Evidence Card Mindmap 主渲染、source evidence panel、交互反馈、真实 Side Panel 截图级验收 |
| `v1.4-reading-map.md` | V1.4 规划门禁 | Reading Map 双栏伴读导航、节点详情、source evidence 和 jumpback / fallback 状态 |
| `v1-complex-site-reading-hardening.md` | V1 complex-site hardening 门禁 | B站 / 小红书 / 观察者网首页与详情页的当前页读取、导图质量和 source evidence 验收 |
| `v1-gemini-style-pass.md` | V1 visual style 门禁 | 当前 sidebar 的 Gemini 样式、按钮系统和 source 状态表达 |
| `v1-launcher-resize-interaction.md` | V1 interaction shell 门禁 | launcher、collapse、resize、drag、push / overlay 的 content script 交互壳 |
| `v1-mainline-closeout.md` | 当前 V1 主线收口门禁 | 汇总 V1.3、V1.4、complex-site、Gemini style、launcher，进入人工产品核查和 V1 complete 候选审计 |
| `v1-mvp-content-quality.md` | 当前 V1-MVP-CQ 门禁 | QH 通过之后的 strict 内容理解质量增强，验证总结、问答、解释选区、Mindmap 和 Source Evidence 是否真正基于主内容 |
| `v1-post-v1-hardening.md` | 当前 Post-V1 hardening 文档门禁 | V1 complete 之后的 source jumpback 精度、Mindmap 质量、窄侧栏 UX 和真实网页回归基线硬化 |
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
