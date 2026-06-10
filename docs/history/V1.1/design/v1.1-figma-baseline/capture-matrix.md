# V1.1 Figma Baseline Capture Matrix

版本：V1.1 Capture Matrix
日期：2026-06-03
状态：证据策略已冻结；mindmap artifact 后续专项

---

## 1. 目标

本文定义 V1.1 前端高保真开发前必须具备的视觉基线矩阵。它用于判断 `reviewed/` 中的截图是否足以支撑完整 V1.1 开发。

当前结论：

```text
Go for V1.1-B documentation readiness.
Mindmap artifact visual implementation deferred to a later dedicated stage.
```

---

## 2. Required States

| State | PRD 对应 | Viewport | 当前状态 | Go 条件 |
|---|---|---|---|---|
| `floating-default` | A：悬浮球默认态 | `1280x900` + `1440x960` | accepted | 使用用户提供 Image #2；实现需呈现贴边圆形 AI ball、阴影、局部露出/贴边效果 |
| `floating-hover` | B：hover 预展开态 | `1280x900` | accepted | 使用用户提供 Image #1；实现需呈现 Ask AI strip、快捷键图标、AI pill、描边和阴影 |
| `panel-440-push` | C：窄距展开态 | `1280x900` | accepted_by_prd_hard_constraint | 不要求实际截图；严格按 PRD `440px` 最小宽度、push、左轨/聊天/工具区实现 |
| `panel-50vw-push` | D：半屏展开态 | `1280x900` | accepted_by_prd_hard_constraint | 不要求实际截图；严格按 PRD `50vw` 附近仍 push、输入区固定实现 |
| `panel-overlay` | E：宽工作区覆盖态 | `1280x900` + `1440x960` | accepted_by_prd_hard_constraint | 不要求实际截图；严格按 PRD `>52vw` overlay、`<48vw` 回 push、最大 `80vw` 实现 |
| `mobile-overlay` | 小屏兼容 | `390x844` + `800x900` | accepted_by_prd_hard_constraint | 不要求实际截图；严格按 PRD `<900px` overlay / fullscreen fallback 实现 |
| `runtime-offline` | 错误态 | `1280x900` | accepted_design_only | 单独设计即可，无标准原型审计；必须可见离线提示、重连入口、禁用正常 chat send |
| `artifact-mindmap` | Artifact 态 | `1280x900` | deferred_to_mindmap_stage | 后续开发单独实现；不阻塞 V1.1-B/C UI fidelity |
| `figma-make-live-main-window` | 原型上下文 | Chrome window | accepted_partial | 只能辅助 token/布局理解，不能单独解锁开发 |

---

## 3. File Naming

`manual-auth/` 原始截图：

```text
figma-live-manual-<state>-<viewport>.png
```

`reviewed/` 复核通过截图：

```text
figma-live-reviewed-<state>-<viewport>.png
```

示例：

```text
manual-auth/figma-live-manual-floating-default-1280x900.png
reviewed/figma-live-reviewed-floating-default-1280x900.png
```

---

## 4. Review Rules

截图进入 `reviewed/` 前必须满足：

- 不是登录页、权限页、空白页、WebGL error page 或错误裁剪区域。
- 能明确对应一个 required state。
- 画面中状态信息足够判断布局、层级、尺寸和视觉风格。
- 已在 `capture-manifest.json` 登记 `state`、`sourceFile`、`reviewedFile`、`status`、`reviewConclusion`。

以下截图不得作为完整开发基线：

- 只包含 Figma Make 操作区，缺少 live preview。
- 截到其他网页或 ChatGPT/Codex 窗口。
- 只覆盖一个普通主窗口状态，但没有 PRD A-F 具体状态。
- 分辨率或裁切导致关键 UI 缺失。

本轮用户确认后的例外规则：

- `floating-default` 和 `floating-hover` 使用对话中用户提供图片作为外部视觉证据，不要求仓库内存在截图文件。
- `panel-440-push`、`panel-50vw-push`、`panel-overlay`、`mobile-overlay` 以 PRD 硬约束为准，不要求 Figma 截图。
- `runtime-offline` 单独设计，无标准原型审计。
- `artifact-mindmap` 后续专项开发，不阻塞本轮 V1.1。

---

## 5. Readiness Gate

允许进入 V1.1 实质前端开发的条件：

```text
Go for V1.1 implementation when all blocking states are accepted or explicitly non-blocking by user-approved policy.
```

当前状态：

```text
Go for V1.1-B documentation readiness.
Mindmap artifact remains deferred to a later dedicated stage.
```
