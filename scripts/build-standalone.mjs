import { build } from "esbuild";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const bundlePath = path.join(distDir, "main.bundle.js");
const assetsDir = path.join(rootDir, "assets");
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

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

async function collectFilesRecursive(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const childFiles = await collectFilesRecursive(fullPath);
      files.push(...childFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function buildAssetDataUrlMap() {
  const files = await collectFilesRecursive(assetsDir);
  const pairs = [];

  for (const filePath of files) {
    const bytes = await readFile(filePath);
    const mimeType = getMimeType(filePath);
    const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
    const relPath = `./${toPosixPath(path.relative(rootDir, filePath))}`;
    pairs.push([relPath, dataUrl]);
  }

  pairs.sort((a, b) => b[0].length - a[0].length);
  return pairs;
}

function inlineAssetPaths(content, replacements) {
  let out = content;
  for (const [assetPath, dataUrl] of replacements) {
    out = out.split(assetPath).join(dataUrl);
  }
  return out;
}

const css = normalizeCssAssetUrls(await bundleCssWithImports(path.join(rootDir, "src", "styles.css")));

const js = await readFile(bundlePath, "utf8");
const assetReplacements = await buildAssetDataUrlMap();

let html = `<!doctype html>
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

      <div id="gameplay-settings" class="hidden" aria-label="In-game settings">
        <button id="gameplay-settings-toggle" class="home-mini-btn gp-settings-btn gp-main-btn" type="button" aria-label="Open in-game settings">⚙️</button>
        <button id="gameplay-settings-music" class="gp-settings-btn gp-settings-item" type="button" aria-label="Music">
          <span class="gp-settings-icon" aria-hidden="true">🎵</span>
        </button>
        <button id="gameplay-settings-sfx" class="gp-settings-btn gp-settings-item" type="button" aria-label="SFX">
          <span class="gp-settings-icon" aria-hidden="true">🔊</span>
        </button>
        <button id="gameplay-settings-exit" class="gp-settings-btn gp-settings-item gp-exit-btn" type="button" aria-label="Exit">
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

      <div id="level-guide" class="hidden" aria-hidden="true">
        <span id="level-guide-tip" class="level-guide-tip">连续划到相同泡泡，一起消除！</span>
        <img id="level-guide-hand" class="level-guide-hand" src="./assets/images/HandPointer.png" alt="" aria-hidden="true" />
      </div>

      <div id="lock-guide" class="hidden" aria-hidden="true">
        <div id="lock-guide-mask"></div>
        <div id="lock-guide-spotlight" aria-hidden="true"></div>
        <div id="lock-guide-tip">锁泡泡需要先消除对应数量泡泡，才会解锁</div>
      </div>

      <div id="double-layer-guide" class="hidden" aria-hidden="true">
        <div id="double-layer-guide-mask"></div>
        <div id="double-layer-guide-spotlight" aria-hidden="true"></div>
        <div id="double-layer-guide-tip">双层泡泡，需要消除2次才能消除掉</div>
      </div>

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

          <button id="home-settings-btn" class="home-mini-btn" type="button" aria-label="Open settings">⚙️</button>
        </div>

        <div id="home-settings-modal" class="hidden" aria-label="Game settings">
          <div class="home-settings-card" role="dialog" aria-modal="true" aria-label="Game settings dialog">
            <button id="home-settings-close-btn" class="home-settings-close" type="button" aria-label="Close settings">✕</button>
            <div class="home-settings-title-pill">Settings</div>
            <div class="home-settings-inner">
              <div class="home-settings-icon" aria-hidden="true">⚙️</div>
              <label class="home-settings-row" for="setting-music-toggle">
                <span>Music</span>
                <input id="setting-music-toggle" type="checkbox" checked />
              </label>
              <label class="home-settings-row" for="setting-sfx-toggle">
                <span>SFX</span>
                <input id="setting-sfx-toggle" type="checkbox" checked />
              </label>
            </div>
            <div class="home-settings-actions">
              <button id="home-fill-stamina-btn" class="home-settings-test-btn" type="button">Test: Fill stamina</button>
              <button id="home-clear-data-btn" class="home-clear-data-btn" type="button">Clear game data</button>
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

      <div id="out-of-moves-continue-mask" class="hidden" aria-hidden="true"></div>
      <div id="out-of-moves-continue-modal" class="hidden" role="dialog" aria-modal="true" aria-label="Continue modal">
        <button id="out-of-moves-continue-close" class="out-of-moves-continue-close" type="button" aria-label="Close">✕</button>
        <div class="out-of-moves-continue-body">
          <div class="out-of-moves-continue-title">Continue?</div>
          <div class="out-of-moves-continue-center">
            <div class="out-of-moves-continue-badge">+<span id="out-of-moves-continue-moves">3</span></div>
            <p class="out-of-moves-continue-desc">Spend coins to add moves and keep playing!</p>
          </div>
          <button id="out-of-moves-continue-buy" class="out-of-moves-continue-buy" type="button">
            <span class="out-of-moves-continue-buy-text">Play On</span>
            <img class="out-of-moves-continue-buy-coin" src="./assets/images/currency128_Coin.png" alt="Coin" />
            <span id="out-of-moves-continue-cost" class="out-of-moves-continue-buy-cost">50</span>
          </button>
        </div>
      </div>

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
      <button id="level-test-add-coins" class="tool-btn" type="button">Test +50 Coins</button>
      <button id="level-test-toggle" class="tool-btn" type="button">Level Test</button>
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

html = inlineAssetPaths(html, assetReplacements);

await writeFile(standalonePath, html, "utf8");
