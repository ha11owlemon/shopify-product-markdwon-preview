---
name: shopify-helper-popup-markdown
overview: 在弹出层中实现 Markdown 编辑器：左侧输入框 + 右侧 1400px 渲染预览，输入内容防抖后同步到 Shopify 的 CodeMirror 编辑器（cm-content），并展示同步状态。
design:
  architecture:
    framework: html
  styleKeywords:
    - Clean
    - Editor-style
    - Functional
  fontSystem:
    fontFamily: PingFang-SC
    heading:
      size: 16px
      weight: 600
    subheading:
      size: 13px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#5c6ac4"
      - "#4c3a8e"
    background:
      - "#1e1e2e"
      - "#FFFFFF"
    text:
      - "#E0E0E0"
      - "#374151"
    functional:
      - "#22c55e"
      - "#eab308"
      - "#ef4444"
todos:
  - id: update-popup-layout
    content: 重构 openPopup() HTML 结构：左编辑器 textarea + 右预览容器 + 底部状态栏
    status: completed
  - id: add-markdown-sync-logic
    content: 实现 markdown-it 加载、防抖输入、渲染预览、同步到 cm-content、状态提示全部逻辑
    status: completed
    dependencies:
      - update-popup-layout
  - id: update-styles
    content: 更新 style.css：编辑器/预览/状态栏/水平滚动等样式
    status: completed
    dependencies:
      - update-popup-layout
---

## 产品概述

在已有的 Shopify Helper 浏览器插件弹出面板中，添加 Markdown 编辑器与实时预览功能，并自动将输入内容同步到 Shopify 后台的 CodeMirror 6 描述编辑器中。

## 核心功能

- **左侧 Markdown 编辑器**：文本输入框，支持 Markdown 格式输入，带 500ms 防抖
- **右侧渲染预览**：固定 1400px 宽度的渲染容器，使用 markdown-it 渲染；视口不足时出现水平滚动条，确保始终可预览完整 1400px 内容
- **自动同步到 Shopify 后台**：每次防抖触发后，将原始 Markdown 文本同步到页面中的 `div.cm-content`（CodeMirror 6 编辑器），通过 focus + execCommand 模拟用户输入
- **同步状态提示**：三种状态 —— 同步中（黄色）、已自动同步（绿色）、同步失败（红色，3 秒内找不到目标元素则判定失败）

## 技术栈

- 浏览器插件：Manifest V3（已有）
- Markdown 渲染：markdown-it（通过 CDN 动态加载）
- 内容同步：document.execCommand 模拟用户输入（兼容 CodeMirror 6 的 contenteditable 机制）

## 实现方案

### 核心技术决策

**1. markdown-it 加载方式**
由于 content script 无法使用 npm/webpack，需通过动态 `<script>` 标签从 CDN（jsdelivr）加载 markdown-it。加载完成后初始化编辑器交互逻辑。若加载失败，预览区显示错误提示。

**2. CodeMirror 6 内容写入方式**
`div.cm-content` 是由 CM6 管理的 contenteditable 元素，直接修改 `.textContent` 或 `.innerHTML` 会导致 CM6 内部状态与 DOM 不同步。正确方式：

- `element.focus()` — 聚焦编辑器
- `document.execCommand('selectAll', false, null)` — 全选现有内容
- `document.execCommand('insertText', false, newText)` — 替换为新文本

这种方式触发 CM6 的原生 input 事件处理，保持内部状态一致。`execCommand` 虽已标记为 deprecated，但各浏览器仍完整支持，且是与 contenteditable 富文本编辑器交互的最可靠方式。

**3. 防抖与同步流程**

```
用户输入 → 500ms 防抖 → 同时执行：
  ① markdown-it 渲染到预览区
  ② 状态设为"同步中" → 查找 cm-content → 写入内容 → 状态设为"已自动同步"
     └─ 3s 内未找到元素 → 状态设为"同步失败"
```

**4. 目标元素查找策略**

- 策略1：`document.querySelector('.cm-editor .cm-content[contenteditable="true"]')` — CM6 官方类名，稳定
- 策略2：`document.querySelector('[class*="cm-content"][contenteditable="true"]')` — 部分类名匹配
- 找不到时启动 3s 轮询重试（每 500ms 重试一次，共 6 次），超时则标记失败

**5. 布局方案**

- `.sh-popup-body` 为 `overflow-x: auto` 的水平滚动容器
- 内部 flex 行布局，`flex-wrap: nowrap`
- 左侧 textarea：`flex: 0 0 400px`，最小宽度 400px
- 右侧预览：`flex: 0 0 1400px`，固定 1400px
- 当视口宽度 < 1800px 时，自然出现水平滚动条

## 目录结构

```
c:/Users/kg/Desktop/shopify-browser-plugin/
├── manifest.json          # [MODIFY] 无需修改，CSP 不限制 CDN script 加载
├── content.js             # [MODIFY] 修改 openPopup()、新增编辑器/同步/防抖/markdown 相关函数
├── style.css              # [MODIFY] 修改 .sh-popup-body 布局，新增编辑器/预览/状态栏样式
├── icons/                 # 不变
└── README.md              # 不变
```

### 详细修改说明

**content.js 修改点：**

- 新增 `loadMarkdownIt()` — 动态加载 markdown-it CDN
- 新增 `debounce(fn, delay)` — 通用防抖函数
- 新增 `findCmContent()` — 多策略查找 CodeMirror 6 的 cm-content 元素
- 新增 `syncToShopify(text)` — 将文本写入 cm-content，管理同步状态
- 新增 `updateSyncStatus(status)` — 更新状态提示 UI（syncing/synced/failed）
- 修改 `openPopup()` — 重构 popup HTML 结构（左编辑器 + 右预览 + 状态栏），初始化 markdown-it，绑定防抖输入事件

**style.css 修改点：**

- 修改 `.sh-popup-body` — 改为水平滚动容器，移除原有 padding
- 新增 `.sh-editor-panel` — 左侧编辑面板样式
- 新增 `.sh-preview-panel` — 右侧预览面板固定 1400px
- 新增 `.sh-markdown-textarea` — 编辑区 textarea 样式
- 新增 `.sh-markdown-preview` — 预览渲染区样式
- 新增 `.sh-sync-status-bar` — 底部同步状态栏样式
- 新增 `.sh-sync-status-*` 三种状态的样式（绿/黄/红）

## 实现备注

- markdown-it 从 `https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js` 加载，挂载到全局 `window.markdownit`
- execCommand 写入前需确保按钮已点击（弹出时已自动点击），cm-content 已渲染到 DOM 中
- 同步状态栏放在 popup 底部（header 下方或 body 底部），不影响编辑区空间
- 防抖 500ms 是合理的输入节奏，避免频繁 DOM 操作

## 设计风格

在现有白色弹出面板基础上，采用简洁实用的编辑器风格。左右分栏布局，左侧为深色背景代码编辑区，右侧为白色背景渲染预览区，底部为同步状态指示条。

## 页面规划 — 弹出面板内部

### Block 1: 头部栏（已有，保持不变）

标题 + 关闭按钮，flex 布局

### Block 2: 编辑器主体区域

水平滚动容器，flex 行布局 nowrap：

- 左侧编辑面板（400px 宽）：深色背景 textarea，等宽字体，行号感，顶部有"Markdown 编辑"标签
- 右侧预览面板（1400px 宽）：白色背景，标准排版字体，顶部有"预览"标签，内容区渲染 markdown HTML

### Block 3: 同步状态栏

底部固定条，高度 32px，左侧显示同步状态图标+文字，三态切换：

- 同步中：黄色圆点 + "同步中..."
- 已同步：绿色圆点 + "已自动同步"  
- 失败：红色圆点 + "同步失败"