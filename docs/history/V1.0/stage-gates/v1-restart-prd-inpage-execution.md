# V1 Restart Stage Gate：PRD 页面内交互主线重启执行

版本：V1 Restart Gate
日期：2026-06-02
阶段状态：实质开发已完成一轮；自动回归通过；真实 Chrome 页面内交互手工验收已通过；V1 complete 等待 G/E2/H 收口

---

## 1. 阶段目标

按用户确认，从头重启 V1 执行，但保留现有 Runtime 与插件代码作为候选资产。前端体验以 `PRD/窗口交互_PRD.md` 为准：

```text
悬浮球默认态
-> hover 小长条
-> 网页内 AI 双轨面板
-> 窄距 / 半屏挤压
-> 宽覆盖
-> 点击悬浮球收起并恢复布局
```

Chrome Side Panel 只允许作为调试入口，不再作为 V1 前端验收依据。

---

## 2. PRD 规格检视

对齐文档：

- `PRD/窗口交互_PRD.md`
- `docs/navia_v1_project_docs/12-interaction-prd-authority-and-revised-plan.md`
- `docs/navia_v1_project_docs/01-prd.md`
- `docs/navia_v1_project_docs/03-development-plan.md`
- `docs/navia_v1_project_docs/04-acceptance-plan.md`

本轮允许：

- 复用现有 Local Runtime / AgentCore / SSE / PageContext / Reading Tools。
- 复用 Side Panel 的调试逻辑，但不能作为通过依据。
- Figma 未到位前先实现 PRD 交互骨架，不声明最终视觉通过。

本轮禁止：

- 用 Side Panel 替代网页内交互验收。
- 引入 RAG、MCP、Skill、多 Agent、浏览器自动操作、网络搜索、本地文件默认读取。
- 在真实 Chrome 页面内交互未验收前声明 V1 complete。

---

## 3. 开发计划与实施摘要

### V1.0-0/A/B/C 复核

结论：候选底座可复用。

证据：

- Runtime tests 覆盖合同、状态机、治理、reading tools 与 session recovery。
- `/v1/chat/stream` 仍使用 SSE。
- 每轮 chat 产生 turn / tool / artifact / trace。
- Budget / Permission / File deny 仍由 Runtime 管理。

### V1.0-D 页面内交互壳与 PageContext

已实现：

- Content Script 自动挂载网页内 Shadow DOM host：`#navia-injected-host`。
- 页面内悬浮球默认态。
- hover 小长条。
- 点击小长条展开网页内面板。
- 悬浮球上下拖动与左右吸附。
- 网页内面板读取当前页面并提交 `/v1/page/context`。
- Runtime offline / online 状态展示。
- Chrome action click 优先尝试打开网页内面板，Side Panel 仅保留兜底调试。

### V1.0-E 网页内 AI 双轨面板与伴读工具

已实现：

- 左轨 avatar / 收起入口。
- 右轨 Chatbox、消息区、输入区、工具入口。
- 右侧功能轨占位：聊天 / 画图 / 视频 / 音频 / 发现。
- `/v1/chat/stream` SSE 消费。
- summary / question / mindmap 命令入口。
- unknown SSE event 不崩溃。
- Mermaid artifact 尝试渲染，失败显示源码 fallback。

### V1.0-F PRD A-F 布局状态与 Resize

已实现：

- `440px` 最小面板宽度。
- `>52vw` 进入 overlay。
- `<48vw` 回到 push。
- `80vw` 最大宽度。
- `<900px` 视口强制 overlay。
- resize handle。
- 收起后恢复 `html` margin。

---

## 4. 预审计意见

结论：

```text
Go for implementation, but not Go for V1 complete.
```

致命问题：无。

重大风险：

| 风险 | 等级 | 闭环状态 |
|---|---|---|
| Headless Chromium 不自动注入 content script，也不暴露 extension service worker | 重大 | 已记录；真实 Chrome 手工验收已通过 |
| Headed Chrome for Testing 在本环境卡在 browser launch | 重大 | 已记录；真实 Chrome 手工验收已通过 |
| content script build 体积偏大 | 一般 | 已通过 E2 修复为 iframe renderer 方案，content script 主包不再承载 Mermaid |
| Figma 未到位，视觉不能最终验收 | 重大 | 已记录；本轮只验收交互骨架 |

---

## 5. 自动化验收报告

已通过：

```text
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/tests
21 passed

pnpm test
4 files / 15 tests passed

pnpm run typecheck
passed

pnpm build
passed
```

新增测试：

- `src/injectedPanel.test.ts`
  - push / overlay 阈值。
  - `<900px` 小视口 overlay。
  - width clamp。
  - Shadow DOM host mount。
  - controller open / close。

真实数据来源：

- `docs/navia_v1_project_docs/fixtures/real_pages/article.html`

E2E 尝试：

```text
pnpm run e2e:inpage
```

结果：

- Sandbox 内首次运行：Runtime 绑定 `127.0.0.1:17861` 被拒绝，提权后解决。
- Headless Chromium：进入 fixture，但 manifest content script 未自动注入；fallback 需要 extension service worker，但 headless 未暴露 service worker。
- Headed Chromium：卡在 browser launch，未进入 fixture 页面。

结论：

```text
真实 Chrome 页面内交互 E2E 未通过。
不得声明 V1 complete。
```

---

## 6. PRD 规格复检

通过项：

- 代码主线已从 Side Panel 迁移到网页内注入式交互。
- Side Panel 已降级为调试/兜底入口。
- D/E/F 的交互骨架已覆盖 PRD A-F 的核心状态。
- Runtime / AgentCore 状态仍归后端，不归前端。
- 未引入 V1 禁止范围。

已补验收：

- 用户已在真实 Chrome 本地完成最小手工验收：扩展加载、网页内浮动球/贴边入口、面板打开、Runtime online、读取当前页面、基础对话、Mermaid source artifact。

仍未通过项：

- 未完成网页内 session refresh/reopen 恢复复验。
- 未完成 Mermaid SVG 视觉渲染复验。
- 未完成 Figma 视觉规格验收。

---

## 7. 最终结论

```text
V1 Restart 第一轮实现完成。
自动回归通过，真实 Chrome 页面内最小手工验收已通过。
下一步进入 G/E2/H 收口：网页内 session 恢复、Mermaid iframe renderer、最终文档与回归。
```

人类确认边界：

- 是否接受真实 Chrome 人工验收作为当前环境下的高风险流程。
- 是否等待 Figma 后再做最终视觉验收。
