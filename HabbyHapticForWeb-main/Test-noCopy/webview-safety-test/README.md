# WebView Safety Test

iOS WebView 触摸安全模块测试项目 - 用于验证长按/拖动不触发文字选取和放大镜问题的解决方案。

## 测试目标

验证 `webview-safety-module` 组件能否解决以下问题：
- 长按触发文字选取（蓝色高亮）
- 长按触发放大镜 (Magnifier/Loupe)
- 双击触发页面缩放
- 拖动时意外选中文字

## 项目结构

```
webview-safety-test/
├── www/                          # Web 资源目录
│   ├── index.html               # 测试页面（带开关控制）
│   ├── webview-safety.js        # 安全模块 JS
│   └── webview-safety.css       # 安全模块 CSS
├── ios-native-config/           # iOS 原生增强配置
│   └── MyViewController.swift   # 可选的原生配置
├── capacitor.config.ts          # Capacitor 配置
├── package.json                 # 项目配置
└── README.md                    # 本文档
```

## 快速开始

### 1. 安装依赖

```bash
cd webview-safety-test
npm install
```

### 2. 本地测试（浏览器）

```bash
npm start
# 打开 http://localhost:3000
```

### 3. iOS 打包测试

```bash
# 初始化 iOS 项目（首次）
npm run ios:init

# 同步并打开 Xcode
npm run ios:run
```

### 4. 在 Xcode 中运行

1. 在 Xcode 中选择目标设备（真机或模拟器）
2. 点击运行按钮
3. 在设备上进行触摸测试

## 测试功能说明

### 开关控制面板

| 开关 | 功能 |
|------|------|
| Master Switch | 总开关，控制所有安全功能 |
| Prevent Double Tap | 防止双击缩放/放大镜 |
| Prevent Long Press | 防止长按菜单 |
| Prevent Selection | 防止文字选择 |
| Prevent Context Menu | 防止右键菜单 |

### 测试区域

1. **Canvas Test Area** - 画布触摸测试
   - 测试长按是否出现放大镜
   - 测试拖动是否触发选取
   - 测试双击是否触发缩放

2. **Draggable Items Test** - 可拖动元素测试
   - 测试拖动操作是否正常
   - 测试拖动时是否触发选取

3. **Button Click Test** - 按钮点击测试
   - 验证点击事件正常响应
   - 验证双击检测

4. **Text Selection Test** - 文字选择测试
   - 开启安全时：不能选择
   - 关闭安全时：可以选择

5. **Input Field Test** - 输入框测试
   - 无论安全开关状态，输入框始终可以选择文字

### 日志面板

实时显示所有触摸事件和状态变化，便于调试验证。

## 验证清单

在 iOS 真机上测试以下场景：

| 测试项 | 安全开启预期 | 安全关闭预期 |
|--------|-------------|-------------|
| Canvas 长按 | 无放大镜 | 可能出现放大镜 |
| Canvas 拖动 | 无选取框 | 可能出现选取 |
| Canvas 双击 | 无缩放 | 可能触发缩放 |
| 拖动元素 | 正常拖动 | 正常拖动 |
| 按钮点击 | 正常响应 | 正常响应 |
| 文字长按 | 不可选择 | 可选择 |
| 输入框 | 可选择/输入 | 可选择/输入 |

## iOS 原生增强（可选）

如需 99% 防护覆盖率，可添加原生配置：

1. 打开 `ios/App/App/` 目录
2. 将 `ios-native-config/MyViewController.swift` 添加到项目
3. 修改 `AppDelegate.swift` 使用 `MyViewController`

关键代码：
```swift
// iOS 14.5+ 禁用文字交互
if #available(iOS 14.5, *) {
    webView?.configuration.preferences.isTextInteractionEnabled = false
}
```

## 日志说明

测试页面在控制台输出详细日志，格式：

```
[WebViewSafetyTest][INFO] 信息日志
[WebViewSafetyTest][SUCCESS] 成功日志
[WebViewSafetyTest][WARNING] 警告日志
[WebViewSafetyTest][ERROR] 错误日志
[WebViewSafetyTest][EVENT] 事件日志
```

## 常见问题

### Q: 模拟器测试有效吗？
A: 建议使用真机测试，模拟器可能无法完全模拟 iOS 触摸行为。

### Q: 需要特定 iOS 版本吗？
A: CSS/JS 方案支持 iOS 9.3+，原生增强需要 iOS 14.5+。

### Q: 为什么输入框始终可以选择？
A: 这是设计行为，输入框需要保留文字选择功能用于编辑。

## 相关文档

- [WebView Safety Module README](../../HapticForWeb/webview-safety-module/README.md)
- [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- [MDN: user-select](https://developer.mozilla.org/en-US/docs/Web/CSS/user-select)
- [Apple: isTextInteractionEnabled](https://developer.apple.com/documentation/webkit/wkpreferences/istextinteractionenabled)
