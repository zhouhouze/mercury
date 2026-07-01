# V1-MVP-QH-CU/MQ 阶段性审计闭环记录

Date: 2026-07-02

Result: PASS for `V1 MVP quality hardening passed expanded real-site acceptance`.

Claim boundary:

```text
This closes V1-MVP-QH expanded real-site acceptance only.
It does not claim full V1 complete, final Monica-like UX complete, all mainstream sites high-quality, RAG / Memory / Web Research / PPT / Deep Research ready, or video-stream understanding.
```

## 审计范围

- 基于 active PRD / architecture / acceptance plan / stage gate 重新检视本阶段实现。
- 重新执行前端类型检查、前端单测、Python 模块测试、扩展构建、48 页 headless 真实网页矩阵验收。
- 重新生成 QH 独立 HTML / JSON 报告和 V1 mainline closeout 聚合报告。
- 使用 JSON Schema 校验 QH `report.json` 与 `sample-manifest.json`。

## 子阶段结果

| 子阶段 | 审计点 | 结果 |
|---|---|---|
| QH-0 文档门禁 | active 文档目标一致，未升级为完整 V1 complete | PASS |
| QH-1 样本矩阵 | 48 页，国内 24，国外 24，6 类各 8 页 | PASS |
| QH-2 A Page Reading | 主内容识别、噪声过滤、SourceRef 质量硬化 | PASS |
| QH-3 C Mindmap | 主题归并、短标签、nodeSourceMap 绑定 | PASS |
| QH-4 B Renderer | Evidence Card Mindmap / Reading Map / Source Evidence 可审计 | PASS |
| QH-5 Source Jumpback | located / fallback_shown / blocked 三态保留 | PASS |
| QH-6 真实矩阵复验 | 48 页 full headless E2E 完成，44/48 pass | PASS |

## 最终验收证据

- `docs/active/project/evidence/v1_mvp_quality_hardening/sample-manifest.json`
- `docs/active/project/evidence/v1_mvp_quality_hardening/report.json`
- `docs/active/project/evidence/v1_mvp_quality_hardening/acceptance-report.html`
- `docs/active/project/evidence/v1_mvp_quality_hardening/prd-review.md`
- `docs/active/project/evidence/v1_mvp_quality_hardening/false-green-audit.md`
- `docs/active/project/evidence/v1_mvp_quality_hardening/evidence-manifest.json`
- `docs/active/project/evidence/v1_mainline_closeout/report.json`
- `docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html`

## 通过门槛

- Total samples: 48
- Domestic samples: 24
- International samples: 24
- Passed samples: 44
- Category pass: 6/6 categories meet at least 7/8
- Report fatal issues: 0
- Report major issues: 0
- `report.json` schema validation: PASS
- `sample-manifest.json` schema validation: PASS

## 保留的真实风险证据

以下样本未计入 pass，但在 44/48 门槛允许范围内保留为真实 evidence：

- `domestic-content-xhs-note`: 小红书详情页返回不可浏览 / 404 风险，source jumpback 只能 fallback。
- `international-portal-reuters-home`: Reuters 首页在当前 headless 环境下低信号 / fallback。
- `international-article-reuters-world`: Reuters world channel 在当前 headless 环境下低信号 / fallback。
- `international-doc-openai-docs`: OpenAI Docs 在当前 headless 环境下跳转验证页，正文识别降级。

## 已执行验证命令

```bash
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard pageContext
PYTHONPATH=services/local-runtime .venv/bin/pytest services/local-runtime/navia_runtime/modules/page_reading/tests/test_high_signal_page.py services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py -q
npm --prefix apps/chrome-extension run build
node --check apps/chrome-extension/e2e/chrome-real-site-diagnostics.mjs
node --check apps/chrome-extension/e2e/generate-v1-mvp-quality-hardening-report.mjs
node --check apps/chrome-extension/e2e/generate-v1-mainline-closeout-report.mjs
NAVIA_REAL_SITE_HEADLESS=1 npm --prefix apps/chrome-extension run e2e:chrome:v1-mvp-quality-hardening
node apps/chrome-extension/e2e/generate-v1-mainline-closeout-report.mjs
```

Schema validation used `.venv/bin/python` with `jsonschema.Draft202012Validator` against:

- `docs/active/project/contracts/v1_mvp_quality_hardening_report.schema.json`
- `docs/active/project/contracts/v1_mvp_quality_hardening_sample_manifest.schema.json`

## 审计结论

当前自动化开发计划中已经被 active 文档完整支撑的部分已顺序实现，并通过本轮 full headless E2E 与 schema 校验。此结论仅支持 V1-MVP-QH expanded real-site acceptance passed；完整 V1 complete 仍需要后续人工产品体验核查和 V1 closeout 候选审计。

`v1_mainline_closeout` 聚合报告已重新生成并通过，用于引用 QH 48 页证据；它仍不得单独声明完整 V1 complete。
