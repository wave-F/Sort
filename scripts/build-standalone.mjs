import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const bundlePath = path.join(distDir, "main.bundle.js");
const popAudioSrcDir = path.join(rootDir, "assets", "audio", "pop");
const popAudioDistDir = path.join(distDir, "assets", "audio", "pop");
const bgImageSrcDir = path.join(rootDir, "assets", "images", "backgrounds");
const bgImageDistDir = path.join(distDir, "assets", "images", "backgrounds");
const standalonePath = path.join(rootDir, "standalone.html");

await mkdir(distDir, { recursive: true });

await build({
  entryPoints: [path.join(rootDir, "src", "main.js")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["chrome123", "edge123"],
  outfile: bundlePath,
  legalComments: "none",
});

const [css, js] = await Promise.all([
  readFile(path.join(rootDir, "src", "styles.css"), "utf8"),
  readFile(bundlePath, "utf8"),
]);

await cp(popAudioSrcDir, popAudioDistDir, { recursive: true, force: true });
await cp(bgImageSrcDir, bgImageDistDir, { recursive: true, force: true });

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>切泡泡 - standalone WebGPU</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="phone-frame">
      <div id="hud">
        <div id="score">步数: -</div>
      </div>

      <div id="level-test">
        <button id="level-test-toggle" class="tool-btn" type="button">测试关卡</button>
        <div id="level-test-panel" class="hidden">
          <label for="level-test-select">选择关卡</label>
          <select id="level-test-select"></select>
          <button id="level-test-jump" class="tool-btn" type="button">切换到该关</button>
        </div>
      </div>

      <div id="commentary">开始后，先锁定一种颜色再连戳。</div>

      <div id="start-screen" class="layer">
        <h1>切泡泡</h1>
        <p>一刀只能戳同色，碰到异色会断刀。<br />每关有步数限制，尽量用更少步通关。</p>
        <button id="start-btn">开始游戏</button>
      </div>

      <div id="pause-overlay" class="layer hidden">断刀暂停 - 点一下继续</div>

      <div id="game-over" class="layer hidden">
        <h2 id="game-over-title">本局结束</h2>
        <button id="restart-btn">再来一局</button>
      </div>

      <div id="app"></div>
    </div>

    <script>${js}</script>
  </body>
</html>
`;

await writeFile(standalonePath, html, "utf8");
