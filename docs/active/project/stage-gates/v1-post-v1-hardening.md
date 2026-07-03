# V1.0.x Post-V1 Hardening Stage Gate

状态：文档基线

日期：2026-07-03

## 1. 阶段定位

V1 已经记录为 MVP 当前页伴随阅读范围内的 complete。本阶段不重新打开 V1 complete，也不把 V1 complete 降级为候选态。`V1.0.x Post-V1 Hardening` 只处理 V1 之后仍然可见的质量硬化问题：

- Source jumpback 在复杂动态网页上仍可能定位不准、解释不清或 fallback 不新鲜。
- Mindmap / Reading Map 在推荐流、重复卡片、站点壳、长文本和低价值文本较多的页面上仍可能退化。
- 真实网页验收需要从 QH / CQ 的阶段证明，升级为可长期回归的 post-V1 baseline。
- fallback / blocked 路径需要本阶段 fresh evidence，而不是只继承 V1.3 / V1.4 上游证据。

## 2. 允许声明

开发前允许声明：

```text
V1.0.x post-V1 hardening ready for staged implementation.
```

开发和验收通过后最多允许声明：

```text
V1.0.x post-V1 hardening passed source jumpback, Mindmap quality, and real-site regression acceptance.
```

## 3. No-Go

本阶段不得声明：

- 最终 Monica-like UX complete。
- 复杂站点全量高质量通过。
- 视频 / 音频 / 图片像素内容已被理解。
- V2 Memory / RAG ready。
- Web Research / PPT / Deep Research ready。
- 多 Agent 编排、产品浏览器自动操作、语音、桌宠、OCR / VLM / ASR 或默认本地文件读取。

## 4. 范围

本阶段范围：

- 当前页 SourceRef、selector、domPath、textQuote、nearby heading、href/card hints 的 source jumpback 精度硬化。
- fresh fallback 和 blocked 样本，要求 UI、JSON、HTML、截图和 metadata 语义一致。
- Mindmap / Reading Map 的主题质量、短标签、节点压缩、证据绑定和低价值文本过滤。
- B Renderer 的窄侧栏可读性、source card 解释、degraded 状态和状态卡层级。
- 100+ 真实网页候选矩阵，覆盖国内外页面、复杂动态页、低信号页和技术长文。
- 独立 post-V1 evidence package、stage gate、drawio、开发计划、验收计划、readiness audit 和 schema。

不在范围内：

- 新增 Runtime public API、Artifact/Event/Trace 合同；如确需新增，必须另开合同审计。
- 长期记忆、RAG、Web Research、PPT、Deep Research、OCR/VLM/ASR、视频/音频流理解或自主浏览。
- 替换 V1 complete 证据或重写 QH/CQ 历史结论。

## 5. 必须出现的架构实体

目标架构和 drawio 必须命名具体实现实体：

| 实体 | 当前状态 | Post-V1 hardening 目标 |
|---|---|---|
| `apps/chrome-extension/src/pageContext.ts` | 已实现需强化 | 输出更稳定的 visible block role hints 和 source candidate metadata |
| `apps/chrome-extension/src/contentBridge.ts` | 已实现需强化 | 强化 located / fallback / blocked 语义一致性和 marker 可解释性 |
| `apps/chrome-extension/src/runtimeClient.ts` | 已实现保持边界 | 保持 Runtime transport 和诊断边界；B 不直连 A/C/D |
| B `chat_renderer` | 已实现需强化 | source card 解释、degraded 状态和窄侧栏可读性 |
| B `mindmap_renderer` | 已实现需强化 | 节点短标签、布局防重叠、证据关系和 degraded node |
| A Page Reading | 已实现需强化 | 低价值文本过滤、SourceRef 质量和真实网页 degraded 判断 |
| C Mindmap | 已实现需强化 | 语义归并、节点压缩、nodeSourceMap 质量和短标签 |
| D Adapter / Agent Loop | 已实现保持边界 | 不新增公共合同，保留 ToolResult / Artifact / Event / Trace 治理边界 |
| `v1_post_v1_hardening` evidence | 待新增 | 独立 manifest、report、HTML、截图、PRD review、false-green audit、UX checklist |

## 6. 固定子阶段

| 子阶段 | 目标 | 门禁 |
|---|---|---|
| `V1.0.x-H-0` | 文档门禁 | PRD、架构、开发计划、验收计划、stage gate、gap companion、drawio、schema 一致，无 fatal / major |
| `V1.0.x-H-1` | 真实网页回归矩阵 | 100+ candidate manifest、验收子集、类别、替代、登录边界、低信号规则冻结 |
| `V1.0.x-H-2` | Source jumpback 精度 | located / fallback / blocked、marker 文案、selection reason、source card 排序规则冻结 |
| `V1.0.x-H-3` | Mindmap 质量 | 主题归并、短标签、去重、噪声过滤、source binding、degraded node 规则冻结 |
| `V1.0.x-H-4` | 窄侧栏 UX polish | source evidence 层级、状态卡、导图、输入区、虚影 / 截断检查规则冻结 |
| `V1.0.x-H-5` | 自动化验收 | HTML 报告、截图、PRD review、false-green audit、schema validation 规则冻结 |
| `V1.0.x-H-6` | 出门审计 | 验收无 fatal / major；声明仍限于 post-V1 hardening |

## 7. 出门条件

必须全部满足：

- drawio 不超过 8 页，中文书写，展示当前架构、目标架构、实现实体、状态色块、开发计划、里程碑、验收门槛和 No-Go。
- 新文档不和 V1 complete 证据冲突，不降级 V1 complete 记录。
- `sample-manifest.json` 必须符合 `v1_post_v1_hardening_sample_manifest.schema.json`。
- `report.json` 必须符合 `v1_post_v1_hardening_report.schema.json`。
- 必须执行 semantic validator，验证 schema 难以表达的跨字段关系：`passed=true`、样本分布、acceptance subset 数量、截图证据、metric 阈值方向、fresh fallback / blocked replacement 口径、UI / JSON / HTML / screenshot metadata 的 located / fallback / blocked 一致性。
- semantic validator 固定命令为 `npm --prefix apps/chrome-extension run validate:post-v1-hardening`；实现时可由该 npm script 调用 `node apps/chrome-extension/e2e/validate-post-v1-hardening-report.mjs`。
- `report.json` 必须结构化记录 `sampleDistribution` 和 `fallbackPolicy`，避免出现 `freshFallbackSamples = 0` 但无 blocked replacement 解释仍通过的 false-green。
- 真实网页矩阵至少包含 100 个 candidate，并冻结不少于 36 页的可重复自动化验收子集。
- Source jumpback 在 UI、JSON、HTML、截图、metadata 中区分 `located`、`fallback_shown`、`blocked`。
- Mindmap 验收拒绝导航型、推荐型、重复卡片型、过长型、无证据型顶层节点。
- fresh fallback 样本必须出现，或明确 blocked 并记录替代路线。
- 自动化验收后必须有人工 UX review checklist。

## 8. 必须执行的文档校验

```bash
git diff --check
python3 -m xml.etree.ElementTree docs/active/project/design/v1-post-v1-hardening-gap.drawio
node -e "const fs=require('fs'); const s=fs.readFileSync('docs/active/project/design/v1-post-v1-hardening-gap.drawio','utf8'); const n=[...s.matchAll(/<diagram /g)].length; if(n>8) process.exit(1); console.log('drawio pages', n)"
node -e "JSON.parse(require('fs').readFileSync('docs/active/project/contracts/v1_post_v1_hardening_sample_manifest.schema.json','utf8')); JSON.parse(require('fs').readFileSync('docs/active/project/contracts/v1_post_v1_hardening_report.schema.json','utf8')); console.log('schema json ok')"
```

## 9. 未来实现验收固定命令

后续 H-5 / H-6 实现出门验收必须提供并执行：

```bash
npm --prefix apps/chrome-extension run validate:post-v1-hardening
```

该命令在文档阶段不要求已经存在；进入实际开发后必须由实现阶段补齐，并验证独立 evidence package、schema validation、semantic validator、截图证据和 false-green audit。
