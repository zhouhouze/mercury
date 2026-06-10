# V1.1 Figma Make Visual Baseline

版本：V1.1 Figma Make Screenshot Baseline
日期：2026-06-03
状态：捕获协议已定义；partial visual reference 已存在；完整状态矩阵未冻结

---

## 1. 目的

本目录用于沉淀 V1.1 前端高保真阶段的 Figma Make 视觉基线。由于当前 Figma MCP 对 Make 链接不稳定，V1.1 允许使用 Chrome CLI 对 Figma Make live preview 页面进行截图硬切，作为后续前端实现、截图对照和出门评审的输入。

Figma Make live preview：

```text
https://www.figma.com/make/GQTyaHmZoYpsBUQCIda2QP/%E6%B5%8F%E8%A7%88%E5%99%A8%E6%8F%92%E4%BB%B6%E6%A1%86%E6%9E%B6%E5%BC%80%E5%8F%91?p=f&t=lrqXaHNloFyLsXl3-0&preview-route=%2Flive
```

该链接只作为视觉证据来源，不改变 `PRD/窗口交互_PRD.md` 的 P0 交互权威。

---

## 2. 目录结构

```text
docs/navia_v1_project_docs/design/v1.1-figma-baseline/
  README.md
  capture-matrix.md
  capture-manifest.json
  manual-capture-runbook.md
  current/
  manual-auth/
  reviewed/
```

说明：

- `current/`：Chrome CLI 自动截图结果。
- `manual-auth/`：自动截图遇到登录或权限页时，由已登录 Chrome 手工补采的截图。
- `reviewed/`：经过 PRD 规格检视和视觉审计后可作为 V1.1 实现基线的截图。
- `capture-matrix.md`：完整 required state 矩阵。
- `manual-capture-runbook.md`：已登录 Chrome 手工补采流程。

只有 `reviewed/` 中存在覆盖完整状态矩阵的截图时，才允许声明 V1.1 视觉基线已冻结。

---

## 3. 捕获矩阵

Viewport：

| Viewport | 用途 |
|---|---|
| `1440x960` | 宽屏视觉比例 |
| `1280x900` | 主桌面验收 |
| `800x900` | 小视口 overlay 触发边界 |
| `390x844` | 移动窄屏降级 |

目标状态：

| State | 必须捕获 | 说明 |
|---|---|---|
| `floating-default` | 是 | 悬浮球默认贴边、不遮挡主内容 |
| `floating-hover` | 是 | hover 高亮与小长条 |
| `panel-440-push` | 是 | `440px` 窄距展开，网页被挤压 |
| `panel-50vw-push` | 是 | 接近半屏仍为 push |
| `panel-overlay` | 是 | `>52vw` 覆盖态 |
| `mobile-overlay` | 是 | 小视口 overlay / 全屏侧栏降级 |
| `runtime-offline` | 是 | Runtime 离线状态 |
| `artifact-mindmap` | 是 | Mermaid artifact 或 source fallback |
| `figma-make-live-main-window` | 辅助 | 当前已接受的 partial visual reference，不能单独解锁开发 |

若 Figma Make live preview 无法通过 URL 直接指定状态，必须在 `capture-manifest.json` 的 `notes` 字段记录实际捕获到的页面状态，并在 `08-open-questions.md` 保持未闭环状态。

---

## 4. Chrome CLI 捕获方式

自动捕获脚本：

```bash
node scripts/capture_figma_make_baseline.mjs
```

脚本默认输出到：

```text
docs/navia_v1_project_docs/design/v1.1-figma-baseline/current/
```

如果截图结果是 Figma 登录页、权限页、空白页或错误页：

- 不得把该截图移动到 `reviewed/`。
- 必须标记为 `manual_auth_required`。
- 由已登录 Figma 的 Chrome 窗口手工打开 live preview，再使用系统截图补采到 `manual-auth/`。

---

## 5. 进入实现前的冻结规则

V1.1 实质开发前必须满足：

- [ ] `reviewed/` 中已有完整捕获矩阵截图，或已有普通 Figma `/design` 节点可由 Figma MCP 读取。
- [ ] 每张截图都在 `capture-manifest.json` 中登记 viewport、state、来源、是否登录、审计结论。
- [ ] `stage-gates/v1.1-frontend-fidelity.md` 已记录视觉基线冻结结论。
- [ ] `04-acceptance-plan.md` 已把截图基线路径纳入验收。
- [ ] `05-codex-alignment-checklist.md` 已把 Figma 基线冻结列为 V1.1 开工前检查项。
- [ ] `08-open-questions.md` 中没有未闭环的 V1.1 P0 视觉问题。

未满足以上条件时，只能继续文档补全、截图采集或审计，不得声明 V1.1 高保真完成。

---

## 6. 审计口径

审计结论必须使用以下等级：

```text
Go: 可进入对应实现。
Go with P1: 可进入实现，但有非阻塞观察项。
No-Go: 不可进入实现，必须补齐文档或视觉证据。
```

当前默认结论：

```text
Go for V1.1-B after machine readiness check passes.
Mindmap artifact visual implementation deferred to a later dedicated stage.
```

当前 reviewed 证据：

```text
reviewed/figma-live-reviewed-main-window.png
```

该截图仅作为 partial visual reference。当前 V1.1-B 的正式依据是：用户提供 Image #1/#2、PRD 硬约束、runtime-offline 独立设计验收，以及 mindmap 后续专项的范围裁剪。
