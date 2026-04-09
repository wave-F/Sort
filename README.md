# 刀切水果（Three.js / WebGPU）

## 项目简介

这是一个轻量的网页端“刀切水果”项目，使用 Three.js WebGPU 渲染。

核心玩法：
- 鼠标/触摸滑动形成刀光轨迹。
- 一刀内先锁定颜色，只能连续选择同色水果。
- 滑动过程中先选中水果，滑动结束后再按顺序依次切割。
- 命中异色会触发提示并立即结算本刀已选水果（不中断游戏）。
- 关卡制：共 6 关，每关先配置颜色与数量，再用 `seed` 固定生成布局（同一关每次进入一致）。

关卡布局挑选热键（开局后可用）：
- `R`：基于当前关参数生成一版随机布局预览。
- `S`：保存当前预览为候选关卡数据。
- `E`：导出已保存候选为 JSON 文件（并尝试复制到剪贴板）。

关卡颜色与数量配置（`src/levels.js`）：
- 使用 `colorCounts` 单独配置每种颜色数量，例如：

```js
colorCounts: [
  { colorId: C.RED, count: 7 },
  { colorId: C.ORANGE, count: 7 },
]
```

- `fruitCount` 会由 `colorCounts` 自动求和。
- 同一关 `seed` 不变时，布局每次进入都一致。

## 运行方式

在项目根目录启动任意静态服务器，例如：

```bash
python3 -m http.server 4173
```

然后打开：

`http://localhost:4173`

## 目录说明

- `src/main.js`：游戏主循环、输入、判定、结算与渲染逻辑。
- `src/levels.js`：关卡配置（颜色、数量、seed、尺寸与速度范围）。
- `src/styles.css`：界面样式。
- `index.html`：入口页面。
- `PROJECT_LOG.md`：项目迭代日志。

## 说明

- 推荐使用支持 WebGPU 的现代浏览器体验最佳效果（建议新版 Chrome/Edge）。
