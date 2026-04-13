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
const bgmAudioSrcDir = path.join(rootDir, "assets", "audio", "bgm_preview");
const bgmAudioDistDir = path.join(distDir, "assets", "audio", "bgm_preview");
const imageSrcDir = path.join(rootDir, "assets", "images");
const imageDistDir = path.join(distDir, "assets", "images");
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

async function bundleCssWithImports(entryPath, seen = new Set()) {
  const key = path.resolve(entryPath);
  if (seen.has(key)) return "";
  seen.add(key);

  const css = await readFile(key, "utf8");
  const importRegex = /^\s*@import\s+"([^"]+)";\s*$/gm;
  let out = "";
  let last = 0;
  let match;

  while ((match = importRegex.exec(css)) !== null) {
    out += css.slice(last, match.index);
    const childPath = path.resolve(path.dirname(key), match[1]);
    out += await bundleCssWithImports(childPath, seen);
    last = importRegex.lastIndex;
  }
  out += css.slice(last);
  return out;
}

function normalizeCssAssetUrls(css) {
  return css.replace(/url\((['"]?)(?:\.\.\/)+assets\//g, "url($1./assets/");
}

const css = normalizeCssAssetUrls(await bundleCssWithImports(path.join(rootDir, "src", "styles.css")));

const js = await readFile(bundlePath, "utf8");

await cp(popAudioSrcDir, popAudioDistDir, { recursive: true, force: true });
await cp(bgmAudioSrcDir, bgmAudioDistDir, { recursive: true, force: true });
await cp(imageSrcDir, imageDistDir, { recursive: true, force: true });

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <link rel="icon" href="data:," />
    <title>切泡泡 - standalone WebGPU</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="phone-frame">
      <div id="gameplay-topbar" class="hidden" aria-hidden="true">
        <div class="gameplay-topbar-spacer" aria-hidden="true"></div>
        <div id="gameplay-coin-status" class="home-status home-status-coin is-hidden-in-gameplay" aria-label="金币数量">
          <img class="home-status-badge coin" src="./assets/images/currency128_Coin.png" alt="金币" />
          <span id="gameplay-coin-text" class="home-status-value">0</span>
        </div>
        <div class="gameplay-topbar-spacer gameplay-topbar-right" aria-hidden="true"></div>
      </div>
      <div id="coin-fly-layer" class="hidden" aria-hidden="true"></div>

      <div id="hud" aria-label="关卡状态">
        <div class="home-status gameplay-hud-item" aria-label="剩余步数">
          <span id="score" class="home-status-value">MOVE:0</span>
        </div>
        <div class="home-status gameplay-hud-item" aria-label="当前关卡">
          <span id="hud-level" class="home-status-value">LV:1</span>
        </div>
      </div>

      <div id="gameplay-settings-mask" class="hidden" aria-hidden="true"></div>

      <div id="gameplay-settings" class="hidden" aria-label="局内设置">
        <button id="gameplay-settings-toggle" class="home-mini-btn gp-settings-btn gp-main-btn" type="button" aria-label="打开局内设置">⚙️</button>
        <button id="gameplay-settings-music" class="gp-settings-btn gp-settings-item" type="button" aria-label="音乐">
          <span class="gp-settings-icon" aria-hidden="true">🎵</span>
        </button>
        <button id="gameplay-settings-sfx" class="gp-settings-btn gp-settings-item" type="button" aria-label="音效">
          <span class="gp-settings-icon" aria-hidden="true">🔊</span>
        </button>
        <button id="gameplay-settings-exit" class="gp-settings-btn gp-settings-item gp-exit-btn" type="button" aria-label="退出">
          <span class="gp-settings-icon" aria-hidden="true">↩</span>
        </button>
      </div>

      <div id="gameplay-exit-mask" class="hidden" aria-hidden="true"></div>
      <div id="gameplay-exit-modal" class="hidden" role="dialog" aria-modal="true" aria-label="Quit confirmation">
        <button id="gameplay-exit-close" class="gameplay-exit-close" type="button" aria-label="Close">✕</button>
        <div class="gameplay-exit-title">Are You Sure?</div>
        <div class="gameplay-exit-inner">
          <div class="gameplay-exit-icon" aria-hidden="true">💔</div>
          <p>Leave this level and return Home?</p>
        </div>
        <div class="gameplay-exit-actions">
          <button id="gameplay-exit-cancel" class="gameplay-exit-cancel" type="button">Cancel</button>
          <button id="gameplay-exit-confirm" class="gameplay-exit-confirm" type="button">Quit</button>
        </div>
      </div>

      <div id="commentary">开始后，先锁定一种颜色再连戳。</div>

      <div id="home-screen" class="layer">
        <div id="home-topbar">
          <div class="home-status home-status-energy" aria-label="体力状态">
            <span class="home-status-badge" aria-hidden="true">❤</span>
            <span id="home-energy-text" class="home-status-value">FULL</span>
          </div>

          <div class="home-status home-status-coin" aria-label="金币数量">
            <img class="home-status-badge coin" src="./assets/images/currency128_Coin.png" alt="金币" />
            <span id="home-coin" class="home-status-value">0</span>
          </div>

          <button id="home-settings-btn" class="home-mini-btn" type="button" aria-label="打开设置">⚙️</button>
        </div>

        <div id="home-settings-modal" class="hidden" aria-label="游戏设置">
          <div class="home-settings-card" role="dialog" aria-modal="true" aria-label="游戏设置弹窗">
            <button id="home-settings-close-btn" class="home-settings-close" type="button" aria-label="关闭设置">✕</button>
            <div class="home-settings-title-pill">设置</div>
            <div class="home-settings-inner">
              <div class="home-settings-icon" aria-hidden="true">⚙️</div>
              <label class="home-settings-row" for="setting-music-toggle">
                <span>音乐</span>
                <input id="setting-music-toggle" type="checkbox" checked />
              </label>
              <label class="home-settings-row" for="setting-sfx-toggle">
                <span>音效</span>
                <input id="setting-sfx-toggle" type="checkbox" checked />
              </label>
            </div>
            <div class="home-settings-actions">
              <button id="home-fill-stamina-btn" class="home-settings-test-btn" type="button">测试：体力回满</button>
              <button id="home-clear-data-btn" class="home-clear-data-btn" type="button">清除游戏数据</button>
            </div>
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
      <div id="out-of-moves-banner" class="hidden" aria-hidden="true">OUT OF MOVES!</div>

      <div id="result-mask" class="hidden" aria-hidden="true"></div>
      <div id="result-page" class="layer hidden">
        <div class="result-card panel-light">
          <button id="result-win-close" class="result-win-close hidden" type="button" aria-label="Close">✕</button>
          <h2 id="result-page-title" class="result-title is-lose"><span id="result-page-title-text">结果页</span></h2>
          <div id="result-win-perfect" class="result-win-perfect hidden">PERFECT!</div>
          <div id="result-reward-label" class="result-reward-label hidden">Rewards:</div>
          <div class="result-reward-stack">
            <img id="result-coin-icon" class="result-coin hidden" src="./assets/images/currency128_Coin.png" alt="金币" />
            <div id="result-coin-gain" class="result-coin-gain hidden">0</div>
          </div>
          <p id="result-page-text">当前暂无统计。</p>
          <div class="result-actions">
            <button id="result-retry-btn" type="button" class="hidden" aria-label="重试"></button>
            <button id="result-exit-btn" type="button" class="hidden" aria-label="返回"></button>
            <button id="result-next-btn" type="button" class="hidden" aria-label="下一关"></button>
          </div>
        </div>
      </div>

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

    <div id="level-test" aria-label="Level test tools">
      <button id="level-test-toggle" class="tool-btn" type="button">测试关卡</button>
      <div id="level-test-panel" class="hidden">
        <label for="level-test-select">选择关卡</label>
        <select id="level-test-select"></select>
        <button id="level-test-jump" class="tool-btn" type="button">切换到该关</button>
      </div>
    </div>


    <script>${js}</script>
  </body>
</html>
`;

await writeFile(standalonePath, html, "utf8");
