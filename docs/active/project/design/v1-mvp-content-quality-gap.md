# V1-MVP-CQ Content Quality Gap Companion

Date: 2026-07-02

`v1-mvp-content-quality-gap.drawio` 是 V1-MVP-CQ 内容理解质量增强阶段的 active gap 图。它承接 QH 48 页矩阵已经通过的事实，但明确说明 QH passed 不能替代 strict content quality prove-out。

## 分页

分页固定为 8 页，不超过 8 页：

| 页面 | 目的 |
|---|---|
| `01 阶段目标与目标体验` | 说明基础 MVP 可体验、QH passed，但用户仍认为内容理解不足；定义 CQ 目标体验、允许声明和 No-Go。 |
| `02 当前架构与 CQ 目标架构差异` | 用具体实现实体展示 `pageContext.ts`、A Page Reading、D Adapter、C Mindmap、B Renderer、`contentBridge.ts` 和 CQ evidence 的状态与差异。 |
| `03 内容角色识别与 Grounding 链路` | 展示 DOM block 到 content role、SourceRef、summary / QA / explain-selection grounding 的链路。 |
| `04 Mindmap 语义质量与 Source Evidence` | 展示主题 / 论点 / 事实 / 步骤 / 结论节点、nodeSourceMap、source card 解释和 located / fallback / blocked。 |
| `05 开发及验收计划` | 展示 `V1-MVP-CQ-0` 到 `V1-MVP-CQ-7` 的阶段闭环和打回规则。 |
| `06 项目里程碑与证据矩阵` | 展示 V1.3 / V1.4 / V1-MC / QH 已完成输入、CQ 36+ strict 样本、gold notes 和独立 evidence。 |
| `07 验收门槛与出门条件` | 展示 strict 阈值、用户体验门槛、允许声明、禁止声明和出门条件。 |
| `08 False-Green 风险与备选路线` | 展示 QH passed 冒充 CQ strict passed、标题级理解、反跳伪成功、媒体理解越界等风险和打回路线。 |

## 色块图例

- 绿色：已实现或已通过的上游事实，如 V1-MC candidate、QH expanded acceptance、已存在的 D Adapter 边界。
- 黄色：本阶段需强化的代码实体和质量指标，如 `pageContext.ts`、A Page Reading、C Mindmap、B Renderer、`contentBridge.ts`。
- 蓝色：待新增的 CQ evidence、gold notes、schema、report、strict acceptance。
- 红色：false-green 风险和禁止声明。
- 灰色：边界说明或非本阶段能力。

## 当前口径

允许声明：

```text
V1 MVP content quality prove-out ready for staged implementation.
```

CQ 完成后最多允许声明：

```text
V1 MVP content quality prove-out passed strict real-site acceptance.
```

不得声明：

```text
完整 V1 complete。
最终 Monica-like UX complete。
复杂站点全量高质量通过。
视频 / 音频 / 图片内容已被理解。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

## 审查重点

- 图中必须出现真实代码实体，而不是只写“前端 / 后端 / AI”。
- 图中必须标注实体状态：已实现、已实现需修改、待新增、保持边界、禁止声明。
- QH passed 必须作为输入事实，不得被画成 CQ strict passed。
- CQ 证据必须是独立包：`docs/active/project/evidence/v1_mvp_content_quality/`。
- `located`、`fallback_shown`、`blocked` 必须保留三态，不得合并为成功。
- 视频 / 图片 / 音频理解仍是 No-Go；只允许页面可见文本和页面已有 metadata。
