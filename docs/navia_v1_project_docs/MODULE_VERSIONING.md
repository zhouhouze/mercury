# Navia 模块内部编号规则

版本：Module Versioning Baseline
日期：2026-06-04

## 1. 目标

本规则用于统一后续模块内部开发计划、stage gate、验收证据和任务拆分的编号方式，让不同 Agent 可以快速定位自己负责的模块能力。

项目级阶段仍使用：

```text
V1.0 / V1.1 / V1.2 / V1.12 / V1.13 / V1.14 / ... / V3.0 / V4.0 / V5.0
```

模块内部能力使用：

```text
<模块>-V<模块版本>-<序号>
```

示例：

```text
A-V1.0-1
B-V1.0-1
C-V1.0-1
D-V1.0-1
INT-V1.0-1
```

## 2. 编号含义

```text
A-V1.0-1
| |    |
| |    子能力序号
| 模块内部能力版本
模块代号
```

模块代号：

| 代号 | 模块 |
|---|---|
| `A` | Page Perception / AgentCore Eyes |
| `B` | Frontend Renderer |
| `C` | Mindmap Generation |
| `D` | CoreProvider + Adapter Layer |
| `INT` | Integration / E2E / PRD Review |
| `EVD` | V2 Coding Evidence Platform |

## 3. 项目阶段与模块编号关系

`V1.2-A` 是项目级阶段名，表示 V1.2 阶段中的 A 模块工作。

`A-V1.0-*` 是 A 模块内部能力编号，表示 A 模块第一代感知能力合同下的子能力。

二者关系：

```text
V1.2-A Page Perception
  -> A-V1.0-0 合同冻结
  -> A-V1.0-1 文本 / DOM 结构识别
  -> A-V1.0-2 图文网页识别
  -> A-V1.0-3 OCR 识别规划
  -> A-V1.0-4 表格 / 列表 / 代码块识别
  -> A-V1.0-5 页面区域与信息密度识别
  -> A-V1.1-* 高信号网页感知增强
```

## 4. A 模块路线

A 模块是 AgentCore 的眼睛。它只负责感知和结构化事实，不负责最终回答、AgenticLoop、Artifact 创建、SSE 或外部工具执行。

### A-V1.0-0：感知合同冻结

目标：

- 冻结 `StructuredPageContext`。
- 冻结 source map、field ownership、No-Go。
- 明确 A 只输出感知事实。

### A-V1.0-1：文本 / DOM 结构识别

目标：

- headings。
- paragraphs。
- chunks。
- annotations。
- contentHash。
- summaryDraft。

当前 mock-first baseline 归入本编号。

### A-V1.0-2：图文网页识别

目标：

- image metadata。
- figure。
- caption。
- alt / title / aria-label。
- nearby text。
- image-to-paragraph / image-to-chunk relation。

禁止：

- 下载图片。
- 上传图片到远端。
- 幻想图片内容。
- 默认调用 OCR 或视觉模型。

### A-V1.0-3：OCR 识别规划

目标：

- 定义 OCR 输入、输出和置信度合同。
- 定义 `OcrTextBlock[]`。
- 明确 OCR engine 只能作为受控 Adapter 接入。

### A-V1.0-4：表格 / 列表 / 代码块识别

目标：

- table。
- list。
- code block。
- blockquote。
- link cluster。

### A-V1.0-5：页面区域与信息密度识别

目标：

- main / article / aside / nav / footer。
- hero / metadata / recommendation / ad-like block。
- 信息密度评分。
- 低价值区域过滤。

## 5. A 模块下一阶段路线

`A-V1.1-*` 是 A 模块第二轮网页感知增强，目标是把 A 从“结构化抓取”升级为“高信号、可评估、可反跳、可供 D/C 直接消费的网页感知层”。

### A-V1.1-0：高信号感知合同冻结

目标：

- 完成 public vs module-local 决策。
- 如 D/C 直接消费，先把 `HighSignalPageContext`、`PerceptionDigest`、`PagePerceptionQualityReport` 和 `SourceMap` 提升为公共合同。
- 冻结 SourceRef、质量指标公式、fixture class gates 和 candidate extractor isolation。
- 明确 A-V1.1-1+ 在 P0 合同闭环前 No-Go。

默认技术路线：

- 正文抽取 baseline 优先 `trafilatura`。
- 对照 baseline 使用 Mozilla Readability / `readabilipy`。
- 轻量 fallback 使用 `readability-lxml`。
- 最终输出仍由 A Pipeline 统一生成。

子阶段：

- `A-V1.1-0a`：Public vs module-local decision。
- `A-V1.1-0b`：Schema freeze。
- `A-V1.1-0c`：Quality metric formula freeze。
- `A-V1.1-0d`：Candidate extractor isolation。
- `A-V1.1-0e`：Fixture class gates。

### A-V1.1-1：正文识别与噪声过滤

目标：

- 主内容识别。
- nav / footer / aside / recommendation / ad-like / comment 降权或过滤。
- 输出 `regionType`、`noiseScore`、`contentDensityScore`。
- 保留过滤证据供 Debug 和审计使用。

### A-V1.1-2：SourceMap 与反跳基础

目标：

- 为 paragraph、chunk、image metadata、table cell、code block 建立 source reference。
- source reference 至少包含 `pageId`、`blockId`、`textQuote` 和可选 `domPath` / `textOffset`。
- 为 B 的原文定位和 C 的 mindmap 节点反跳提供输入。

### A-V1.1-3：高密度关键信息蒸馏

目标：

- 输出 `PerceptionDigest`。
- 包含 key facts、entities、claims、evidence、definitions、procedures、open questions、table/code/image summaries。
- 每个 digest item 必须绑定 source reference。
- 不生成最终 assistant answer。

### A-V1.1-4：A 模块质量评估器

目标：

- 输出 `PagePerceptionQualityReport`。
- 评估 noise ratio、content coverage、source coverage、fact density、compression ratio、grounding completeness、jumpback coverage 和 downstream readiness。
- 用机器门槛替代人工肉眼判断。

### A-V1.1-5：图片与 OCR 合同增强

目标：

- 强化 image metadata、figure、caption、nearby text、image-to-paragraph / image-to-chunk relation。
- 定义 `OcrTextBlock` mock 合同。
- OCR / VLM 执行必须未来通过 D Adapter Layer 和治理接入。

### A-V1.1-6：视频 / 直播感知规划登记

目标：

- 登记 `VideoMetadata`、`TranscriptSegment`、`KeyFrameRef`、`FrameOcrBlock`、`MediaTimelineEvent`、`LiveRollingPerception`。
- 明确视频 / 直播真实识别不是 A-V1.1 完成项。

## 6. A 模块未来路线

### A-V1.2：Production Page Perception

目标：

- 把 A-V1.1 DOM baseline 高信号感知升级为复杂真实网页可验收的网页感知层。
- 阶段定位收敛为：高质量网页感知、结构化页面摘要、可反跳证据、Debug 可验证 JSON。
- 采用组合路线：DOM baseline + candidate extractor ensemble + A-owned schema normalization + SourceMap / jumpback + Quality Evaluator + DebugEvidenceBundle + 100-page corpus gate。
- 至少使用 `100` 个复杂不同种类网页或可复现 HTML snapshot 做最终验收。
- 提升主体内容识别、噪声过滤、结构化摘要、SourceMap 反跳和质量评估可信度。
- 保持 A 不生成最终回答、不创建 Artifact、不发 SSE、不写 EventStore、不调用 D/C/B/MCP/Skill。

默认组合路线：

```text
DOM baseline
+ extractor ensemble
+ A-owned schema normalization
+ SourceMap / jumpback
+ Quality Evaluator
+ DebugEvidenceBundle
+ 100-page corpus gate
```

路线解释：

- `DOM baseline` 是最低实现与离线 fallback。
- `extractor ensemble` 是提升复杂网页鲁棒性的候选层，不是公共输出层。
- `A-owned schema normalization` 是下游 D/C/B 的唯一依赖入口。
- `SourceMap / jumpback` 是 C Mindmap 反跳与 B Debug 证据展示的基础。
- `Quality Evaluator` 是防止人工肉眼判断和 false green 的核心。
- `DebugEvidenceBundle` 是开发者判断 A 模块提取质量的前端证据。
- `100-page corpus gate` 是 A-V1.2 是否完成的最终门槛。

子阶段：

- `A-V1.2-0`：合同与目标冻结。
- `A-V1.2-1`：100-page 验收集。
- `A-V1.2-2`：主体内容识别。
- `A-V1.2-3`：噪声过滤与密度提升。
- `A-V1.2-4`：结构化页面摘要。
- `A-V1.2-5`：SourceMap 与反跳证据。
- `A-V1.2-6`：质量评估模型。
- `A-V1.2-7`：Debug JSON 证据包。
- `A-V1.2-8`：100-page 出门验收。

No-Go：

- 少于 100 个复杂网页就声明 A-V1.2 完成。
- 第三方 extractor 输出直接暴露为 Navia 公共合同。
- 未审计依赖、license、fallback 就安装 extractor 包。
- A 默认执行 OCR / VLM / ASR / 视频 / 直播 engine。
- A 生成学习卡片、Quiz、Podcast、Notebook、最终回答或 Mindmap。

### A-V1.12-1：视频感知规划

目标：

- video metadata。
- subtitle track。
- transcript。
- key frames。
- frame OCR。
- scene timeline。

### A-V1.12-2：直播实时感知规划

目标：

- rolling transcript。
- sampled frames。
- live OCR snapshots。
- event detection。
- latency / budget / sampling policy。

## 7. V1.13+ Coding Evidence Platform 编号修正

当前计划继续沿用 V1 连续编号，从 `V1.13` 开始进入 coding-agent evidence platform 方向，因此不应继续使用 V1 A/B/C/D 模块号。

正式编号采用项目级 `V1.13+` 加子系统内部 `EVD-Vx.y-z`：

| 正式项目编号 | 历史别名 | 阶段 | 模块内部编号 |
|---|---|---|---|
| `V1.12` | `V2.11-V2.12` baseline | Coding Evidence Platform baseline | `EVD-V1.0-1` |
| `V1.13` | `V2.13` | Controlled Runtime Evidence | `EVD-V1.0-2` |
| `V1.14` | `V2.14` | Incremental Intelligence | `EVD-V1.0-3` |
| `V1.15` | `V2.15` | Interactive Review Workbench | `EVD-V1.0-4` |
| `V1.16` | `V2.16` | Real MCP / External Repo E2E / Executable Schema | `EVD-V1.1-1` 到 `EVD-V1.1-3` |

规则：

- 新文档必须优先使用正式编号。
- 旧文档可以保留历史文件名，但正文需要标注 `legacy alias`。
- 禁止继续新增 `V2.*` 这类跳号阶段。
- 若后续仍是 coding evidence 增强，使用 `V1.17`。
- 若进入知识库 / RAG / Memory 产品化，单独评估是否切到新的主版本。

## 8. 编写规则

后续新增模块任务时必须：

- 在标题中包含模块编号。
- 在 stage gate 中登记编号。
- 在验收证据中标注编号。
- 如果改变公共合同，回到对应 `*-Vx.y-0` 合同冻结。

禁止：

- 只写“下一阶段”“A 子阶段”这类不可追踪名称。
- 在同一编号下混合多个模块职责。
- 用项目级版本号替代模块内部编号。
