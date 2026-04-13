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
import { clampNumber, createLevelIndexClamper, createPersistenceController } from "./game/persistence.js";
import { readGameSettings, createSettingsUiController } from "./game/settings-ui.js";
import { createRewardFlow } from "./game/reward-flow.js";
import { createHomeScreenController } from "./game/home-screen.js";

const appEl = document.getElementById("app");
const phoneFrameEl = document.getElementById("phone-frame");
const hudEl = document.getElementById("hud");
const stepsEl = document.getElementById("score");
const hudLevelEl = document.getElementById("hud-level");
const sliceStateEl = document.getElementById("slice-state");
const commentaryEl = document.getElementById("commentary");
const homeScreenEl = document.getElementById("home-screen");
const homeLevelPrevBtn = document.getElementById("home-level-prev");
const homeLevelCurrentBtn = document.getElementById("home-level-current");
const homeLevelNextBtn = document.getElementById("home-level-next");
const homeSettingsBtn = document.getElementById("home-settings-btn");
const homeSettingsModalEl = document.getElementById("home-settings-modal");
const homeSettingsCloseBtn = document.getElementById("home-settings-close-btn");
const settingMusicToggleEl = document.getElementById("setting-music-toggle");
const settingSfxToggleEl = document.getElementById("setting-sfx-toggle");
const homeFillStaminaBtn = document.getElementById("home-fill-stamina-btn");
const homeClearDataBtn = document.getElementById("home-clear-data-btn");
const homeCoinEl = document.getElementById("home-coin");
const homeEnergyTextEl = document.getElementById("home-energy-text");
const homeEnergyStatusEl = document.querySelector("#home-topbar .home-status-energy");
const gameplayTopbarEl = document.getElementById("gameplay-topbar");
const gameplayCoinStatusEl = document.getElementById("gameplay-coin-status");
const gameplayCoinTextEl = document.getElementById("gameplay-coin-text");
const coinFlyLayerEl = document.getElementById("coin-fly-layer");
const gameplaySettingsMaskEl = document.getElementById("gameplay-settings-mask");
const gameplaySettingsRootEl = document.getElementById("gameplay-settings");
const gameplaySettingsToggleEl = document.getElementById("gameplay-settings-toggle");
const gameplaySettingsMusicEl = document.getElementById("gameplay-settings-music");
const gameplaySettingsSfxEl = document.getElementById("gameplay-settings-sfx");
const gameplaySettingsExitEl = document.getElementById("gameplay-settings-exit");
const gameplayExitMaskEl = document.getElementById("gameplay-exit-mask");
const gameplayExitModalEl = document.getElementById("gameplay-exit-modal");
const gameplayExitCloseEl = document.getElementById("gameplay-exit-close");
const gameplayExitCancelEl = document.getElementById("gameplay-exit-cancel");
const gameplayExitConfirmEl = document.getElementById("gameplay-exit-confirm");
const resultMaskEl = document.getElementById("result-mask");
const resultPageEl = document.getElementById("result-page");
const resultPageTitleEl = document.getElementById("result-page-title");
const resultPageTitleTextEl = document.getElementById("result-page-title-text");
const resultWinCloseBtn = document.getElementById("result-win-close");
const resultWinPerfectEl = document.getElementById("result-win-perfect");
const resultRewardLabelEl = document.getElementById("result-reward-label");
const resultPageTextEl = document.getElementById("result-page-text");
const resultCoinIconEl = document.getElementById("result-coin-icon");
const resultCoinGainEl = document.getElementById("result-coin-gain");
const resultRetryBtn = document.getElementById("result-retry-btn");
const resultExitBtn = document.getElementById("result-exit-btn");
const resultNextBtn = document.getElementById("result-next-btn");
const gameOverEl = document.getElementById("game-over");
const gameOverTitleEl = document.getElementById("game-over-title");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const levelTestToggleBtn = document.getElementById("level-test-toggle");
const levelTestPanelEl = document.getElementById("level-test-panel");
const levelTestSelectEl = document.getElementById("level-test-select");
const levelTestJumpBtn = document.getElementById("level-test-jump");
const outOfMovesBannerEl = document.getElementById("out-of-moves-banner");

function setupHomeFloatBubbles() {
  homeScreenController.setupHomeFloatBubbles();
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
const staminaStorageKey = "fruit_stamina_v1";
const homeUiTuningStorageKey = "fruit_home_ui_tuning_v1";
const gameSettingsStorageKey = "fruit_game_settings_v1";
const uiLayoutDebugStorageKey = "fruit_ui_layout_debug_v1";
const hudDebugStorageKey = "fruit_hud_debug_v1";
const staminaMax = 5;
const staminaRecoverIntervalMs = 25 * 60 * 1000;
const outOfMovesBannerDurationMs = 1800;
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
const clickSoundUrl = "./assets/audio/pop/click.wav";
const selectScaleFrequencies = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
const levelBgmUrl = "./assets/audio/bgm_preview/result_win_soft_carefree.mp3";
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

const defaultGameSettings = {
  musicEnabled: true,
  sfxEnabled: true,
};

const clampLevelIndex = createLevelIndexClamper(LEVELS.length);

const defaultUiLayoutDebugTuning = {
  winWidth: 0,
  winHeight: 0,
  winX: 0,
  winY: 0,
  winScale: 1,
  titleY: 0,
  titleScale: 1,
  perfectY: 0,
  perfectScale: 1,
  rewardY: 0,
  rewardScale: 1,
  coinNumX: 0,
  coinNumY: 0,
  actionsY: 0,
  continueScale: 1,
};

const defaultHudDebugTuning = {
  hudLevelOffsetX: 0,
};

const loadedBubbleTuning = loadBubbleTuning();
const bubbleTuning = loadedBubbleTuning.value;
const hasBubbleTuningOverride = loadedBubbleTuning.fromStorage;
const gameSettings = readGameSettings({ storageKey: gameSettingsStorageKey, defaultSettings: defaultGameSettings });
const uiLayoutDebugTuning = readUiLayoutDebugTuning();
const hudDebugTuning = readHudDebugTuning();

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
  stamina: staminaMax,
  staminaLastRecoverAt: 0,
  staminaUiSyncAt: 0,
  pendingWinReward: 0,
  rewardAppliedThisRound: false,
  staminaTipHideTimer: 0,
  staminaTipTickTimer: 0,
  homeCenterTipTimer: 0,
  outOfMovesBannerTimer: 0,
  outOfMovesBannerAnimation: null,
};

const persistence = createPersistenceController({
  state,
  storageKeys: {
    levelProgress: levelProgressStorageKey,
    coin: coinStorageKey,
    stamina: staminaStorageKey,
  },
  levelCount: LEVELS.length,
  staminaMax,
  staminaRecoverIntervalMs,
});

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

const rewardFlow = createRewardFlow({
  state,
  coinStorageKey,
  levelWinRewardBase,
  getGameUI: () => gameUI,
  homeCoinEl,
  gameplayCoinStatusEl,
  gameplayTopbarEl,
});

const settingsUi = createSettingsUiController({
  elements: {
    homeSettingsBtn,
    homeSettingsModalEl,
    homeSettingsCloseBtn,
    settingMusicToggleEl,
    settingSfxToggleEl,
    homeFillStaminaBtn,
    homeClearDataBtn,
    gameplaySettingsMaskEl,
    gameplaySettingsRootEl,
    gameplaySettingsToggleEl,
    gameplaySettingsMusicEl,
    gameplaySettingsSfxEl,
    gameplaySettingsExitEl,
    gameplayExitMaskEl,
    gameplayExitModalEl,
    gameplayExitCloseEl,
    gameplayExitCancelEl,
    gameplayExitConfirmEl,
  },
  gameSettings,
  defaultGameSettings,
  storageKey: gameSettingsStorageKey,
  gameAudio,
  gameUI,
  onFillStaminaToMax: fillStaminaToMax,
  onClearGameplayDataOnly: clearGameplayDataOnly,
  onExitGameplayToHome: exitGameplayToHome,
});

const homeScreenController = createHomeScreenController({
  state,
  elements: {
    homeScreenEl,
    homeEnergyStatusEl,
    homeLevelPrevBtn,
    homeLevelCurrentBtn,
    homeLevelNextBtn,
  },
  levels: LEVELS,
  colors,
  homeEasyColorIds,
  homeMediumColorId,
  homeHardColorId,
  clampLevelIndex,
  staminaMax,
  formatCountdownMmSs,
  getStaminaRecoverCountdownMs,
  onSyncStaminaUi: syncStaminaUi,
  onSettleStaminaRecovery: settleStaminaRecovery,
  onSetGameHudVisible: setGameHudVisible,
  onHideHomeSettingsModal: hideHomeSettingsModal,
  getRenderer: () => renderer,
  getTrail: () => trail,
  screenToWorld,
  createHomeBubbleEntity: ({ id, colorId }) => new BubbleEntity({
    id,
    colorId,
    radius: 1,
    vx: 0,
    vy: 0,
    baseColor: new THREE.Color(colors[colorId].base),
  }),
  scene,
  bubbleBaseRadius,
  onPlayUiClick: () => gameAudio.playUiClickAudio(),
  onShowCommentary: (text, durationMs) => gameUI.showCommentary(text, durationMs),
});

init();

function createGameRuntime() {
  const gameUI = createGameUI({
    sliceStateEl,
    commentaryEl,
    gameOverEl,
    gameOverTitleEl,
    resultPage: {
      maskEl: resultMaskEl,
      cardEl: resultPageEl,
      titleEl: resultPageTitleEl,
      titleTextEl: resultPageTitleTextEl,
      winCloseBtn: resultWinCloseBtn,
      perfectEl: resultWinPerfectEl,
      rewardLabelEl: resultRewardLabelEl,
      descEl: resultPageTextEl,
      rewardEl: resultCoinGainEl,
      coinIconEl: resultCoinIconEl,
      retryBtn: resultRetryBtn,
      nextBtn: resultNextBtn,
      backBtn: resultExitBtn,
    },
    coinStatus: {
      rootEl: gameplayCoinStatusEl,
      valueEl: gameplayCoinTextEl,
    },
    coinFly: {
      layerEl: coinFlyLayerEl,
      frameEl: phoneFrameEl,
    },
    onResultRetry: () => {
      gameAudio.playUiClickAudio();
      retryCurrentLevelFromResult();
    },
    onResultNext: () => {
      gameAudio.playUiClickAudio();
      levelFlow.continueToNextLevel();
    },
    onResultBack: () => {
      gameAudio.playUiClickAudio();
      backHomeFromResult();
    },
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
    clickSoundUrl,
    selectScaleFrequencies,
    levelBgmUrl,
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
      refundStaminaOnWin();
      const reward = getLevelWinReward(levelCount - 1);
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
      refundStaminaOnWin();
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

function readUiLayoutDebugTuning() {
  const fallback = { ...defaultUiLayoutDebugTuning };
  if (typeof window === "undefined" || !window.localStorage) return fallback;

  try {
    const raw = window.localStorage.getItem(uiLayoutDebugStorageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      winWidth: clampNumber(parsed.winWidth, -80, 180, fallback.winWidth),
      winHeight: clampNumber(parsed.winHeight, -120, 220, fallback.winHeight),
      winX: clampNumber(parsed.winX, -140, 140, fallback.winX),
      winY: clampNumber(parsed.winY, -140, 140, fallback.winY),
      winScale: clampNumber(parsed.winScale, 0.7, 1.35, fallback.winScale),
      titleY: clampNumber(parsed.titleY, -80, 100, fallback.titleY),
      titleScale: clampNumber(parsed.titleScale, 0.7, 1.5, fallback.titleScale),
      perfectY: clampNumber(parsed.perfectY, -100, 100, fallback.perfectY),
      perfectScale: clampNumber(parsed.perfectScale, 0.6, 1.4, fallback.perfectScale),
      rewardY: clampNumber(parsed.rewardY, -100, 100, fallback.rewardY),
      rewardScale: clampNumber(parsed.rewardScale, 0.6, 1.5, fallback.rewardScale),
      coinNumX: clampNumber(parsed.coinNumX, -120, 120, fallback.coinNumX),
      coinNumY: clampNumber(parsed.coinNumY, -120, 120, fallback.coinNumY),
      actionsY: clampNumber(parsed.actionsY, -100, 120, fallback.actionsY),
      continueScale: clampNumber(parsed.continueScale, 0.75, 1.45, fallback.continueScale),
    };
  } catch (_err) {
    return fallback;
  }
}

function applyUiLayoutDebugTuning(values) {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--dbg-win-width", `${values.winWidth}px`);
  rootStyle.setProperty("--dbg-win-height", `${values.winHeight}px`);
  rootStyle.setProperty("--dbg-win-x", `${values.winX}px`);
  rootStyle.setProperty("--dbg-win-y", `${values.winY}px`);
  rootStyle.setProperty("--dbg-win-scale", String(values.winScale));
  rootStyle.setProperty("--dbg-title-y", `${values.titleY}px`);
  rootStyle.setProperty("--dbg-title-scale", String(values.titleScale));
  rootStyle.setProperty("--dbg-perfect-y", `${values.perfectY}px`);
  rootStyle.setProperty("--dbg-perfect-scale", String(values.perfectScale));
  rootStyle.setProperty("--dbg-reward-y", `${values.rewardY}px`);
  rootStyle.setProperty("--dbg-reward-scale", String(values.rewardScale));
  rootStyle.setProperty("--dbg-coin-num-x", `${values.coinNumX}px`);
  rootStyle.setProperty("--dbg-coin-num-y", `${values.coinNumY}px`);
  rootStyle.setProperty("--dbg-actions-y", `${values.actionsY}px`);
  rootStyle.setProperty("--dbg-continue-scale", String(values.continueScale));

  const winCardEl = resultPageEl?.querySelector?.(".result-card.is-win");
  if (winCardEl instanceof HTMLElement) {
    winCardEl.style.width = `min(90%, calc(350px + ${values.winWidth}px))`;
    winCardEl.style.minHeight = `calc(452px + ${values.winHeight}px)`;
    winCardEl.style.transform = `translate(${values.winX}px, ${values.winY}px) scale(${values.winScale})`;
  }

  const perfectEl = resultPageEl?.querySelector?.(".result-card.is-win .result-win-perfect");
  if (perfectEl instanceof HTMLElement) {
    perfectEl.style.transform = `translateY(${values.perfectY}px) scale(${values.perfectScale})`;
  }

  const titleEl = resultPageEl?.querySelector?.(".result-card.is-win .result-title");
  if (titleEl instanceof HTMLElement) {
    titleEl.style.transform = `translateY(${values.titleY}px) scale(${values.titleScale})`;
  }

  const rewardStackEl = resultPageEl?.querySelector?.(".result-card.is-win .result-reward-stack");
  if (rewardStackEl instanceof HTMLElement) {
    rewardStackEl.style.transform = `translateY(${values.rewardY}px) scale(${values.rewardScale})`;
  }

  const actionsEl = resultPageEl?.querySelector?.(".result-card.is-win .result-actions");
  if (actionsEl instanceof HTMLElement) {
    actionsEl.style.transform = `translateY(${values.actionsY}px)`;
  }

  const coinNumEl = resultPageEl?.querySelector?.(".result-card.is-win .result-coin-gain");
  if (coinNumEl instanceof HTMLElement) {
    coinNumEl.style.transform = `translate(${values.coinNumX}px, ${values.coinNumY}px)`;
  }

  const continueBtnEl = resultPageEl?.querySelector?.(".result-card.is-win #result-next-btn");
  if (continueBtnEl instanceof HTMLElement) {
    continueBtnEl.style.transform = `scale(${values.continueScale})`;
  }
}

function readHudDebugTuning() {
  const fallback = { ...defaultHudDebugTuning };
  if (typeof window === "undefined" || !window.localStorage) return fallback;

  try {
    const raw = window.localStorage.getItem(hudDebugStorageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      hudLevelOffsetX: clampNumber(parsed.hudLevelOffsetX, -40, 40, fallback.hudLevelOffsetX),
    };
  } catch (_err) {
    return fallback;
  }
}

function applyHudDebugTuning(values) {
  document.documentElement.style.setProperty("--hud-level-offset-x", `${values.hudLevelOffsetX}px`);
}

function saveGameSettings() {
  settingsUi.saveGameSettings();
}

function applyGameSettings() {
  settingsUi.applyGameSettings();
}

function syncSettingsUi() {
  settingsUi.syncSettingsUi();
}

function showHomeSettingsModal() {
  settingsUi.showHomeSettingsModal();
}

function hideHomeSettingsModal() {
  settingsUi.hideHomeSettingsModal();
}

function setGameplaySettingsMenuOpen(open) {
  settingsUi.setGameplaySettingsMenuOpen(open);
}

function hideGameplaySettingsMenu() {
  settingsUi.hideGameplaySettingsMenu();
}

function showGameplayExitModal() {
  settingsUi.showGameplayExitModal();
}

function hideGameplayExitModal() {
  settingsUi.hideGameplayExitModal();
}

function syncGameplaySettingsButtons() {
  settingsUi.syncGameplaySettingsButtons();
}

function exitGameplayToHome() {
  hideOutOfMovesBanner();
  state.started = false;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  clearQueuedSelections();
  gameUI.closeResult();
  clearBoardEntities();
  showHomeScreen();
}

function bindGameplaySettingsMenu() {
  settingsUi.bindGameplaySettingsMenu();
}

function clearGameplayDataOnly() {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(levelProgressStorageKey);
    window.localStorage.removeItem(coinStorageKey);
    window.localStorage.removeItem(staminaStorageKey);
    window.localStorage.removeItem(gameSettingsStorageKey);
  }

  hydrateLevelProgress();
  hydrateCoinBalance();
  hydrateStamina();
  gameSettings.musicEnabled = defaultGameSettings.musicEnabled;
  gameSettings.sfxEnabled = defaultGameSettings.sfxEnabled;
  applyGameSettings();
  syncSettingsUi();
  syncGameplaySettingsButtons();
  syncCoinUi();
  syncStaminaUi();

  state.selectedHomeLevelIndex = state.currentPlayableLevelIndex;
  if (state.inHome) {
    renderHomeScreen();
  }

  gameUI.showCommentary("已清除游玩数据（保留TopBar和泡泡调参）", 1400);
}

function bindHomeSettingsModal() {
  settingsUi.bindHomeSettingsModal();
}

function hydrateLevelProgress() {
  persistence.hydrateLevelProgress();
}

function persistLevelProgress() {
  persistence.persistLevelProgress();
}

function hydrateCoinBalance() {
  persistence.hydrateCoinBalance();
}

function hydrateStamina() {
  persistence.hydrateStamina();
}

function persistStamina() {
  persistence.persistStamina();
}

function settleStaminaRecovery(now = Date.now()) {
  persistence.settleStaminaRecovery(now);
}

function syncStaminaUi() {
  settleStaminaRecovery();
  if (homeEnergyTextEl) {
    homeEnergyTextEl.textContent = `${state.stamina}/${staminaMax}`;
  }
  state.staminaUiSyncAt = Date.now();
}

function tryConsumeStaminaForLevelEntry() {
  settleStaminaRecovery();
  if (state.stamina <= 0) {
    syncStaminaUi();
    showHomeCenterTip("体力不足", 1200);
    return false;
  }

  state.stamina = Math.max(0, state.stamina - 1);
  state.staminaLastRecoverAt = Date.now();
  persistStamina();
  syncStaminaUi();
  return true;
}

function refundStaminaOnWin() {
  settleStaminaRecovery();
  if (state.stamina >= staminaMax) return;

  state.stamina = Math.min(staminaMax, state.stamina + 1);
  if (state.stamina >= staminaMax) {
    state.staminaLastRecoverAt = Date.now();
  }
  persistStamina();
  syncStaminaUi();
}

function restoreStaminaAfterFailedEntry() {
  if (state.stamina >= staminaMax) return;
  state.stamina = Math.min(staminaMax, state.stamina + 1);
  if (state.stamina >= staminaMax) {
    state.staminaLastRecoverAt = Date.now();
  }
  persistStamina();
  syncStaminaUi();
}

function fillStaminaToMax() {
  state.stamina = staminaMax;
  state.staminaLastRecoverAt = Date.now();
  persistStamina();
  syncStaminaUi();
}

function formatCountdownMmSs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}:${ss}`;
}

function getStaminaRecoverCountdownMs(now = Date.now()) {
  if (state.stamina >= staminaMax) return 0;
  const safeNow = Number.isFinite(now) ? Math.floor(now) : Date.now();
  const elapsed = Math.max(0, safeNow - state.staminaLastRecoverAt);
  const remainder = elapsed % staminaRecoverIntervalMs;
  return staminaRecoverIntervalMs - remainder;
}

function hideHomeCenterTip() {
  homeScreenController.hideHomeCenterTip();
}

function showHomeCenterTip(text, durationMs = 1200) {
  homeScreenController.showHomeCenterTip(text, durationMs);
}

function hideHomeEnergyRecoverTip() {
  homeScreenController.hideHomeEnergyRecoverTip();
}

function bindHomeEnergyTip() {
  homeScreenController.bindHomeEnergyTip();
}

function clearOutOfMovesBannerTimer() {
  if (!state.outOfMovesBannerTimer) return;
  window.clearTimeout(state.outOfMovesBannerTimer);
  state.outOfMovesBannerTimer = 0;
}

function clearOutOfMovesBannerAnimation() {
  if (!state.outOfMovesBannerAnimation) return;
  state.outOfMovesBannerAnimation.cancel();
  state.outOfMovesBannerAnimation = null;
}

function hideOutOfMovesBanner() {
  clearOutOfMovesBannerAnimation();
  clearOutOfMovesBannerTimer();
  if (!outOfMovesBannerEl) return;
  outOfMovesBannerEl.classList.remove("show");
  outOfMovesBannerEl.classList.add("hidden");
  outOfMovesBannerEl.style.opacity = "";
  outOfMovesBannerEl.style.transform = "";
}

function playOutOfMovesBanner(onDone) {
  if (!outOfMovesBannerEl) {
    onDone?.();
    return;
  }

  hideOutOfMovesBanner();
  outOfMovesBannerEl.classList.remove("hidden");
  outOfMovesBannerEl.style.opacity = "1";
  outOfMovesBannerEl.style.transform = "translateY(-50%)";

  if (typeof outOfMovesBannerEl.animate === "function") {
    const animation = outOfMovesBannerEl.animate(
      [
        { transform: "translateY(-260%)", opacity: 0, offset: 0 },
        { transform: "translateY(-50%)", opacity: 1, offset: 0.24 },
        { transform: "translateY(-50%)", opacity: 1, offset: 0.62 },
        { transform: "translateY(220%)", opacity: 0, offset: 1 },
      ],
      {
        duration: outOfMovesBannerDurationMs,
        easing: "cubic-bezier(0.22, 0.82, 0.22, 1)",
        fill: "both",
      }
    );
    state.outOfMovesBannerAnimation = animation;
    animation.onfinish = () => {
      state.outOfMovesBannerAnimation = null;
      hideOutOfMovesBanner();
      onDone?.();
    };
    animation.oncancel = () => {
      state.outOfMovesBannerAnimation = null;
    };
    return;
  }

  outOfMovesBannerEl.classList.remove("show");
  void outOfMovesBannerEl.offsetWidth;
  outOfMovesBannerEl.classList.add("show");
  state.outOfMovesBannerTimer = window.setTimeout(() => {
    hideOutOfMovesBanner();
    onDone?.();
  }, outOfMovesBannerDurationMs);
}

function persistCoinBalance() {
  rewardFlow.persistCoinBalance();
}

function syncCoinUi() {
  rewardFlow.syncCoinUi();
}

function addCoins(value) {
  rewardFlow.addCoins(value);
}

function getLevelWinReward(levelIndex) {
  return rewardFlow.getLevelWinReward(levelIndex);
}

function setGameplayCoinTopbarVisible(show) {
  rewardFlow.setGameplayCoinTopbarVisible(show);
}

function playWinCoinFly() {
  rewardFlow.playWinCoinFly();
}

function settlePendingWinReward(playFx = false) {
  rewardFlow.settlePendingWinReward(playFx);
}

function bindHomeLevelButtons() {
  homeScreenController.bindHomeLevelButtons();
}

function updateHomeBubbles(dt) {
  homeScreenController.updateHomeBubbles(dt);
}

function renderHomeScreen() {
  homeScreenController.renderHomeScreen();
}

function showHomeScreen() {
  homeScreenController.showHomeScreen();
}

function hideHomeScreen() {
  homeScreenController.hideHomeScreen();
}

function setGameHudVisible(visible) {
  const hidden = !visible;
  hudEl?.classList.toggle("hidden", hidden);
  gameplayTopbarEl?.classList.toggle("hidden", hidden);
  gameplayTopbarEl?.classList.remove("is-floating-over-result");
  gameplayCoinStatusEl?.classList.toggle("hidden", hidden);
  gameplayCoinStatusEl?.classList.toggle("is-hidden-in-gameplay", visible);
  gameplaySettingsRootEl?.classList.toggle("hidden", hidden);
  gameplaySettingsMaskEl?.classList.toggle("hidden", true);
  gameplayExitMaskEl?.classList.toggle("hidden", true);
  gameplayExitModalEl?.classList.toggle("hidden", true);
  if (hidden) {
    hideGameplaySettingsMenu();
    hideGameplayExitModal();
  }
  commentaryEl?.classList.add("hidden");
  sliceStateEl?.classList.add("hidden");
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
  hideOutOfMovesBanner();
  if (!tryConsumeStaminaForLevelEntry()) {
    gameUI.closeResult();
    state.started = false;
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    clearBoardEntities();
    showHomeScreen();
    showHomeCenterTip("体力不足", 1200);
    return;
  }
  gameUI.closeResult();
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  const loaded = loadLevel(state.currentLevelIndex);
  if (!loaded) {
    restoreStaminaAfterFailedEntry();
    state.started = false;
    showHomeScreen();
  }
}

function backHomeFromResult() {
  hideOutOfMovesBanner();
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
  hideOutOfMovesBanner();
  if (!tryConsumeStaminaForLevelEntry()) return;
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
    restoreStaminaAfterFailedEntry();
    backHomeFromResult();
  }
}

function init() {
  hydrateLevelProgress();
  hydrateCoinBalance();
  hydrateStamina();
  applyHomeUiTuning(readHomeUiTuning());
  applyUiLayoutDebugTuning(uiLayoutDebugTuning);
  applyHudDebugTuning(hudDebugTuning);
  applyGameSettings();
  syncCoinUi();
  syncStaminaUi();
  state.inHome = true;
  updatePhoneAspect();
  setGameHudVisible(false);
  if (homeScreenEl) homeScreenEl.classList.remove("hidden");
  setupHomeFloatBubbles();
  renderHomeScreen();

  startBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    startGame();
  });
  restartBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    startGame();
  });
  bindHomeLevelButtons();
  bindHomeEnergyTip();
  bindHomeSettingsModal();
  bindGameplaySettingsMenu();
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
    gameAudio.playUiClickAudio();
    levelTestPanelEl.classList.toggle("hidden");
  });

  levelTestJumpBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
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
  hideOutOfMovesBanner();
  if (!tryConsumeStaminaForLevelEntry()) return;
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
    restoreStaminaAfterFailedEntry();
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
}

function tick() {
  if (!renderer) return;
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now();
  const wallNow = Date.now();

  updateTrail(now);
  processPendingPops(dt);
  updateHomeBubbles(dt);
  if (state.inHome && wallNow - state.staminaUiSyncAt >= 1000) {
    syncStaminaUi();
  }

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
    endGame(`第${state.currentLevelIndex + 1}关失败：步数用尽`, { showOutOfMovesBanner: true });
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
  stepsEl.textContent = `MOVE:${remaining}`;
  if (hudLevelEl) hudLevelEl.textContent = `LV:${state.currentLevelIndex + 1}`;
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
  updatePhoneAspect();
  if (!renderer) {
    return;
  }
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

  const framePadding = 24;
  const maxFrameWidth = 470;
  const availableWidth = Math.max(280, viewportWidth - framePadding);
  const availableHeight = Math.max(560, viewportHeight - framePadding);
  const widthByHeight = availableHeight * targetAspect;
  const frameWidth = Math.min(maxFrameWidth, availableWidth, widthByHeight);
  const frameHeight = frameWidth / targetAspect;
  const uiScale = THREE.MathUtils.clamp(frameHeight / 932, 0.76, 1.06);
  const compactWidthScale = frameWidth <= 330
    ? 0.85
    : frameWidth <= 360
      ? 0.9
      : frameWidth <= 430
        ? 0.96
        : 1;
  const fontScale = THREE.MathUtils.clamp(compactWidthScale * (0.96 + (uiScale - 0.9) * 0.22), 0.82, 1.05);
  const spaceScale = THREE.MathUtils.clamp(compactWidthScale * (0.98 + (uiScale - 0.9) * 0.2), 0.84, 1.04);
  const titleScale = THREE.MathUtils.clamp(fontScale * (frameWidth <= 360 ? 0.95 : 1), 0.8, 1.03);
  const labelScale = THREE.MathUtils.clamp(fontScale * 0.97, 0.82, 1.04);

  let homeLevelBoost = 1.5;
  if (rawAspect <= 0.48) homeLevelBoost = 1.5;
  else if (rawAspect <= 0.52) homeLevelBoost = 1.3;
  else if (rawAspect <= 0.58) homeLevelBoost = 1.2;

  if (viewportHeight < 700) homeLevelBoost = Math.min(homeLevelBoost, 1.2);
  if (viewportHeight < 620) homeLevelBoost = 1.1;

  const homeLevelOffsetY = Math.round(16 * uiScale * (homeLevelBoost - 1));

  document.documentElement.style.setProperty("--phone-aspect-live", `${targetAspect}`);
  document.documentElement.style.setProperty("--phone-frame-width", `${frameWidth.toFixed(2)}px`);
  document.documentElement.style.setProperty("--ui-scale", `${uiScale.toFixed(4)}`);
  document.documentElement.style.setProperty("--font-scale", `${fontScale.toFixed(4)}`);
  document.documentElement.style.setProperty("--space-scale", `${spaceScale.toFixed(4)}`);
  document.documentElement.style.setProperty("--title-scale", `${titleScale.toFixed(4)}`);
  document.documentElement.style.setProperty("--label-scale", `${labelScale.toFixed(4)}`);
  document.documentElement.style.setProperty("--home-level-boost", `${homeLevelBoost.toFixed(2)}`);
  document.documentElement.style.setProperty("--home-level-offset-y", `${homeLevelOffsetY}px`);
}

function endGame(reason, options = {}) {
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

  const openLoseResult = () => {
    gameUI.openResult("lose", {
      level: state.currentLevelIndex + 1,
      score: Math.max(0, state.stepLimit - state.stepsUsed),
      reward: 0,
      canNext: false,
      isFinal: false,
    });
  };

  if (options.showOutOfMovesBanner === true) {
    playOutOfMovesBanner(openLoseResult);
    return;
  }

  openLoseResult();
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
