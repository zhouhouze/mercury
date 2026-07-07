# V1.0.x Baseline Maintenance + UX Polish Readiness Audit

状态：文档基线审计

日期：2026-07-07

## 1. 结论

```text
Go for V1.0.x Baseline Maintenance + UX Polish documentation baseline.

Conditional Go for staged implementation after BM-0 is reviewed
and no new fatal / major documentation issue is introduced.
```

当前文档可以支撑下一阶段自动化开发计划制定、分阶段验收、PRD 复检和 false-green audit。它只支撑：

```text
V1.0.x baseline maintenance and scoped UX polish regression acceptance.
```

不能支撑：

```text
最终 Monica-like UX complete。
复杂站点全量高质量通过。
视频 / 音频 / 图片像素内容已被理解。
V2 Memory / RAG ready。
Web Research / PPT / Deep Research ready。
```

## 2. 审计范围

本轮只审计 active 文档：

- `docs/active/project/01-prd.md`
- `docs/active/project/02-architecture.md`
- `docs/active/project/03-development-plan.md`
- `docs/active/project/04-acceptance-plan.md`
- `docs/active/project/stage-gates/v1-baseline-maintenance-ux-polish.md`
- `docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.md`
- `docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio`
- `docs/active/project/design/v1-baseline-maintenance-ux-polish-development-acceptance-plan.md`
- `docs/active/project/design/v1-baseline-maintenance-ux-polish-prototype-review/index.html`

## 3. 产品 / PRD 审计

PASS：

- 阶段目标明确承接 frozen post-V1 baseline。
- 不重新打开 V1 complete，不重写上一阶段证据。
- 目标拆为 Baseline Maintenance 和 V1 UX Polish，边界清楚。
- 原型审查页被定位为设计输入，不被定位为实现证据或验收通过证据。
- 后续 V1 Content Quality Plus、V2 Memory、V4 Web Research / PPT / Deep Research 只作为路线登记。

Fatal issues：无。

Major issues：无。

## 4. 架构审计

PASS：

- 目标架构列出具体代码实体，包含 content entry、sidepanel entry、style、runtime client、content bridge、renderer modules、Local Runtime 和 A/C/D 模块。
- 目标架构说明了原型审查页、frozen baseline evidence、新 BM / UX evidence 三者的不同证据身份。
- B / A / C / D 职责边界没有扩大。
- Runtime public contract、Artifact、Event、Trace 和 ViewModel 公共字段没有新增要求。
- 新 evidence package 与 post-V1 frozen evidence 分离。

Fatal issues：无。

Major issues：无。

## 5. 验收 / False-Green 审计

PASS：

- 验收计划要求 build、post-V1 validator、Runtime health、截图、PRD review、false-green audit。
- 明确 headless 和 `--mute-audio` 优先，必要可见 Chrome 需提前告知并关闭实例。
- 明确 located / fallback_shown / blocked 不得混淆。
- 明确自动化报告不得冒充人工 spot-check。
- 明确目标图不得冒充真实实现截图；后续 HTML 报告必须映射原型目标和真实截图证据。
- 明确禁止最终 Monica-like UX complete 和 V2 / V4 能力声明。

Fatal issues：无。

Major issues：无。

## 6. Drawio 审计

PASS 标准：

- 页数不超过 8 页。
- 页面覆盖目标体验、架构差异、Baseline Maintenance、UX Polish、启动诊断、开发验收计划、里程碑、风险和 No-Go。
- 图中使用状态色块表达已实现 / 冻结保持、已实现需修改、待新增、保持边界和 No-Go。
- 架构图必须出现具体代码实体，不使用抽象大框替代实现实体。

Fatal issues：无。

Major issues：无。

## 7. Readiness Checks

实施前必须完成：

```bash
git diff --check
python3 -m xml.etree.ElementTree docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio
node -e "const fs=require('fs'); const s=fs.readFileSync('docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio','utf8'); const n=[...s.matchAll(/<diagram /g)].length; if(n>8) process.exit(1); console.log('drawio pages', n)"
rg -n "V1.0.x Baseline Maintenance \\+ UX Polish|V1.0.x-BM|v1_baseline_maintenance_ux_polish" docs/active/project
```

## 8. 剩余风险

- 真实视觉 polish 的通过率属于实现风险，不是当前文档缺口。
- 可见 Chrome 截图可能打扰用户，因此实现阶段必须优先 headless，并在必要时提前告知。
- 如果实际开发发现需要新增 Runtime contract，必须停止并回到合同审计，不能在本阶段直接扩大范围。

## 9. 最终判断

```text
V1.0.x-BM-0：Go for documentation baseline.
V1.0.x-BM-1+：Conditional Go after BM-0 review with no fatal / major.
Completion claim：only after BM-5 evidence passes.
Final Monica-like UX complete：No-Go.
V2 / RAG / Memory / Web Research / PPT / Deep Research：No-Go.
```

## 10. BM-0 多轮独立审计补充

审计时间：2026-07-07

审计结论：

```text
No fatal / major documentation gap remains for V1.0.x Baseline Maintenance + UX Polish.

The active documentation can guide staged implementation, automated acceptance,
PRD review, false-green audit, and human spot-check preparation.
```

审计要点：

- PRD、目标架构、开发计划、验收计划、stage gate、gap companion、drawio、prototype review 和 readiness audit 的阶段目标一致。
- `v1_post_v1_hardening` 被定义为只读 frozen baseline；`v1_baseline_maintenance_ux_polish` 被定义为后续独立证据包。
- 原型审查页被定义为设计输入，不得作为当前实现截图或验收通过证据。
- drawio 保持 8 页，且覆盖目标体验、当前架构与目标架构差异、开发及验收计划、项目里程碑、验收门槛、出门条件和 No-Go。
- 目标架构列出具体实现实体和状态，没有使用抽象大框替代代码实体。
- 验收计划要求真实截图对照 prototype review，并要求 HTML 报告记录偏差、原因和阻塞判断。

是否需要 ChatGPT 外部审计：

```text
Not required for gate entry.
```

理由：

- 当前已经完成多轮独立文档审计。
- 文档内没有剩余 fatal / major 缺口。
- 后续主要风险是真实实现阶段的视觉 polish、启动诊断和截图回归风险，不是文档不足。

如果仍要外部抽检，建议只审计以下 active 文档，不超过 20 个路径：

```text
docs/active/project/01-prd.md
docs/active/project/02-architecture.md
docs/active/project/03-development-plan.md
docs/active/project/04-acceptance-plan.md
docs/active/project/stage-gates/v1-baseline-maintenance-ux-polish.md
docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.md
docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio
docs/active/project/design/v1-baseline-maintenance-ux-polish-development-acceptance-plan.md
docs/active/project/design/v1-baseline-maintenance-ux-polish-readiness-audit.md
docs/active/project/design/v1-baseline-maintenance-ux-polish-prototype-review/index.html
```
