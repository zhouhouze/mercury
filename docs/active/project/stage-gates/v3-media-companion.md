# V3 Media Companion Stage Gate

## 1. 阶段定位

`V3 Media Companion` 是视频页伴随体验的规划门禁。它把此前只散落在长期路线和历史 drawio 中的 V3 重新纳入 active 文档，但当前只做目标体验、目标架构、开发计划和验收计划规划，不进入代码实现。

当前阶段状态：

```text
V3 Media Companion planning only.
No code implementation.
No media understanding ready claim.
```

当前允许声明：

```text
V3 Media Companion planning baseline ready for review.
```

未来 V3.0 只有在独立实现和真实验收完成后，最多允许声明：

```text
V3.0 transcript-first video companion passed YouTube and Bilibili planning-aligned acceptance.
```

## 2. 目标体验

V3 应接近 Monica 在 YouTube 的视频助手体验，并覆盖 B站 AI 视频总结账号 / 工具中常见的体验：

- 视频概览卡。
- 关键看点和省流总结。
- 章节时间轴。
- Media Mindmap / 视频概览图。
- 字幕 / 转录搜索和问答。
- 视频时间点截图证据卡。
- 点击节点或证据后跳转到视频时间点。
- transcript、截图、seek、登录、地区、平台限制失败时，展示 fallback / blocked。

竞品参考必须进入规划：

- Monica Video Summarizer。
- AI课代表。
- BibiGPT。
- NoteGPT Bilibili Summarizer。
- Eightify。
- HARPA。
- YouTube conversational AI。
- Gemini Video Understanding 只能作为 V3.x 多模态路线，不属于 V3.0 范围。

## 3. 范围拆分

### 3.1 V3.0 Transcript-first Video Companion

V3.0 只规划以下输入和体验：

- YouTube 和 B站视频页。
- 标题、作者 / 频道、简介、时长和页面可见 metadata。
- 可用的字幕 / 转录 / 章节文本。
- 可见评论、弹幕或互动文本。
- 当前播放时间。
- 某个时间点的视频截图证据。
- timestamp seek / jumpback。

V3.0 不得声明：

- 已理解视频画面或声音。
- ASR / VLM / OCR / Gemini Video ready。
- 直播实时理解 ready。
- 跨视频 Memory / RAG ready。
- 自动下载、提取视频流或绕过平台访问限制。

### 3.2 V3.x Multimodal Media Understanding

V3.x 是未来路线，可以规划：

- ASR 音频转写。
- VLM 视频帧理解。
- 视频帧 OCR。
- Gemini Video / Live API。
- 直播 rolling transcript。
- frame sampling。

V3.x 实现前必须冻结：

- 用户授权。
- 隐私边界。
- 采样策略。
- 缓存和删除规则。
- 延迟预算。
- 成本预算。
- confidence 和 source provenance。
- EventStore / Trace 回放。
- false-green audit。

## 4. 目标架构实体

V3 drawio 和架构文档必须出现以下具体实体：

- Content Script Media Collector。
- `MediaPageContext`。
- A Media Page Perception。
- D Adapter / Governance / Trace。
- C Media Mindmap。
- B Media Companion Renderer。
- `VideoFrameEvidenceRef`。
- `MediaJumpbackTarget`。
- V3 evidence package。

边界：

- B 不得直接调用 ASR、VLM、OCR、Gemini Video、A、C 或 D 服务。
- A 不得绕过 D Adapter / Governance 调用多模态 engine。
- Content Script 只采集当前页用户可访问上下文和用户触发的反跳信号。
- V3.0 截图证据只证明某个 timestamp 的可见帧，不等于视觉理解。

## 5. 必需文档

V3 文档门禁必须覆盖：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/stage-gates/v3-media-companion.md
docs/active/project/design/v3-media-companion-gap.md
docs/active/project/design/v3-media-companion-gap.drawio
docs/active/project/design/v3-media-companion-development-acceptance-plan.md
docs/active/project/design/v3-media-companion-readiness-audit.md
```

## 6. Drawio 门禁

`v3-media-companion-gap.drawio` 必须：

- 中文书写。
- 不超过 8 页。
- 包含目标体验和竞品对标。
- 包含当前架构与目标架构差异。
- 展示 YouTube / B站 transcript-first 输入链路。
- 展示视频概览、Media Mindmap、截图证据和 timestamp jumpback。
- 展示 V3.0 与 V3.x 边界。
- 展示开发计划、里程碑、验收门槛和 No-Go。

## 7. 未来 V3.0 验收矩阵

未来实现阶段必须规划至少 24 个真实视频页：

- YouTube 至少 12 页。
- B站至少 12 页。
- 覆盖知识 / 课程、新闻 / 评论、影视解说、游戏 / 赛事、长视频、短视频、字幕可用、字幕不可用、评论丰富、评论贫乏。

最低未来门槛：

- 至少 20/24 页面生成可审计视频概览或正确 degraded / blocked。
- 至少 16/24 页面生成章节时间轴或等价片段结构。
- 至少 12 个样本包含视频截图证据卡。
- 至少 12 个样本完成 timestamp jumpback 或清晰 fallback / blocked。
- PRD review 和 false-green audit 无 fatal / major。

## 8. No-Go

以下任一情况必须打回：

- 当前文档阶段声明 V3.0 已实现。
- 声明完整 Monica-like YouTube parity。
- 无多模态证据时声明视频画面 / 音频已理解。
- 无字幕 / 无转录视频被计为 understood。
- timestamp fallback 被计为精准 located。
- 第三方 B站 AI 总结账号内容被冒充为 Navia 自己理解。
- 声明 ASR / VLM / OCR / Gemini Video ready。
- 声明直播实时理解 ready。
- 规划自动下载、提取视频流或绕过平台访问限制。
- 声明跨视频 Memory / RAG ready。

