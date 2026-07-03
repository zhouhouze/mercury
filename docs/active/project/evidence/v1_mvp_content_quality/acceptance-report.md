# V1-MVP-CQ 内容理解质量增强自动化验收报告

Date: 2026-07-03T07:06:41.164Z
Result: PASS

## 结论

- Claim: V1 MVP content quality prove-out passed strict real-site acceptance.
- 证据路径：docs/active/project/evidence/v1_mvp_content_quality
- 审计边界：本报告只支持 CQ 内容理解质量增强 strict prove-out；不支持完整 V1 complete、最终 Monica-like UX complete、媒体流理解、RAG / Memory / Web Research / PPT / Deep Research ready。

## Summary

- 总样本：36
- QH 核心回归样本：24
- 高风险样本：12
- strict pass：34
- degraded：2
- blocked：0
- fatalIssues：0
- majorIssues：0

## 类别门槛

- domestic_portal_homepage: 6/6 strict pass, PASS
- domestic_article_detail: 5/6 strict pass, PASS
- domestic_content_platform: 5/6 strict pass, PASS
- international_portal_homepage: 6/6 strict pass, PASS
- international_article_detail: 6/6 strict pass, PASS
- international_knowledge_blog_doc: 6/6 strict pass, PASS

## 未通过 strict 的样本

- domestic-article-juejin: degraded, jumpback=located, content=0.967, noise=0.167
- domestic-content-bilibili-video: degraded, jumpback=located, content=0.967, noise=0.167

## 审计链接

- HTML: acceptance-report.html
- JSON: report.json
- PRD review: prd-review.md
- False-green audit: false-green-audit.md

## 实现与证据完整性

- apps/chrome-extension/src/modules/mindmap_renderer/mindmapPresentation.ts: B Renderer: 缩短 Evidence Card / Source Evidence 可见标签，过滤 cookie consent / tracking 来源噪声，避免内部结构标签或同意弹窗文案冒充内容证据。
- apps/chrome-extension/e2e/generate-v1-mvp-content-quality-report.mjs: CQ Reporter: 将 consent/cookie 噪声排除在 sourceCardOrder 外；生成最终 HTML/Markdown/JSON 报告、PRD 复检、false-green audit 和 schema validation。
- docs/active/project/evidence/v1_mvp_content_quality/**: 36 页真实网页 headless/mute 验收证据包：sample manifest、gold notes、逐页 runtime/session/source/jumpback/screenshot、最终 HTML/JSON/Markdown 报告。

## 完整性复核

- 敏感信息扫描: pass. no unredacted cookie/token findings
- 自动化浏览器实例清理: pass. no matching Navia automation browser process
- Git / 远端口径: info. branch=main, head=e8f9788, origin=https://github.com/zhouhouze/mercury; report 文件本身会由后续 Git 提交承载，最终提交哈希以 git log -1 为准。
