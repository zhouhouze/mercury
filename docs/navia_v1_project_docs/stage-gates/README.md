# Navia V1 Stage Gates

本目录保存 V1 每个子阶段的独立门禁文档。

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

- `v1.0-0-contracts-runtime-skeleton.md`：已完成。
- `v1.0-a-agentcore-baseline.md`：已完成。
- `v1.0-b-state-observability.md`：已完成。
- `v1.0-c-governance-budget.md`：已完成。
- `v1.0-d-chrome-pagecontext.md`：已完成，Chrome 手工验收已通过。
- `v1.0-e-reading-tools.md`：实质开发与自动验收已完成；等待真实 Chrome Side Panel 人工验收。
- `v1.0-g-session-recovery.md`：实质开发与自动验收已完成；等待最终 Chrome UI 联合验收。
- `v1.0-h-closure.md`：自动回归与文档同步已完成；V1 complete 等待真实 Chrome UI 最终验收。
