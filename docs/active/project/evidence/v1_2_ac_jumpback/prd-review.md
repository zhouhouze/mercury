# V1.2-AC-Jumpback MVP PRD Review

## PRD 对齐结论

Pass with scoped MVP claim.

本阶段实现与 `01-prd.md`、`02-architecture.md`、`03-development-plan.md`、`04-acceptance-plan.md` 中的 V1.2-AC-Jumpback MVP 目标一致：只做 Mindmap 节点来源证据与当前页反跳的最小闭环，不扩大到完整 V1.2 或 Monica 级体验。

## 规格覆盖

| PRD / 架构要求 | 实现情况 | 结论 |
|---|---|---|
| C 输出可绑定的节点来源 | `metadata.nodeBindings` + `metadata.nodeSourceMap` | Pass |
| B 展示来源证据卡片 | `ArtifactInlineCard` 渲染 `mindmap-source-panel` | Pass |
| 用户触发 Jumpback | 来源卡片点击发送 `navia.jumpToSource` | Pass |
| 当前页定位策略 | `selector -> domPath -> textQuote` | Pass |
| 失败可见，不伪成功 | 返回 `fallback_shown` 并展示来源证据 | Pass |
| D 边界不变 | 未改 D，不让 A/C/B 写 Artifact/Event/Trace | Pass |
| 不扩展范围 | 未引入 RAG、Memory、Web Research、OCR/video/live/PPT | Pass |
| 真实页面主体验不回退 | native Side Panel UX 5 页通过 | Pass |

## 不声明范围

- 不声明完整 V1.2 完成。
- 不声明完整聊天体验完成。
- 不声明网页内双轨/悬浮球体验完成。
- 不声明像 Monica 一样的所有页面精确回跳。
- 不声明多媒体、PDF、OCR、iframe、shadow DOM、虚拟列表精确反跳。

## 审计意见闭环

| 审计点 | 处理结果 |
|---|---|
| 不得只给 `nodeSourceMap`，必须有稳定点击绑定 | 已新增 `nodeBindings`。 |
| Source fallback 不得冒充 DOM success | 已通过 `fallback_shown` 状态与测试防护。 |
| B 不能绕过 Runtime / D 生成 Mindmap | B 只消费 artifact metadata，不生成 artifact。 |
| A/C 不能写 Artifact/SSE/EventStore/Trace | 本次只改 C metadata 输出，不改 D 边界。 |
| 真实页面验收不能用全屏 extension page 冒充 | 复用 native Side Panel UX 报告，5 页通过。 |

## 后续建议

下一阶段若继续强化 C/Jumback，应优先做：

1. 真实 Chrome 截图级断言：点击来源卡片后网页正文被高亮。
2. A SourceRef selector 质量提升：为更多 block 输出稳定 selector/domPath。
3. C 节点去重与同名节点 disambiguation。
4. B source evidence 面板交互细化：折叠、过滤、复制引用。
