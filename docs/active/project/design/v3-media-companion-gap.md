# V3 Media Companion Gap Companion

## 1. 阶段定位

`V3 Media Companion` 是 V1 当前网页伴读之后的视频页伴随体验规划阶段。当前只做文档开发，不进入代码实现。目标是让 Navia 未来在 YouTube 和 B站视频页中提供接近 Monica YouTube 视频助手的侧栏体验，并覆盖 B站 AI 视频总结账号 / 工具中常见的视频概览、章节、导图、截图证据和时间戳反跳。

允许规划声明：

```text
V3 Media Companion planning baseline ready for review.
```

当前不得声明：

```text
V3.0 implemented.
完整 Monica-like YouTube parity complete。
真实视频画面 / 音频已被理解。
ASR / VLM / OCR / Gemini Video ready。
直播实时理解 ready。
跨视频知识库 / RAG ready。
```

## 2. 目标体验

用户打开 YouTube 或 B站视频页后，Navia 仍以现有 companion shell 进入，但 V3 目标体验从网页正文伴读扩展到视频页伴随：

```text
打开视频页
-> 点击 Navia launcher
-> 读取视频页
-> 生成视频概览卡
-> 展示章节时间轴和 Media Mindmap
-> 展示视频截图证据卡
-> 用户点击节点或证据
-> 跳转到对应视频时间点
-> 围绕片段继续问答
```

V3.0 的核心价值不是“模型看懂视频画面”，而是先把视频页可获得的标题、简介、字幕 / 转录、章节、评论 / 弹幕、metadata 和时间戳组织成可读、可问、可追溯、可跳转的伴随体验。

## 3. 当前架构与目标架构差异

| 状态 | 实体 | 当前 V1 / V2 基线 | V3 目标 |
|---|---|---|---|
| 已实现保持 | Launcher / Sidebar shell | 当前网页伴读入口已可用 | 复用为视频页 companion 入口，不新增独立顶级产品 |
| 待新增 | Content Script Media Collector | 只有普通 DOM / metadata / selection 读取 | 新增视频页平台识别、播放器时间、字幕入口、章节、评论 / 弹幕可见文本采集规划 |
| 待新增 | `MediaPageContext` | 无媒体页上下文合同 | 规划 platform、videoId、duration、currentTime、transcriptAvailability、timelineSources、degradedReason |
| 待新增 | A Media Page Perception | A 负责网页 page reading | 规划 transcript-first digest、timeline events、media source refs、quality report |
| 保持边界 | D Adapter / Governance / Trace | D 负责 ToolResult / Artifact / Event / Trace | 未来 ASR / VLM / OCR / Gemini Video 必须通过 D，不允许 B/A 绕过治理 |
| 待新增 | C Media Mindmap | C 生成网页 Mindmap | 规划章节图、主题图、事件 / 论点 / 结论图，绑定 timestamp source |
| 待新增 | B Media Companion Renderer | B 展示 Chat / Mindmap / Source Evidence | 规划视频概览卡、章节时间轴、Media Mindmap、截图证据卡、Ask Video |
| 待新增 | VideoFrameEvidenceRef | 当前只有页面截图 / source marker | 规划 timestamp screenshot evidence；V3.0 不声明截图语义理解 |
| 待新增 | MediaJumpbackTarget | 当前反跳面向 DOM/text | 规划 timestamp seek、transcript segment、fallback / blocked |
| 未来候选 | V3.x Multimodal Adapters | V1 禁止媒体流理解 | 规划 ASR / VLM / OCR / Gemini Video / live input 的权限、隐私、采样、成本和 trace |

## 4. 竞品对标

V3 文档必须把竞品能力映射到 Navia 规格，而不是只写抽象目标。

| 参考对象 | 用户可感知能力 | Navia V3 规划映射 |
|---|---|---|
| Monica Video Summarizer | YouTube 总结、transcript、Mind Map、Ask Video | V3.0 视频概览、章节时间轴、Media Mindmap、片段问答 |
| AI课代表 | B站 / YouTube 总结、字幕搜索、知识提问、时间戳 | V3.0 B站字幕 / 评论 / 弹幕可见文本、timestamp jumpback |
| BibiGPT | 核心要点、章节大纲、思维导图、可搜索字幕、二次追问 | V3.0 Media Mindmap、字幕 source refs、Ask Video |
| NoteGPT Bilibili Summarizer | B站转录、深度总结、思维导图、继续对话 | V3.0 视频概览、导图和问答 |
| Gemini Video Understanding | 视频 / 音频真实多模态理解 | V3.x 多模态候选，不进入 V3.0 首期承诺 |

竞品来源：

```text
Monica Video Summarizer: https://monica.im/en/products/ai-video-summarizer
AI课代表 Chrome Web Store: https://chromewebstore.google.com/detail/ai%E8%AF%BE%E4%BB%A3%E8%A1%A8-b%E7%AB%99%E5%AD%A6%E4%B9%A0%E5%8A%A9%E6%89%8B-%E8%A7%86%E9%A2%91%E6%80%BB%E7%BB%93-%E5%AD%97%E5%B9%95%E5%88%97%E8%A1%A8-gp/jgilkmapjeaikiboajahmeiadceioobc
BibiGPT docs: https://docs.bibigpt.co/getting-started/experience-all-in-one-ai-audio-video-learning-assistant
NoteGPT Bilibili Summarizer: https://notegpt.io/cn/bilibili-summarizer
Eightify: https://eightify.app/
HARPA YouTube summarize guide: https://harpa.ai/guides/summarize-pages-and-youtube-videos-to-text
YouTube conversational AI help: https://support.google.com/youtube/answer/14110396
Gemini Video Understanding: https://ai.google.dev/gemini-api/docs/video-understanding
```

## 5. 验收规划

未来 V3.0 实现验收最小矩阵：

- YouTube 12 页。
- B站 12 页。
- 覆盖课程 / 知识、新闻评论、影视解说、游戏 / 赛事、长视频、短视频、字幕可用、字幕不可用、评论丰富、评论贫乏。
- 至少 20/24 页面生成可审计视频概览或正确 degraded / blocked。
- 至少 16/24 页面具备章节 / 时间轴或等价片段结构。
- 至少 12 个样本包含视频截图证据卡。
- 至少 12 个样本完成 timestamp jumpback 或清晰 fallback / blocked。

每个样本必须记录：

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
```

## 6. False-green 防线

- 无字幕 / 无转录 / 无简介 / 无评论 / 无 metadata 的视频必须 degraded / blocked。
- 视频截图证据只证明目标时间点的可见帧，不等于 VLM 已理解画面。
- timestamp fallback 不能冒充精准 located。
- 第三方 B站 AI 总结账号或站外摘要不能冒充 Navia 生成的理解结果。
- ASR / VLM / OCR / Gemini Video / live input 只能作为 V3.x 路线；未冻结授权、隐私、采样、成本、延迟和 trace 前不得声明 ready。
