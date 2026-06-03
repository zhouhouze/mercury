# Navia V1 Stage Gates

本目录保存 V1 每个子阶段的独立门禁文档。

## 交互口径更新

2026-06-02 起，V1 前端页面体验以仓库根目录 `PRD/窗口交互_PRD.md` 为准。此前 D/E/G/H/I 阶段中以 Chrome Side Panel 作为 V1 主交互形态的验收记录，仅保留为历史工程记录和调试入口证据，不能再作为 V1 complete 的前端体验通过依据。

后续必须重新制定面向 `PRD/窗口交互_PRD.md` 的 stage-gate：

```text
V1.0-D：Chrome 插件页面内交互壳与 PageContext
V1.0-E：网页内 AI 双轨面板与伴读工具
V1.0-F：PRD A-F 布局状态与 Resize
V1.0-G：Session 质量与网页内面板恢复
V1.0-H：真实 Chrome UI 最终验收与文档收口
```

每个阶段文档必须包含：

- PRD 规格检视。
- 开发计划。
- 验收标准。
- 真实数据验收方案。
- 预审计意见。
- 审计意见闭环记录。
- 实施摘要。
- E2E 验收报告。
- PRD 规格复检。
- 最终放行或打回结论。

执行规则：

```text
无 stage-gate 文档，不开发。
有未闭环致命或重大审计意见，不开发。
无真实数据验收，不放行。
验收失败，打回开发计划阶段。
只有阶段验收和 PRD 复检都通过，才进入下一阶段。
```

当前阶段：

- `v1-restart-prd-inpage-execution.md`：按 `PRD/窗口交互_PRD.md` 重启 V1 页面内交互主线；自动回归通过，真实 Chrome 页面内交互手工验收已通过。
- `v1.0-0-contracts-runtime-skeleton.md`：已完成。
- `v1.0-a-agentcore-baseline.md`：已完成。
- `v1.0-b-state-observability.md`：已完成。
- `v1.0-c-governance-budget.md`：已完成。
- `v1.0-d-chrome-pagecontext.md`：已完成，Chrome 手工验收已通过。
- `v1.0-e-reading-tools.md`：历史 Side Panel 主线记录；已被 `12-interaction-prd-authority-and-revised-plan.md` 的网页内交互口径覆盖。
- `v1.0-e2-mermaid-renderer.md`：新口径 Mermaid iframe renderer 计划、验收与审计记录。
- `v1.0-g-inpage-session-recovery.md`：新口径网页内 Session 恢复计划、验收与审计记录。
- `v1.0-h-final-inpage-closure.md`：新口径最终收口计划、验收与审计记录。
- `v1.1-frontend-fidelity.md`：V1.1 前端体验高保真阶段门禁；用于 Figma 对照、视觉 token、截图基线、真实 Chrome 视觉复验和出门评审。
- `v1.1-a-visual-baseline-freeze.md`：V1.1-A 视觉基线冻结；当前已按用户证据策略 Go for V1.1-B。
- `v1.1-b-ui-structure-token-refactor.md`：V1.1-B UI 结构与 token 重构；已完成。
- `v1.1-c-high-fidelity-states.md`：V1.1-C 高保真状态补齐；已完成。
- `v1.1-d-visual-e2e-regression.md`：V1.1-D 视觉 E2E 回归；已完成。
- `v1.1-e-exit-review.md`：V1.1-E 出门评审；已完成，允许声明 `V1.1 frontend fidelity ready`。

V1.1-B 开工前必须执行：

```bash
node scripts/validate_v1_1_doc_readiness.mjs
```

只有输出 `canStartV11B=true`，才允许进入 `v1.1-b-ui-structure-token-refactor.md`。
- `v1.0-g-session-recovery.md`：历史 Side Panel 恢复记录；不能用于声明新口径 V1 complete。
- `v1.0-h-closure.md`：历史 Side Panel closure 记录；不能用于声明新口径 V1 complete。
- `v1.0-i-final-chrome-acceptance.md`：历史 Side Panel 自动化边界记录；后续真实 Chrome UI 验收必须覆盖 `PRD/窗口交互_PRD.md` A-F 状态。
