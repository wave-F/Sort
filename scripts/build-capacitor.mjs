import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "www");
const popAudioSrcDir = path.join(rootDir, "assets", "audio", "pop");
const popAudioWebDir = path.join(webDir, "assets", "audio", "pop");
const bgImageSrcDir = path.join(rootDir, "assets", "images", "backgrounds");
const bgImageWebDir = path.join(webDir, "assets", "images", "backgrounds");

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
await cp(popAudioSrcDir, popAudioWebDir, { recursive: true, force: true });
await cp(bgImageSrcDir, bgImageWebDir, { recursive: true, force: true });

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <link rel="icon" href="data:," />
    <title>切泡泡 - iOS</title>
    <link rel="stylesheet" href="./styles.css" />
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

      <div id="home-screen" class="layer">
        <div id="home-topbar">
          <div class="home-pill">
            <span class="home-pill-icon">❤️</span>
            <span>体力满</span>
          </div>
          <div class="home-pill">
            <span class="home-pill-icon">💰</span>
            <span id="home-coin">5680</span>
          </div>
          <button id="home-settings-btn" class="home-mini-btn" type="button" aria-label="打开设置">⚙️</button>
        </div>

        <div id="home-settings-modal" class="hidden" aria-label="游戏设置">
          <div class="home-settings-card" role="dialog" aria-modal="true" aria-label="游戏设置弹窗">
            <div class="home-settings-header">
              <h3>设置</h3>
              <button id="home-settings-close-btn" class="home-settings-close" type="button" aria-label="关闭设置">✕</button>
            </div>
            <label class="home-settings-row" for="setting-music-toggle">
              <span>音乐</span>
              <input id="setting-music-toggle" type="checkbox" checked />
            </label>
            <label class="home-settings-row" for="setting-sfx-toggle">
              <span>音效</span>
              <input id="setting-sfx-toggle" type="checkbox" checked />
            </label>
            <button id="home-clear-data-btn" class="home-clear-data-btn" type="button">清除游戏数据</button>
          </div>
        </div>

        <div id="home-main">
          <div id="home-level-strip" aria-label="最近关卡">
            <button id="home-level-prev" class="home-level-bubble" type="button"></button>
            <button id="home-level-current" class="home-level-bubble" type="button"></button>
            <button id="home-level-next" class="home-level-bubble" type="button"></button>
          </div>

          <button id="start-btn" class="home-play-btn" type="button">PLAY</button>
        </div>

      </div>

      <div id="pause-overlay" class="layer hidden">断刀暂停 - 点一下继续</div>

      <div id="level-win" class="layer hidden">
        <h2 id="level-win-title">关卡胜利！</h2>
        <p id="level-win-desc">泡泡雨已放送，准备下一关。</p>
        <button id="level-win-next-btn">下一关</button>
      </div>

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
