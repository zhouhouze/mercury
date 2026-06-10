# Navia 浏览器插件整体页面改造计划（历史草案）

> 状态：历史草案，仅保留工程脉络。2026-06-03 起，本文件不得作为 V1/V1.1 前端实现依据。
>
> 当前 P0 交互权威是仓库根目录 `PRD/窗口交互_PRD.md`；V1.1 开发前必须读取 `docs/navia_v1_project_docs/12-interaction-prd-authority-and-revised-plan.md`、`docs/navia_v1_project_docs/stage-gates/v1.1-frontend-fidelity.md` 和 `docs/navia_v1_project_docs/design/v1.1-figma-baseline/README.md`。
>
> 本文件中的“只展示右侧悬浮球”“不允许拖到左侧”“聊天框左右侧独立状态模型”等内容与当前 P0 PRD 的左右贴边、网页内双轨面板、push/overlay/collapse 口径存在偏差，不能继续作为验收标准。

## 1. 改造目标

将当前 Navia Chrome 插件从「sidepanel 为主的调试型界面」改造成「网页内悬浮球 + 展开聊天框」为主入口的产品化交互体验。

核心目标：

- 普通网页右侧默认出现 Navia 悬浮球。
- 悬浮球支持右侧 Y 轴上下拖动，并持久化位置。
- 点击悬浮球后展开聊天框。
- C/D/E 状态下，悬浮球 Y 轴锚点保持不变。
- 聊天框与悬浮球同侧时吸附，异侧时不吸附。
- E 态支持双栏聊天框。
- sidepanel 保留为调试/回退入口，不作为主体验。

## 2. 当前状态

当前已经具备：

- content script 注入能力。
- Shadow DOM 挂载节点。
- 基础悬浮球和聊天框组件。
- FloatingWidgetState 状态模型。
- RuntimeClient 共享运行时调用模块。
- chrome-mv3-unpacked 可安装产物目录。
- postbuild ASCII 转换，避免 Chrome content script 编码报错。

当前仍需完善：

- 悬浮球视觉还比较简陋。
- 聊天框仍是单栏工具面板。
- C/D/E 状态的视觉表达还不完整。
- hover 小条入口尚未产品化。
- 双栏聊天框尚未落地。
- sidepanel 与 content widget 的角色边界需要更清晰。
- 页面推挤模式尚未实现。

## 3. 页面结构规划

### 3.1 主入口：网页内悬浮球

悬浮球作为插件默认入口。

默认位置：

- 固定在页面右侧。
- 初始 top = 120px。
- right = 12px。
- 仅允许上下拖动。
- 不允许拖到左侧。

交互：

- hover 时显示短条入口。
- 点击悬浮球展开聊天框。
- 拖动结束后保存 ballY。
- 页面刷新后恢复上次位置。

### 3.2 状态 C：收起态

状态 C 是默认状态。

表现：

- 只展示右侧悬浮球。
- hover 时出现短条。
- 不展示聊天框。
- 保持 ballY。

用途：

- 低干扰常驻入口。
- 用户可随时唤起 Navia。

### 3.3 状态 D：基础聊天框

状态 D 是基础展开态。

表现：

- 展示单栏聊天框。
- 聊天框默认在右侧。
- 如果 chatSide = right，悬浮球吸附在聊天框边缘。
- 如果 chatSide = left，聊天框在左侧展开，悬浮球保持右侧，不吸附。
- 展开前后 ballY 不变。

内容：

- 顶部：Navia 标题、运行状态、收起/放大按钮。
- 中部：消息流。
- 底部：输入框、发送按钮、状态提示。
- 工具区：读取页面、提交上下文、切换布局。

### 3.4 状态 E：双栏聊天框

状态 E 是扩展态。

表现：

- 展示更宽的双栏聊天框。
- 左栏为页面上下文。
- 右栏为聊天流和输入框。
- 悬浮球同侧时继续吸附。
- ballY 保持不变。

左栏内容：

- 当前页面标题。
- 当前页面 URL/domain。
- 页面结构摘要。
- 已读取/已提交状态。
- 页面上下文操作入口。

右栏内容：

- 聊天消息流。
- Mermaid/Artifact 输出。
- 输入框。
- 发送状态。
- runtime 在线/离线状态。

响应式：

- 宽屏使用双栏。
- 窄屏退化为单栏上下结构。
- 防止文本、按钮和滚动区域重叠。

## 4. 状态模型

继续使用当前状态结构：

```ts
type UIState = "A" | "B" | "C" | "D" | "E";

type FloatingWidgetState = {
  uiState: UIState;
  chatSide: "left" | "right";
  ballY: number;
  isAttached: boolean;
};
```
