import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const bundlePath = path.join(distDir, "main.bundle.js");
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

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>刀切水果 - standalone WebGPU</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="phone-frame">
      <div id="hud">
        <div id="score">分数: 0</div>
      </div>

      <div id="commentary">开始后，先锁定一种颜色再连切。</div>

      <div id="start-screen" class="layer">
        <h1>刀切水果</h1>
        <p>一刀只能切同色，碰到异色会断刀。<br />不限刀数，尽量拿高分。</p>
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
