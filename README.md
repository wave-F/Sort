# 切泡泡（Three.js / WebGPU）

## 项目简介

这是一个轻量的网页端“切泡泡”项目，使用 Three.js WebGPU 渲染。

核心玩法：
- 鼠标/触摸滑动形成刀光轨迹。
- 一刀内先锁定颜色，只能连续选择同色泡泡。
- 滑动过程中先选中泡泡，滑动结束后再按顺序依次爆破。
- 命中异色会触发提示并立即结算本刀已选泡泡（不中断游戏）。
- 关卡制：当前示例为 10 关，按 Excel 配置自动生成每关颜色数量与泡泡总数，再用 `seed` 固定布局（同一关每次进入一致）。

关卡颜色与数量配置（Excel -> JSON -> 运行时）：
- Excel 源文件：`src/excel/Levels.xlsx`
- 导出 JSON：`src/config/levels.json`
- 运行时读取：`src/levels.js`（直接读取 `levels.json`）

导表命令：

```bash
npm run excel:sync
```

监听 Excel 实时导出（可选）：

```bash
npm run excel:watch
```

`src/levels.js` 中仍保留运行时兜底校验；建议在构建前先执行 `excel:sync`。

关卡字段说明（Excel 列）：
- `id` / `name`
- `difficulty`：难度（`easy` / `medium` / `hard`）
- `colorKindCount`：本关使用几种颜色（1-8）
- `fruitCountRange`：泡泡总数范围（如 `10,40`）
- `radiusRange`：半径范围（如 `0.22,0.42`）
- `speedRange`：速度范围（如 `0,0.28`）
- `seed`：布局随机种子（固定可复现）

导出时会根据 `seed + colorKindCount + fruitCountRange` 自动生成 `colorCounts/fruitCount`，并估算 `minSteps`，再按难度计算步数上限：
- `easy`: `stepLimit = minSteps + 4`
- `medium`: `stepLimit = minSteps + 3`
- `hard`: `stepLimit = minSteps + 2`

## 运行方式

在项目根目录启动任意静态服务器，例如：

```bash
python3 -m http.server 4173
```

然后打开：

`http://localhost:4173`

泡泡单体调试页：

`http://localhost:4173/bubble-debug.html`

## 步数关卡工具（静态评估）

已提供一个离线工具：`scripts/step-level-lab.mjs`

- 分析某个 seed 的最少步数估计：

```bash
npm run steps:analyze -- --seed 12401 --colorCounts 0:8,1:8,2:7,3:7 --radiusRange 0.31,0.38
```

- 按目标步数反向筛选候选关卡：

```bash
npm run steps:generate -- --targetSteps 6 --samples 1200 --seedStart 30000 --maxResults 5 --colorCounts 0:8,1:8,2:7,3:7 --radiusRange 0.31,0.38 --out ./dist/step-candidates.json
```

可选：加 `--refineIterations 400` 启用局部搜索细调，更容易命中目标步数（但会更慢）。

输出会包含：`minSteps`、每色分量步数、以及建议通关预算（`hard=min+2`、`easy=min+5`）。

## 目录说明

- `src/main.js`：游戏主循环、输入、判定、结算与渲染逻辑。
- `src/levels.js`：关卡配置（颜色、数量、seed、尺寸与速度范围）。
- `src/styles.css`：界面样式。
- `index.html`：入口页面。
- `PROJECT_LOG.md`：项目迭代日志。

## 说明

- 推荐使用支持 WebGPU 的现代浏览器体验最佳效果（建议新版 Chrome/Edge）。
