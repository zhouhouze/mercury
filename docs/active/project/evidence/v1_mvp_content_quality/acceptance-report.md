# V1 Real-Site Complex Pages Diagnostic Acceptance Report

Date: 2026-07-02T20:53:19.540Z
Result: PASS

## Summary

- Samples: 36
- Passed: 34
- Degraded: 2
- Blocked: 0
- DOM highlighted: 36
- Fallback shown: 0
- Environment: 2 sample(s) degraded and 0 sample(s) blocked were retained as honest evidence. Login profile was unavailable; diagnostic used a temporary Chrome profile with injected auth cookies. Auth cookies were injected for: bilibili(30), bilibili(30), xiaohongshu(16). Cookie values are intentionally omitted from evidence.

## Claim

```text
V1 MVP content quality diagnostic collected strict real-site evidence. Run generate-v1-mvp-content-quality-report.mjs for the final schema report.
```

| Site | Page | Result | Readiness | Text length | SourceRefs | Digest | Jumpback | Selected source card | Mindmap quality | Issues |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 网易新闻 | homepage | pass | pass | 5432 | 109 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| 央视网新闻 | homepage | pass | pass | 3478 | 90 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| 中国新闻网 | homepage | pass | pass | 6533 | 110 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| 观察者网 | homepage | pass | pass | 17595 | 125 | 18 | highlighted | 0 | 12 labels / noise 0.00 / unique 1.00 | none |
| 人民网 | homepage | pass | pass | 5781 | 109 | 18 | highlighted | 0 | 9 labels / noise 0.00 / unique 1.00 | none |
| 腾讯新闻 | homepage | degraded | degraded | 1785 | 88 | 18 | highlighted | 0 | 12 labels / noise 0.00 / unique 1.00 | Page perception readiness is degraded. |
| 36氪 | channel | pass | pass | 2592 | 102 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| 央视网新闻 | channel | pass | pass | 3555 | 91 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| 博客园 | homepage | pass | pass | 6152 | 109 | 18 | highlighted | 0 | 6 labels / noise 0.00 / unique 1.00 | none |
| 观察者网 | homepage | pass | pass | 17595 | 125 | 18 | highlighted | 0 | 12 labels / noise 0.00 / unique 1.00 | none |
| 稀土掘金 | feed | pass | pass | 3604 | 93 | 18 | highlighted | 0 | 9 labels / noise 0.00 / unique 1.00 | none |
| 少数派 | homepage | pass | pass | 1554 | 92 | 18 | highlighted | 0 | 14 labels / noise 0.00 / unique 1.00 | none |
| 百家号 | feed | pass | pass | 274 | 16 | 10 | highlighted | 0 | 14 labels / noise 0.00 / unique 1.00 | none |
| B站 | feed | pass | pass | 632 | 20 | 10 | highlighted | 1 | 10 labels / noise 0.00 / unique 1.00 | none |
| B站 | detail | degraded | degraded | 2751 | 15 | 8 | highlighted | 4 | 15 labels / noise 0.00 / unique 0.93 | Login or verification hints visible: 请先登录; Page perception readiness is degraded. |
| 豆瓣 | homepage | pass | pass | 4131 | 103 | 18 | highlighted | 0 | 8 labels / noise 0.00 / unique 1.00 | none |
| 微博热搜 | feed | pass | pass | 1310 | 65 | 18 | highlighted | 0 | 13 labels / noise 0.00 / unique 1.00 | none |
| 小红书 | feed | pass | pass | 9046 | 107 | 18 | highlighted | 0 | 9 labels / noise 0.00 / unique 1.00 | none |
| Al Jazeera | homepage | pass | pass | 9430 | 110 | 18 | highlighted | 0 | 6 labels / noise 0.00 / unique 1.00 | none |
| AP News | homepage | pass | pass | 18225 | 126 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| BBC News | homepage | pass | pass | 8852 | 115 | 18 | highlighted | 0 | 7 labels / noise 0.00 / unique 1.00 | none |
| CNN | channel | pass | pass | 10057 | 113 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| The Guardian | homepage | pass | pass | 19393 | 123 | 18 | highlighted | 0 | 5 labels / noise 0.00 / unique 1.00 | none |
| NPR | channel | pass | pass | 9596 | 117 | 18 | highlighted | 0 | 6 labels / noise 0.00 / unique 1.00 | none |
| AP News | channel | pass | pass | 10694 | 113 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| Ars Technica | homepage | pass | pass | 7761 | 114 | 18 | highlighted | 0 | 8 labels / noise 0.00 / unique 1.00 | none |
| BBC News | channel | pass | pass | 7302 | 114 | 18 | highlighted | 0 | 9 labels / noise 0.00 / unique 1.00 | none |
| The Guardian | channel | pass | pass | 7092 | 102 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| TechCrunch | homepage | pass | pass | 12082 | 113 | 18 | highlighted | 0 | 14 labels / noise 0.00 / unique 1.00 | none |
| The Verge | channel | pass | pass | 17211 | 129 | 18 | highlighted | 3 | 8 labels / noise 0.00 / unique 1.00 | none |
| Cloudflare Blog | blog | pass | pass | 9280 | 116 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| GitHub Blog | blog | pass | pass | 8547 | 115 | 18 | highlighted | 0 | 12 labels / noise 0.00 / unique 1.00 | none |
| Google Blog | blog | pass | pass | 2841 | 106 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| MDN | docs | pass | pass | 3670 | 105 | 18 | highlighted | 1 | 9 labels / noise 0.00 / unique 1.00 | none |
| Python Docs | docs | pass | pass | 7619 | 112 | 18 | highlighted | 0 | 6 labels / noise 0.00 / unique 1.00 | none |
| React Docs | docs | pass | pass | 12387 | 121 | 18 | highlighted | 1 | 5 labels / noise 0.00 / unique 1.00 | none |
