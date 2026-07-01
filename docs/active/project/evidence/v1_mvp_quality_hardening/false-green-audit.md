# V1-MVP-QH Expanded False-Green Audit

Result: PASS

## 防误判检查

- 旧 6 样本 evidence 未被当作 48 页 expanded acceptance。
- 每个样本有独立 reportConclusion，blocked / degraded 不会被统计为 pass。
- Jumpback 统一为 located / fallback_shown / blocked，fallback 和 blocked 不冒充 located。
- fresh fallback、referenced fallback、blocked、located 分开计数。
- report passed 仅在 44/48、每类 7/8、类别站点数和 fatal / major 口径均通过时成立。

## Fatal

- none

## Major

- none

## Non-pass Samples Retained In Evidence

- domestic-content-xhs-note blocked: theme-color rgb 255, 255, 255fallback_shownviewport: width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover未能定位到原文位置，已显示来源证据。原因：source_not_found_in_dom
- international-portal-reuters-home degraded: reuters.comfallback_shownviewport: width=device-width, initial-scale=1.0未能定位到原文位置，已显示来源证据。原因：source_not_found_in_dom
- international-article-reuters-world degraded: var dd rt c, cid AHrlqAAAAAMAvgb7rMmYuV8AXbNhKA, hshfallback_shownviewport: width=device-width, initial-scale=1.0未能定位到原文位置，已显示来源证据。原因：source_not_found_in_dom
- international-doc-openai-docs degraded: quality metrics or source evidence did not pass
