# 刀切水果（Three.js / WebGPU）

## 项目简介

这是一个轻量的网页端“刀切水果”原型项目，使用 Three.js 渲染，优先走 WebGPU，自动回退 WebGL。

核心玩法：
- 鼠标/触摸滑动形成刀光轨迹。
- 一刀内先锁定颜色，只能连续选择同色水果。
- 滑动过程中先选中水果，滑动结束后再按顺序依次切割。
- 命中异色会触发提示并立即结算本刀已选水果（不中断游戏）。

## 运行方式

在项目根目录启动任意静态服务器，例如：

```bash
python3 -m http.server 4173
```

然后打开：

`http://localhost:4173`

## 单机版（双击 HTML）

如果你希望给别人一个“直接双击就能玩”的文件：

```bash
npm run build:standalone
```

构建后会在项目根目录生成：

- `standalone.html`

该文件为 WebGPU-only 单机版，包含内联样式和脚本，可直接双击打开。

注意：目标浏览器/设备必须支持 WebGPU（建议新版 Chrome/Edge）。

## 目录说明

- `src/main.js`：核心玩法逻辑（输入、命中判定、结算、动画与特效）。
- `src/styles.css`：界面样式。
- `index.html`：入口页面。
- `PROJECT_LOG.md`：项目迭代日志。

## 说明

- 推荐使用支持 WebGPU 的现代浏览器体验最佳效果。
- 若 WebGPU 不可用，项目会自动使用 WebGL 渲染。
