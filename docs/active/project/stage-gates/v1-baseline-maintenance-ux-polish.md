# V1.0.x Baseline Maintenance + UX Polish Stage Gate

状态：文档基线

日期：2026-07-07

## 1. 阶段定位

`V1.0.x Baseline Maintenance + UX Polish` 承接已经冻结的 `V1.0.x Post-V1 Hardening` 基线。它不重新打开 V1 complete，不重写上一阶段 frozen evidence，也不扩大到 V2 / V4。

本阶段只处理两类问题：

- Baseline Maintenance：让 build、Runtime health、post-V1 validator、HTML 报告、人工冻结记录和本地启动路径可重复、可审计。
- V1 UX Polish：在当前 V1 launcher / sidebar / Chat / Mindmap / Source Evidence / Debug / Settings 范围内降低用户可见摩擦。

本阶段设计输入包括：

- `docs/active/project/design/v1-baseline-maintenance-ux-polish-prototype-review/index.html`
- `docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio`
- 已冻结 `docs/active/project/evidence/v1_post_v1_hardening/`

原型审查页用于指导目标体验和模块关系，不得被计为已实现证据。

## 2. 允许声明

开发前允许声明：

```text
V1.0.x baseline maintenance and UX polish ready for staged implementation.
```

开发和验收通过后最多允许声明：

```text
V1.0.x baseline maintenance and scoped UX polish passed regression acceptance.
```

## 3. No-Go

本阶段不得声明或引入：

- 最终 Monica-like UX complete。
- 复杂站点全量高质量通过。
- 视频 / 音频 / 图片像素内容已被理解。
- V2 Memory / RAG ready。
- Web Research / PPT / Deep Research ready。
- 新顶级页面、默认本地文件读取、产品浏览器自动操作、多 Agent、语音、桌宠、OCR/VLM/ASR 或媒体流理解。

## 4. 范围

本阶段范围：

- 维护 `docs/active/project/evidence/v1_post_v1_hardening/` frozen baseline 的可复验性。
- 建立独立 `docs/active/project/evidence/v1_baseline_maintenance_ux_polish/` evidence package。
- 优化本地启动、Runtime offline / reconnect 诊断、报告入口和人类审计路径。
- 优化当前 V1 范围内 launcher、sidebar、按钮、状态卡、Mindmap、source evidence 和窄屏布局。
- 通过 headless 优先的截图和报告验证没有遮挡、截断、虚影、焦点抢占和 source 状态混淆。

不在范围内：

- 新增 Runtime public API、Artifact / Event / Trace 合同或公共 ViewModel 字段。
- 重写 A / C / D / B 模块边界。
- 把 post-V1 frozen baseline 改写成本阶段通过证据。
- 开启 V1 Content Quality Plus、V2 Memory 或 V4 Web Research / PPT / Deep Research。

## 5. 必须出现的架构实体

目标架构和 drawio 必须命名具体实现实体：

| 实体 | 当前状态 | BM / UX 目标 |
|---|---|---|
| `docs/active/project/evidence/v1_post_v1_hardening/` | 已冻结保持 | 只读引用，用于 no-downgrade 和 regression |
| `apps/chrome-extension/entrypoints/content/index.ts` | 已实现需修改 | launcher / collapse / drag / resize 低打扰 polish |
| `apps/chrome-extension/entrypoints/sidepanel/main.tsx` | 已实现需修改 | 保持 Chat / Mindmap / Debug / Settings 可达 |
| `apps/chrome-extension/entrypoints/sidepanel/style.css` | 已实现需修改 | 按钮、状态卡、输入区、窄侧栏视觉 polish |
| `apps/chrome-extension/src/pageContext.ts` | 已实现保持边界 | 继续作为 current-page context 输入，不扩大到 Web Research |
| `apps/chrome-extension/src/contentBridge.ts` | 已实现需修改 | source marker / fallback / blocked 清晰度和一致性 |
| `apps/chrome-extension/src/runtimeClient.ts` | 已实现保持边界 | Runtime health / offline / reconnect 诊断，不改 public contract |
| B `chat_renderer` | 已实现需修改 | 消息、source card、状态和 degraded 文案 polish |
| B `mindmap_renderer` | 已实现需修改 | Evidence Card Mindmap / Reading Map 可读性 polish |
| B `debug_renderer` | 已实现保持边界 | Debug JSON / diagnostics 入口保持可达 |
| `services/local-runtime/navia_runtime/app.py` | 已实现保持边界 | `/v1/health` 与既有 runtime routes 保持兼容 |
| A Page Reading | 已实现保持边界 | 作为回归依赖，不新增能力 |
| C Mindmap | 已实现保持边界 | 作为回归依赖，不输出前端组件 |
| D Agent Loop / Adapter | 已实现保持边界 | 不新增 Runtime public contract |
| `v1_baseline_maintenance_ux_polish` evidence | 待新增 | 独立 report、HTML、截图、PRD review、false-green audit |
| `v1-baseline-maintenance-ux-polish-prototype-review/index.html` | 设计输入 | 指导目标体验、模块设计和用户路径；后续以真实截图对照 |

## 6. 固定子阶段

| 子阶段 | 目标 | 门禁 |
|---|---|---|
| `V1.0.x-BM-0` | 文档门禁 | PRD、架构、开发计划、验收计划、stage gate、gap companion、drawio、readiness audit 一致，无 fatal / major |
| `V1.0.x-BM-1` | 基线维护 | build、Runtime health、post-V1 validator、HTML 报告、人工冻结记录、敏感信息扫描可复验 |
| `V1.0.x-BM-2` | 启动与诊断 polish | 本地启动路径、Runtime offline / reconnect、报告入口和诊断文案可理解 |
| `V1.0.x-BM-3` | V1 UX polish | launcher、sidebar、按钮、状态卡、Mindmap、source evidence、窄屏布局完成 scoped polish |
| `V1.0.x-BM-4` | 视觉与交互回归 | Headless 优先截图，证明无遮挡、截断、虚影、焦点抢占和 source 状态混淆 |
| `V1.0.x-BM-5` | 出门审计 | HTML 报告、PRD review、false-green audit、人工 spot-check 无 fatal / major |

## 7. 出门条件

必须全部满足：

- drawio 不超过 8 页，中文书写，展示当前架构、目标架构、实现实体、状态色块、开发计划、里程碑、验收门槛和 No-Go。
- `v1_post_v1_hardening` frozen baseline 不被重写、不被降级、不被冒充为本阶段新 evidence。
- 新阶段 evidence package 独立落在 `docs/active/project/evidence/v1_baseline_maintenance_ux_polish/`。
- `npm --prefix apps/chrome-extension run build` 通过。
- `npm --prefix apps/chrome-extension run validate:post-v1-hardening` 通过。
- Runtime `/v1/health` 返回 `status=ok`。
- 截图覆盖 launcher、sidebar、Mindmap、source evidence、状态卡、输入区、Debug 和 Settings。
- located / fallback_shown / blocked 在 UI、JSON、HTML、截图 metadata 中不混淆。
- HTML 报告可作为人类审计入口，包含目标架构、当前实现状态、截图、PRD review、false-green audit 和 No-Go。
- HTML 报告必须对照原型审查页，说明每条目标用户路径是否由真实实现截图覆盖，不能用目标图冒充实现截图。

## 8. 必须执行的文档校验

```bash
git diff --check
python3 -m xml.etree.ElementTree docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio
node -e "const fs=require('fs'); const s=fs.readFileSync('docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio','utf8'); const n=[...s.matchAll(/<diagram /g)].length; if(n>8) process.exit(1); console.log('drawio pages', n)"
rg -n "V1.0.x Baseline Maintenance \\+ UX Polish|V1.0.x-BM|v1_baseline_maintenance_ux_polish" docs/active/project
```

## 9. 未来实现验收固定命令

后续 BM-4 / BM-5 实现出门验收必须至少执行：

```bash
npm --prefix apps/chrome-extension run build
npm --prefix apps/chrome-extension run validate:post-v1-hardening
```

Runtime 验证必须在本地启动后检查：

```bash
curl --noproxy '*' -sS http://127.0.0.1:17861/v1/health
```
