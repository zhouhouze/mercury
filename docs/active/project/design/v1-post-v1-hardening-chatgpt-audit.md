# V1.0.x Post-V1 Hardening ChatGPT Audit

状态：外部审计意见已采纳

日期：2026-07-03

## 1. 外部审计结论

本轮外部审计只基于当前 active 文档判断，历史过期文件不参与结论。

```text
Go for V1.0.x Post-V1 Hardening documentation baseline.

Conditional Go for staged implementation after V1.0.x-H-0 is reviewed
and no new fatal / major documentation issue is introduced.
```

外部审计支持当前文档可以支撑 `V1.0.x Post-V1 Hardening` 下一阶段的自动化开发、分阶段验收、PRD 复检和 false-green audit。

## 2. 外部审计确认的边界

本阶段只支持：

- Source jumpback 精度硬化。
- Mindmap / Reading Map 质量硬化。
- 窄侧栏 UX 和 source evidence 可读性硬化。
- 真实网页回归基线和独立 post-V1 evidence package。

本阶段不得声明：

- 最终 Monica-like UX complete。
- 复杂站点全量高质量通过。
- 视频 / 音频 / 图片像素内容已被理解。
- V2 Memory / RAG ready。
- Web Research / PPT / Deep Research ready。

## 3. 外部审计 P1 建议

外部审计提出 3 个 P1 建议，均不阻塞文档基线，但需要在 H-0 / H-1 前闭环：

| 编号 | 建议 | 处理结论 |
|---|---|---|
| P1-1 | semantic validator 必须落成实际命令，不能只写描述 | 已采纳。文档固定未来实现验收命令：`npm --prefix apps/chrome-extension run validate:post-v1-hardening` |
| P1-2 | sample manifest schema 不能独自保证 category 分布，必须由 semantic validator 校验 | 已采纳。验收计划、stage gate、开发验收计划均要求 semantic validator 校验样本分布和 acceptance subset 数量 |
| P1-3 | fresh fallback 特殊口径要强制写入 report | 已采纳。`v1_post_v1_hardening_report.schema.json` 已新增 `fallbackPolicy`，并要求解释 `freshFallbackSamples < 3` 时的 blocked replacement 原因 |

## 4. 本轮文档修订

已完成以下文档修订：

- `docs/active/project/01-prd.md`：补充固定 semantic validator 命令和 report 语义要求。
- `docs/active/project/02-architecture.md`：补充验证入口、`sampleDistribution`、`fallbackPolicy` 和跨字段一致性要求。
- `docs/active/project/04-acceptance-plan.md`：补充固定命令、`sampleDistribution`、`fallbackPolicy` 和 false-green 门禁。
- `docs/active/project/stage-gates/v1-post-v1-hardening.md`：补充 future implementation validation command，避免当前文档门禁要求执行尚未实现的脚本。
- `docs/active/project/design/v1-post-v1-hardening-development-acceptance-plan.md`：补充 fixed command、report 字段和 fresh fallback 例外口径。
- `docs/active/project/contracts/v1_post_v1_hardening_report.schema.json`：新增 `sampleDistribution` 与 `fallbackPolicy`。

## 5. 最终判断

```text
V1.0.x-H-0 documentation gate: Go.
V1.0.x-H-1+ staged implementation: Conditional Go after H-0 review.
Post-V1 hardening completion claim: only after H-6 passes.
Final Monica-like UX complete: No-Go.
V2 / RAG / Memory / Web Research / PPT / Deep Research: No-Go.
```

本外部审计已作为 H-0 文档门禁的审计记录之一。当前无 fatal / major 文档缺口。
