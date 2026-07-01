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

- domestic-content-xhs-note blocked: Source Jumpback 未能在当前 DOM 中精确定位，已显示 fallback source evidence；不得统计为 located。
- international-portal-reuters-home degraded: Source Jumpback 未能在当前 DOM 中精确定位，已显示 fallback source evidence；不得统计为 located。
- international-article-reuters-world degraded: Source Jumpback 未能在当前 DOM 中精确定位，已显示 fallback source evidence；不得统计为 located。
- international-doc-openai-docs degraded: 样本未达 pass 门槛；详见逐页 sample-report.json 与 jumpback.json。
