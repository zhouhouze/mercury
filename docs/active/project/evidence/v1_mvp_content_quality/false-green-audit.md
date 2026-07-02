# V1-MVP-CQ False-Green Audit

Result: PASS

## 防误判结论

- QH evidence 只用于 seed manifest/gold-notes；CQ strict pass 只读取 docs/active/project/evidence/v1_mvp_content_quality/pages 下的本轮逐页证据。
- report.json 必须通过 CQ report schema；manifest 与每个 gold notes 必须通过各自 schema。
- blocked / fallback / degraded 样本保留，不计入 strict_pass。
- 只提取标题、导航、首页卡片、推荐列表、评论、广告、时间戳或“图1”的样本不得 strict pass。
- located / fallback_shown / blocked 必须在 JSON、HTML 和截图证据中保持一致。

## 未通过样本

- domestic-content-xhs-home: degraded, jumpback=located, content=0.967, noise=0.167

## Threshold Issues

- none
