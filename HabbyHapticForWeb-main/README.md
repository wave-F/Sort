# HabbyHapticForWeb

iOS CoreHaptics / AHAP 触觉反馈 + WebView 触摸安全解决方案，适用于 Web 和 Capacitor 应用。

## 项目结构

```
HabbyHapticForWeb/
├── HapticForWeb/                    # 核心模块目录
│   ├── haptic-module/               # 纯 JavaScript 触觉模块
│   ├── capacitor-haptic-plugin/     # Capacitor 8 原生插件
│   └── webview-safety-module/       # WebView 触摸安全模块
├── Test/                            # 触觉模块测试项目
└── Test-noCopy/                     # WebView 安全模块测试项目
```

---

## 核心模块 (HapticForWeb/)

### 1. haptic-module

**零依赖的 JavaScript 触觉反馈模块**

适用于任何 Web 项目，通过 `<script>` 标签直接引入即可使用。

**功能特性：**
- 三层级 API：系统预设 / 参数化控制 / AHAP 文件播放
- 自动平台检测和优雅降级
- iOS Capacitor: 完整 CoreHaptics 支持
- Android: `navigator.vibrate()` 降级
- Desktop: 静默跳过

**快速使用：**
```html
<script src="haptic-module.js"></script>
<script>
  HapticModule.init();
  HapticModule.impact('light');           // 系统预设
  HapticModule.playTransient({ intensity: 0.8 }); // 参数化
  HapticModule.playFile('./tap.ahap');    // AHAP 文件
</script>
```

### 2. capacitor-haptic-plugin

**Capacitor 8 原生触觉插件**

标准 Capacitor 插件，`npm install + cap sync` 即可使用，无需手动配置。

**功能特性：**
- iOS CoreHaptics 完整支持
- AHAP/HAHAP 文件播放
- TypeScript 类型定义
- Web/Android 自动降级

**快速使用：**
```bash
npm install capacitor-haptic-plugin
npx cap sync
```

```typescript
import { CustomHaptics } from 'capacitor-haptic-plugin';

await CustomHaptics.impact({ style: 'heavy' });
await CustomHaptics.playPattern({ ahapJson: '...' });
await CustomHaptics.playBundled({ name: 'damage' });
```

### 3. webview-safety-module

**iOS WebView 触摸安全模块**

解决 iOS WebView 中长按/拖动触发文字选取、放大镜等问题，同时保留所有游戏触摸交互。

**解决的问题：**
- 长按触发文字选取（蓝色高亮）
- 长按触发放大镜 (Magnifier/Loupe)
- 双击触发页面缩放
- 拖动时意外选中文字

**快速使用：**
```html
<!-- CSS 防护层（必需） -->
<link rel="stylesheet" href="webview-safety.css">

<!-- JS 增强层（可选） -->
<script src="webview-safety.js"></script>
```

```html
<!-- 游戏画布自动识别 -->
<canvas id="gameCanvas"></canvas>

<!-- 或使用 class/data 属性标记 -->
<div class="game-container">...</div>
<div data-game-element>...</div>
```

---

## 测试项目

### Test/ - 触觉模块测试

用于测试 `haptic-module` 和 `capacitor-haptic-plugin` 的 iOS Capacitor 测试应用。

**测试功能：**
- **Tier 1 - 系统预设**：Impact (light/medium/heavy/rigid/soft)、Notification (success/warning/error)、Selection
- **Tier 2 - 参数化控制**：Transient、Continuous（可调节 intensity/sharpness/duration）
- **Tier 3 - AHAP 文件**：playFile（HTTP 加载）、playBundled（Bundle 直读）、playPattern（内联 JSON）

**运行测试：**
```bash
cd Test/Build
npm install
npm run sync
npm run open
# 在 Xcode 中选择 iOS 设备并运行
```

### Test-noCopy/ - WebView 安全模块测试

用于测试 `webview-safety-module` 的 iOS Capacitor 测试应用。

**测试功能：**
- **开关控制面板**：可独立开关各项安全功能（双击防护、长按防护、文字选择防护、右键菜单防护）
- **Canvas 触摸测试**：验证长按/双击/拖动不触发系统行为
- **可拖动元素测试**：验证拖动操作正常工作
- **多点触控测试**：验证 pinch zoom、swipe 等手势正常识别
- **输入框测试**：验证输入框始终保留文字选择功能
- **事件统计面板**：实时显示 touch/pointer/click 事件计数，证明事件正常传递

**运行测试：**
```bash
cd Test-noCopy/webview-safety-test
npm install
npm run ios:run
# 在 Xcode 中选择 iOS 真机并运行
```

**验证清单：**

| 测试项 | 安全开启预期 | 安全关闭预期 |
|--------|-------------|-------------|
| Canvas 长按 | 无放大镜 | 可能出现放大镜 |
| Canvas 拖动 | 无选取框 | 可能出现选取 |
| Canvas 双击 | 无缩放 | 可能触发缩放 |
| 拖动元素 | 正常拖动 | 正常拖动 |
| 按钮点击 | 正常响应 | 正常响应 |
| 文字长按 | 不可选择 | 可选择 |
| 输入框 | 可选择/输入 | 可选择/输入 |

---

## 模块选择指南

| 你的项目 | 推荐模块 | 安装方式 |
|---------|---------|---------|
| 纯 Web 项目（无 Capacitor） | `haptic-module` | `<script src="haptic-module.js">` |
| Capacitor iOS 应用 | `capacitor-haptic-plugin` | `npm install capacitor-haptic-plugin && npx cap sync` |
| Capacitor + 统一 API | 两者配合使用 | `haptic-module` 自动检测并桥接原生插件 |
| iOS WebView 游戏（触摸问题） | `webview-safety-module` | 引入 CSS + JS 文件 |

---

## 兼容性

### haptic-module / capacitor-haptic-plugin

| 平台 | 支持情况 |
|------|---------|
| iOS (Capacitor) | 完整 CoreHaptics 支持 |
| Android | `navigator.vibrate()` 降级 |
| Desktop | 静默跳过 |

### webview-safety-module

| 平台 | 版本 | 状态 |
|------|------|------|
| iOS Safari / WKWebView | 9.3+ | 完全支持 |
| Android Chrome / WebView | 全版本 | 完全支持 |
| 桌面浏览器 | 全版本 | 完全支持 |

---

## 预设 AHAP 文件

两个触觉模块都包含 5 个预设 AHAP 文件：

| 文件名 | 用途 |
|--------|------|
| `tap.ahap` | 轻触反馈 |
| `cardSwap.hahap` | 卡牌交换 |
| `damage.ahap` | 受击反馈 |
| `cabo.hahap` | Cabo 游戏效果 |
| `suddenDeath.ahap` | 突然死亡效果 |

---

## Capacitor iOS 打包发布流程

### 完整打包流程

#### 1. 项目初始化

```bash
# 创建新项目（如果还没有）
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "YourAppName" "com.yourcompany.appname"

# 安装触觉插件
npm install capacitor-haptic-plugin

# 添加 iOS 平台
npx cap add ios
```

#### 2. Web 资源构建

```bash
# 构建你的 Web 应用（根据你的框架）
npm run build

# 确保构建输出到 capacitor.config.ts 中配置的 webDir
# 默认是 dist/ 或 www/
```

#### 3. 同步到 iOS 项目

```bash
# 同步 Web 资源和插件到 iOS
npx cap sync ios

# 或者分步执行
npx cap copy ios   # 仅复制 Web 资源
npx cap update ios # 更新原生依赖
```

#### 3.1 AHAP 文件打包注意事项 (重要)

使用 `HapticModule.playFile()` 时，AHAP/HAHAP 文件必须存在于 Capacitor 的 `webDir` 目录中。

**核心规则：文件只要在 `webDir` 目录下即可访问**

```
capacitor.config.json 配置:
{
  "webDir": "www"    ← Capacitor 加载资源的根目录
}
```

**路径对应关系：**

| www 目录中的文件位置 | playFile() 调用路径 |
|---------------------|---------------------|
| `www/Touch.hahap` | `'./Touch.hahap'` |
| `www/assets/Touch.hahap` | `'./assets/Touch.hahap'` |
| `www/HapticForWeb/haptic-module/assets/Touch.hahap` | `'./HapticForWeb/haptic-module/assets/Touch.hahap'` |
| `www/sounds/haptics/tap.ahap` | `'./sounds/haptics/tap.ahap'` |

**简单来说：**
- 文件放在 `webDir`（默认 `www/`）目录下的**任意位置**都可以
- `playFile()` 的路径相对于 `www/` 目录书写即可
- 路径以 `./` 开头

**常见问题：文件存在于源目录但未被打包**

```
项目结构示例：
your-project/
├── src/                        # 源代码目录
│   └── assets/
│       └── Touch.hahap         # ❌ 这里的文件不会被 Capacitor 打包!
├── Build/
│   ├── www/                    # ← Capacitor webDir (文件必须在这里!)
│   │   └── assets/
│   │       └── Touch.hahap     # ✅ 正确位置
│   └── capacitor.config.json
```

**问题原因：**
- Capacitor 只会从 `webDir`（默认 `www/` 或 `dist/`）复制文件到 iOS
- 源目录的文件修改不会自动同步到 `webDir`
- `playFile()` 使用 `fetch()` 加载文件，文件不存在会静默失败（无错误提示）

**解决方案：**

**方案 A：手动复制文件**
```bash
# 每次新增/修改 AHAP 文件后，手动复制到 webDir
cp src/assets/MyHaptic.hahap Build/www/assets/
npx cap sync ios
```

**方案 B：配置构建脚本自动复制**
```json
// package.json
{
  "scripts": {
    "copy-assets": "cp -r src/assets Build/www/",
    "build": "npm run copy-assets && npx cap sync ios"
  }
}
```

**方案 C：直接在 webDir 中管理 AHAP 文件**
```
Build/www/
├── HapticForWeb/
│   └── haptic-module/
│       └── assets/           # 所有 AHAP 文件放这里
│           ├── tap.ahap
│           ├── damage.ahap
│           └── MyCustom.hahap
```

**方案 D：使用 playBundled() 替代 playFile() (推荐)**
```javascript
// playBundled 从 iOS Bundle 直接读取，延迟最低
// 需要将 AHAP 文件添加到 Xcode 项目的 Bundle Resources
HapticModule.playBundled('Touch');  // 不需要扩展名
```

**验证文件是否正确打包：**
```bash
# 检查 webDir 中是否存在文件
ls -la Build/www/assets/*.ahap Build/www/assets/*.hahap

# 检查 iOS 项目中是否存在文件
ls -la Build/ios/App/App/public/assets/
```

**调试技巧：**
```javascript
// 临时添加错误日志，定位 fetch 失败
HapticModule.playFile('./assets/Touch.hahap')
  .catch(e => console.error('playFile failed:', e));

// 或直接测试 fetch
fetch('./assets/Touch.hahap')
  .then(r => console.log('fetch status:', r.status))
  .catch(e => console.error('fetch error:', e));
```

#### 4. Xcode 配置

```bash
# 打开 Xcode 项目
npx cap open ios
```

在 Xcode 中完成以下配置：

**基础配置 (TARGETS → Your App)：**

| 配置项 | 位置 | 说明 |
|--------|------|------|
| Bundle Identifier | General → Identity | 与 App Store Connect 一致，如 `com.yourcompany.appname` |
| Version | General → Identity | 版本号，如 `1.0.0` |
| Build | General → Identity | 构建号，每次提交递增，如 `1`, `2`, `3` |
| Deployment Target | General → Deployment Info | 最低 iOS 版本，建议 `iOS 13.0+` |
| Device Orientation | General → Deployment Info | 支持的屏幕方向 |
| Team | Signing & Capabilities | 你的 Apple Developer Team |

**签名配置 (Signing & Capabilities)：**

```
☑️ Automatically manage signing
Team: Your Team Name
Bundle Identifier: com.yourcompany.appname
Provisioning Profile: Xcode Managed Profile
```

#### 5. 添加必要的 Capabilities

根据功能需求添加：

| Capability | 用途 | 本项目是否需要 |
|------------|------|---------------|
| Push Notifications | 推送通知 | 可选 |
| Background Modes | 后台运行 | 可选 |
| App Groups | 应用组共享 | 可选 |
| Associated Domains | Universal Links | 可选 |

> **注意**：本项目的触觉反馈功能不需要特殊 Capabilities，CoreHaptics 是系统自带框架。

#### 6. App Icons 和 Launch Screen

**App Icons：**
- 位置：`ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- 需要提供完整的图标集（1024x1024 为必需）
- 推荐使用工具自动生成：[App Icon Generator](https://appicon.co/)

**Launch Screen：**
- 位置：`ios/App/App/Base.lproj/LaunchScreen.storyboard`
- 或使用 `ios/App/App/Assets.xcassets/Splash.imageset/`

#### 7. 构建 Archive

```
Xcode 菜单: Product → Archive

# 确保选择了 "Any iOS Device (arm64)" 作为目标设备
# 不能选择模拟器
```

#### 8. 上传到 App Store Connect

**方式一：通过 Xcode Organizer**
```
Window → Organizer → 选择 Archive → Distribute App
→ App Store Connect → Upload
```

**方式二：通过 Transporter**
1. 在 Organizer 中选择 "Export" 导出 .ipa
2. 使用 Transporter App 上传

**方式三：命令行 (CI/CD)**
```bash
# 使用 altool
xcrun altool --upload-app -f YourApp.ipa -t ios -u "your@email.com" -p "app-specific-password"

# 或使用 fastlane
fastlane deliver
```

---

## App Store 审核注意事项

### 审核清单

#### 1. 隐私与权限

**Info.plist 必需配置：**

```xml
<!-- 如果使用触觉反馈，无需特殊权限声明 -->
<!-- CoreHaptics 是系统框架，无需用户授权 -->

<!-- 如果你的应用有其他功能，按需添加： -->

<!-- 相机权限 -->
<key>NSCameraUsageDescription</key>
<string>需要访问相机以拍摄照片</string>

<!-- 相册权限 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册以选择图片</string>

<!-- 麦克风权限 -->
<key>NSMicrophoneUsageDescription</key>
<string>需要访问麦克风以录制音频</string>

<!-- 位置权限 -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>需要访问位置以提供本地化服务</string>
```

**审核要点：**
- 所有权限必须有明确的使用说明
- 说明必须与实际用途相符
- 不要请求不必要的权限
- 权限描述使用用户能理解的语言

#### 2. App Store Connect 元数据

| 字段 | 要求 | 示例 |
|------|------|------|
| App Name | 30 字符内，不含特殊符号 | `My Game` |
| Subtitle | 30 字符内 | `触觉反馈游戏体验` |
| Description | 详细描述功能 | 完整的功能介绍 |
| Keywords | 100 字符内，逗号分隔 | `game,haptic,触觉,反馈` |
| Support URL | 有效的支持链接 | `https://yoursite.com/support` |
| Privacy Policy URL | **必需** | `https://yoursite.com/privacy` |
| Screenshots | 各设备尺寸 | 6.7", 6.5", 5.5" 等 |

**截图尺寸要求：**

| 设备 | 尺寸 (像素) | 数量 |
|------|------------|------|
| 6.7" (iPhone 15 Pro Max) | 1290 × 2796 | 1-10 张 |
| 6.5" (iPhone 11 Pro Max) | 1242 × 2688 | 1-10 张 |
| 5.5" (iPhone 8 Plus) | 1242 × 2208 | 1-10 张 |
| 12.9" iPad Pro | 2048 × 2732 | 1-10 张 |

#### 3. 常见拒审原因及解决方案

##### 3.1 Guideline 2.1 - App Completeness

**问题**：应用崩溃、无法加载、功能不完整

**解决方案：**
```bash
# 充分测试
# 1. 在真机上测试所有功能
# 2. 测试网络断开情况
# 3. 测试首次启动流程
# 4. 测试后台返回前台

# Capacitor 调试
npx cap run ios --target=<device-id>
```

##### 3.2 Guideline 2.3 - Accurate Metadata

**问题**：截图、描述与实际功能不符

**解决方案：**
- 截图必须来自真实应用
- 不要使用模拟器边框或设备边框
- 描述的功能必须在应用中存在

##### 3.3 Guideline 4.2 - Minimum Functionality

**问题**：应用只是网页包装，功能太简单

**解决方案：**
```javascript
// 添加原生功能证明应用价值
// 本项目的触觉反馈就是很好的原生功能

// 确保使用了原生插件
import { CustomHaptics } from 'capacitor-haptic-plugin';

// 触觉反馈增强用户体验
await CustomHaptics.impact({ style: 'medium' });
```

**原生功能建议：**
- ✅ 触觉反馈 (CoreHaptics)
- ✅ 推送通知
- ✅ 本地存储
- ✅ 设备传感器
- ✅ 相机/相册集成
- ✅ 分享功能

##### 3.4 Guideline 5.1.1 - Data Collection and Storage

**问题**：隐私政策缺失或不完整

**隐私政策必需内容：**
```markdown
## 隐私政策

### 数据收集
- 说明收集哪些数据
- 说明收集目的
- 说明数据存储位置

### 第三方服务
- 列出所有第三方 SDK
- 说明各服务的数据使用

### 用户权利
- 如何访问数据
- 如何删除数据
- 如何联系我们

### 联系方式
- 提供有效的联系邮箱
```

##### 3.5 Guideline 5.1.2 - Data Use and Sharing

**App Privacy 声明 (App Store Connect)：**

在 App Store Connect → App Privacy 中如实填写：

| 数据类型 | 是否收集 | 用途 |
|----------|---------|------|
| Contact Info | 按实际 | 注册/登录 |
| Identifiers | 按实际 | 分析/广告 |
| Usage Data | 按实际 | 产品改进 |
| Diagnostics | 按实际 | 崩溃报告 |

#### 4. WebView 应用特别注意

##### 4.1 避免被判定为"网页包装"

```javascript
// ❌ 不要这样 - 纯粹加载远程网页
window.location.href = 'https://yourwebsite.com';

// ✅ 应该这样 - 本地资源 + 原生功能
// Capacitor 默认就是加载本地 www/ 目录
// 配合原生插件提供增强功能
```

**必要措施：**
1. Web 资源必须打包在应用内（Capacitor 默认行为）
2. 使用至少一个原生功能（触觉反馈、通知等）
3. 离线时应用应能基本运行
4. 不要只是简单地嵌入网页 URL

##### 4.2 WKWebView 配置

Capacitor 已正确配置 WKWebView，但确保：

```swift
// ios/App/App/AppDelegate.swift
// Capacitor 默认配置已包含正确的 WKWebView 设置

// 如需自定义，可在此文件中修改
```

##### 4.3 本地存储限制

```javascript
// WKWebView 的 localStorage 有限制
// 建议使用 Capacitor 的存储插件

import { Preferences } from '@capacitor/preferences';

// 存储
await Preferences.set({ key: 'name', value: 'John' });

// 读取
const { value } = await Preferences.get({ key: 'name' });
```

#### 5. 触觉反馈相关审核

##### 5.1 无需特殊声明

CoreHaptics 是系统框架，不需要：
- 特殊权限声明
- 隐私政策特别说明
- App Privacy 数据声明

##### 5.2 确保降级处理

```javascript
// 必须处理设备不支持触觉的情况
const result = await HapticModule.init();

if (!result.haptics) {
  // 设备不支持触觉（模拟器或旧设备）
  // 应用应能正常运行，只是没有触觉反馈
  console.log('Haptics not available, continuing without feedback');
}

// 不要因为触觉不可用而阻止应用功能
```

##### 5.3 合理使用触觉

```javascript
// ✅ 好的做法 - 适度使用，增强体验
HapticModule.impact('light');     // 按钮点击
HapticModule.notification('success'); // 操作成功

// ❌ 避免 - 过度使用，影响体验
// 不要在高频操作中每次都触发触觉
// 不要使用持续时间过长的震动
```

#### 6. 提交前检查清单

```markdown
## App Store 提交检查清单

### 基础配置
- [ ] Bundle Identifier 正确且唯一
- [ ] Version 和 Build 号已更新
- [ ] App Icons 完整（所有尺寸）
- [ ] Launch Screen 已配置
- [ ] Deployment Target 设置合理

### 签名与证书
- [ ] Development 证书有效
- [ ] Distribution 证书有效
- [ ] Provisioning Profile 正确
- [ ] Team 选择正确

### App Store Connect
- [ ] App 已创建
- [ ] 所有元数据已填写
- [ ] 截图已上传（所有必需尺寸）
- [ ] 隐私政策 URL 有效
- [ ] App Privacy 已声明
- [ ] 年龄分级已填写

### 功能测试
- [ ] 所有功能在真机上正常
- [ ] 触觉反馈正常工作
- [ ] 网络断开时应用不崩溃
- [ ] 内存使用合理
- [ ] 无明显卡顿

### 隐私合规
- [ ] 所有权限有使用说明
- [ ] 隐私政策完整且可访问
- [ ] 数据收集声明准确
- [ ] 第三方 SDK 已声明

### 代码质量
- [ ] 无崩溃日志
- [ ] 无废弃 API 警告
- [ ] 无内存泄漏
- [ ] 无私有 API 调用
```

---

## CI/CD 自动化打包 (可选)

### GitHub Actions 示例

```yaml
# .github/workflows/ios-release.yml
name: iOS Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build web assets
        run: npm run build
        
      - name: Sync Capacitor
        run: npx cap sync ios
        
      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable
          
      - name: Install CocoaPods
        run: |
          cd ios/App
          pod install
          
      - name: Build and Archive
        env:
          CERTIFICATE_BASE64: ${{ secrets.CERTIFICATE_BASE64 }}
          PROVISION_PROFILE_BASE64: ${{ secrets.PROVISION_PROFILE_BASE64 }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          # 设置证书和描述文件
          # ... (证书安装脚本)
          
          # 构建
          xcodebuild -workspace ios/App/App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive
            
      - name: Upload to App Store Connect
        env:
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
        run: |
          xcrun altool --upload-app \
            -f build/App.ipa \
            -t ios \
            --apiKey $APP_STORE_CONNECT_API_KEY
```

### Fastlane 配置 (推荐)

```ruby
# ios/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Push a new release build to TestFlight"
  lane :beta do
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store"
    )
    upload_to_testflight
  end
  
  desc "Push a new release build to App Store"
  lane :release do
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store"
    )
    upload_to_app_store(
      skip_screenshots: true,
      skip_metadata: true
    )
  end
end
```

---

## 常见问题 FAQ

### Q: 触觉反馈在模拟器上不工作？

**A:** 正常现象。CoreHaptics 需要真实的 Taptic Engine 硬件，模拟器无法模拟。使用真机测试。

```javascript
// 代码中应正确处理
const { haptics } = await HapticModule.init();
if (!haptics) {
  console.log('Running on simulator or unsupported device');
}
```

### Q: 提交后显示 "Invalid Binary"？

**A:** 常见原因：
1. 使用了模拟器架构 - 确保选择 "Any iOS Device" 构建
2. 包含了 i386/x86_64 架构 - 需要剔除
3. 使用了私有 API

```bash
# 检查架构
lipo -info YourApp.app/YourApp

# 应该只包含 arm64
```

### Q: 审核被拒，说是 "Minimum Functionality"？

**A:** WebView 应用常见问题。解决方案：
1. 确保使用了原生功能（触觉反馈是一个很好的例子）
2. 应用必须提供超出网页的价值
3. 在 Review Notes 中说明原生功能

```
Review Notes 示例：
This app uses native iOS features including:
- CoreHaptics for enhanced tactile feedback during gameplay
- Local storage for offline gameplay data
- Native share functionality
```

### Q: 如何处理 App Store 隐私标签？

**A:** 在 App Store Connect 的 "App Privacy" 中：
1. 如果只使用触觉反馈，无数据收集 → 选择 "Data Not Collected"
2. 如果使用分析 SDK → 如实声明
3. 每次添加新功能都要更新

### Q: playFile() 没有触发震动，但也没有报错？

**A:** 这是最常见的打包问题。`playFile()` 使用 `fetch()` 加载 AHAP 文件，文件不存在时会**静默失败**。

**排查步骤：**

1. **确认文件路径**
```javascript
// 检查实际调用的路径
HapticModule.playFile('./assets/Touch.hahap');
// 对应的实际文件位置：Build/www/assets/Touch.hahap
```

2. **检查 webDir 中是否存在文件**
```bash
# 源文件位置 (开发目录)
ls -la src/assets/Touch.hahap

# 打包目录 (Capacitor 实际加载的位置)
ls -la Build/www/assets/Touch.hahap  # ← 文件必须在这里!
```

3. **常见原因**
   - 文件只存在于源目录，未复制到 `webDir`
   - 文件名大小写不匹配（iOS 区分大小写）
   - 路径前缀错误（如 `./` vs `/` vs 无前缀）

4. **添加调试日志**
```javascript
// 临时修改 haptic-module.js 的 playFile 方法
static async playFile(url) {
  console.log('[HapticModule] playFile called:', url);
  
  try {
    const response = await fetch(url);
    console.log('[HapticModule] fetch status:', response.status);
    
    if (!response.ok) {
      console.error('[HapticModule] File not found:', url);
      return;
    }
    // ...
  } catch (e) {
    console.error('[HapticModule] fetch error:', e);
  }
}
```

5. **解决方案**
```bash
# 复制文件到正确位置
cp src/assets/Touch.hahap Build/www/assets/

# 重新同步
npx cap sync ios
```

**推荐：使用 playBundled() 替代**
```javascript
// playBundled 从 iOS Bundle 读取，不依赖 webDir
// 延迟更低，更可靠
HapticModule.playBundled('Touch');
```

### Q: playFile() 和 playBundled() 有什么区别？

**A:** 

| 特性 | playFile(url) | playBundled(name) |
|------|---------------|-------------------|
| 文件位置 | webDir (www/) | iOS Bundle |
| 加载方式 | HTTP fetch | 原生文件读取 |
| 延迟 | 较高 (网络请求) | 最低 (直接读取) |
| 打包要求 | 文件在 webDir 中 | 文件在 Xcode Bundle 中 |
| 动态加载 | 支持 | 不支持 |
| 错误处理 | 静默失败 | 返回错误信息 |

**推荐场景：**
- `playFile()`: 需要动态加载、用户上传的 AHAP 文件
- `playBundled()`: 预设的触觉效果，追求最低延迟

---

## License

MIT
