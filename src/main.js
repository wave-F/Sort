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
import { createLevelFlowController } from "./flow/level-flow.js";
import { createCollisionSystem } from "./systems/collision-system.js";
import { createSliceSystem } from "./systems/slice-system.js";
import { createVictoryRainSystem } from "./systems/victory-rain-system.js";
import { createBurstSystem } from "./systems/burst-system.js";
import { createGameUI } from "./ui/game-ui.js";
import { createGameAudio } from "./audio/game-audio.js";
import { createLevelRuntime } from "./content/level-runtime.js";
import { readSave, writeSave } from "./state/persist.js";

const phoneFrameEl = document.getElementById("phone-frame");
const appEl = document.getElementById("app");
const titleEl = document.getElementById("title");
const stepsEl = document.getElementById("score");
const sliceStateEl = document.getElementById("slice-state");
const commentaryEl = document.getElementById("commentary");
const startScreenEl = document.getElementById("start-screen");
const startLadderEl = document.getElementById("start-ladder");
const startBtn = document.getElementById("start-btn");
const battleExitBtn = document.getElementById("battle-exit-btn");
const resultMaskEl = document.getElementById("result-mask");
const resultPageEl = document.getElementById("result-page");
const resultTitleEl = document.getElementById("result-title");
const resultTitleTextEl = document.getElementById("result-title-text");
const resultDescEl = document.getElementById("result-desc");
const resultRewardEl = document.getElementById("result-reward");
const resultCoinIconEl = document.getElementById("result-coin-icon");
const resultRetryBtn = document.getElementById("result-retry-btn");
const resultNextBtn = document.getElementById("result-next-btn");
const resultBackBtn = document.getElementById("result-back-btn");
const coinStatusEl = document.getElementById("coin-status");
const coinValueEl = document.getElementById("coin-value");
const coinFlyLayerEl = document.getElementById("coin-fly-layer");
const levelTestToggleBtn = document.getElementById("level-test-toggle");
const levelTestPanelEl = document.getElementById("level-test-panel");
const levelTestSelectEl = document.getElementById("level-test-select");
const levelTestJumpBtn = document.getElementById("level-test-jump");

const loadedSave = readSave();

const rules = {
  worldHeight: 10,
  minSliceSegment: 0.02,
  playAreaInset: 0.18,
};

const slicePopStaggerStep = 0.075;
const spawnEdgePadding = 0.01;
const spawnEdgeBias = 0.38;
const spawnEdgeBand = 0.9;
const wallSlideDamping = 0.992;
const wallContactGain = 0.8;

const bubbleRadiusScale = 3;
const bubbleTuningStorageKey = "bubble_tuning_v1";
const popSoundFiles = [
  "oga-pop1.ogg",
  "oga-pop2.ogg",
  "oga-pop3.ogg",
  "oga-pop4.ogg",
  "oga-pop5.ogg",
  "oga-pop6.ogg",
  "oga-pop7.ogg",
  "oga-pop8.ogg",
  "oga-pop9.ogg",
  "oga-pop10.ogg",
];
const popSoundUrls = popSoundFiles.map((file) => `./assets/audio/pop/${file}`);
const selectScaleFrequencies = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

const colors = [
  { id: "red", name: "红泡", base: 0xff3355 },
  { id: "orange", name: "橙泡", base: 0xff9800 },
  { id: "green", name: "绿泡", base: 0x20c85a },
  { id: "blue", name: "蓝泡", base: 0x2f7dff },
  { id: "purple", name: "紫泡", base: 0x9b5cff },
  { id: "yellow", name: "黄泡", base: 0xf7d046 },
  { id: "pink", name: "粉泡", base: 0xff5fb2 },
  { id: "teal", name: "青泡", base: 0x14b8a6 },
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
  maxPassedLevel: loadedSave.maxPassedLevel,
  activeLevel: null,
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
  stepLimit: 0,
  stepsUsed: 0,
  coins: loadedSave.coins,
  pendingReward: 0,
  resultOutcome: "lose",
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfffbf2);

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
const burstBubbleGeometry = new THREE.SphereGeometry(1, 22, 22);

const BubbleBurstState = {
  IDLE: "IDLE",
  PRE_BURST: "PRE_BURST",
  BURST: "BURST",
  DISSIPATE: "DISSIPATE",
  RESET: "RESET",
};

const gameRuntime = createGameRuntime();
const {
  gameUI,
  burstSystem,
  victoryRainSystem,
  collisionSystem,
  sliceSystem,
  levelFlow,
  gameAudio,
  levelRuntime,
} = gameRuntime;

init();

function createGameRuntime() {
  const gameUI = createGameUI({
    sliceStateEl,
    commentaryEl,
    levelCount: LEVELS.length,
    startScreen: {
      rootEl: startScreenEl,
      ladderEl: startLadderEl,
      startBtn,
      onStart: (selectedLevelIndex) => {
        startGame(selectedLevelIndex);
      },
    },
    resultPage: {
      maskEl: resultMaskEl,
      cardEl: resultPageEl,
      titleEl: resultTitleEl,
      titleTextEl: resultTitleTextEl,
      descEl: resultDescEl,
      rewardEl: resultRewardEl,
      coinIconEl: resultCoinIconEl,
      retryBtn: resultRetryBtn,
      nextBtn: resultNextBtn,
      backBtn: resultBackBtn,
      onRetry: () => {
        retryCurrentLevel();
      },
      onNext: () => {
        levelFlow.continueToNextLevel();
      },
      onBack: () => {
        backToStart();
      },
    },
    coinStatus: {
      rootEl: coinStatusEl,
      valueEl: coinValueEl,
    },
    coinFly: {
      layerEl: coinFlyLayerEl,
      frameEl: phoneFrameEl,
      getTargetRect: () => gameUI.getCoinAnchorRect(),
    },
  });

  gameUI.setCoins(state.coins);
  gameUI.updateStartMeta({
    maxPassedLevel: state.maxPassedLevel,
    selectedLevelIndex: Math.max(0, state.maxPassedLevel - 1),
  });
  gameUI.showStartScreen({
    maxPassedLevel: state.maxPassedLevel,
    selectedLevelIndex: Math.max(0, state.maxPassedLevel - 1),
  });

  const burstSystem = createBurstSystem({
    scene,
    colors,
    bubbleTuning,
    bubbleBaseRadius,
    burstBubbleGeometry,
    createBubbleMaterial,
    poolSize: 180,
  });

  const gameAudio = createGameAudio({
    popSoundUrls,
    selectScaleFrequencies,
  });

  const victoryRainSystem = createVictoryRainSystem({
    scene,
    bounds,
    colors,
    bubbleRadiusScale,
    bubbleBaseRadius,
    emitDuration: 0.78,
    spawnRate: 74,
    maxBubbles: 56,
  });

  const collisionSystem = createCollisionSystem({
    cellSize: 1.2,
    neighborRange: 2,
  });

  const sliceSystem = createSliceSystem({
    camera,
    raycaster,
    colors,
    minSliceSegment: rules.minSliceSegment,
    sliceGridCellSize: 1.2,
  });

  const levelFlow = createLevelFlowController({
    levelCount: LEVELS.length,
    isStarted: () => state.started,
    isGameOver: () => state.gameOver,
    isLevelTransitioning: () => state.levelTransitioning,
    setLevelTransitioning: (value) => {
      state.levelTransitioning = Boolean(value);
    },
    getCurrentLevelIndex: () => state.currentLevelIndex,
    onAllLevelsCleared: (levelCount) => {
      const reward = computeWinReward();
      settleWinResult({
        levelNumber: levelCount,
        reward,
        isFinal: true,
        canNext: false,
      });
    },
    onPrepareLevelWin: () => {
      state.pointerDown = false;
      clearQueuedSelections();
      trail.reset();
    },
    onVictoryFxStart: () => {
      victoryRainSystem.start();
    },
    onVictoryFxUpdate: (dt) => {
      victoryRainSystem.update(dt);
    },
    onShowLevelWinOverlay: (current, next) => {
      const reward = computeWinReward();
      settleWinResult({
        levelNumber: current,
        nextLevel: next,
        reward,
        isFinal: false,
        canNext: true,
      });
      return true;
    },
    onHideLevelWinOverlay: () => {
      gameUI.closeResult();
    },
    onContinueToLevel: (nextLevelIndex) => {
      state.gameOver = false;
      state.pendingReward = 0;
      gameUI.closeResult();
      if (battleExitBtn) battleExitBtn.classList.remove("hidden");
      victoryRainSystem.reset();
      loadLevel(nextLevelIndex);
    },
    showCommentary: (text, durationMs) => {
      gameUI.showCommentary(text, durationMs);
    },
    clearDelayMs: 500,
    overlayDelaySec: 1.12,
  });

  const levelRuntime = createLevelRuntime({
    levels: LEVELS,
    colors,
    bounds,
    bubbleRadiusScale,
    spawnEdgePadding,
    spawnEdgeBias,
    spawnEdgeBand,
  });

  return {
    gameUI,
    burstSystem,
    victoryRainSystem,
    collisionSystem,
    sliceSystem,
    levelFlow,
    gameAudio,
    levelRuntime,
  };
}

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
  setupLevelTestControls();
  if (battleExitBtn) {
    battleExitBtn.addEventListener("click", () => {
      if (!state.started || state.gameOver || state.levelTransitioning) return;
      backToStart();
    });
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  setupRenderer();
}

function setupLevelTestControls() {
  if (!levelTestToggleBtn || !levelTestPanelEl || !levelTestSelectEl || !levelTestJumpBtn) {
    return;
  }

  levelTestSelectEl.innerHTML = "";
  for (let i = 0; i < LEVELS.length; i += 1) {
    const level = LEVELS[i];
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `第${i + 1}关 ${level.name}`;
    levelTestSelectEl.appendChild(option);
  }

  levelTestToggleBtn.addEventListener("click", () => {
    levelTestPanelEl.classList.toggle("hidden");
  });

  levelTestJumpBtn.addEventListener("click", () => {
    const targetIndex = Number(levelTestSelectEl.value);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= LEVELS.length) {
      return;
    }
    jumpToLevelForTest(targetIndex);
  });
}

function setLevelTestSelection(index) {
  if (!levelTestSelectEl) return;
  levelTestSelectEl.value = String(index);
}

function jumpToLevelForTest(index) {
  if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) return;

  if (!state.started || state.gameOver) {
    startGame(index);
  } else {
    gameUI.closeResult();
    state.levelTransitioning = false;
    state.gameOver = false;
    loadLevel(index);
  }
  if (levelTestPanelEl) levelTestPanelEl.classList.add("hidden");
  gameUI.showCommentary(`测试模式：已切到第${index + 1}关`, 1400);
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

function startGame(initialLevelIndex = 0) {
  gameAudio.ensureAudioUnlocked();
  void gameAudio.preloadPopAudio();
  gameAudio.resetSelectToneProgression();

  const safeLevelIndex = THREE.MathUtils.clamp(
    Number.isInteger(initialLevelIndex) ? initialLevelIndex : 0,
    0,
    LEVELS.length - 1
  );

  state.started = true;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.currentLevelIndex = safeLevelIndex;
  state.activeLevel = null;
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
  state.stepLimit = 0;
  state.stepsUsed = 0;
  levelFlow.reset();
  burstSystem.clear();
  victoryRainSystem.reset();

  if (trail) trail.reset();

  gameUI.hideStartScreen();
  gameUI.closeResult();
  if (battleExitBtn) battleExitBtn.classList.remove("hidden");

  if (hasBubbleTuningOverride) {
    gameUI.showCommentary("已应用调试页同步参数。", 1300);
  }

  loadLevel(safeLevelIndex);
}

function loadLevel(index) {
  const level = levelRuntime.getNormalizedLevel(index);
  if (!level) return;

  state.currentLevelIndex = index;
  state.activeLevel = level;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.sliceColorId = null;
  state.sliceBroken = false;
  state.sliceCommitted = false;
  gameAudio.resetSelectToneProgression();
  clearQueuedSelections();
  state.pendingPops.length = 0;
  state.lastPoint = null;
  state.nowPoint = null;
  state.stepLimit = Math.max(1, Math.floor(level.stepLimit ?? 1));
  state.stepsUsed = 0;
  levelFlow.reset();
  burstSystem.clear();
  victoryRainSystem.reset();
  setLevelTestSelection(index);
  updateStepsHud();

  if (trail) trail.reset();

  gameUI.setSliceStatus(`状态: 第${index + 1}关`);
  gameUI.showCommentary(
    `第${index + 1}/${LEVELS.length}关 · ${level.name} · 颜色${level.colorIds.length}种 数量${level.fruitCount} · 步数${state.stepLimit}`,
    2400
  );

  resetFruits(level);
}

function resetFruits(level) {
  burstSystem.clear();
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

function onPointerDown(ev) {
  if (!state.started || state.gameOver || state.levelTransitioning || !renderer) return;
  if (state.stepLimit > 0 && state.stepsUsed >= state.stepLimit) {
    gameUI.showCommentary("本关步数已用尽。", 1000);
    return;
  }

  gameAudio.ensureAudioUnlocked();
  void gameAudio.preloadPopAudio();
  gameAudio.resetSelectToneProgression();

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
  gameUI.setSliceStatus("状态: 划线中");
}

function onPointerMove(ev) {
  if (!state.pointerDown || !renderer) return;
  state.lastPoint.copy(state.nowPoint);
  state.nowPoint.copy(screenToWorld(ev.clientX, ev.clientY));
  const now = performance.now();
  const dt = Math.min(Math.max((now - state.lastMoveAt) / 1000, 1 / 240), 1 / 20);
  state.lastMoveAt = now;

  trail.push(state.nowPoint, now);
  sliceSystem.processSliceSegment({
    state,
    fruits,
    dt,
    trail,
    consumeStep,
    settleQueuedSlices,
    setSliceStatus: gameUI.setSliceStatus,
    showCommentary: gameUI.showCommentary,
    resetSelectToneProgression: gameAudio.resetSelectToneProgression,
    playSelectTone: gameAudio.playSelectTone,
  });
}

function onPointerUp() {
  if (!state.pointerDown) return;
  state.pointerDown = false;
  state.lastPoint = null;
  state.nowPoint = null;
  gameAudio.resetSelectToneProgression();

  settleQueuedSlices();
  if (state.keepFullTrailDuringDrag) trail.reset();

  if (state.gameOver) return;
  if (state.sliceBroken) gameUI.setSliceStatus("状态: 断刀");
  else if (state.sliceColorId !== null) gameUI.setSliceStatus(`状态: 本刀锁定${colors[state.sliceColorId].name}`);
  else gameUI.setSliceStatus("状态: 空挥");

}

function tick() {
  if (!renderer) return;
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now();

  updateTrail(now);
  processPendingPops(dt);

  collisionSystem.resolve(fruits);
  burstSystem.update(dt);
  levelFlow.updateVictory(dt);

  let remaining = 0;
  for (const fruit of fruits) {
    fruit.update(dt, bounds);
    if (fruit.active && !fruit.sliced) remaining += 1;
  }

  renderer.render(scene, camera);

  if (levelFlow.updateLevelClear(now, remaining)) return;

  if (
    state.started
    && !state.gameOver
    && state.stepLimit > 0
    && state.stepsUsed >= state.stepLimit
    && remaining > 0
    && !state.pointerDown
    && state.pendingPops.length === 0
  ) {
    openLoseResult("步数用尽");
  }
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
      gameAudio.playRandomPopAudio();
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

function consumeStep() {
  if (state.stepLimit <= 0) return;
  state.stepsUsed = Math.min(state.stepLimit, state.stepsUsed + 1);
  updateStepsHud();
}

function updateStepsHud() {
  if (!stepsEl) return;
  if (!state.started) {
    stepsEl.textContent = "步数: -";
    return;
  }
  const remaining = Math.max(0, state.stepLimit - state.stepsUsed);
  stepsEl.textContent = `步数: ${remaining}`;
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

function resize() {
  if (!renderer) return;
  const rect = appEl.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);

  const aspect = rect.width / rect.height;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  const worldHalfH = rules.worldHeight / 2;
  const worldHalfW = worldHalfH * aspect;
  bounds.left = -worldHalfW + rules.playAreaInset;
  bounds.right = worldHalfW - rules.playAreaInset;
  bounds.top = worldHalfH - rules.playAreaInset;
  bounds.bottom = -worldHalfH + rules.playAreaInset;
  levelRuntime.clearCache();
}

function computeWinReward() {
  return Math.max(1, Math.ceil((state.stepLimit - state.stepsUsed + 1) * 0.5));
}

function persistProgress() {
  const saved = writeSave({
    maxPassedLevel: state.maxPassedLevel,
    coins: state.coins,
  });
  state.maxPassedLevel = saved.maxPassedLevel;
  state.coins = saved.coins;
}

function addCoins(value) {
  const delta = Math.max(0, Math.floor(value ?? 0));
  if (delta <= 0) return;
  state.coins += delta;
  persistProgress();
  gameUI.setCoins(state.coins);
}

function settleWinResult({ levelNumber, reward, isFinal, canNext }) {
  if (state.gameOver && !canNext) return;
  state.gameOver = !canNext;
  state.pointerDown = false;
  burstSystem.clear();
  clearQueuedSelections();
  state.pendingPops.length = 0;
  if (trail) trail.reset();

  state.resultOutcome = "win";
  state.pendingReward = Math.max(0, Math.floor(reward));

  const unlockedLevel = Math.min(LEVELS.length, Math.max(state.maxPassedLevel, levelNumber + 1));
  state.maxPassedLevel = unlockedLevel;
  persistProgress();

  gameUI.updateStartMeta({
    maxPassedLevel: state.maxPassedLevel,
    selectedLevelIndex: Math.max(0, Math.min(levelNumber, state.maxPassedLevel - 1)),
  });

  gameUI.openResult("win", {
    reward: state.pendingReward,
    level: levelNumber,
    score: state.stepsUsed,
    canNext,
    isFinal,
  });
  if (battleExitBtn) battleExitBtn.classList.add("hidden");
  gameUI.setSliceStatus(`状态: 第${levelNumber}关完成`);

  if (state.pendingReward > 0) {
    const originRect = resultRewardEl?.getBoundingClientRect?.();
    gameUI.playCoinFly(state.pendingReward, {
      originRect,
      onEachCoin: (value) => {
        addCoins(value);
      },
      onDone: () => {
        state.pendingReward = 0;
      },
    });
  }
}

function openLoseResult(reason) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.levelTransitioning = false;
  state.pointerDown = false;
  levelFlow.reset();
  burstSystem.clear();
  clearQueuedSelections();
  state.pendingPops.length = 0;
  victoryRainSystem.reset();
  if (trail) trail.reset();

  state.resultOutcome = "lose";
  state.pendingReward = 0;
  gameUI.openResult("lose", {
    reward: 0,
    level: state.currentLevelIndex + 1,
    score: state.stepsUsed,
    canNext: false,
    isFinal: false,
  });
  if (battleExitBtn) battleExitBtn.classList.add("hidden");
  gameUI.setSliceStatus(`状态: 第${state.currentLevelIndex + 1}关失败 (${reason})`);
}

function retryCurrentLevel() {
  gameUI.closeResult();
  state.gameOver = false;
  state.levelTransitioning = false;
  if (battleExitBtn) battleExitBtn.classList.remove("hidden");
  loadLevel(state.currentLevelIndex);
}

function backToStart() {
  state.started = false;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.pendingReward = 0;
  state.stepLimit = 0;
  state.stepsUsed = 0;
  levelFlow.reset();
  burstSystem.clear();
  victoryRainSystem.reset();
  clearQueuedSelections();
  state.pendingPops.length = 0;
  if (trail) trail.reset();

  for (const fruit of fruits) scene.remove(fruit.group);
  fruits.length = 0;

  gameUI.closeResult();
  gameUI.showStartScreen({
    maxPassedLevel: state.maxPassedLevel,
    selectedLevelIndex: Math.max(0, state.maxPassedLevel - 1),
  });
  if (battleExitBtn) battleExitBtn.classList.add("hidden");
  gameUI.setSliceStatus("状态: 待机");
  updateStepsHud();
}

function endGame(reason) {
  openLoseResult(reason);

  gameUI.showCommentary(reason, 1200);
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
    this.burstPointsVisible = false;

    this.minBurstBubbleCount = 2;
    this.maxBurstBubbleCount = 5;
    this.activeBurstBubbleCount = 0;

    this.group.add(this.bubble, this.selectRing);
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

      const leftLimit = worldBounds.left + this.radius;
      if (this.group.position.x < leftLimit) {
        const overlap = leftLimit - this.group.position.x;
        this.group.position.x = leftLimit;
        if (this.vel.x < 0) this.vel.x = 0;
        this.vel.y *= wallSlideDamping;
        this.applyWallContact(1, 0, overlap);
      }

      const rightLimit = worldBounds.right - this.radius;
      if (this.group.position.x > rightLimit) {
        const overlap = this.group.position.x - rightLimit;
        this.group.position.x = rightLimit;
        if (this.vel.x > 0) this.vel.x = 0;
        this.vel.y *= wallSlideDamping;
        this.applyWallContact(-1, 0, overlap);
      }

      const bottomLimit = worldBounds.bottom + this.radius;
      if (this.group.position.y < bottomLimit) {
        const overlap = bottomLimit - this.group.position.y;
        this.group.position.y = bottomLimit;
        if (this.vel.y < 0) this.vel.y = 0;
        this.vel.x *= wallSlideDamping;
        this.applyWallContact(0, 1, overlap);
      }

      const topLimit = worldBounds.top - this.radius;
      if (this.group.position.y > topLimit) {
        const overlap = this.group.position.y - topLimit;
        this.group.position.y = topLimit;
        if (this.vel.y > 0) this.vel.y = 0;
        this.vel.x *= wallSlideDamping;
        this.applyWallContact(0, -1, overlap);
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

  applyWallContact(nx, ny, overlap) {
    this.applyContact(nx, ny, overlap * wallContactGain);
  }

  setBurstState(nextState) {
    this.burstState = nextState;
    this.stateElapsed = 0;
  }

  resetBurstArtifacts() {
    this.activeBurstBubbleCount = 0;
    this.burstPointsVisible = false;
  }

  initBurstParticles() {
    burstSystem.spawnForEntity(this);
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
