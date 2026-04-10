import * as THREE from "three/webgpu";
import {
  normalLocal,
  normalView,
  positionLocal,
  positionViewDirection,
  time,
  uniform,
  vec3,
} from "three/tsl";
import { LEVELS } from "./levels.js";

const appEl = document.getElementById("app");
const titleEl = document.getElementById("title");
const scoreEl = document.getElementById("score");
const sliceStateEl = document.getElementById("slice-state");
const commentaryEl = document.getElementById("commentary");
const startScreenEl = document.getElementById("start-screen");
const gameOverEl = document.getElementById("game-over");
const gameOverTitleEl = document.getElementById("game-over-title");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

const rules = {
  worldHeight: 10,
  minSliceSegment: 0.02,
};

const scoring = {
  perFruit: 5,
  comboBonusFactor: 2,
};

const slicePopStaggerStep = 0.075;

const bubbleRadiusScale = 3;
const bubbleTuningStorageKey = "bubble_tuning_v1";

const colors = [
  { id: "red", name: "红泡", base: 0xff1f4b },
  { id: "orange", name: "橙泡", base: 0xff9800 },
  { id: "green", name: "绿泡", base: 0x12cf5b },
  { id: "blue", name: "蓝泡", base: 0x1b8fff },
];

const defaultBubbleTuning = {
  transmission: 0.93,
  roughness: 0.1,
  clearcoat: 0.42,
  wobble: 0.022,
  flow: 1.15,
  dye: 1.12,
  edge: 0.3,
  iri: 0.75,
  springTension: 0.12,
  springDamping: 0.84,
  lightKey: 1.25,
  lightAmbient: 0.62,
  toggleDye: true,
  toggleEdge: true,
  toggleIri: true,
};

const loadedBubbleTuning = loadBubbleTuning();
const bubbleTuning = loadedBubbleTuning.value;
const hasBubbleTuningOverride = loadedBubbleTuning.fromStorage;

const state = {
  started: false,
  gameOver: false,
  levelTransitioning: false,
  currentLevelIndex: 0,
  activeLevel: null,
  score: 0,
  pointerDown: false,
  sliceColorId: null,
  sliceBroken: false,
  sliceCommitted: false,
  keepFullTrailDuringDrag: true,
  sliceHitIds: new Set(),
  sliceQueue: [],
  pendingPops: [],
  lastPoint: null,
  nowPoint: null,
  lastMoveAt: 0,
};

const levelEditor = {
  lastSeed: Math.floor(Date.now() % 1000000),
  savedLayouts: [],
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef6ff);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 12.1);
camera.lookAt(0, 0, 0);

let renderer;
let trail;

const bounds = { left: -3, right: 3, top: 5, bottom: -5 };
const fruits = [];

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const workHit = new THREE.Vector3();
const workA = new THREE.Vector3();
const workProject = new THREE.Vector3();

let commentaryTimer = 0;

scene.add(new THREE.AmbientLight(0xffffff, bubbleTuning.lightAmbient));
const key = new THREE.DirectionalLight(0xffffff, bubbleTuning.lightKey);
key.position.set(4, 7, 4);
scene.add(key);

const rim = new THREE.DirectionalLight(0x8ce7ff, 0.82);
rim.position.set(-6, 4, -5);
scene.add(rim);

const fill = new THREE.DirectionalLight(0xff9ec8, 0.44);
fill.position.set(2, -4, 3);
scene.add(fill);

const bubbleBaseRadius = 1.2;
const bubbleGeometry = new THREE.SphereGeometry(bubbleBaseRadius, 120, 120);
const burstBubbleCount = 10;
const burstBubbleGeometry = new THREE.SphereGeometry(1, 22, 22);

const BubbleBurstState = {
  IDLE: "IDLE",
  PRE_BURST: "PRE_BURST",
  BURST: "BURST",
  DISSIPATE: "DISSIPATE",
  RESET: "RESET",
};

init();

function loadBubbleTuning() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { value: { ...defaultBubbleTuning }, fromStorage: false };
  }

  try {
    const raw = window.localStorage.getItem(bubbleTuningStorageKey);
    if (!raw) return { value: { ...defaultBubbleTuning }, fromStorage: false };
    const parsed = JSON.parse(raw);
    const safe = {
      transmission: clampNumber(parsed.transmission, 0.5, 1, defaultBubbleTuning.transmission),
      roughness: clampNumber(parsed.roughness, 0.01, 0.3, defaultBubbleTuning.roughness),
      clearcoat: clampNumber(parsed.clearcoat, 0, 1, defaultBubbleTuning.clearcoat),
      wobble: clampNumber(parsed.wobble, 0, 0.08, defaultBubbleTuning.wobble),
      flow: clampNumber(parsed.flow, 0.2, 2.5, defaultBubbleTuning.flow),
      dye: clampNumber(parsed.dye, 0.6, 2.4, defaultBubbleTuning.dye),
      edge: clampNumber(parsed.edge, 0, 0.8, defaultBubbleTuning.edge),
      iri: clampNumber(parsed.iri, 0, 1, defaultBubbleTuning.iri),
      springTension: clampNumber(parsed.springTension, 0.04, 0.25, defaultBubbleTuning.springTension),
      springDamping: clampNumber(parsed.springDamping, 0.7, 0.98, defaultBubbleTuning.springDamping),
      lightKey: clampNumber(parsed.lightKey, 0.3, 2, defaultBubbleTuning.lightKey),
      lightAmbient: clampNumber(parsed.lightAmbient, 0.1, 1, defaultBubbleTuning.lightAmbient),
      toggleDye: parsed.toggleDye !== false,
      toggleEdge: parsed.toggleEdge !== false,
      toggleIri: parsed.toggleIri !== false,
    };
    return { value: safe, fromStorage: true };
  } catch (_err) {
    return { value: { ...defaultBubbleTuning }, fromStorage: false };
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return THREE.MathUtils.clamp(n, min, max);
}

function init() {
  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onEditorHotkey);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  setupRenderer();
}

async function setupRenderer() {
  renderer = await createRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  appEl.appendChild(renderer.domElement);
  resize();

  trail = new SliceTrail(64);
  trail.setKeepFullMode(state.keepFullTrailDuringDrag);
  scene.add(trail.mesh);

  renderer.setAnimationLoop(tick);
}

async function createRenderer() {
  if (!navigator.gpu) {
    showWebGpuUnsupported();
    throw new Error("WebGPU is not supported in this browser.");
  }

  const webgpu = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
  await webgpu.init();
  if (titleEl) titleEl.textContent = "切泡泡 (WebGPU)";
  return webgpu;
}

function showWebGpuUnsupported() {
  const layer = document.createElement("div");
  layer.className = "layer";
  layer.style.zIndex = "20";
  layer.style.background = "rgba(15, 25, 38, 0.9)";
  layer.style.color = "#ffffff";
  layer.style.fontWeight = "800";
  layer.style.lineHeight = "1.7";
  layer.innerHTML = "<div style=\"font-size:28px;\">无法启动</div><div style=\"margin-top:10px;font-size:15px;opacity:0.92;\">当前浏览器/设备不支持 WebGPU。<br/>请使用支持 WebGPU 的新版 Chrome 或 Edge。</div>";
  appEl.appendChild(layer);
}

function startGame() {
  state.started = true;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.currentLevelIndex = 0;
  state.activeLevel = null;
  state.score = 0;
  state.pointerDown = false;
  state.sliceColorId = null;
  state.sliceBroken = false;
  state.sliceCommitted = false;
  clearQueuedSelections();
  state.sliceHitIds.clear();
  state.sliceQueue.length = 0;
  state.pendingPops.length = 0;
  state.lastPoint = null;
  state.nowPoint = null;

  trail.reset();

  startScreenEl.classList.add("hidden");
  gameOverEl.classList.add("hidden");

  if (hasBubbleTuningOverride) {
    showCommentary("已应用调试页同步参数。", 1300);
  }

  updateHud();
  loadLevel(0);
}

function loadLevel(index) {
  const baseLevel = LEVELS[index];
  if (!baseLevel) return;
  const level = normalizeLevelDefinition(baseLevel, index);

  state.currentLevelIndex = index;
  state.activeLevel = level;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.sliceColorId = null;
  state.sliceBroken = false;
  state.sliceCommitted = false;
  clearQueuedSelections();
  state.pendingPops.length = 0;
  state.lastPoint = null;
  state.nowPoint = null;

  trail.reset();

  setSliceStatus(`状态: 第${index + 1}关`);
  showCommentary(
    `第${index + 1}/${LEVELS.length}关 · ${level.name} · 颜色${level.colorIds.length}种 数量${level.fruitCount}（R随机/S保存/E导出）`,
    2400
  );

  resetFruits(level);
}

function resetFruits(level) {
  state.pendingPops.length = 0;
  for (const fruit of fruits) scene.remove(fruit.group);
  fruits.length = 0;

  const defs = level?.fruits ?? [];
  for (let i = 0; i < defs.length; i += 1) {
    const def = defs[i];
    const colorIndex = THREE.MathUtils.clamp(def.colorId, 0, colors.length - 1);
    const fruit = new BubbleEntity({
      id: i,
      colorId: colorIndex,
      radius: THREE.MathUtils.clamp(def.radius ?? 0.42, 0.84, 1.86),
      vx: def.vx ?? 0,
      vy: def.vy ?? 0,
      baseColor: new THREE.Color(colors[colorIndex].base),
    });
    const spawnMargin = fruit.radius + 0.06;
    fruit.setPosition(
      THREE.MathUtils.clamp(def.x, bounds.left + spawnMargin, bounds.right - spawnMargin),
      THREE.MathUtils.clamp(def.y, bounds.bottom + spawnMargin, bounds.top - spawnMargin),
      0
    );
    fruits.push(fruit);
    scene.add(fruit.group);
  }
}

function onEditorHotkey(ev) {
  if (!state.started || state.gameOver || state.levelTransitioning) return;
  if (ev.repeat) return;

  const key = ev.key.toLowerCase();
  if (key === "r") {
    ev.preventDefault();
    randomizeCurrentLevelLayout();
  } else if (key === "s") {
    ev.preventDefault();
    saveCurrentLevelLayout();
  } else if (key === "e") {
    ev.preventDefault();
    void exportSavedLayouts();
  }
}

function randomizeCurrentLevelLayout() {
  if (!state.activeLevel) return;

  const seed = nextEditorSeed();
  const template = state.activeLevel;

  const randomized = generateRandomFruits({
    seed,
    fruitCount: template.fruitCount,
    colorCounts: template.colorCounts,
    radiusMin: template.radiusRange.min,
    radiusMax: template.radiusRange.max,
    speedMin: template.speedRange.min,
    speedMax: template.speedRange.max,
  });

  state.activeLevel = {
    ...template,
    seed,
    name: `${template.name}·随机`,
    fruits: randomized,
  };

  clearQueuedSelections();
  trail.reset();
  state.pointerDown = false;
  state.lastPoint = null;
  state.nowPoint = null;

  resetFruits(state.activeLevel);
  showCommentary(`已生成随机布局 seed=${seed}（颜色${template.colorIds.length}种/数量${template.fruitCount}）按 S 保存`, 1900);
}

function saveCurrentLevelLayout() {
  if (!state.activeLevel) return;

  const candidateIndex = levelEditor.savedLayouts.length + 1;
  const candidate = {
    id: candidateIndex,
    name: `L${state.currentLevelIndex + 1}-候选${candidateIndex}`,
    targetScore: state.activeLevel.targetScore,
    seed: state.activeLevel.seed,
    fruitCount: state.activeLevel.fruitCount,
    colorIds: [...state.activeLevel.colorIds],
    colorCounts: state.activeLevel.colorCounts.map((item) => ({ colorId: item.colorId, count: item.count })),
    radiusRange: [round3(state.activeLevel.radiusRange.min), round3(state.activeLevel.radiusRange.max)],
    speedRange: [round3(state.activeLevel.speedRange.min), round3(state.activeLevel.speedRange.max)],
    fruits: state.activeLevel.fruits.map(roundFruitDef),
  };

  levelEditor.savedLayouts.push(candidate);
  window.__FRUIT_LEVEL_CANDIDATES__ = levelEditor.savedLayouts;
  showCommentary(`已保存候选 ${candidateIndex}，按 E 导出数据`, 1600);
}

async function exportSavedLayouts() {
  if (!levelEditor.savedLayouts.length) {
    showCommentary("还没有已保存候选，先按 S 保存一个。", 1400);
    return;
  }

  const payload = JSON.stringify(levelEditor.savedLayouts, null, 2);
  const filename = `level-candidates-${Date.now()}.json`;
  let copied = false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(payload);
      copied = true;
    }
  } catch (_err) {
    // ignore clipboard failure; file download still works
  }

  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  const copyTip = copied ? "并复制到剪贴板" : "请在下载文件中查看";
  showCommentary(`已导出 ${levelEditor.savedLayouts.length} 份候选（${copyTip}）`, 1800);
}

function normalizeLevelDefinition(level, index) {
  const fruitsDef = Array.isArray(level.fruits) ? level.fruits : [];
  const parsedColorCounts = normalizeColorCounts(level.colorCounts);
  const hasColorCounts = parsedColorCounts.length > 0;
  const fruitCountFromCounts = hasColorCounts ? sumColorCounts(parsedColorCounts) : 0;
  const fallbackFruitCount = fruitsDef.length > 0 ? fruitsDef.length : 20;
  const fruitCount = hasColorCounts ? fruitCountFromCounts : Math.max(4, Math.floor(level.fruitCount ?? fallbackFruitCount));
  const colorIds = hasColorCounts ? parsedColorCounts.map((item) => item.colorId) : normalizeColorIds(level.colorIds, fruitsDef);
  const colorCounts = hasColorCounts ? parsedColorCounts : buildEvenColorCounts(colorIds, fruitCount);
  const baseRadiusRange = normalizeRange(level.radiusRange, inferRadiusRangeFromFruits(fruitsDef), 0.28, 0.62);
  const radiusRange = {
    min: baseRadiusRange.min * bubbleRadiusScale,
    max: baseRadiusRange.max * bubbleRadiusScale,
  };
  const speedRange = normalizeRange(level.speedRange, inferSpeedRangeFromFruits(fruitsDef, index), 0, 0.9);
  const seed = Math.floor(level.seed ?? 1000 + (level.id ?? index + 1) * 137);

  const fruits = fruitsDef.length
    ? fruitsDef.map((f) => ({
        x: f.x,
        y: f.y,
        colorId: f.colorId,
        radius: (f.radius ?? 0.42) * bubbleRadiusScale,
        vx: f.vx ?? 0,
        vy: f.vy ?? 0,
      }))
    : generateRandomFruits({
        seed,
        fruitCount,
        colorCounts,
        radiusMin: radiusRange.min,
        radiusMax: radiusRange.max,
        speedMin: speedRange.min,
        speedMax: speedRange.max,
      });

  return {
    id: level.id,
    name: level.name,
    targetScore: level.targetScore,
    seed,
    fruitCount,
    colorIds,
    colorCounts,
    radiusRange,
    speedRange,
    fruits,
  };
}

function nextEditorSeed() {
  levelEditor.lastSeed += 1;
  return levelEditor.lastSeed;
}

function normalizeColorIds(colorIds, fruitsDef) {
  if (Array.isArray(colorIds) && colorIds.length) {
    const valid = [];
    for (const id of colorIds) {
      const v = Math.floor(id);
      if (v >= 0 && v < colors.length && !valid.includes(v)) valid.push(v);
    }
    if (valid.length) return valid;
  }

  const set = new Set();
  for (const def of fruitsDef) set.add(Math.floor(def.colorId));
  const inferred = [];
  for (const id of set) {
    if (id >= 0 && id < colors.length) inferred.push(id);
  }
  if (inferred.length) return inferred;
  return colors.map((_c, idx) => idx);
}

function normalizeColorCounts(colorCounts) {
  if (!Array.isArray(colorCounts) || colorCounts.length === 0) return [];

  const merged = new Map();
  for (const item of colorCounts) {
    if (!item) continue;
    const colorId = Math.floor(item.colorId);
    const count = Math.floor(item.count);
    if (colorId < 0 || colorId >= colors.length || count <= 0) continue;
    merged.set(colorId, (merged.get(colorId) ?? 0) + count);
  }

  const result = [];
  for (const [colorId, count] of merged.entries()) {
    result.push({ colorId, count });
  }
  result.sort((a, b) => a.colorId - b.colorId);
  return result;
}

function sumColorCounts(colorCounts) {
  let total = 0;
  for (const item of colorCounts) total += item.count;
  return total;
}

function buildEvenColorCounts(colorIds, fruitCount) {
  const ids = Array.isArray(colorIds) && colorIds.length ? colorIds : colors.map((_c, idx) => idx);
  const counts = ids.map((colorId) => ({ colorId, count: 0 }));
  for (let i = 0; i < fruitCount; i += 1) {
    const idx = i % counts.length;
    counts[idx].count += 1;
  }
  return counts;
}

function inferRadiusRangeFromFruits(fruitsDef) {
  let min = Infinity;
  let max = -Infinity;
  for (const def of fruitsDef) {
    min = Math.min(min, def.radius ?? 0.4);
    max = Math.max(max, def.radius ?? 0.4);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0.34, max: 0.44 };
  }
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return {
    min: THREE.MathUtils.clamp(lo, 0.28, 0.58),
    max: THREE.MathUtils.clamp(hi, 0.3, 0.62),
  };
}

function inferSpeedRangeFromFruits(fruitsDef, levelIndex) {
  let sum = 0;
  let count = 0;
  for (const def of fruitsDef) {
    const vx = def.vx ?? 0;
    const vy = def.vy ?? 0;
    sum += Math.hypot(vx, vy);
    count += 1;
  }
  const avg = count > 0 ? sum / count : 0;
  const base = Math.max(avg + 0.08, 0.14 + levelIndex * 0.04);
  return {
    min: 0,
    max: THREE.MathUtils.clamp(base, 0.12, 0.58),
  };
}

function normalizeRange(inputRange, fallbackRange, clampMin, clampMax) {
  const src = Array.isArray(inputRange) && inputRange.length >= 2 ? { min: inputRange[0], max: inputRange[1] } : fallbackRange;
  const lo = THREE.MathUtils.clamp(Math.min(src.min, src.max), clampMin, clampMax);
  const hi = THREE.MathUtils.clamp(Math.max(src.min, src.max), clampMin, clampMax);
  return { min: lo, max: hi };
}

function generateRandomFruits({ seed, fruitCount, colorCounts, radiusMin, radiusMax, speedMin, speedMax }) {
  const rng = createSeededRandom(seed);
  const fruitsDef = [];
  const colorBag = buildColorBag(colorCounts, fruitCount);
  shuffleInPlace(colorBag, rng);

  const clusterCount = THREE.MathUtils.clamp(Math.round(fruitCount / 6), 3, 7);
  const clusterMargin = 1.0;
  const clusters = [];
  for (let i = 0; i < clusterCount; i += 1) {
    clusters.push({
      x: lerp(bounds.left + clusterMargin, bounds.right - clusterMargin, rng()),
      y: lerp(bounds.bottom + clusterMargin, bounds.top - clusterMargin, rng()),
      spread: lerp(0.85, 1.55, rng()),
      weight: lerp(0.7, 1.4, rng()),
    });
  }

  let weightTotal = 0;
  for (const c of clusters) weightTotal += c.weight;

  for (let i = 0; i < fruitCount; i += 1) {
    const radius = lerp(radiusMin, radiusMax, rng());
    const margin = radius + 0.06;

    let x = 0;
    let y = 0;
    let placed = false;
    const useCluster = rng() < 0.84;

    for (let k = 0; k < 180; k += 1) {
      if (useCluster) {
        let pick = rng() * weightTotal;
        let cluster = clusters[0];
        for (let c = 0; c < clusters.length; c += 1) {
          pick -= clusters[c].weight;
          if (pick <= 0) {
            cluster = clusters[c];
            break;
          }
        }

        const angle = rng() * Math.PI * 2;
        const radial = Math.sqrt(rng()) * cluster.spread;
        x = cluster.x + Math.cos(angle) * radial;
        y = cluster.y + Math.sin(angle) * radial;
      } else {
        x = lerp(bounds.left + margin, bounds.right - margin, rng());
        y = lerp(bounds.bottom + margin, bounds.top - margin, rng());
      }

      x = THREE.MathUtils.clamp(x, bounds.left + margin, bounds.right - margin);
      y = THREE.MathUtils.clamp(y, bounds.bottom + margin, bounds.top - margin);

      let overlap = false;
      for (const p of fruitsDef) {
        const minDist = Math.max(0.42, (radius + p.radius) * 0.55);
        if (Math.hypot(x - p.x, y - p.y) < minDist) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      x = lerp(bounds.left + margin, bounds.right - margin, rng());
      y = lerp(bounds.bottom + margin, bounds.top - margin, rng());
    }

    const angle = rng() * Math.PI * 2;
    const speed = lerp(speedMin, speedMax, rng());

    fruitsDef.push({
      x,
      y,
      colorId: colorBag[i],
      radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  return fruitsDef;
}

function buildColorBag(colorCounts, fruitCount) {
  const normalized = normalizeColorCounts(colorCounts);
  const bag = [];

  for (const item of normalized) {
    for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
  }

  if (bag.length === 0) {
    for (let i = 0; i < fruitCount; i += 1) bag.push(i % colors.length);
    return bag;
  }

  if (bag.length > fruitCount) return bag.slice(0, fruitCount);
  if (bag.length < fruitCount) {
    const fallbackColor = bag[bag.length - 1] ?? 0;
    while (bag.length < fruitCount) bag.push(fallbackColor);
  }
  return bag;
}

function roundFruitDef(def) {
  return {
    x: round3(def.x),
    y: round3(def.y),
    colorId: def.colorId,
    radius: round3(def.radius),
    vx: round3(def.vx ?? 0),
    vy: round3(def.vy ?? 0),
  };
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function createSeededRandom(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function onPointerDown(ev) {
  if (!state.started || state.gameOver || state.levelTransitioning || !renderer) return;

  const rect = renderer.domElement.getBoundingClientRect();
  if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) return;

  state.pointerDown = true;
  state.sliceColorId = null;
  state.sliceBroken = false;
  state.sliceCommitted = false;
  clearQueuedSelections();
  state.sliceHitIds.clear();
  state.sliceQueue.length = 0;

  const world = screenToWorld(ev.clientX, ev.clientY);
  state.lastPoint = world.clone();
  state.nowPoint = world.clone();
  state.lastMoveAt = performance.now();

  trail.reset();
  trail.push(world, state.lastMoveAt);
  setSliceStatus("状态: 划线中");
}

function onPointerMove(ev) {
  if (!state.pointerDown || !renderer) return;
  state.lastPoint.copy(state.nowPoint);
  state.nowPoint.copy(screenToWorld(ev.clientX, ev.clientY));
  const now = performance.now();
  const dt = Math.min(Math.max((now - state.lastMoveAt) / 1000, 1 / 240), 1 / 20);
  state.lastMoveAt = now;

  trail.push(state.nowPoint, now);
  processSliceSegment(dt);
}

function onPointerUp() {
  if (!state.pointerDown) return;
  state.pointerDown = false;
  state.lastPoint = null;
  state.nowPoint = null;

  settleQueuedSlices();
  if (state.keepFullTrailDuringDrag) trail.reset();

  if (state.gameOver) return;
  if (state.sliceBroken) setSliceStatus("状态: 断刀");
  else if (state.sliceColorId !== null) setSliceStatus(`状态: 本刀锁定${colors[state.sliceColorId].name}`);
  else setSliceStatus("状态: 空挥");

}

function tick() {
  if (!renderer) return;
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now();

  updateTrail(now);
  processPendingPops(dt);

  resolveFruitCollisions();

  let alive = 0;
  for (const fruit of fruits) {
    fruit.update(dt, bounds);
    if (fruit.active) alive += 1;
  }

  renderer.render(scene, camera);

  if (state.started && !state.gameOver && alive === 0) {
    handleLevelCleared();
  }
}

function handleLevelCleared() {
  if (state.gameOver || state.levelTransitioning) return;

  const justCleared = state.currentLevelIndex;
  const next = justCleared + 1;
  const lastLevel = next >= LEVELS.length;

  if (lastLevel) {
    endGame(`全部${LEVELS.length}关通关`);
    return;
  }

  state.levelTransitioning = true;
  state.pointerDown = false;
  clearQueuedSelections();
  trail.reset();

  showCommentary(`第${justCleared + 1}关完成，准备进入第${next + 1}关`, 1200);
  window.setTimeout(() => {
    if (!state.started || state.gameOver) return;
    loadLevel(next);
  }, 860);
}

function updateTrail(now) {
  if (state.keepFullTrailDuringDrag) {
    if (!state.pointerDown) return;
    trail.rebuild(state.sliceBroken);
    return;
  }

  trail.prune(now, 260);
  trail.rebuild(state.sliceBroken);
  if (!state.pointerDown && now - state.lastMoveAt > 320) trail.reset();
}

function processSliceSegment(dt) {
  if (!state.pointerDown || state.gameOver || state.sliceBroken || !state.lastPoint || !state.nowPoint) return;

  workA.copy(state.nowPoint).sub(state.lastPoint);
  const len = workA.length();
  if (len < rules.minSliceSegment) return;

  const sliceDir = workA.multiplyScalar(1 / len);
  const speed = Math.min(len / Math.max(dt, 0.001), 14);

  // Use raycast top-hit sampling so selection follows visible overlap.
  const ax = state.lastPoint.x;
  const ay = state.lastPoint.y;
  const bx = state.nowPoint.x;
  const by = state.nowPoint.y;
  const hits = collectSliceHitsSorted(ax, ay, bx, by);
  for (let i = 0; i < hits.length; i += 1) {
    const { fruit, hitRadius } = hits[i];

    if (state.sliceHitIds.has(fruit.id)) {
      const dx = bx - fruit.group.position.x;
      const dy = by - fruit.group.position.y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return;
      }
      continue;
    }

    if (state.sliceColorId === null) {
      if (!state.sliceCommitted) {
        state.sliceCommitted = true;
      }
      state.sliceColorId = fruit.colorId;
      setSliceStatus(`状态: 锁定${colors[fruit.colorId].name}`);
      showCommentary(`这刀只戳${colors[fruit.colorId].name}。`, 1200);
    }

    if (fruit.colorId !== state.sliceColorId) {
      fruit.flashWrongHit();
      settleQueuedSlices();
      if (state.keepFullTrailDuringDrag) trail.reset();
      state.sliceBroken = true;
      state.pointerDown = false;
      state.lastPoint = null;
      state.nowPoint = null;
      setSliceStatus(`状态: 断刀（碰到${colors[fruit.colorId].name}，已结算）`);
      showCommentary(`碰到${colors[fruit.colorId].name}，已结算已选泡泡。`, 1500);
      return;
    }

    state.sliceHitIds.add(fruit.id);
    state.sliceQueue.push({
      fruit,
      sliceDir: sliceDir.clone(),
      speed,
    });
    fruit.setSelected(true);
    setSliceStatus(`状态: 已选${state.sliceHitIds.size}个${colors[state.sliceColorId].name}`);
    return;
  }
}

function collectSliceHitsSorted(ax, ay, bx, by) {
  const result = [];
  const seen = new Set();
  const len = Math.hypot(bx - ax, by - ay);
  const sampleCount = Math.max(1, Math.ceil(len / 0.08));
  const bubbleMeshes = collectPickableBubbleMeshes();
  if (!bubbleMeshes.length) return result;

  for (let i = 1; i <= sampleCount; i += 1) {
    const t = i / sampleCount;
    const x = lerp(ax, bx, t);
    const y = lerp(ay, by, t);
    const fruit = pickTopFruitAtWorldPoint(x, y, bubbleMeshes);
    if (!fruit || seen.has(fruit.id)) continue;

    seen.add(fruit.id);
    const hitRadius = fruit.radius * Math.max(1, fruit.selectionScale ?? 1);
    result.push({ fruit, hitRadius });
  }

  return result;
}

function collectPickableBubbleMeshes() {
  const bubbleMeshes = [];
  for (let i = 0; i < fruits.length; i += 1) {
    const fruit = fruits[i];
    if (!fruit.active || fruit.sliced || !fruit.bubble.visible) continue;
    bubbleMeshes.push(fruit.bubble);
  }
  return bubbleMeshes;
}

function pickTopFruitAtWorldPoint(worldX, worldY, bubbleMeshes) {
  workProject.set(worldX, worldY, 0).project(camera);
  raycaster.setFromCamera({ x: workProject.x, y: workProject.y }, camera);

  const intersections = raycaster.intersectObjects(bubbleMeshes, false);
  if (!intersections.length) return null;

  return intersections[0].object.userData.fruit ?? null;
}

function settleQueuedSlices() {
  if (!state.sliceQueue.length) return;

  let gain = 0;
  for (let i = 0; i < state.sliceQueue.length; i += 1) {
    const entry = state.sliceQueue[i];
    const fruit = entry.fruit;
    if (!fruit || !fruit.active || fruit.sliced) continue;

    fruit.setSelected(false);
    state.pendingPops.push({
      fruit,
      sliceDir: entry.sliceDir,
      speed: entry.speed,
      delay: gain * slicePopStaggerStep,
    });
    gain += 1;
  }

  clearQueuedSelections();

  if (gain > 0) {
    const sliceScore = scoring.perFruit * gain + scoring.comboBonusFactor * gain * (gain - 1);
    state.score += sliceScore;
    updateHud();
  }
}

function processPendingPops(dt) {
  if (!state.pendingPops.length) return;
  for (let i = 0; i < state.pendingPops.length; ) {
    const item = state.pendingPops[i];
    item.delay -= dt;
    if (item.delay > 0) {
      i += 1;
      continue;
    }

    const fruit = item.fruit;
    if (fruit && fruit.active && !fruit.sliced) {
      fruit.pop(item.sliceDir, item.speed);
    }
    state.pendingPops.splice(i, 1);
  }
}

function clearQueuedSelections() {
  for (let i = 0; i < state.sliceQueue.length; i += 1) {
    const fruit = state.sliceQueue[i].fruit;
    if (fruit) fruit.setSelected(false);
  }
  state.sliceQueue.length = 0;
  state.sliceHitIds.clear();
}

function resolveFruitCollisions() {
  for (let i = 0; i < fruits.length; i += 1) {
    const d1 = fruits[i];
    if (!d1.active || d1.sliced) continue;
    for (let j = i + 1; j < fruits.length; j += 1) {
      const d2 = fruits[j];
      if (!d2.active || d2.sliced) continue;

      const dx = d2.group.position.x - d1.group.position.x;
      const dy = d2.group.position.y - d1.group.position.y;
      let dist = Math.hypot(dx, dy);
      const hardDist = d1.radius + d2.radius;
      const softContactDist = hardDist * 0.42;
      if (dist >= softContactDist) continue;

      let nx = dx;
      let ny = dy;
      if (dist === 0) {
        nx = 1;
        ny = 0;
        dist = 1;
      }

      nx /= dist;
      ny /= dist;
      const overlap = softContactDist - dist;

      const m1 = d1.radius * d1.radius;
      const m2 = d2.radius * d2.radius;
      const totalM = m1 + m2;
      const r1 = m2 / totalM;
      const r2 = m1 / totalM;

      const separation = overlap * 0.12;
      d1.group.position.x -= nx * separation * r1;
      d1.group.position.y -= ny * separation * r1;
      d2.group.position.x += nx * separation * r2;
      d2.group.position.y += ny * separation * r2;

      d1.applyContact(-nx, -ny, overlap);
      d2.applyContact(nx, ny, overlap);

      const kx = d1.vel.x - d2.vel.x;
      const ky = d1.vel.y - d2.vel.y;
      const p = (2.0 * (nx * kx + ny * ky)) / (m1 + m2);
      const restitution = 0.12;
      d1.vel.x -= p * m2 * nx * restitution;
      d1.vel.y -= p * m2 * ny * restitution;
      d2.vel.x += p * m1 * nx * restitution;
      d2.vel.y += p * m1 * ny * restitution;

      const stickiness = 0.22;
      const avgVX = (d1.vel.x + d2.vel.x) * 0.5;
      const avgVY = (d1.vel.y + d2.vel.y) * 0.5;
      d1.vel.x = lerp(d1.vel.x, avgVX, stickiness);
      d1.vel.y = lerp(d1.vel.y, avgVY, stickiness);
      d2.vel.x = lerp(d2.vel.x, avgVX, stickiness);
      d2.vel.y = lerp(d2.vel.y, avgVY, stickiness);
    }
  }
}

function screenToWorld(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = THREE.MathUtils.clamp(clientX, rect.left, rect.right);
  const y = THREE.MathUtils.clamp(clientY, rect.top, rect.bottom);
  const ndcX = ((x - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((y - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
  raycaster.ray.intersectPlane(playPlane, workHit);
  return workHit.clone();
}

function distSegmentToPointNumeric(ax, ay, bx, by, px, py) {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-6) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function resize() {
  if (!renderer) return;
  const rect = appEl.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);

  const aspect = rect.width / rect.height;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  const worldHalfH = rules.worldHeight / 2;
  const worldHalfW = worldHalfH * aspect;
  bounds.left = -worldHalfW + 0.5;
  bounds.right = worldHalfW - 0.5;
  bounds.top = worldHalfH - 0.5;
  bounds.bottom = -worldHalfH + 0.5;
}

function updateHud() {
  scoreEl.textContent = `分数: ${state.score}`;
}

function setSliceStatus(text) {
  if (!sliceStateEl) return;
  sliceStateEl.textContent = text;
}

function showCommentary(text, durationMs) {
  commentaryEl.textContent = text;
  commentaryEl.classList.add("show");
  if (commentaryTimer) clearTimeout(commentaryTimer);
  commentaryTimer = window.setTimeout(() => commentaryEl.classList.remove("show"), durationMs);
}

function endGame(reason) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.levelTransitioning = false;
  state.pointerDown = false;
  clearQueuedSelections();
  state.pendingPops.length = 0;
  trail.reset();

  if (reason.startsWith("全部")) {
    gameOverTitleEl.textContent = `恭喜通关！总分 ${state.score}`;
  } else {
    gameOverTitleEl.textContent = `本局结束！本局分数 ${state.score}`;
  }
  gameOverEl.classList.remove("hidden");
  setSliceStatus(`状态: ${reason}`);
}

function createBubbleMaterial(baseColor) {
  const accentColor = baseColor.clone().offsetHSL(0, -0.12, 0.26);
  const springUniform = uniform(0);
  const crackGlowUniform = uniform(0);
  const contactDirUniform = uniform(new THREE.Vector3(1, 0, 0));
  const contactStrengthUniform = uniform(0);
  const tintUniform = uniform(baseColor.clone());
  const accentUniform = uniform(accentColor.clone());

  const flowSpeedUniform = uniform(bubbleTuning.flow);
  const wobbleAmplitudeUniform = uniform(bubbleTuning.wobble);
  const dyeContrastUniform = uniform(bubbleTuning.dye);
  const edgeGlowUniform = uniform(bubbleTuning.edge);
  const iridescenceUniform = uniform(bubbleTuning.iri);
  const dyeEnabledUniform = uniform(bubbleTuning.toggleDye ? 1.0 : 0.0);
  const edgeEnabledUniform = uniform(bubbleTuning.toggleEdge ? 1.0 : 0.0);
  const iridescenceEnabledUniform = uniform(bubbleTuning.toggleIri ? 1.0 : 0.0);
  const iridescenceBaseUniform = uniform(90.0);
  const iridescenceSpanUniform = uniform(520.0);

  const material = new THREE.MeshPhysicalNodeMaterial({
    transmission: bubbleTuning.transmission,
    thickness: 1.35,
    roughness: bubbleTuning.roughness,
    metalness: 0.0,
    clearcoat: bubbleTuning.clearcoat,
    clearcoatRoughness: 0.16,
    ior: 1.2,
    envMapIntensity: 0.72,
    transparent: true,
    opacity: 0.9,
  });

  const flow = time.mul(flowSpeedUniform);
  const rippleA = positionLocal.x.mul(2.9).add(flow).sin();
  const rippleB = positionLocal.y.mul(3.2).add(flow.mul(1.18)).cos();
  const rippleC = positionLocal.z.mul(2.5).add(flow.mul(0.86)).sin();
  const wobble = rippleA.add(rippleB).add(rippleC).mul(wobbleAmplitudeUniform);

  const dyeA = positionLocal.x.mul(3.6).add(flow.mul(0.66)).sin();
  const dyeB = positionLocal.y.mul(4.1).add(flow.mul(0.93)).cos();
  const dyeC = positionLocal.z.mul(3.1).add(flow.mul(0.53)).sin();
  const dyeMix = dyeA.add(dyeB).add(dyeC).mul(0.34).add(0.5).clamp(0.0, 1.0);

  const squishX = springUniform.mul(0.52).add(1.0);
  const squishY = springUniform.mul(-1.02).add(1.0);
  const squishZ = springUniform.mul(0.52).add(1.0);

  const contactMask = normalLocal.dot(contactDirUniform).max(0.0);
  const contactDent = contactDirUniform.mul(contactMask.mul(contactStrengthUniform).mul(-0.32));

  material.positionNode = positionLocal
    .add(normalLocal.mul(wobble))
    .add(contactDent)
    .mul(vec3(squishX, squishY, squishZ));

  const dyeBlend = dyeMix.pow(dyeContrastUniform);
  const dyeColor = tintUniform.mix(accentUniform, dyeBlend);
  material.colorNode = tintUniform.mix(dyeColor, dyeEnabledUniform);

  const viewDot = normalView.dot(positionViewDirection.negate()).abs().clamp(0.0, 1.0);
  const edgeGlow = viewDot.mul(-1.0).add(1.0).pow(2.8);
  material.emissiveNode = tintUniform.mul(edgeGlow.mul(edgeGlowUniform.add(crackGlowUniform)).mul(edgeEnabledUniform));

  material.iridescenceNode = iridescenceUniform.mul(iridescenceEnabledUniform);
  material.iridescenceIORNode = uniform(1.3);
  material.iridescenceThicknessNode = dyeMix.mul(iridescenceSpanUniform).add(iridescenceBaseUniform);

  return { material, springUniform, crackGlowUniform, contactDirUniform, contactStrengthUniform };
}

class BubbleEntity {
  constructor({ id, colorId, radius, vx = 0, vy = 0, baseColor }) {
    this.id = id;
    this.colorId = colorId;
    this.radius = radius;
    this.baseColor = baseColor;
    this.active = true;
    this.sliced = false;
    this.life = 0;
    this.selected = false;
    this.wrongFlash = 0;
    this.wrongShake = 0;
    this.selectionScale = 1;
    this.selectionTarget = 1;
    this.selectionVel = 0;

    this.vel = new THREE.Vector3(vx, vy, 0);
    this.springVal = 0;
    this.springVel = 0;
    this.springTension = bubbleTuning.springTension;
    this.springDamping = bubbleTuning.springDamping;
    this.contactStrength = 0;
    this.contactDir = new THREE.Vector3(1, 0, 0);

    this.group = new THREE.Group();

    const nodeMaterialData = createBubbleMaterial(baseColor);
    this.bubbleMaterial = nodeMaterialData.material;
    this.springUniform = nodeMaterialData.springUniform;
    this.crackGlowUniform = nodeMaterialData.crackGlowUniform;
    this.contactDirUniform = nodeMaterialData.contactDirUniform;
    this.contactStrengthUniform = nodeMaterialData.contactStrengthUniform;
    this.baseScale = this.radius / bubbleBaseRadius;
    this.baseOpacity = 0.9;

    this.bubble = new THREE.Mesh(bubbleGeometry, this.bubbleMaterial);
    this.bubble.scale.setScalar(this.baseScale);
    this.bubble.userData.fruit = this;
    this.selectRing = this.createSelectRing();

    this.burstState = BubbleBurstState.IDLE;
    this.stateElapsed = 0;
    this.preBurstDuration = 0.09;
    this.burstDuration = 0.18;
    this.dissipateDuration = 1.6;
    this.resetDelay = 0.2;
    this.preBurstScaleMax = 1.08;
    this.burstBubbleFadeInDuration = 0.16;
    this.burstPointsVisible = false;

    this.minBurstBubbleCount = 7;
    this.maxBurstBubbleCount = 10;
    this.activeBurstBubbleCount = 8;
    this.burstBubbleVelocities = [];
    this.burstBubbleLife = new Array(burstBubbleCount).fill(0);
    this.burstBubbleLifeMax = new Array(burstBubbleCount).fill(1);
    this.burstBubbleBaseScale = new Array(burstBubbleCount).fill(0.08);
    this.burstBubbleMeshes = [];

    for (let i = 0; i < burstBubbleCount; i += 1) {
      const burstBubbleMaterial = this.bubbleMaterial.clone();
      burstBubbleMaterial.transparent = true;
      burstBubbleMaterial.opacity = 0;
      burstBubbleMaterial.depthWrite = false;
      burstBubbleMaterial.side = THREE.DoubleSide;

      const burstBubbleMesh = new THREE.Mesh(burstBubbleGeometry, burstBubbleMaterial);
      burstBubbleMesh.visible = false;
      this.burstBubbleMeshes.push(burstBubbleMesh);
      this.burstBubbleVelocities.push(new THREE.Vector3());
    }

    this.group.add(this.bubble, this.selectRing, ...this.burstBubbleMeshes);
    this.resetBurstArtifacts();
  }

  createSelectRing() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.06, 1.22, 42),
      new THREE.MeshBasicMaterial({
        color: 0xff5c5c,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      })
    );
    ring.visible = false;
    ring.scale.setScalar(this.radius);
    ring.position.z = this.radius * 0.04;
    return ring;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  pop(sliceDir, speed) {
    if (this.sliced) return;
    this.setSelected(false);
    this.sliced = true;
    this.life = 0;
    this.wrongFlash = 0;
    this.wrongShake = 0;
    this.springVel -= THREE.MathUtils.clamp(speed * 0.05, 0.08, 0.2);
    this.crackGlowUniform.value = 0.12;
    this.bubble.visible = true;
    this.bubble.scale.setScalar(this.baseScale);
    this.bubbleMaterial.opacity = this.baseOpacity;
    this.resetBurstArtifacts();
    this.setBurstState(BubbleBurstState.PRE_BURST);
  }

  update(dt, worldBounds) {
    if (!this.active) return;

    this.springVel += (0 - this.springVal) * this.springTension;
    this.springVel *= this.springDamping;
    this.springVal += this.springVel;
    this.springUniform.value = this.springVal;
    this.contactStrength = Math.max(0, this.contactStrength - dt * 3.2);
    this.contactStrengthUniform.value = this.contactStrength;
    this.contactDirUniform.value.copy(this.contactDir);

    if (!this.sliced) {
      this.group.position.addScaledVector(this.vel, dt);

      if (this.group.position.x < worldBounds.left + this.radius) {
        this.group.position.x = worldBounds.left + this.radius;
        if (this.vel.x < 0) this.vel.x *= -0.5;
      }
      if (this.group.position.x > worldBounds.right - this.radius) {
        this.group.position.x = worldBounds.right - this.radius;
        if (this.vel.x > 0) this.vel.x *= -0.5;
      }
      if (this.group.position.y < worldBounds.bottom + this.radius) {
        this.group.position.y = worldBounds.bottom + this.radius;
        if (this.vel.y < 0) this.vel.y *= -0.5;
      }
      if (this.group.position.y > worldBounds.top - this.radius) {
        this.group.position.y = worldBounds.top - this.radius;
        if (this.vel.y > 0) this.vel.y *= -0.5;
      }

      this.vel.multiplyScalar(0.985);
      this.updateSelectionScale(dt);
      this.bubble.scale.setScalar(this.baseScale * this.selectionScale);

      if (this.wrongFlash > 0) {
        this.wrongFlash = Math.max(0, this.wrongFlash - dt);
        this.wrongShake = Math.max(0, this.wrongShake - dt);
        const t = this.wrongFlash / 0.22;
        const shakeT = this.wrongShake / 0.22;
        const shakeAmp = this.radius * 0.12 * shakeT;
        const shakePhase = (1 - shakeT) * Math.PI * 12;
        const shakeX = Math.sin(shakePhase) * shakeAmp;
        const shakeY = Math.cos(shakePhase * 0.6) * shakeAmp * 0.25;

        this.selectRing.visible = true;
        this.selectRing.material.color.setHex(0xff5c5c);
        this.selectRing.scale.setScalar(this.radius * (1.08 + (1 - t) * 0.1));
        this.selectRing.material.opacity = 0.28 + t * 0.68;
        this.bubble.position.set(shakeX, shakeY, 0);
      } else {
        this.selectRing.visible = false;
        this.bubble.position.set(0, 0, 0);
      }
      return;
    }

    this.stateElapsed += dt;

    if (this.burstState === BubbleBurstState.PRE_BURST) {
      const t = Math.min(this.stateElapsed / this.preBurstDuration, 1);
      const smooth = t * t * (3 - 2 * t);
      this.bubble.visible = true;
      this.bubble.scale.setScalar(this.baseScale * (1 + (this.preBurstScaleMax - 1) * smooth));
      this.crackGlowUniform.value = 0.12 * smooth;
      this.bubbleMaterial.opacity = this.baseOpacity;

      if (t >= 1) {
        this.setBurstState(BubbleBurstState.BURST);
        this.initBurstParticles();
      }
      return;
    }

    if (this.burstState === BubbleBurstState.BURST) {
      const t = Math.min(this.stateElapsed / this.burstDuration, 1);
      this.crackGlowUniform.value = (1 - t) * 0.12;
      this.bubbleMaterial.opacity = Math.max(0, this.baseOpacity * (1 - t * 1.85));
      this.bubble.scale.setScalar(this.baseScale * (this.preBurstScaleMax + t * 0.03));
      this.updateBurstParticles(dt);

      if (t > 0.5) this.bubble.visible = false;

      if (t >= 1) {
        this.setBurstState(BubbleBurstState.DISSIPATE);
        this.bubbleMaterial.opacity = 0;
      }
      return;
    }

    if (this.burstState === BubbleBurstState.DISSIPATE) {
      this.crackGlowUniform.value = 0;
      this.bubble.visible = false;
      this.updateBurstParticles(dt);

      if (this.stateElapsed >= this.dissipateDuration && !this.burstPointsVisible) {
        this.setBurstState(BubbleBurstState.RESET);
      }
      return;
    }

    if (this.burstState === BubbleBurstState.RESET) {
      if (this.stateElapsed >= this.resetDelay) {
        this.active = false;
        this.group.visible = false;
      }
      return;
    }
  }

  setSelected(flag) {
    const next = Boolean(flag) && this.active && !this.sliced;
    const changed = next !== this.selected;
    this.selected = next;
    this.selectionTarget = next ? 1.05 : 1;

    if (changed && next) {
      this.selectionScale = Math.max(this.selectionScale, 1.1);
      this.selectionVel = 0;
    }

    if (!next) {
      this.selectRing.visible = false;
      this.selectRing.material.opacity = 0;
      this.selectRing.scale.setScalar(this.radius);
      this.bubble.position.set(0, 0, 0);
    }
  }

  updateSelectionScale(dt) {
    const spring = 120;
    const damping = 9;
    this.selectionVel += (this.selectionTarget - this.selectionScale) * spring * dt;
    this.selectionVel *= Math.exp(-damping * dt);
    this.selectionScale += this.selectionVel * dt;

    if (Math.abs(this.selectionTarget - this.selectionScale) < 0.001 && Math.abs(this.selectionVel) < 0.001) {
      this.selectionScale = this.selectionTarget;
      this.selectionVel = 0;
    }
  }

  flashWrongHit() {
    if (!this.active || this.sliced) return;
    this.wrongFlash = 0.22;
    this.wrongShake = 0.22;
  }

  applyContact(nx, ny, overlap) {
    if (!this.active || this.sliced) return;
    const strength = THREE.MathUtils.clamp(overlap / Math.max(this.radius * 1.05, 0.001), 0, 0.65);
    const boost = Math.max(this.contactStrength * 0.7, strength);
    this.contactStrength = boost;
    this.contactDir.set(nx, ny, 0).normalize();
    this.springVel -= boost * 0.09;
  }

  setBurstState(nextState) {
    this.burstState = nextState;
    this.stateElapsed = 0;
  }

  resetBurstArtifacts() {
    for (let i = 0; i < burstBubbleCount; i += 1) {
      this.burstBubbleLife[i] = 0;
      this.burstBubbleLifeMax[i] = 1;
      const burstBubbleMesh = this.burstBubbleMeshes[i];
      burstBubbleMesh.visible = false;
      burstBubbleMesh.position.set(9999, 9999, 9999);
      burstBubbleMesh.scale.setScalar(0.0001);
      burstBubbleMesh.material.opacity = 0;
    }
    this.burstPointsVisible = false;
  }

  initBurstParticles() {
    this.activeBurstBubbleCount = this.minBurstBubbleCount + Math.floor(Math.random() * (this.maxBurstBubbleCount - this.minBurstBubbleCount + 1));

    for (let i = 0; i < burstBubbleCount; i += 1) {
      const burstBubbleMesh = this.burstBubbleMeshes[i];
      const burstBubbleMaterial = burstBubbleMesh.material;
      if (i >= this.activeBurstBubbleCount) {
        this.burstBubbleLife[i] = 0;
        this.burstBubbleLifeMax[i] = 1;
        burstBubbleMesh.visible = false;
        burstBubbleMaterial.opacity = 0;
        continue;
      }

      burstBubbleMaterial.positionNode = this.bubbleMaterial.positionNode;
      burstBubbleMaterial.colorNode = this.bubbleMaterial.colorNode;
      burstBubbleMaterial.emissiveNode = this.bubbleMaterial.emissiveNode;
      burstBubbleMaterial.iridescenceNode = this.bubbleMaterial.iridescenceNode;
      burstBubbleMaterial.iridescenceIORNode = this.bubbleMaterial.iridescenceIORNode;
      burstBubbleMaterial.iridescenceThicknessNode = this.bubbleMaterial.iridescenceThicknessNode;
      burstBubbleMaterial.transmission = this.bubbleMaterial.transmission;
      burstBubbleMaterial.roughness = Math.min(0.26, this.bubbleMaterial.roughness + 0.02);
      burstBubbleMaterial.thickness = Math.min(0.7, this.bubbleMaterial.thickness * 0.5);
      burstBubbleMaterial.ior = this.bubbleMaterial.ior;
      burstBubbleMaterial.clearcoat = this.bubbleMaterial.clearcoat;
      burstBubbleMaterial.clearcoatRoughness = this.bubbleMaterial.clearcoatRoughness;
      burstBubbleMaterial.envMapIntensity = this.bubbleMaterial.envMapIntensity;

      const randomDir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();

      const spawnDir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();

      const velocityDir = spawnDir.clone().lerp(randomDir, 0.22).normalize();
      const speed = 0.34 + Math.random() * 0.5;
      this.burstBubbleVelocities[i].copy(velocityDir).multiplyScalar(speed);

      const innerRadius = bubbleBaseRadius * this.preBurstScaleMax * 0.9;
      const spawnRadius = innerRadius * Math.cbrt(Math.random());
      burstBubbleMesh.position.copy(this.bubble.position).addScaledVector(spawnDir, spawnRadius * this.baseScale);

      const startScale = (0.055 + Math.random() * 0.11) * this.baseScale;
      this.burstBubbleBaseScale[i] = startScale;
      burstBubbleMesh.scale.setScalar(startScale);
      burstBubbleMaterial.opacity = 0;
      burstBubbleMesh.visible = true;

      this.burstBubbleLife[i] = 1.05 + Math.random() * 0.75;
      this.burstBubbleLifeMax[i] = this.burstBubbleLife[i];
    }

    this.burstPointsVisible = true;
  }

  updateBurstParticles(delta) {
    let aliveCount = 0;

    for (let i = 0; i < burstBubbleCount; i += 1) {
      if (this.burstBubbleLife[i] <= 0) continue;

      aliveCount += 1;
      const burstBubbleMesh = this.burstBubbleMeshes[i];
      this.burstBubbleLife[i] -= delta;

      this.burstBubbleVelocities[i].multiplyScalar(Math.pow(0.94, delta * 60));
      burstBubbleMesh.position.addScaledVector(this.burstBubbleVelocities[i], delta);

      const lifeRatio = Math.max(this.burstBubbleLife[i], 0) / Math.max(this.burstBubbleLifeMax[i], 0.0001);
      const age = Math.max(this.burstBubbleLifeMax[i] - this.burstBubbleLife[i], 0);
      const appear = Math.min(age / this.burstBubbleFadeInDuration, 1);
      const fade = Math.pow(lifeRatio, 0.62);
      const scaleNow = this.burstBubbleBaseScale[i] * (0.68 + 0.32 * fade);

      burstBubbleMesh.scale.setScalar(scaleNow);
      burstBubbleMesh.material.opacity = this.baseOpacity * fade * appear;

      if (this.burstBubbleLife[i] <= 0) {
        burstBubbleMesh.visible = false;
        burstBubbleMesh.material.opacity = 0;
      }
    }

    if (aliveCount === 0) this.burstPointsVisible = false;
  }
}

class SliceTrail {
  constructor(maxPoints) {
    this.baseMaxPoints = maxPoints;
    this.maxPoints = maxPoints;
    this.points = [];
    this.width = 0.12;
    this.keepFullMode = true;

    this.positions = new Float32Array(0);
    this.colors = new Float32Array(0);
    this.indices = [];

    this.geometry = new THREE.BufferGeometry();
    this.resizeBuffers(maxPoints);

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  push(point, t) {
    this.points.push({ pos: point.clone(), t });
    if (this.points.length > this.maxPoints) {
      if (!this.keepFullMode) {
        this.points.shift();
        return;
      }

      this.resizeBuffers(Math.max(this.maxPoints * 2, this.points.length));
    }
  }

  prune(now, ttlMs) {
    this.points = this.points.filter((p) => now - p.t <= ttlMs);
  }

  rebuild(isBroken) {
    const n = this.points.length;
    if (n < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    const up = new THREE.Vector3(0, 0, 1);
    const dir = new THREE.Vector3();
    const side = new THREE.Vector3();

    for (let i = 0; i < n; i += 1) {
      const p = this.points[i].pos;
      const prev = this.points[Math.max(0, i - 1)].pos;
      const next = this.points[Math.min(n - 1, i + 1)].pos;
      dir.copy(next).sub(prev).normalize();
      side.crossVectors(dir, up).normalize();

      const t = i / (n - 1);
      const w = this.width * (1 - t * 0.62);
      const hue = isBroken ? 0.01 : 0.56;
      const color = new THREE.Color().setHSL(hue - t * 0.03, 1.0, 0.75 - t * 0.14);

      const a = p.clone().addScaledVector(side, w);
      const b = p.clone().addScaledVector(side, -w);

      const ia = i * 2 * 3;
      const ib = ia + 3;
      this.positions[ia] = a.x;
      this.positions[ia + 1] = a.y;
      this.positions[ia + 2] = a.z;
      this.positions[ib] = b.x;
      this.positions[ib + 1] = b.y;
      this.positions[ib + 2] = b.z;

      this.colors[ia] = color.r;
      this.colors[ia + 1] = color.g;
      this.colors[ia + 2] = color.b;
      this.colors[ib] = color.r * 0.8;
      this.colors[ib + 1] = color.g * 0.8;
      this.colors[ib + 2] = color.b * 0.8;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, (n - 1) * 6);
  }

  reset() {
    this.points.length = 0;
    this.geometry.setDrawRange(0, 0);
  }

  setKeepFullMode(flag) {
    const keepFull = Boolean(flag);
    this.keepFullMode = keepFull;

    if (keepFull) return;

    if (this.maxPoints !== this.baseMaxPoints) {
      this.resizeBuffers(this.baseMaxPoints);
    }
    if (this.points.length > this.maxPoints) {
      this.points = this.points.slice(this.points.length - this.maxPoints);
    }
  }

  resizeBuffers(nextMaxPoints) {
    this.maxPoints = nextMaxPoints;
    this.positions = new Float32Array(this.maxPoints * 2 * 3);
    this.colors = new Float32Array(this.maxPoints * 2 * 3);
    this.indices.length = 0;

    for (let i = 0; i < this.maxPoints - 1; i += 1) {
      const o = i * 2;
      this.indices.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }

    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setIndex(this.indices);
    this.geometry.setDrawRange(0, 0);
  }
}
