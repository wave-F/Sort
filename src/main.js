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

const appEl = document.getElementById("app");
const phoneFrameEl = document.getElementById("phone-frame");
const titleEl = document.getElementById("title");
const hudEl = document.getElementById("hud");
const stepsEl = document.getElementById("score");
const sliceStateEl = document.getElementById("slice-state");
const commentaryEl = document.getElementById("commentary");
const homeScreenEl = document.getElementById("home-screen");
const homeLevelPrevBtn = document.getElementById("home-level-prev");
const homeLevelCurrentBtn = document.getElementById("home-level-current");
const homeLevelNextBtn = document.getElementById("home-level-next");
const homeSettingsBtn = document.getElementById("home-settings-btn");
const homeUiPanelEl = document.getElementById("home-ui-panel");
const homeUiEnergySizeEl = document.getElementById("home-ui-energy-size");
const homeUiEnergyXEl = document.getElementById("home-ui-energy-x");
const homeUiEnergyYEl = document.getElementById("home-ui-energy-y");
const homeUiCoinSizeEl = document.getElementById("home-ui-coin-size");
const homeUiCoinIconXEl = document.getElementById("home-ui-coin-icon-x");
const homeUiCoinIconYEl = document.getElementById("home-ui-coin-icon-y");
const homeUiCoinXEl = document.getElementById("home-ui-coin-x");
const homeUiCoinYEl = document.getElementById("home-ui-coin-y");
const homeUiEnergySizeValueEl = document.getElementById("home-ui-energy-size-value");
const homeUiEnergyXValueEl = document.getElementById("home-ui-energy-x-value");
const homeUiEnergyYValueEl = document.getElementById("home-ui-energy-y-value");
const homeUiCoinSizeValueEl = document.getElementById("home-ui-coin-size-value");
const homeUiCoinIconXValueEl = document.getElementById("home-ui-coin-icon-x-value");
const homeUiCoinIconYValueEl = document.getElementById("home-ui-coin-icon-y-value");
const homeUiCoinXValueEl = document.getElementById("home-ui-coin-x-value");
const homeUiCoinYValueEl = document.getElementById("home-ui-coin-y-value");
const homeUiSaveBtn = document.getElementById("home-ui-save-btn");
const homeUiCloseBtn = document.getElementById("home-ui-close-btn");
const homeUiResetBtn = document.getElementById("home-ui-reset-btn");
const homeCoinEl = document.getElementById("home-coin");
const coinStatusEl = document.getElementById("coin-status");
const coinStatusTextEl = document.getElementById("coin-status-text");
const coinFlyLayerEl = document.getElementById("coin-fly-layer");
const resultMaskEl = document.getElementById("result-mask");
const resultPageEl = document.getElementById("result-page");
const resultPageTitleEl = document.getElementById("result-page-title");
const resultPageTitleTextEl = document.getElementById("result-page-title-text");
const resultPageTextEl = document.getElementById("result-page-text");
const resultCoinIconEl = document.getElementById("result-coin-icon");
const resultCoinGainEl = document.getElementById("result-coin-gain");
const resultRetryBtn = document.getElementById("result-retry-btn");
const resultExitBtn = document.getElementById("result-exit-btn");
const resultNextBtn = document.getElementById("result-next-btn");
const gameOverEl = document.getElementById("game-over");
const gameOverTitleEl = document.getElementById("game-over-title");
const levelWinEl = document.getElementById("level-win");
const levelWinTitleEl = document.getElementById("level-win-title");
const levelWinDescEl = document.getElementById("level-win-desc");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const levelWinNextBtn = document.getElementById("level-win-next-btn");
const levelTestToggleBtn = document.getElementById("level-test-toggle");
const levelTestRootEl = document.getElementById("level-test");
const levelTestPanelEl = document.getElementById("level-test-panel");
const levelTestSelectEl = document.getElementById("level-test-select");
const levelTestJumpBtn = document.getElementById("level-test-jump");
const levelTestHexToggleEl = document.getElementById("level-test-hex-toggle");

function setupHomeFloatBubbles() {
  if (!homeScreenEl) return;

  let layer = homeScreenEl.querySelector("#home-float-layer");
  if (!(layer instanceof HTMLElement)) {
    layer = document.createElement("div");
    layer.id = "home-float-layer";
    layer.setAttribute("aria-hidden", "true");
    homeScreenEl.prepend(layer);
  }

  if (layer.childElementCount > 0) return;

  const bubbleCount = 16;
  for (let i = 0; i < bubbleCount; i += 1) {
    const bubble = document.createElement("span");
    bubble.className = "home-float-bubble";

    const size = 10 + Math.random() * 32;
    const left = 4 + Math.random() * 92;
    const duration = 9 + Math.random() * 10;
    const delay = -Math.random() * duration;
    const drift = -18 + Math.random() * 36;
    const alpha = 0.42 + Math.random() * 0.38;

    bubble.style.setProperty("--size", `${size.toFixed(1)}px`);
    bubble.style.setProperty("--left", `${left.toFixed(2)}%`);
    bubble.style.setProperty("--dur", `${duration.toFixed(2)}s`);
    bubble.style.setProperty("--delay", `${delay.toFixed(2)}s`);
    bubble.style.setProperty("--drift", `${drift.toFixed(1)}px`);
    bubble.style.setProperty("--alpha", alpha.toFixed(2));

    layer.appendChild(bubble);
  }
}

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
const levelProgressStorageKey = "fruit_level_progress_v1";
const coinStorageKey = "fruit_coin_balance_v1";
const homeUiTuningStorageKey = "fruit_home_ui_tuning_v1";
const levelWinRewardBase = 20;
const homeEasyColorIds = [1, 2, 3, 5, 6];
const homeMediumColorId = 4;
const homeHardColorId = 0;
const popSoundFiles = [
  "oga-pop1.ogg",
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
const iphoneAspectBase = 430 / 932;
const portraitAspectMin = 9 / 20;
const portraitAspectMax = 1 / 2;
const desktopAspectSwitchWidth = 820;

const colors = [
  { id: "red", name: "红泡", base: 0xff1a2d },
  { id: "orange", name: "橙泡", base: 0xff7a00 },
  { id: "green", name: "绿泡", base: 0x20c85a },
  { id: "blue", name: "蓝泡", base: 0x145dff },
  { id: "purple", name: "紫泡", base: 0xc24dff },
  { id: "yellow", name: "黄泡", base: 0xd6f542 },
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

const defaultHomeUiTuning = {
  energyTextSize: 22,
  energyTextX: 0,
  energyTextY: 0,
  coinTextSize: 24,
  coinIconX: 0,
  coinIconY: 0,
  coinTextX: 0,
  coinTextY: 0,
};

const loadedBubbleTuning = loadBubbleTuning();
const bubbleTuning = loadedBubbleTuning.value;
const hasBubbleTuningOverride = loadedBubbleTuning.fromStorage;

const state = {
  started: false,
  gameOver: false,
  inHome: true,
  levelTransitioning: false,
  currentLevelIndex: 0,
  currentPlayableLevelIndex: 0,
  highestPassedLevelIndex: -1,
  selectedHomeLevelIndex: 0,
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
  coins: 0,
  pendingWinReward: 0,
  rewardAppliedThisRound: false,
  showHexOverlay: true,
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
const homeBubbles = [];
const homeBubbleBounds = { left: -999, right: 999, top: 999, bottom: -999 };
const hexOverlayRadius = 0.2;
const hexOverlayOpacity = 0.38;
const hexOverlayBorderOpacity = 0.72;
const hexOverlayBorderWidth = 0.02;

let hexOverlayMesh = null;
let hexOverlayBorderMesh = null;
let hexOverlayCenters = [];
const hexOverlayDefaultColor = new THREE.Color(0x000000);
const hexOverlayWorkColor = new THREE.Color();

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
    gameOverEl,
    gameOverTitleEl,
    levelWinEl,
    levelWinTitleEl,
    levelWinDescEl,
    resultPage: {
      maskEl: resultMaskEl,
      cardEl: resultPageEl,
      titleEl: resultPageTitleEl,
      titleTextEl: resultPageTitleTextEl,
      descEl: resultPageTextEl,
      rewardEl: resultCoinGainEl,
      coinIconEl: resultCoinIconEl,
      retryBtn: resultRetryBtn,
      nextBtn: resultNextBtn,
      backBtn: resultExitBtn,
    },
    coinStatus: {
      rootEl: coinStatusEl,
      valueEl: coinStatusTextEl,
    },
    coinFly: {
      layerEl: coinFlyLayerEl,
      frameEl: phoneFrameEl,
    },
    onResultRetry: retryCurrentLevelFromResult,
    onResultNext: () => levelFlow.continueToNextLevel(),
    onResultBack: backHomeFromResult,
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
      const reward = getLevelWinReward(levelCount - 1) + 10;
      state.highestPassedLevelIndex = LEVELS.length - 1;
      state.currentPlayableLevelIndex = LEVELS.length - 1;
      state.selectedHomeLevelIndex = LEVELS.length - 1;
      persistLevelProgress();
      state.pendingWinReward = reward;
      state.rewardAppliedThisRound = false;
      state.levelTransitioning = true;
      gameUI.openResult("win", {
        reward,
        level: levelCount,
        score: Math.max(0, state.stepLimit - state.stepsUsed),
        canNext: false,
        isFinal: true,
        onWinCountDone: () => {
          playWinCoinFly();
        },
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
      const nextLevelIndex = Math.max(0, next - 1);
      const reward = getLevelWinReward(current - 1);
      grantLevelWinProgress(nextLevelIndex);
      state.pendingWinReward = reward;
      state.rewardAppliedThisRound = false;
      gameUI.openResult("win", {
        reward,
        level: current,
        score: Math.max(0, state.stepLimit - state.stepsUsed),
        canNext: nextLevelIndex < LEVELS.length,
        isFinal: false,
        onWinCountDone: () => {
          playWinCoinFly();
        },
      });
      return true;
    },
    onHideLevelWinOverlay: () => {
      gameUI.closeResult();
    },
    onContinueToLevel: (nextLevelIndex) => {
      victoryRainSystem.reset();
      startNextLevel(nextLevelIndex);
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

function clampLevelIndex(index, fallback = 0) {
  const maxIndex = Math.max(0, LEVELS.length - 1);
  const fallbackIndex = Number.isFinite(Number(fallback)) ? Math.floor(Number(fallback)) : 0;
  const n = Number(index);
  if (!Number.isFinite(n)) {
    return THREE.MathUtils.clamp(fallbackIndex, 0, maxIndex);
  }
  return THREE.MathUtils.clamp(Math.floor(n), 0, maxIndex);
}

function readHomeUiTuning() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...defaultHomeUiTuning };
  }

  try {
    const raw = window.localStorage.getItem(homeUiTuningStorageKey);
    if (!raw) return { ...defaultHomeUiTuning };
    const parsed = JSON.parse(raw);
    return {
      energyTextSize: clampNumber(parsed.energyTextSize, 14, 42, defaultHomeUiTuning.energyTextSize),
      energyTextX: clampNumber(parsed.energyTextX, -80, 80, defaultHomeUiTuning.energyTextX),
      energyTextY: clampNumber(parsed.energyTextY, -40, 40, defaultHomeUiTuning.energyTextY),
      coinTextSize: clampNumber(parsed.coinTextSize, 14, 42, defaultHomeUiTuning.coinTextSize),
      coinIconX: clampNumber(parsed.coinIconX, -30, 40, defaultHomeUiTuning.coinIconX),
      coinIconY: clampNumber(parsed.coinIconY, -30, 30, defaultHomeUiTuning.coinIconY),
      coinTextX: clampNumber(parsed.coinTextX, -80, 80, defaultHomeUiTuning.coinTextX),
      coinTextY: clampNumber(parsed.coinTextY, -40, 40, defaultHomeUiTuning.coinTextY),
    };
  } catch (_err) {
    return { ...defaultHomeUiTuning };
  }
}

function applyHomeUiTuning(values) {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--home-energy-text-size", `${values.energyTextSize}px`);
  rootStyle.setProperty("--home-energy-text-x", `${values.energyTextX}px`);
  rootStyle.setProperty("--home-energy-text-y", `${values.energyTextY}px`);
  rootStyle.setProperty("--home-coin-text-size", `${values.coinTextSize}px`);
  rootStyle.setProperty("--home-coin-icon-x", `${values.coinIconX}px`);
  rootStyle.setProperty("--home-coin-icon-y", `${values.coinIconY}px`);
  rootStyle.setProperty("--home-coin-text-x", `${values.coinTextX}px`);
  rootStyle.setProperty("--home-coin-text-y", `${values.coinTextY}px`);
}

function setHomeUiInputs(values) {
  if (homeUiEnergySizeEl) homeUiEnergySizeEl.value = String(values.energyTextSize);
  if (homeUiEnergyXEl) homeUiEnergyXEl.value = String(values.energyTextX);
  if (homeUiEnergyYEl) homeUiEnergyYEl.value = String(values.energyTextY);
  if (homeUiCoinSizeEl) homeUiCoinSizeEl.value = String(values.coinTextSize);
  if (homeUiCoinIconXEl) homeUiCoinIconXEl.value = String(values.coinIconX);
  if (homeUiCoinIconYEl) homeUiCoinIconYEl.value = String(values.coinIconY);
  if (homeUiCoinXEl) homeUiCoinXEl.value = String(values.coinTextX);
  if (homeUiCoinYEl) homeUiCoinYEl.value = String(values.coinTextY);
}

function syncHomeUiLabels() {
  if (homeUiEnergySizeValueEl && homeUiEnergySizeEl) homeUiEnergySizeValueEl.textContent = homeUiEnergySizeEl.value;
  if (homeUiEnergyXValueEl && homeUiEnergyXEl) homeUiEnergyXValueEl.textContent = homeUiEnergyXEl.value;
  if (homeUiEnergyYValueEl && homeUiEnergyYEl) homeUiEnergyYValueEl.textContent = homeUiEnergyYEl.value;
  if (homeUiCoinSizeValueEl && homeUiCoinSizeEl) homeUiCoinSizeValueEl.textContent = homeUiCoinSizeEl.value;
  if (homeUiCoinIconXValueEl && homeUiCoinIconXEl) homeUiCoinIconXValueEl.textContent = homeUiCoinIconXEl.value;
  if (homeUiCoinIconYValueEl && homeUiCoinIconYEl) homeUiCoinIconYValueEl.textContent = homeUiCoinIconYEl.value;
  if (homeUiCoinXValueEl && homeUiCoinXEl) homeUiCoinXValueEl.textContent = homeUiCoinXEl.value;
  if (homeUiCoinYValueEl && homeUiCoinYEl) homeUiCoinYValueEl.textContent = homeUiCoinYEl.value;
}

function collectHomeUiValues() {
  return {
    energyTextSize: clampNumber(homeUiEnergySizeEl?.value, 14, 42, defaultHomeUiTuning.energyTextSize),
    energyTextX: clampNumber(homeUiEnergyXEl?.value, -80, 80, defaultHomeUiTuning.energyTextX),
    energyTextY: clampNumber(homeUiEnergyYEl?.value, -40, 40, defaultHomeUiTuning.energyTextY),
    coinTextSize: clampNumber(homeUiCoinSizeEl?.value, 14, 42, defaultHomeUiTuning.coinTextSize),
    coinIconX: clampNumber(homeUiCoinIconXEl?.value, -30, 40, defaultHomeUiTuning.coinIconX),
    coinIconY: clampNumber(homeUiCoinIconYEl?.value, -30, 30, defaultHomeUiTuning.coinIconY),
    coinTextX: clampNumber(homeUiCoinXEl?.value, -80, 80, defaultHomeUiTuning.coinTextX),
    coinTextY: clampNumber(homeUiCoinYEl?.value, -40, 40, defaultHomeUiTuning.coinTextY),
  };
}

function saveHomeUiValues(values) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(homeUiTuningStorageKey, JSON.stringify(values));
}

function hideHomeUiPanel() {
  homeUiPanelEl?.classList.add("hidden");
}

function bindHomeUiPanel() {
  const hasAll = homeUiPanelEl
    && homeUiEnergySizeEl && homeUiEnergyXEl && homeUiEnergyYEl
    && homeUiCoinSizeEl && homeUiCoinIconXEl && homeUiCoinIconYEl
    && homeUiCoinXEl && homeUiCoinYEl;
  if (!hasAll) return;

  const saved = readHomeUiTuning();
  setHomeUiInputs(saved);
  syncHomeUiLabels();
  applyHomeUiTuning(saved);

  const onInput = () => {
    const values = collectHomeUiValues();
    applyHomeUiTuning(values);
    syncHomeUiLabels();
  };

  homeUiEnergySizeEl.addEventListener("input", onInput);
  homeUiEnergyXEl.addEventListener("input", onInput);
  homeUiEnergyYEl.addEventListener("input", onInput);
  homeUiCoinSizeEl.addEventListener("input", onInput);
  homeUiCoinIconXEl.addEventListener("input", onInput);
  homeUiCoinIconYEl.addEventListener("input", onInput);
  homeUiCoinXEl.addEventListener("input", onInput);
  homeUiCoinYEl.addEventListener("input", onInput);

  homeUiSaveBtn?.addEventListener("click", () => {
    const values = collectHomeUiValues();
    saveHomeUiValues(values);
    hideHomeUiPanel();
    gameUI.showCommentary("主界面样式已保存", 900);
  });

  homeUiCloseBtn?.addEventListener("click", () => {
    const savedValues = readHomeUiTuning();
    setHomeUiInputs(savedValues);
    applyHomeUiTuning(savedValues);
    syncHomeUiLabels();
    hideHomeUiPanel();
  });

  homeUiResetBtn?.addEventListener("click", () => {
    const defaults = { ...defaultHomeUiTuning };
    setHomeUiInputs(defaults);
    applyHomeUiTuning(defaults);
    syncHomeUiLabels();
    saveHomeUiValues(defaults);
    gameUI.showCommentary("已恢复默认样式", 900);
  });

  homeSettingsBtn?.addEventListener("click", () => {
    homeUiPanelEl.classList.toggle("hidden");
  });
}

function hydrateLevelProgress() {
  if (typeof window === "undefined" || !window.localStorage) {
    state.currentPlayableLevelIndex = 0;
    state.highestPassedLevelIndex = -1;
    state.selectedHomeLevelIndex = 0;
    return;
  }

  try {
    const raw = window.localStorage.getItem(levelProgressStorageKey);
    if (!raw) {
      state.currentPlayableLevelIndex = 0;
      state.highestPassedLevelIndex = -1;
      state.selectedHomeLevelIndex = 0;
      return;
    }

    const parsed = JSON.parse(raw);
    const playable = clampLevelIndex(parsed.currentPlayableLevelIndex, 0);
    const passedRaw = Number(parsed.highestPassedLevelIndex);
    const passed = Number.isFinite(passedRaw) ? Math.floor(passedRaw) : -1;
    state.currentPlayableLevelIndex = playable;
    state.highestPassedLevelIndex = THREE.MathUtils.clamp(passed, -1, LEVELS.length - 1);
    state.selectedHomeLevelIndex = playable;
  } catch (_err) {
    state.currentPlayableLevelIndex = 0;
    state.highestPassedLevelIndex = -1;
    state.selectedHomeLevelIndex = 0;
  }
}

function persistLevelProgress() {
  if (typeof window === "undefined" || !window.localStorage) return;
  const payload = {
    currentPlayableLevelIndex: state.currentPlayableLevelIndex,
    highestPassedLevelIndex: state.highestPassedLevelIndex,
  };
  window.localStorage.setItem(levelProgressStorageKey, JSON.stringify(payload));
}

function hydrateCoinBalance() {
  if (typeof window === "undefined" || !window.localStorage) {
    state.coins = 0;
    return;
  }

  const raw = window.localStorage.getItem(coinStorageKey);
  const parsed = Number(raw);
  state.coins = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function persistCoinBalance() {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(coinStorageKey, String(Math.max(0, Math.floor(state.coins))));
}

function syncCoinUi() {
  const safe = Math.max(0, Math.floor(state.coins));
  gameUI.setCoins(safe);
  if (homeCoinEl) homeCoinEl.textContent = String(safe);
}

function addCoins(value) {
  const gain = Math.max(0, Math.floor(value));
  if (gain <= 0) return;
  state.coins += gain;
  persistCoinBalance();
  syncCoinUi();
}

function getLevelWinReward(levelIndex) {
  const idx = Math.max(0, Math.floor(levelIndex));
  return levelWinRewardBase + idx * 2;
}

function playWinCoinFly() {
  settlePendingWinReward(true);
}

function settlePendingWinReward(playFx = false) {
  if (state.rewardAppliedThisRound) return;
  const reward = Math.max(0, Math.floor(state.pendingWinReward));
  if (reward <= 0) {
    state.rewardAppliedThisRound = true;
    return;
  }

  if (!playFx || gameUI.isCoinFlyPlaying()) {
    addCoins(reward);
    state.rewardAppliedThisRound = true;
    state.pendingWinReward = 0;
    return;
  }

  state.rewardAppliedThisRound = true;
  const originRect = gameUI.getResultRewardRect();
  gameUI.playCoinFly(reward, {
    originRect,
    onEachCoin: (part) => addCoins(part),
    onDone: () => {
      state.pendingWinReward = 0;
    },
  });
}

function bindHomeLevelButtons() {
  const onTap = (ev) => {
    const button = ev.currentTarget;
    if (!(button instanceof HTMLElement)) return;

    const raw = Number(button.dataset.levelIndex);
    if (!Number.isInteger(raw) || raw < 0 || raw >= LEVELS.length) return;

    const current = clampLevelIndex(state.currentPlayableLevelIndex);
    if (raw > current) {
      gameUI.showCommentary(`第${raw + 1}关尚未解锁`, 900);
      return;
    }

    gameUI.showCommentary(`当前可挑战：第${current + 1}关`, 900);
  };

  homeLevelPrevBtn?.addEventListener("click", onTap);
  homeLevelCurrentBtn?.addEventListener("click", onTap);
  homeLevelNextBtn?.addEventListener("click", onTap);
}

function renderHomeBubble(button, index, role) {
  if (!button) return;

  if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) {
    button.dataset.levelIndex = "";
    button.textContent = "";
    button.className = "home-level-bubble";
    button.disabled = true;
    return;
  }

  const level = LEVELS[index];
  const classes = ["home-level-bubble", "live", role];
  if (level.difficulty === "hard") classes.push("hard");
  if (level.difficulty === "medium") classes.push("medium");
  if (role === "upcoming" && index > state.currentPlayableLevelIndex) classes.push("locked");

  button.dataset.levelIndex = String(index);
  button.className = classes.join(" ");
  button.disabled = false;
  button.textContent = String(index + 1);

  const oldTag = button.querySelector(".home-level-tag");
  if (oldTag) oldTag.remove();

  if (level.difficulty === "medium" || level.difficulty === "hard") {
    const tag = document.createElement("span");
    tag.className = `home-level-tag ${level.difficulty}`;
    tag.textContent = level.difficulty === "hard" ? "HARD" : "MED";
    button.appendChild(tag);
  }
}

function pickHomeBubbleColorId(level, fallbackIndex) {
  const configured = Math.floor(level?.homeBubbleColorId ?? -1);
  if (configured >= 0 && configured < colors.length) {
    return configured;
  }

  const difficulty = String(level?.difficulty ?? "easy").toLowerCase();
  if (difficulty === "hard") return homeHardColorId;
  if (difficulty === "medium") return homeMediumColorId;

  const step = Math.max(0, Math.floor((level?.id ?? fallbackIndex + 1) - 1));
  return homeEasyColorIds[step % homeEasyColorIds.length];
}

function clearHomeBubbles() {
  for (const bubble of homeBubbles) {
    scene.remove(bubble.group);
  }
  homeBubbles.length = 0;
}

function rebuildHomeBubbles(specs) {
  if (!renderer || !trail) return;
  clearHomeBubbles();
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    if (!spec || !spec.anchorEl || !spec.level) continue;
    const colorId = pickHomeBubbleColorId(spec.level, spec.levelIndex);
    const entity = new BubbleEntity({
      id: -100 - i,
      colorId,
      radius: 1,
      vx: 0,
      vy: 0,
      baseColor: new THREE.Color(colors[colorId].base),
    });
    entity.homeAnchorEl = spec.anchorEl;
    entity.homeLevelIndex = spec.levelIndex;
    entity.homeColorId = colorId;
    entity.selectRing.visible = false;
    scene.add(entity.group);
    homeBubbles.push(entity);
  }
}

function syncHomeBubbleLayout() {
  if (!renderer || !state.inHome) return;

  for (const bubble of homeBubbles) {
    const anchor = bubble.homeAnchorEl;
    if (!anchor) continue;

    const rect = anchor.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      bubble.group.visible = false;
      continue;
    }

    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const center = screenToWorld(centerX, centerY);
    const edge = screenToWorld(centerX + rect.width * 0.5, centerY);
    const radius = Math.max(0.32, center.distanceTo(edge));

    bubble.group.visible = true;
    bubble.radius = radius;
    bubble.baseScale = radius / bubbleBaseRadius;
    bubble.bubble.scale.setScalar(bubble.baseScale * bubble.selectionScale);
    bubble.selectRing.scale.setScalar(radius);
    bubble.selectRing.position.z = radius * 0.04;
    bubble.vel.set(0, 0, 0);
    bubble.setPosition(center.x, center.y, 0);
  }
}

function updateHomeBubbles(dt) {
  if (!state.inHome || !homeBubbles.length) return;
  syncHomeBubbleLayout();
  for (const bubble of homeBubbles) {
    bubble.update(dt, homeBubbleBounds);
  }
}

function renderHomeScreen() {
  const current = clampLevelIndex(state.currentPlayableLevelIndex);
  state.selectedHomeLevelIndex = current;

  const nextIndex = current + 1;
  const next2Index = current + 2;
  renderHomeBubble(homeLevelPrevBtn, current, "current");
  renderHomeBubble(homeLevelCurrentBtn, nextIndex, "upcoming");
  renderHomeBubble(homeLevelNextBtn, next2Index, "upcoming");

  rebuildHomeBubbles([
    { anchorEl: homeLevelPrevBtn, levelIndex: current, level: LEVELS[current] },
    { anchorEl: homeLevelCurrentBtn, levelIndex: nextIndex, level: LEVELS[nextIndex] },
    { anchorEl: homeLevelNextBtn, levelIndex: next2Index, level: LEVELS[next2Index] },
  ]);

}

function showHomeScreen() {
  state.inHome = true;
  setGameHudVisible(false);
  if (homeScreenEl) homeScreenEl.classList.remove("hidden");
  renderHomeScreen();
}

function hideHomeScreen() {
  state.inHome = false;
  setGameHudVisible(true);
  if (homeScreenEl) homeScreenEl.classList.add("hidden");
  hideHomeUiPanel();
  clearHomeBubbles();
}

function setGameHudVisible(visible) {
  const hidden = !visible;
  hudEl?.classList.toggle("hidden", hidden);
  coinStatusEl?.classList.toggle("hidden", hidden);
  levelTestRootEl?.classList.toggle("hidden", hidden);
  commentaryEl?.classList.toggle("hidden", hidden);
  if (hidden) {
    levelTestPanelEl?.classList.add("hidden");
  }
}

function clearBoardEntities() {
  burstSystem.clear();
  state.pendingPops.length = 0;
  clearQueuedSelections();
  for (const fruit of fruits) scene.remove(fruit.group);
  fruits.length = 0;
  victoryRainSystem.reset();
  trail.reset();
}

function grantLevelWinProgress(nextLevelIndex) {
  const justCleared = state.currentLevelIndex;
  state.highestPassedLevelIndex = Math.max(state.highestPassedLevelIndex, justCleared);
  state.currentPlayableLevelIndex = clampLevelIndex(nextLevelIndex);
  state.selectedHomeLevelIndex = state.currentPlayableLevelIndex;
  persistLevelProgress();
}

function retryCurrentLevelFromResult() {
  if (!state.started) return;
  gameUI.closeResult();
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  const loaded = loadLevel(state.currentLevelIndex);
  if (!loaded) {
    state.started = false;
    showHomeScreen();
  }
}

function backHomeFromResult() {
  settlePendingWinReward(false);
  gameUI.closeResult();
  state.started = false;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  clearBoardEntities();
  showHomeScreen();
}

function startNextLevel(nextLevelIndex) {
  settlePendingWinReward(false);
  gameUI.closeResult();
  const next = clampLevelIndex(nextLevelIndex);
  state.started = true;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  const loaded = loadLevel(next);
  if (!loaded) {
    backHomeFromResult();
  }
}

function completeLevelAndBackHome(nextLevelIndex) {
  state.started = false;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;

  grantLevelWinProgress(nextLevelIndex);
  gameUI.closeResult();

  clearBoardEntities();
  showHomeScreen();
}

function completeAllLevelsAndBackHome(levelCount) {
  state.started = false;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.highestPassedLevelIndex = LEVELS.length - 1;
  state.currentPlayableLevelIndex = LEVELS.length - 1;
  state.selectedHomeLevelIndex = LEVELS.length - 1;
  persistLevelProgress();
  gameUI.closeResult();

  clearBoardEntities();
  showHomeScreen();
}

function init() {
  hydrateLevelProgress();
  hydrateCoinBalance();
  syncCoinUi();
  state.inHome = true;
  updatePhoneAspect();
  setGameHudVisible(false);
  if (homeScreenEl) homeScreenEl.classList.remove("hidden");
  setupHomeFloatBubbles();
  renderHomeScreen();

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
  bindHomeLevelButtons();
  bindHomeUiPanel();
  gameUI.closeResult();
  setupLevelTestControls();

  window.addEventListener("resize", resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
    window.visualViewport.addEventListener("scroll", resize);
  }
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  setupRenderer();
}

function setupLevelTestControls() {
  if (!levelTestToggleBtn || !levelTestPanelEl || !levelTestSelectEl || !levelTestJumpBtn || !levelTestHexToggleEl) {
    return;
  }

  levelTestHexToggleEl.checked = state.showHexOverlay;

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

  levelTestHexToggleEl.addEventListener("change", () => {
    state.showHexOverlay = levelTestHexToggleEl.checked;
    updateHexOverlayColors();
  });
}

function setLevelTestSelection(index) {
  if (!levelTestSelectEl) return;
  levelTestSelectEl.value = String(index);
}

function jumpToLevelForTest(index) {
  if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) return;

  if (!state.started || state.gameOver) {
    startGame();
  }

  state.levelTransitioning = false;
  loadLevel(index);
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

  if (state.inHome) {
    renderHomeScreen();
  }

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
  gameAudio.ensureAudioUnlocked();
  void gameAudio.preloadPopAudio();
  gameAudio.resetSelectToneProgression();

  const startIndex = clampLevelIndex(state.currentPlayableLevelIndex);

  state.started = true;
  state.gameOver = false;
  state.inHome = false;
  state.levelTransitioning = false;
  state.currentLevelIndex = startIndex;
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
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  levelFlow.reset();
  burstSystem.clear();
  victoryRainSystem.reset();

  trail.reset();

  hideHomeScreen();
  gameUI.hideGameOver();
  gameUI.closeResult();

  if (hasBubbleTuningOverride) {
    gameUI.showCommentary("已应用调试页同步参数。", 1300);
  }

  const loaded = loadLevel(startIndex);
  if (!loaded) {
    state.started = false;
    state.inHome = true;
    showHomeScreen();
    gameUI.showCommentary("关卡加载失败，请重试。", 1200);
  }
}

function loadLevel(index) {
  const level = levelRuntime.getNormalizedLevel(index);
  if (!level) return false;

  state.currentLevelIndex = index;
  state.selectedHomeLevelIndex = index;
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
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  levelFlow.reset();
  burstSystem.clear();
  victoryRainSystem.reset();
  setLevelTestSelection(index);
  updateStepsHud();

  trail.reset();

  gameUI.setSliceStatus(`状态: 第${index + 1}关`);
  gameUI.showCommentary(
    `第${index + 1}/${LEVELS.length}关 · ${level.name} · 颜色${level.colorIds.length}种 数量${level.fruitCount} · 步数${state.stepLimit}`,
    2400
  );

  resetFruits(level);
  return true;
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

function createHexRingGeometry(radius, borderWidth) {
  const innerRadius = Math.max(0.001, radius - Math.max(0.001, borderWidth));
  const shape = new THREE.Shape();
  const hole = new THREE.Path();

  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  for (let i = 5; i >= 0; i -= 1) {
    const angle = (Math.PI / 3) * i;
    const x = Math.cos(angle) * innerRadius;
    const y = Math.sin(angle) * innerRadius;
    if (i === 5) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  shape.holes.push(hole);

  return new THREE.ShapeGeometry(shape);
}

function rebuildHexOverlay() {
  if (hexOverlayMesh) {
    scene.remove(hexOverlayMesh);
    hexOverlayMesh.geometry.dispose();
    hexOverlayMesh.material.dispose();
    hexOverlayMesh = null;
  }
  if (hexOverlayBorderMesh) {
    scene.remove(hexOverlayBorderMesh);
    hexOverlayBorderMesh.geometry.dispose();
    hexOverlayBorderMesh.material.dispose();
    hexOverlayBorderMesh = null;
  }

  hexOverlayCenters = [];
  const r = hexOverlayRadius;
  const stepX = r * 1.5;
  const stepY = Math.sqrt(3) * r;
  const minX = bounds.left - r;
  const maxX = bounds.right + r;
  const minY = bounds.bottom - r;
  const maxY = bounds.top + r;

  let col = 0;
  for (let x = minX; x <= maxX + stepX; x += stepX, col += 1) {
    const offsetY = col % 2 === 0 ? 0 : stepY * 0.5;
    for (let y = minY + offsetY; y <= maxY + stepY; y += stepY) {
      hexOverlayCenters.push({ x, y });
    }
  }

  const count = hexOverlayCenters.length;
  if (!count) return;

  const geometry = new THREE.CircleGeometry(r, 6);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: hexOverlayOpacity,
    vertexColors: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = 60;

  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    const center = hexOverlayCenters[i];
    matrix.makeTranslation(center.x, center.y, 0.8);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, hexOverlayDefaultColor);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  hexOverlayMesh = mesh;
  scene.add(hexOverlayMesh);

  const borderGeometry = createHexRingGeometry(r, hexOverlayBorderWidth);
  const borderMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: hexOverlayBorderOpacity,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const borderMesh = new THREE.InstancedMesh(borderGeometry, borderMaterial, count);
  borderMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  borderMesh.renderOrder = 61;

  for (let i = 0; i < count; i += 1) {
    const center = hexOverlayCenters[i];
    matrix.makeTranslation(center.x, center.y, 0.801);
    borderMesh.setMatrixAt(i, matrix);
  }

  borderMesh.instanceMatrix.needsUpdate = true;
  hexOverlayBorderMesh = borderMesh;
  scene.add(hexOverlayBorderMesh);
}

function updateHexOverlayColors() {
  if (!hexOverlayMesh) return;
  hexOverlayMesh.visible = state.started && !state.inHome && state.showHexOverlay;
  if (hexOverlayBorderMesh) hexOverlayBorderMesh.visible = hexOverlayMesh.visible;
  if (!hexOverlayMesh.visible) return;

  for (let i = 0; i < hexOverlayCenters.length; i += 1) {
    const center = hexOverlayCenters[i];
    let bestLayerY = -Infinity;
    let bestDistSq = Infinity;
    let pickedColorHex = null;

    for (let j = 0; j < fruits.length; j += 1) {
      const fruit = fruits[j];
      if (!fruit?.active || fruit.sliced || !fruit.bubble.visible) continue;

      const dx = center.x - fruit.group.position.x;
      const dy = center.y - fruit.group.position.y;
      const distSq = dx * dx + dy * dy;
      const hitRadius = fruit.radius * Math.max(1, fruit.selectionScale ?? 1);
      if (distSq > hitRadius * hitRadius) continue;

      const layerY = fruit.group.position.y;
      if (layerY > bestLayerY || (layerY === bestLayerY && distSq < bestDistSq)) {
        bestLayerY = layerY;
        bestDistSq = distSq;
        pickedColorHex = colors[fruit.colorId]?.base ?? null;
      }
    }

    if (pickedColorHex === null) {
      hexOverlayMesh.setColorAt(i, hexOverlayDefaultColor);
    } else {
      hexOverlayWorkColor.setHex(pickedColorHex);
      hexOverlayMesh.setColorAt(i, hexOverlayWorkColor);
    }
  }

  if (hexOverlayMesh.instanceColor) hexOverlayMesh.instanceColor.needsUpdate = true;
}

function tick() {
  if (!renderer) return;
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now();

  updateTrail(now);
  processPendingPops(dt);
  updateHomeBubbles(dt);

  collisionSystem.resolve(fruits);
  burstSystem.update(dt);
  levelFlow.updateVictory(dt);

  let remaining = 0;
  for (const fruit of fruits) {
    fruit.update(dt, bounds);
    if (fruit.active && !fruit.sliced) remaining += 1;
  }

  updateHexOverlayColors();

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
    endGame(`第${state.currentLevelIndex + 1}关失败：步数用尽`);
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
  if (!renderer) {
    return;
  }
  updatePhoneAspect();
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
  rebuildHexOverlay();
}

function updatePhoneAspect() {
  if (!phoneFrameEl) return;

  const visualViewport = window.visualViewport;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;
  if (!viewportWidth || !viewportHeight) return;

  const rawAspect = viewportWidth / viewportHeight;
  const shouldLockToIphonePreview = viewportWidth >= desktopAspectSwitchWidth;
  const targetAspect = shouldLockToIphonePreview
    ? iphoneAspectBase
    : THREE.MathUtils.clamp(rawAspect, portraitAspectMin, portraitAspectMax);

  document.documentElement.style.setProperty("--phone-aspect-live", `${targetAspect}`);
}

function endGame(reason) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.levelTransitioning = false;
  state.pointerDown = false;
  levelFlow.reset();
  burstSystem.clear();
  clearQueuedSelections();
  state.pendingPops.length = 0;
  victoryRainSystem.reset();
  trail.reset();

  gameUI.openResult("lose", {
    level: state.currentLevelIndex + 1,
    score: Math.max(0, state.stepLimit - state.stepsUsed),
    reward: 0,
    canNext: false,
    isFinal: false,
  });
  gameUI.setSliceStatus(`状态: ${reason}`);
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

  return {
    material,
    springUniform,
    crackGlowUniform,
    contactDirUniform,
    contactStrengthUniform,
    tintUniform,
    accentUniform,
  };
}

class BubbleEntity {
  constructor({ id, colorId, radius, vx = 0, vy = 0, baseColor }) {
    this.id = id;
    this.colorId = colorId;
    this.radius = radius;
    this.baseColor = baseColor.clone();
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
    this.tintUniform = nodeMaterialData.tintUniform;
    this.accentUniform = nodeMaterialData.accentUniform;
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
    this.setBaseColor(this.baseColor);
  }

  setBaseColor(color) {
    if (!color) return;
    this.baseColor.copy(color);
    const accent = color.clone().offsetHSL(0, -0.12, 0.26);
    if (this.tintUniform?.value) this.tintUniform.value.copy(color);
    if (this.accentUniform?.value) this.accentUniform.value.copy(accent);
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
