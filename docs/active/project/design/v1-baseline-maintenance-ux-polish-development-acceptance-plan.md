# V1.0.x Baseline Maintenance + UX Polish 开发及验收计划

状态：文档基线

日期：2026-07-07

## 1. 阶段目标

本阶段为已冻结 V1 / post-V1 基线之后的维护和体验打磨阶段。它只聚焦基线可复验、本地启动诊断、当前 V1 交互 polish 和人类可审计的回归证据。

目标体验：

```text
用户按最小步骤启动 Runtime 和 Chrome 扩展
-> Navia 默认低打扰贴边
-> hover / focus / click / collapse / resize / drag 稳定
-> Chat / Mindmap / Source Evidence / Debug / Settings 可达
-> Runtime 离线或异常时有可理解诊断
-> 自动化报告展示构建、Runtime、validator、截图和 false-green 边界
```

本阶段原型审查输入：

```text
docs/active/project/design/v1-baseline-maintenance-ux-polish-prototype-review/index.html
```

该页面用于约束目标总体设计、详细模块设计和用户操作路径。实现验收必须用真实运行截图对照该页面；页面中的目标图不得被当作当前实现截图。

## 2. 开发计划

| 子阶段 | 开发意图 | 必须交付 |
|---|---|---|
| `V1.0.x-BM-0` | 文档门禁 | PRD、架构、开发计划、验收计划、stage gate、gap companion、drawio、readiness audit |
| `V1.0.x-BM-1` | 基线维护 | build、Runtime health、post-V1 validator、HTML 报告、人工冻结记录、敏感信息扫描 |
| `V1.0.x-BM-2` | 启动与诊断 polish | 启动说明、Runtime offline / reconnect、报告入口、诊断文案 |
| `V1.0.x-BM-3` | V1 UX polish | launcher、sidebar、controls、status、Mindmap、source evidence、narrow width polish |
| `V1.0.x-BM-4` | 视觉与交互回归 | Headless 优先截图、必要 Chrome 真实截图、source state consistency |
| `V1.0.x-BM-5` | 出门审计 | HTML 报告、PRD review、false-green audit、人工 spot-check、No-Go 结论 |

## 3. 验收计划

未来实现必须验证：

- `v1_post_v1_hardening` frozen baseline 仍为只读引用，不被重写。
- 独立 `v1_baseline_maintenance_ux_polish` evidence package 存在。
- `npm --prefix apps/chrome-extension run build` 通过。
- `npm --prefix apps/chrome-extension run validate:post-v1-hardening` 通过。
- Runtime `/v1/health` 返回 `status=ok`。
- Runtime 离线时 UI 不空白，给出 offline / reconnect 诊断。
- Launcher 默认贴边、hover / focus、click 展开、collapse 恢复、resize、drag 均有截图证据。
- Chat、Mindmap、Source Evidence、Debug、Settings 入口可达。
- 状态卡、source card、Mindmap、输入区在窄侧栏无明显遮挡、截断、虚影或重叠。
- located / fallback_shown / blocked 在 UI、JSON、HTML、截图 metadata 中不混淆。
- HTML 报告可作为人工审查入口，包含架构、实现状态、命令结果、截图、PRD review、false-green audit 和 No-Go。
- HTML 报告必须列出原型目标到真实截图的映射：default launcher、hover / focus、expanded sidebar、Chat、Mindmap、Source Evidence、Debug、Settings、offline diagnostics。

## 4. 最低指标

| 指标 | 方向 | 门槛 |
|---|---|---|
| `buildPassed` | `eq` | `true` |
| `postV1ValidatorPassed` | `eq` | `true` |
| `runtimeHealthStatus` | `eq` | `ok` |
| `launcherVisualPassRate` | `gte` | `0.95` |
| `sidebarVisualPassRate` | `gte` | `0.95` |
| `mindmapVisualPassRate` | `gte` | `0.95` |
| `sourceStateConsistencyRate` | `eq` | `1.0` |
| `debugSettingsReachability` | `eq` | `true` |
| `fatalIssues` | `eq` | `0` |
| `majorIssues` | `eq` | `0` |

## 5. Report 要求

未来 `report.json` 必须记录：

- `claim`
- `passed`
- `generatedAt`
- `buildPassed`
- `postV1ValidatorPassed`
- `runtimeHealthStatus`
- `frozenBaselineReference`
- `visualSamples`
- `sourceStateSamples`
- `testCommands`
- `prdReview`
- `falseGreenAudit`
- `humanSpotCheck`
- `fatalIssues`
- `majorIssues`

## 6. 打回规则

- BM-0 若文档没有明确本阶段不引入 V2 / V4，打回文档门禁。
- BM-1 若 build、Runtime health、post-V1 validator 或敏感信息扫描失败，打回基线维护。
- BM-2 若 Runtime 离线仍空白或启动说明不可复现，打回启动诊断 polish。
- BM-3 若 UI polish 引入新顶级页面、默认本地文件读取、浏览器自动操作产品能力或最终 Monica-like UX 声明，打回。
- BM-4 若截图出现明显遮挡、截断、虚影或 source 状态混淆，打回 UX polish。
- BM-5 若报告不能作为人类审计入口，或 PRD review / false-green audit 出现 fatal / major，打回对应阶段。

## 7. 允许声明

```text
V1.0.x baseline maintenance and scoped UX polish passed regression acceptance.
```

## 8. No-Go

- 最终 Monica-like UX complete。
- 复杂站点全量高质量通过。
- 视频 / 音频 / 图片像素内容已被理解。
- Memory / RAG / Web Research / PPT / Deep Research ready。
- 浏览器自动操作产品能力、OCR/VLM/ASR、语音、桌宠或默认本地文件读取。

## 9. 审计路径与待验收结论

后续进入实现前，BM-0 文档门禁应复核以下路径：

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

待验收审查结论：

- 当前文档是否仍然只支持 `V1.0.x baseline maintenance and scoped UX polish regression acceptance`。
- 当前文档是否仍然禁止最终 Monica-like UX complete、复杂站点全量高质量通过、媒体内容理解、V2 / V4 能力声明。
- 当前文档是否仍然要求 prototype review 只作为设计输入，不能作为实现截图或通过证据。
- 当前文档是否仍然要求新 evidence package 独立落在 `docs/active/project/evidence/v1_baseline_maintenance_ux_polish/`。
- 当前文档是否仍然要求 build、post-V1 validator、Runtime health、真实截图、PRD review、false-green audit 和 human spot-check 共同支持出门。
