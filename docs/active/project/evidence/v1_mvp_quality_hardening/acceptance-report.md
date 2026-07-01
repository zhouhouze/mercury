# V1-MVP-QH Expanded 自动化验收报告

Result: PASS

Claim boundary:

```text
V1 MVP quality hardening passed expanded real-site acceptance.
```

## Summary

- Samples: 48
- Domestic: 24
- International: 24
- Passed: 44
- Located: 45
- Fresh fallback: 3
- Referenced fallback: 0
- Jumpback blocked: 0
- Non-pass samples retained: 4

| Page | Site | Category | Result | Grounded | Noise | Jumpback | Evidence |
|---|---|---|---|---:|---:|---|---|
| domestic-portal-thepaper-home | 澎湃新闻 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-thepaper-home-before.png<br>screenshots/domestic-portal-thepaper-home-after.png |
| domestic-portal-guancha-home | 观察者网 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-guancha-home-before.png<br>screenshots/domestic-portal-guancha-home-after.png |
| domestic-portal-cctv-home | 央视网新闻 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-cctv-home-before.png<br>screenshots/domestic-portal-cctv-home-after.png |
| domestic-portal-chinanews-home | 中国新闻网 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-chinanews-home-before.png<br>screenshots/domestic-portal-chinanews-home-after.png |
| domestic-portal-xinhua-home | 新华网 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-xinhua-home-before.png<br>screenshots/domestic-portal-xinhua-home-after.png |
| domestic-portal-people-home | 人民网 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-people-home-before.png<br>screenshots/domestic-portal-people-home-after.png |
| domestic-portal-qq-news-home | 腾讯新闻 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-qq-news-home-before.png<br>screenshots/domestic-portal-qq-news-home-after.png |
| domestic-portal-163-news-home | 网易新闻 | domestic_portal_homepage | pass | 1 | 0 | located | screenshots/domestic-portal-163-news-home-before.png<br>screenshots/domestic-portal-163-news-home-after.png |
| domestic-article-xinhua-tech | 新华网 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-xinhua-tech-before.png<br>screenshots/domestic-article-xinhua-tech-after.png |
| domestic-article-cctv-tech | 央视网新闻 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-cctv-tech-before.png<br>screenshots/domestic-article-cctv-tech-after.png |
| domestic-article-thepaper-tech | 澎湃新闻 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-thepaper-tech-before.png<br>screenshots/domestic-article-thepaper-tech-after.png |
| domestic-article-guancha-detail | 观察者网 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-guancha-detail-before.png<br>screenshots/domestic-article-guancha-detail-after.png |
| domestic-article-36kr-news | 36氪 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-36kr-news-before.png<br>screenshots/domestic-article-36kr-news-after.png |
| domestic-article-sspai | 少数派 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-sspai-before.png<br>screenshots/domestic-article-sspai-after.png |
| domestic-article-cnblogs | 博客园 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-cnblogs-before.png<br>screenshots/domestic-article-cnblogs-after.png |
| domestic-article-juejin | 稀土掘金 | domestic_article_detail | pass | 1 | 0 | located | screenshots/domestic-article-juejin-before.png<br>screenshots/domestic-article-juejin-after.png |
| domestic-content-bilibili-home | B站 | domestic_content_platform | pass | 1 | 0 | located | screenshots/domestic-content-bilibili-home-before.png<br>screenshots/domestic-content-bilibili-home-after.png |
| domestic-content-bilibili-video | B站 | domestic_content_platform | pass | 1 | 0 | located | screenshots/domestic-content-bilibili-video-before.png<br>screenshots/domestic-content-bilibili-video-after.png |
| domestic-content-xhs-home | 小红书 | domestic_content_platform | pass | 1 | 0 | located | screenshots/domestic-content-xhs-home-before.png<br>screenshots/domestic-content-xhs-home-after.png |
| domestic-content-xhs-note | 小红书 | domestic_content_platform | blocked | 1 | 0 | fallback_shown | screenshots/domestic-content-xhs-note-before.png<br>screenshots/domestic-content-xhs-note-after.png |
| domestic-content-zhihu-home | 知乎 | domestic_content_platform | pass | 1 | 0 | located | screenshots/domestic-content-zhihu-home-before.png<br>screenshots/domestic-content-zhihu-home-after.png |
| domestic-content-douban-home | 豆瓣 | domestic_content_platform | pass | 1 | 0 | located | screenshots/domestic-content-douban-home-before.png<br>screenshots/domestic-content-douban-home-after.png |
| domestic-content-weibo-hot | 微博热搜 | domestic_content_platform | pass | 1 | 0 | located | screenshots/domestic-content-weibo-hot-before.png<br>screenshots/domestic-content-weibo-hot-after.png |
| domestic-content-baijiahao | 百家号 | domestic_content_platform | pass | 1 | 0 | located | screenshots/domestic-content-baijiahao-before.png<br>screenshots/domestic-content-baijiahao-after.png |
| international-portal-bbc-home | BBC News | international_portal_homepage | pass | 1 | 0 | located | screenshots/international-portal-bbc-home-before.png<br>screenshots/international-portal-bbc-home-after.png |
| international-portal-reuters-home | Reuters | international_portal_homepage | degraded | 1 | 0 | fallback_shown | screenshots/international-portal-reuters-home-before.png<br>screenshots/international-portal-reuters-home-after.png |
| international-portal-ap-home | AP News | international_portal_homepage | pass | 1 | 0 | located | screenshots/international-portal-ap-home-before.png<br>screenshots/international-portal-ap-home-after.png |
| international-portal-guardian-home | The Guardian | international_portal_homepage | pass | 1 | 0 | located | screenshots/international-portal-guardian-home-before.png<br>screenshots/international-portal-guardian-home-after.png |
| international-portal-cnn-home | CNN | international_portal_homepage | pass | 1 | 0 | located | screenshots/international-portal-cnn-home-before.png<br>screenshots/international-portal-cnn-home-after.png |
| international-portal-npr-home | NPR | international_portal_homepage | pass | 1 | 0 | located | screenshots/international-portal-npr-home-before.png<br>screenshots/international-portal-npr-home-after.png |
| international-portal-aljazeera-home | Al Jazeera | international_portal_homepage | pass | 1 | 0 | located | screenshots/international-portal-aljazeera-home-before.png<br>screenshots/international-portal-aljazeera-home-after.png |
| international-portal-yahoo-home | Yahoo News | international_portal_homepage | pass | 1 | 0 | located | screenshots/international-portal-yahoo-home-before.png<br>screenshots/international-portal-yahoo-home-after.png |
| international-article-bbc-tech | BBC News | international_article_detail | pass | 1 | 0 | located | screenshots/international-article-bbc-tech-before.png<br>screenshots/international-article-bbc-tech-after.png |
| international-article-reuters-world | Reuters | international_article_detail | degraded | 1 | 0 | fallback_shown | screenshots/international-article-reuters-world-before.png<br>screenshots/international-article-reuters-world-after.png |
| international-article-ap-world | AP News | international_article_detail | pass | 1 | 0 | located | screenshots/international-article-ap-world-before.png<br>screenshots/international-article-ap-world-after.png |
| international-article-guardian-world | The Guardian | international_article_detail | pass | 1 | 0 | located | screenshots/international-article-guardian-world-before.png<br>screenshots/international-article-guardian-world-after.png |
| international-article-theverge | The Verge | international_article_detail | pass | 1 | 0 | located | screenshots/international-article-theverge-before.png<br>screenshots/international-article-theverge-after.png |
| international-article-wired | Wired | international_article_detail | pass | 1 | 0 | located | screenshots/international-article-wired-before.png<br>screenshots/international-article-wired-after.png |
| international-article-arstechnica | Ars Technica | international_article_detail | pass | 1 | 0 | located | screenshots/international-article-arstechnica-before.png<br>screenshots/international-article-arstechnica-after.png |
| international-article-techcrunch | TechCrunch | international_article_detail | pass | 1 | 0 | located | screenshots/international-article-techcrunch-before.png<br>screenshots/international-article-techcrunch-after.png |
| international-doc-wikipedia-ai | Wikipedia | international_knowledge_blog_doc | pass | 1 | 0 | located | screenshots/international-doc-wikipedia-ai-before.png<br>screenshots/international-doc-wikipedia-ai-after.png |
| international-doc-mdn-fetch | MDN | international_knowledge_blog_doc | pass | 1 | 0 | located | screenshots/international-doc-mdn-fetch-before.png<br>screenshots/international-doc-mdn-fetch-after.png |
| international-doc-python-tutorial | Python Docs | international_knowledge_blog_doc | pass | 1 | 0 | located | screenshots/international-doc-python-tutorial-before.png<br>screenshots/international-doc-python-tutorial-after.png |
| international-doc-react-learn | React Docs | international_knowledge_blog_doc | pass | 1 | 0 | located | screenshots/international-doc-react-learn-before.png<br>screenshots/international-doc-react-learn-after.png |
| international-doc-openai-docs | OpenAI Docs | international_knowledge_blog_doc | degraded | 1 | 0 | located | screenshots/international-doc-openai-docs-before.png<br>screenshots/international-doc-openai-docs-after.png |
| international-doc-cloudflare-blog | Cloudflare Blog | international_knowledge_blog_doc | pass | 1 | 0 | located | screenshots/international-doc-cloudflare-blog-before.png<br>screenshots/international-doc-cloudflare-blog-after.png |
| international-doc-google-ai-blog | Google Blog | international_knowledge_blog_doc | pass | 1 | 0 | located | screenshots/international-doc-google-ai-blog-before.png<br>screenshots/international-doc-google-ai-blog-after.png |
| international-doc-github-blog | GitHub Blog | international_knowledge_blog_doc | pass | 1 | 0 | located | screenshots/international-doc-github-blog-before.png<br>screenshots/international-doc-github-blog-after.png |
