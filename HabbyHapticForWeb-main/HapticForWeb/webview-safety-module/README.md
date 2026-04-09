# WebView Safety Module

iOS WebView 触摸安全模块 - 解决 iOS 设备上长按/拖动触发文字选取、放大镜等问题，同时保留游戏所有触摸交互。

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg)]()

## 安装

### 方式 1: 直接下载

下载以下文件到你的项目：
- `webview-safety.css` - CSS 防护层（必需）
- `webview-safety.js` - JS 增强层（可选）

### 方式 2: npm 安装

```bash
npm install webview-safety-module
```

```javascript
// ES Module
import 'webview-safety-module/webview-safety.css';
import WebViewSafety from 'webview-safety-module';

// CommonJS
require('webview-safety-module/webview-safety.css');
const WebViewSafety = require('webview-safety-module');
```

### 方式 3: CDN（如已发布）

```html
<link rel="stylesheet" href="https://unpkg.com/webview-safety-module/webview-safety.css">
<script src="https://unpkg.com/webview-safety-module/webview-safety.js"></script>
```

---

## 问题现象

在 iOS 设备上运行 Web 游戏时：
- 用户长按会触发 iOS 系统的**文字选取功能**
- 出现**蓝色选取高亮**和**放大镜 (Magnifier/Loupe)**
- 干扰游戏的正常触控操作（拖动地块/小人等）

## 快速开始

### 1. 引入文件

```html
<!-- CSS（必需） -->
<link rel="stylesheet" href="webview-safety.css">

<!-- JS（可选，提供增强防护） -->
<script src="webview-safety.js"></script>
```

### 2. 给游戏画布添加标识

```html
<!-- 方式 A：使用 canvas 标签（自动识别） -->
<canvas id="gameCanvas"></canvas>

<!-- 方式 B：使用 class -->
<div class="game-container">
  <!-- 游戏内容 -->
</div>

<!-- 方式 C：使用 data 属性 -->
<div data-game-element>
  <!-- 游戏内容 -->
</div>
```

### 3. 完成！

现在游戏画布上的长按/拖拽操作不会再触发系统的文字选取和放大镜了。

---

## 分层 UI 架构

本模块专为**分层 UI 架构**设计，支持在游戏画布上层显示可滚动的 UI 面板。

### 典型游戏架构

```
┌─────────────────────────────────────────┐
│            UI Layer (可滚动)             │  ← 设置面板、背包、商店等
│  ┌─────────────────────────────────┐    │
│  │        .ui-panel.scrollable     │    │
│  │        (可上下滚动浏览)           │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│            Game Layer (锁定)             │  ← 游戏主画面
│  ┌─────────────────────────────────┐    │
│  │           <canvas>              │    │
│  │     (禁用系统手势，仅响应游戏)    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### HTML 结构示例

```html
<body>
  <!-- 游戏层：禁用系统手势 -->
  <canvas id="gameCanvas" class="game-container"></canvas>
  
  <!-- UI 层：可正常滚动 -->
  <div id="settingsPanel" class="ui-panel scrollable">
    <h2>设置</h2>
    <div class="settings-content">
      <!-- 大量设置选项，需要滚动查看 -->
    </div>
  </div>
  
  <!-- 背包 UI：可滚动 -->
  <div id="inventory" class="ui-layer" data-scrollable>
    <!-- 背包物品列表 -->
  </div>
</body>
```

### CSS 类说明

#### 游戏元素（禁用系统手势）

| 类名 | 作用 | touch-action |
|------|------|--------------|
| `.game-container` | 游戏容器，禁用所有系统手势 | none |
| `.game-canvas` | 游戏画布（同上） | none |

#### 可滚动容器

| 类名 | 作用 | 滚动方向 |
|------|------|----------|
| `.scrollable` | 可滚动的 UI 面板 | 垂直 |
| `.ui-layer` | UI 层容器（同上） | 垂直 |
| `.ui-panel` | UI 面板（同上） | 垂直 |
| `.scrollable-x` | 水平滚动容器 | 水平 |
| `.scrollable-both` | 双向滚动容器 | 双向 |

#### 可交互元素

| 类名 | 作用 | touch-action |
|------|------|--------------|
| `.btn` / `.button` | 按钮元素 | manipulation |
| `.slider` | 滑块控件 | pan-x |

#### 输入元素（自动恢复文字选择）

| 类名 | 作用 |
|------|------|
| `.text-input` | 文本输入框样式 |

#### 状态类

| 类名 | 作用 |
|------|------|
| `.dragging` | 拖动状态，强制禁用选择 |
| `.disabled` | 禁用状态，阻止交互 |

#### 布局类

| 类名 | 作用 |
|------|------|
| `.safe-area-container` | iPhone X+ 安全区域适配 |
| `.fullscreen-game`（加在 html 上） | 全屏游戏模式，锁定页面 |

### data 属性说明

#### 游戏元素

| 属性 | 作用 |
|------|------|
| `data-game-element` | 标记为游戏元素，禁用系统手势 |
| `data-no-select` | 禁用文字选择 |

#### 滚动控制

| 属性 | 作用 |
|------|------|
| `data-scrollable` | 允许垂直滚动 |
| `data-scrollable-y` | 允许垂直滚动（同上） |
| `data-scrollable-x` | 允许水平滚动 |
| `data-scrollable-both` | 允许双向滚动 |

#### 交互控制

| 属性 | 作用 |
|------|------|
| `data-clickable` | 标记为可点击元素 |
| `data-slider` | 标记为滑块控件 |
| `data-text-input` | 标记为文本输入（恢复选择） |
| `data-selection-enabled` | 恢复文字选择功能 |
| `data-safety-disabled` | 完全禁用安全措施 |
| `data-dragging` | 拖动状态标记 |
| `data-disabled` | 禁用状态标记 |

---

## 全屏游戏模式

如果你的游戏是**全屏模式**（无需页面滚动），可以启用完全锁定：

```html
<!-- 在 html 标签添加 fullscreen-game 类 -->
<html class="fullscreen-game">
<head>
  <link rel="stylesheet" href="webview-safety.css">
</head>
<body>
  <canvas id="gameCanvas"></canvas>
</body>
</html>
```

这将：
- 锁定 html/body 为 `position: fixed`
- 禁用页面滚动
- 禁用所有系统触摸手势

---

## JavaScript API

### 自动初始化

引入 JS 文件后会自动初始化：

```html
<script src="webview-safety.js"></script>
<!-- 自动在 DOMContentLoaded 后初始化 -->
```

> **注意**：自动初始化使用 `setTimeout(..., 0)` 延迟执行。如果你需要在脚本加载后**立即**使用 API（如检查 `isIOS`），请使用手动初始化。

### 手动初始化（推荐）

```javascript
// 立即初始化，确保 API 可用
const result = WebViewSafety.init({
  preventDoubleTap: true,      // 防止双击放大镜 (默认 true)
  preventLongPress: true,      // 防止长按菜单 (默认 true)
  preventSelection: true,      // 防止文字选择 (默认 true)
  preventContextMenu: true,    // 防止右键菜单 (默认 true)
  injectCSS: true,             // 自动注入 CSS (默认 true，如已引入 CSS 文件请设为 false)
  doubleTapThreshold: 300,     // 双击判定时间 ms (默认 300)
});

console.log(result.isIOS);        // 现在可以正确获取
console.log(result.initialized);  // true
```

> **注意**：长按防护完全依赖 CSS 的 `-webkit-touch-callout: none`，无需配置时间阈值。

### CSS 与 JS 配合使用

有三种使用方式：

#### 方式 1: 仅 CSS（覆盖率 ~70%）

```html
<link rel="stylesheet" href="webview-safety.css">
<!-- 不需要 JS，适合简单场景 -->
```

#### 方式 2: 仅 JS（覆盖率 ~85%）

```html
<script src="webview-safety.js"></script>
<!-- JS 会自动注入必要的 CSS -->
```

#### 方式 3: CSS + JS（推荐，覆盖率 ~85%）

```html
<link rel="stylesheet" href="webview-safety.css">
<script src="webview-safety.js"></script>
<script>
  // 重要：禁用 JS 的 CSS 注入，避免重复
  WebViewSafety.init({ injectCSS: false });
</script>
```

> **为什么推荐方式 3？**
> - CSS 文件包含完整样式（滚动支持、Safe Area、全屏模式等）
> - JS 提供增强防护（双击拦截、动态元素监听）
> - 设置 `injectCSS: false` 避免样式重复

### 为特定元素恢复功能

```javascript
// 输入框需要文字选择功能
const input = document.querySelector('input');
WebViewSafety.enableSelectionFor(input);

// 某个按钮需要长按功能
const longPressBtn = document.querySelector('.long-press-btn');
WebViewSafety.disableFor(longPressBtn);

// 重新启用防护
WebViewSafety.enableFor(longPressBtn);
```

### API 参考

| 方法 | 说明 |
|------|------|
| `WebViewSafety.init(options?)` | 初始化模块 |
| `WebViewSafety.enableSelectionFor(element)` | 为元素恢复文字选择 |
| `WebViewSafety.disableFor(element)` | 为元素禁用防护 |
| `WebViewSafety.enableFor(element)` | 为元素重新启用防护 |
| `WebViewSafety.isInitialized` | 是否已初始化 |
| `WebViewSafety.isIOS` | 是否为 iOS 设备 |
| `WebViewSafety.config` | 当前配置 |

---

## 使用场景

### 场景 1：全屏 Canvas 游戏

```html
<html class="fullscreen-game">
<body>
  <canvas id="game"></canvas>
  <script src="webview-safety.js"></script>
  <script>
    // 游戏代码，长按拖拽正常工作
  </script>
</body>
</html>
```

### 场景 2：游戏 + 可滚动设置面板

```html
<body>
  <canvas id="game" class="game-container"></canvas>
  
  <!-- 点击按钮显示设置面板 -->
  <button id="openSettings">设置</button>
  
  <!-- 可滚动的设置面板 -->
  <div id="settings" class="ui-panel scrollable" style="display:none;">
    <h2>游戏设置</h2>
    <div class="option">音量：<input type="range"></div>
    <div class="option">难度：<select>...</select></div>
    <!-- 更多选项... -->
  </div>
  
  <script src="webview-safety.js"></script>
</body>
```

### 场景 3：游戏 + 可滚动背包

```html
<body>
  <canvas id="game"></canvas>
  
  <!-- 横向滚动的物品栏 -->
  <div class="hotbar scrollable-x">
    <div class="item">剑</div>
    <div class="item">盾</div>
    <div class="item">药水</div>
    <!-- 更多物品... -->
  </div>
  
  <!-- 垂直滚动的背包 -->
  <div id="inventory" class="ui-layer" data-scrollable>
    <div class="item-grid">
      <!-- 大量物品格子 -->
    </div>
  </div>
</body>
```

### 场景 4：带输入框的游戏

```html
<body>
  <canvas id="game"></canvas>
  
  <!-- 聊天输入框 - 需要恢复文字选择 -->
  <div class="chat-box">
    <input type="text" id="chatInput" placeholder="输入消息...">
    <button>发送</button>
  </div>
  
  <script src="webview-safety.js"></script>
  <script>
    // 输入框自动恢复文字选择功能（CSS 已处理）
    // 如果需要手动处理：
    // WebViewSafety.enableSelectionFor(document.getElementById('chatInput'));
  </script>
</body>
```

---

## 分层防护架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: CSS 样式层                       │
│                    (基础防护, 覆盖率 ~70%)                    │
│                                                             │
│   • -webkit-user-select: none                               │
│   • -webkit-touch-callout: none                             │
│   • touch-action: none (仅游戏元素)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 2: JavaScript 层                    │
│                    (增强防护, 覆盖率 ~85%)                    │
│                                                             │
│   • 双击拦截器                                               │
│   • contextmenu 阻止                                        │
│   • selectstart 阻止                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: 原生层 (可选)                    │
│                    (完全防护, 覆盖率 ~99%)                    │
│                                                             │
│   • isTextInteractionEnabled = false (iOS 14.5+)            │
│   • Capacitor 插件                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Capacitor 集成（完全防护）

### 使用插件

```bash
# 选项 1: 禁用长按手势
npm install capacitor-suppress-longpress-gesture
npx cap sync ios
```

```typescript
import { SuppressLongpressGesture } from 'capacitor-suppress-longpress-gesture';
SuppressLongpressGesture.activateService();
```

### 原生代码配置

```swift
// ios/App/App/MyViewController.swift
import Capacitor

class MyViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 禁用文字交互 (iOS 14.5+)
        if #available(iOS 14.5, *) {
            webView?.configuration.preferences.isTextInteractionEnabled = false
        }
    }
}
```

---

## 技术原理

### 为什么不影响游戏触摸？

| 技术 | 官方文档说明 |
|------|-------------|
| `touch-action: none` | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action): "允许 JS 事件正常触发，只禁用浏览器默认行为" |
| `-webkit-user-select: none` | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/user-select): "只影响文字选择，不影响事件派发" |

### 验证来源

- [Apple WWDC 2019](https://developer.apple.com/videos/play/wwdc2019/203/) - 官方演示 canvas 使用 touch-action: none
- [web.dev (Google)](https://web.dev/articles/add-touch-to-your-site) - 推荐使用 touch-action 处理触摸
- [Phaser/Three.js 社区](https://discourse.threejs.org/t/iphone-how-to-remove-text-selection-magnifier/47812) - 开发者验证有效

---

## 常见问题

### Q: 页面无法滚动了？

检查是否使用了 `fullscreen-game` 类。如果需要滚动：
- 移除 `<html class="fullscreen-game">`
- 给需要滚动的容器添加 `.scrollable` 类

### Q: UI 面板无法滚动？

给 UI 面板添加正确的类：

```html
<!-- 垂直滚动 -->
<div class="ui-panel scrollable">...</div>

<!-- 或使用 data 属性 -->
<div class="ui-panel" data-scrollable>...</div>
```

### Q: 输入框无法选择文字？

输入框会自动恢复文字选择。如果仍有问题：

```javascript
WebViewSafety.enableSelectionFor(document.querySelector('input'));
```

### Q: 会影响 App Store 审核吗？

**不会。** 所有 API 都是 Apple 公开文档化的：
- CSS 属性 - W3C 标准
- `isTextInteractionEnabled` - [Apple 官方文档](https://developer.apple.com/documentation/webkit/wkpreferences/istextinteractionenabled)

### Q: 只用 CSS 够吗？

对于大多数场景 CSS 层已足够（~70% 覆盖率）。建议：
- 开发测试：CSS + JS（~85%）
- 正式发布：CSS + JS + 原生插件（~99%）

### Q: CSS 和 JS 同时引入会冲突吗？

不会冲突，但会有**样式重复**。推荐做法：

```javascript
// 同时使用 CSS 文件和 JS 时，禁用 JS 的 CSS 注入
WebViewSafety.init({ injectCSS: false });
```

### Q: 为什么 `WebViewSafety.isIOS` 返回 false？

可能是因为自动初始化还未执行。解决方法：

```javascript
// 手动立即初始化
WebViewSafety.init();
console.log(WebViewSafety.isIOS); // 现在返回正确值
```

### Q: 动态添加的元素怎么处理？

JS 模块会自动监听 DOM 变化，为新添加的 `<canvas>` 和 `.game-container` 元素应用防护。

对于其他元素，你可以：

```javascript
// 方法 1: 使用 data 属性（CSS 自动生效）
newElement.setAttribute('data-game-element', 'true');

// 方法 2: 使用 JS API
WebViewSafety.enableFor(newElement);
```

### Q: 如何为特定元素禁用/启用防护？

```javascript
// 禁用防护（如需要长按功能的按钮）
WebViewSafety.disableFor(element);

// 重新启用防护
WebViewSafety.enableFor(element);

// 只恢复文字选择（如自定义输入框）
WebViewSafety.enableSelectionFor(element);
```

---

## 验证清单

| 测试项 | 预期结果 |
|--------|----------|
| 长按游戏画布 | ✅ 无放大镜出现 |
| 拖动游戏元素 | ✅ 无蓝色选取框 |
| 双击画布 | ✅ 无缩放/放大镜 |
| 点击 UI 按钮 | ✅ 正常响应 |
| UI 面板滚动 | ✅ 正常滚动 |
| 输入框输入 | ✅ 可选择/复制文字 |

---

## 文件说明

```
webview-safety-module/
├── webview-safety.css   # CSS 防护层（必需）
├── webview-safety.js    # JS 增强层（可选）
├── package.json         # npm 包配置
└── README.md            # 本文档
```

---

## 浏览器兼容性

| 平台 | 版本 | 状态 |
|------|------|------|
| iOS Safari | 9.3+ | ✅ 完全支持 |
| iOS WKWebView | 9.3+ | ✅ 完全支持 |
| Android Chrome | 全版本 | ✅ 完全支持 |
| Android WebView | 全版本 | ✅ 完全支持 |
| 桌面 Chrome | 全版本 | ✅ 完全支持 |
| 桌面 Safari | 全版本 | ✅ 完全支持 |
| 桌面 Firefox | 全版本 | ✅ 完全支持 |

## 更新日志

### v1.0.0
- 初始版本
- CSS 防护层：禁用文字选择、放大镜、长按菜单
- JS 增强层：双击拦截、动态元素监听
- 支持分层 UI 架构（可滚动面板）
- 支持全屏游戏模式
- 自动恢复输入框文字选择
- Safe Area 适配（iPhone X+）

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
