# V1-MVP-QH 质量硬化真实站点验收报告

Date: 2026-07-03T14:35:55.819Z
Result: PASS

## Summary

- Samples: 48
- Passed: 44
- Degraded: 3
- Blocked: 1
- DOM highlighted: 45
- Fallback shown: 3
- Environment: 3 sample(s) degraded and 1 sample(s) blocked were retained as honest evidence. Login profile was unavailable; diagnostic used a temporary Chrome profile with injected auth cookies. Auth cookies were injected for: xiaohongshu(16). Cookie values are intentionally omitted from evidence.

## Claim

```text
V1 MVP quality hardening diagnostic collected expanded real-site evidence. Run generate-v1-mvp-quality-hardening-report.mjs for the final schema report.
```

| Site | Page | Result | Readiness | Text length | SourceRefs | Digest | Jumpback | Selected source card | Mindmap quality | Issues |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 澎湃新闻 | homepage | pass | pass | 1698 | 89 | 18 | highlighted | 1 | 10 labels / noise 0.00 / unique 1.00 | none |
| 观察者网 | homepage | pass | pass | 17710 | 122 | 18 | highlighted | 0 | 13 labels / noise 0.00 / unique 1.00 | none |
| 央视网新闻 | homepage | pass | pass | 3642 | 91 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| 中国新闻网 | homepage | pass | pass | 6538 | 110 | 18 | highlighted | 1 | 9 labels / noise 0.00 / unique 1.00 | none |
| 新华网 | homepage | pass | pass | 5060 | 108 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| 人民网 | homepage | pass | pass | 6337 | 111 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| 腾讯新闻 | homepage | pass | pass | 1832 | 89 | 18 | highlighted | 0 | 12 labels / noise 0.00 / unique 1.00 | none |
| 网易新闻 | homepage | pass | pass | 5438 | 108 | 18 | highlighted | 1 | 12 labels / noise 0.00 / unique 1.00 | none |
| 新华网 | channel | pass | pass | 1341 | 40 | 18 | highlighted | 0 | 12 labels / noise 0.08 / unique 1.00 | none |
| 央视网新闻 | channel | pass | pass | 3545 | 91 | 18 | highlighted | 0 | 15 labels / noise 0.00 / unique 1.00 | none |
| 澎湃新闻 | channel | pass | pass | 2037 | 89 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| 观察者网 | homepage | pass | pass | 17710 | 122 | 18 | highlighted | 0 | 14 labels / noise 0.00 / unique 1.00 | none |
| 36氪 | channel | pass | pass | 2539 | 104 | 18 | highlighted | 1 | 11 labels / noise 0.00 / unique 0.91 | none |
| 少数派 | homepage | pass | pass | 1350 | 91 | 18 | highlighted | 0 | 9 labels / noise 0.00 / unique 1.00 | none |
| 博客园 | homepage | pass | pass | 5816 | 109 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| 稀土掘金 | feed | pass | pass | 3569 | 94 | 18 | highlighted | 1 | 15 labels / noise 0.00 / unique 1.00 | none |
| B站 | feed | pass | pass | 608 | 22 | 18 | highlighted | 5 | 10 labels / noise 0.00 / unique 1.00 | none |
| B站 | detail | pass | pass | 2707 | 15 | 13 | highlighted | 4 | 11 labels / noise 0.00 / unique 1.00 | none |
| 小红书 | feed | pass | pass | 1529 | 52 | 18 | highlighted | 1 | 8 labels / noise 0.00 / unique 1.00 | none |
| 小红书 | detail | blocked | degraded | 765 | 23 | 8 | fallback_shown | 1 | 3 labels / noise 0.00 / unique 1.00 | Xiaohongshu detail sample did not reach /explore/ or /discovery/item/: https://www.xiaohongshu.com/404?source=/404/sec_izRhedDJ?redirectPath=https%3A%2F%2Fwww.xiaohongshu.com%2Fexplore%2F6a3283ce000000001602715a&error_code=300031&error_msg=%E5%BD%93%E5%89%8D%E7%AC%94%E8%AE%B0%E6%9A%82%E6%97%B6%E6%97%A0%E6%B3%95%E6%B5%8F%E8%A7%88&uuid=3bc9adef-162b-439d-a34a-a475e8c9ec3a&verifyMsg=.; Page perception readiness is degraded.; Source jumpback only showed fallback evidence. |
| 知乎 | feed | pass | pass | 4795 | 76 | 18 | highlighted | 3 | 14 labels / noise 0.00 / unique 1.00 | none |
| 豆瓣 | homepage | pass | pass | 4095 | 104 | 18 | highlighted | 1 | 11 labels / noise 0.00 / unique 1.00 | none |
| 微博热搜 | feed | pass | pass | 164 | 18 | 17 | highlighted | 0 | 13 labels / noise 0.00 / unique 1.00 | none |
| 百家号 | feed | pass | pass | 5983 | 109 | 18 | highlighted | 3 | 9 labels / noise 0.00 / unique 1.00 | none |
| BBC News | homepage | pass | pass | 8521 | 114 | 18 | highlighted | 1 | 6 labels / noise 0.00 / unique 1.00 | none |
| Reuters | homepage | degraded | degraded | 0 | 2 | 2 | fallback_shown | 0 | 2 labels / noise 0.00 / unique 1.00 | Visible page body text is very short; page may be login-gated, JS-empty, media-heavy, or anti-bot limited.; Page perception readiness is degraded.; SourceRef count below diagnostic threshold: 2.; Digest item count below diagnostic threshold: 2.; Source jumpback only showed fallback evidence.; Mindmap label sample is too small for quality assessment. |
| AP News | homepage | pass | pass | 17432 | 121 | 18 | highlighted | 0 | 8 labels / noise 0.00 / unique 1.00 | none |
| The Guardian | homepage | pass | pass | 19507 | 123 | 18 | highlighted | 1 | 5 labels / noise 0.00 / unique 1.00 | none |
| CNN | channel | pass | pass | 9089 | 112 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| NPR | channel | pass | pass | 7780 | 113 | 18 | highlighted | 0 | 13 labels / noise 0.00 / unique 1.00 | none |
| Al Jazeera | homepage | pass | pass | 8503 | 108 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| Yahoo News | homepage | pass | pass | 3704 | 106 | 18 | highlighted | 0 | 7 labels / noise 0.00 / unique 1.00 | none |
| BBC News | channel | pass | pass | 7574 | 114 | 18 | highlighted | 0 | 14 labels / noise 0.00 / unique 1.00 | none |
| Reuters | channel | degraded | degraded | 0 | 2 | 2 | fallback_shown | 0 | 2 labels / noise 0.00 / unique 1.00 | Visible page body text is very short; page may be login-gated, JS-empty, media-heavy, or anti-bot limited.; Page perception readiness is degraded.; SourceRef count below diagnostic threshold: 2.; Digest item count below diagnostic threshold: 2.; Source jumpback only showed fallback evidence.; Mindmap label sample is too small for quality assessment. |
| AP News | channel | pass | pass | 9471 | 110 | 18 | highlighted | 0 | 12 labels / noise 0.00 / unique 1.00 | none |
| The Guardian | channel | pass | pass | 7407 | 104 | 18 | highlighted | 0 | 7 labels / noise 0.00 / unique 1.00 | none |
| The Verge | channel | pass | pass | 14575 | 125 | 18 | highlighted | 0 | 9 labels / noise 0.00 / unique 1.00 | none |
| Wired | channel | pass | pass | 16739 | 126 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| Ars Technica | homepage | pass | pass | 7853 | 113 | 18 | highlighted | 0 | 8 labels / noise 0.00 / unique 1.00 | none |
| TechCrunch | homepage | pass | pass | 11453 | 112 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| Wikipedia | wiki | pass | pass | 187514 | 138 | 18 | highlighted | 0 | 8 labels / noise 0.00 / unique 1.00 | none |
| MDN | docs | pass | pass | 3670 | 105 | 18 | highlighted | 0 | 10 labels / noise 0.00 / unique 1.00 | none |
| Python Docs | docs | pass | pass | 7619 | 112 | 18 | highlighted | 0 | 6 labels / noise 0.00 / unique 1.00 | none |
| React Docs | docs | pass | pass | 12387 | 121 | 18 | highlighted | 1 | 5 labels / noise 0.00 / unique 1.00 | none |
| OpenAI Docs | docs | degraded | pass | 0 | 4 | 4 | highlighted | 1 | 4 labels / noise 0.00 / unique 1.00 | Visible page body text is very short; page may be login-gated, JS-empty, media-heavy, or anti-bot limited. |
| Cloudflare Blog | blog | pass | pass | 8835 | 116 | 18 | highlighted | 0 | 9 labels / noise 0.00 / unique 1.00 | none |
| Google Blog | blog | pass | pass | 2765 | 105 | 18 | highlighted | 0 | 11 labels / noise 0.00 / unique 1.00 | none |
| GitHub Blog | blog | pass | pass | 8100 | 114 | 18 | highlighted | 0 | 12 labels / noise 0.00 / unique 1.00 | none |
