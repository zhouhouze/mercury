# V3 Media Companion 开发及验收计划

## 1. 当前阶段

当前阶段只做文档开发。任何代码实现都必须等 V3 文档门禁审计无 fatal / major 后，再另行启动 V3.0 实现门禁。

## 2. 文档开发计划

| 子阶段 | 输出 | 验收 |
|---|---|---|
| `V3-DOC-0` | 同步 PRD、架构、开发计划、验收计划、stage gate、gap companion 和 drawio | 所有文档统一使用 `V3 Media Companion`，不引入代码实现范围 |
| `V3-DOC-1` | 冻结目标体验和竞品映射 | Monica-like YouTube 体验与 B站 AI 视频总结体验被映射到 Navia 能力 |
| `V3-DOC-2` | 冻结 V3.0 transcript-first 边界 | YouTube + B站、字幕 / 转录、简介、评论、弹幕、metadata、截图证据和时间戳反跳在规划范围内 |
| `V3-DOC-3` | 冻结 V3.x 多模态路线 | ASR、VLM、OCR、Gemini Video 和 live input 仅作为未来候选 |
| `V3-DOC-4` | 冻结未来验收矩阵和 false-green 规则 | 24 页矩阵、截图证据、timestamp jumpback、degraded 和 blocked 规则已定义 |
| `V3-DOC-5` | Readiness audit | 无 fatal / major；没有 V3 implemented 或视频理解 ready 过度声明 |

## 3. 未来 V3.0 实现计划

| 子阶段 | 开发重点 | 验收重点 |
|---|---|---|
| `V3.0-0` | 实现前 kickoff audit | V3.0 与 V3.x 边界仍然清楚 |
| `V3.0-1` | Content Script Media Collector 和 `MediaPageContext` | YouTube / B站 metadata、播放时间和字幕可用性可采集或正确 degraded |
| `V3.0-2` | Transcript、subtitle、chapter 和可见互动文本 ingestion | 每个 segment 有 source、timestamp 和 fallback |
| `V3.0-3` | A Media Page Perception | 生成 media digest、timeline events 和 quality report |
| `V3.0-4` | C Media Mindmap | 章节、主题、事件、论点和结论绑定 timeline source refs |
| `V3.0-5` | B Media Companion Renderer | 侧栏展示视频概览、时间轴、Media Mindmap、截图证据卡和 Ask Video |
| `V3.0-6` | Media Jumpback | timestamp seek 成功，或 fallback / blocked 清晰 |
| `V3.0-7` | 真实验收 | 24 个真实视频页、HTML 报告、截图证据、PRD review 和 false-green audit 通过 |

## 4. 未来验收矩阵

最小样本集：

- YouTube 至少 12 页。
- B站至少 12 页。
- 类别覆盖：课程 / 知识、新闻 / 评论、影视解说、游戏 / 赛事、长视频、短视频、字幕可用、字幕不可用、评论丰富、评论贫乏。

最低通过门槛：

- 至少 20/24 页面生成可审计概览或正确 degraded / blocked。
- 至少 16/24 页面生成时间轴或等价片段结构。
- 至少 12 个样本包含截图证据卡。
- 至少 12 个样本完成 timestamp jumpback 或清晰 fallback / blocked。
- 无 fatal / major PRD 或 false-green 问题。

## 5. 未来报告要求

未来 `report.json` / HTML report 必须记录：

```text
platform
url
title
duration
transcriptAvailability
timelineSources
overviewQuality
mindmapTopNodes
screenshotEvidence
jumpbackResult
degradedReason
screenshotPaths
testCommands
prdReview
falseGreenAudit
```

## 6. No-Go

- 文档阶段声明已实现。
- 声明完整 Monica-like YouTube parity。
- 在 V3.0 声明视频画面或音频已理解。
- 无字幕 / 无转录视频被计为 understood。
- fallback 被计为 located timestamp jumpback。
- 第三方 B站 AI 总结账号内容被冒充为 Navia 自己理解。
- 未另起 V3.x 门禁就声明 ASR / VLM / OCR / Gemini Video / live input ready。

