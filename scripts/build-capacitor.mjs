import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "www");

await mkdir(webDir, { recursive: true });

await build({
  entryPoints: [path.join(rootDir, "src", "main.js")],
  bundle: true,
  format: "iife",
  minify: true,
  legalComments: "none",
  target: ["safari16", "chrome109"],
  outfile: path.join(webDir, "main.js"),
});

const css = await readFile(path.join(rootDir, "src", "styles.css"), "utf8");
await writeFile(path.join(webDir, "styles.css"), css, "utf8");

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>切泡泡 - iOS</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="phone-frame">
      <div id="hud">
        <div id="score">分数: 0</div>
      </div>

      <div id="commentary">开始后，先锁定一种颜色再连戳。</div>

      <div id="start-screen" class="layer">
        <h1>切泡泡</h1>
        <p>一刀只能戳同色，碰到异色会断刀。<br />不限刀数，尽量拿高分。</p>
        <button id="start-btn">开始游戏</button>
      </div>

      <div id="pause-overlay" class="layer hidden">断刀暂停 - 点一下继续</div>

      <div id="game-over" class="layer hidden">
        <h2 id="game-over-title">本局结束</h2>
        <button id="restart-btn">再来一局</button>
      </div>

      <div id="app"></div>
    </div>

    <script src="./main.js"></script>
  </body>
</html>
`;

await writeFile(path.join(webDir, "index.html"), html, "utf8");
