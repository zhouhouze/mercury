# V1.1 Manual-Auth Capture Runbook

版本：V1.1 Manual Screenshot Runbook
日期：2026-06-03
适用：Figma Make live preview 需要已登录 Chrome 或 Headless Chrome 无法启用 WebGL 时

---

## 1. 前置条件

- 本机 Chrome 已登录可访问目标 Figma Make 页面。
- 页面不是登录页、权限页、空白页或 WebGL unsupported error page。
- 目标链接：

```text
https://www.figma.com/make/GQTyaHmZoYpsBUQCIda2QP/%E6%B5%8F%E8%A7%88%E5%99%A8%E6%8F%92%E4%BB%B6%E6%A1%86%E6%9E%B6%E5%BC%80%E5%8F%91?p=f&t=lrqXaHNloFyLsXl3-0&preview-route=%2Flive
```

---

## 2. 捕获流程

1. 打开 Figma Make live preview。
2. 将原型切换到目标状态。
3. 截取整个 Chrome window，先保存到 `manual-auth/`。
4. 检查截图是否命中 live preview 和目标状态。
5. 通过后复制到 `reviewed/`。
6. 更新 `capture-manifest.json`。
7. 更新 `stage-gates/v1.1-a-visual-baseline-freeze.md` 的验收状态。

推荐命令：

```bash
screencapture -x docs/navia_v1_project_docs/design/v1.1-figma-baseline/manual-auth/figma-live-manual-<state>-<viewport>.png
```

如果需要窗口区域截图，先读取 Chrome 窗口边界：

```bash
osascript -e 'tell application "Google Chrome" to get bounds of front window'
```

再用 `screencapture -R<x>,<y>,<w>,<h>` 截取。

---

## 3. 必须补采的状态

按照 `capture-matrix.md` 补齐：

```text
floating-default
floating-hover
panel-440-push
panel-50vw-push
panel-overlay
mobile-overlay
runtime-offline
artifact-mindmap
```

如果 Figma Make live preview 无法切换到某个状态，必须记录：

- 无法切换的状态。
- 原因。
- 是否需要 Figma `/design` 节点。
- 是否需要用户或设计方提供补充截图。

---

## 4. 复核标准

每张截图必须回答：

- 是否真实来自 Figma Make live preview。
- 是否覆盖对应 required state。
- 是否包含关键 UI：悬浮球、小长条、左轨、聊天区、右工具区、resize/overlay 或错误/Artifact 状态。
- 是否足以提取视觉 token。
- 是否可以作为 V1.1 实现基线。

结论只能使用：

```text
accepted
accepted_partial
rejected
```

---

## 5. 当前状态

已接受：

```text
reviewed/figma-live-reviewed-main-window.png
```

该截图只证明 live preview 可访问，并提供主视觉参考；不覆盖完整 required states。

当前结论：

```text
Go for V1.1-B after machine readiness check passes.
Mindmap artifact visual implementation deferred.
```
