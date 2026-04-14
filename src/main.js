import * as THREE from "three/webgpu";
import { LEVELS } from "./levels.js";
import { createLevelFlowController } from "./flow/level-flow.js";
import { createCollisionSystem } from "./systems/collision-system.js";
import { createSliceSystem } from "./systems/slice-system.js";
import { createVictoryRainSystem } from "./systems/victory-rain-system.js";
import { createBurstSystem } from "./systems/burst-system.js";
import { createGameUI } from "./ui/game-ui.js";
import { createResultPage } from "./ui/result-page.js";
import { createStartPageController } from "./ui/start-page.js";
import { createBubblePageController } from "./ui/bubble-page.js";
import { createTopStatusBarController } from "./ui/top-status-bar.js";
import { createGameHaptics } from "./haptics/game-haptics.js";
import { createGameAudio } from "./audio/game-audio.js";
import { createLevelRuntime } from "./content/level-runtime.js";
import { clampNumber, createLevelIndexClamper, createPersistenceController } from "./game/persistence.js";
import { readGameSettings, createSettingsUiController } from "./game/settings-ui.js";
import { createRewardFlow } from "./game/reward-flow.js";
import { createHomeScreenController } from "./game/home-screen.js";
import { createSessionFlowController } from "./game/session-flow.js";
import { createLayoutViewportController } from "./game/layout-viewport.js";
import { createRoundStateController } from "./game/round-state.js";
import { createBubbleMaterial, createBubbleEntityClass } from "./entities/bubble-entity.js";
import { SliceTrail } from "./entities/slice-trail.js";
import { calculateTheoryStepsRecursive, createHexTestFlowController } from "./flow/hex-test-flow.js";

const appEl = document.getElementById("app");
const phoneFrameEl = document.getElementById("phone-frame");
const hudEl = document.getElementById("hud");
const stepsEl = document.getElementById("score");
const hudLevelEl = document.getElementById("hud-level");
const sliceStateEl = document.getElementById("slice-state");
const commentaryEl = document.getElementById("commentary");
const levelGuideEl = document.getElementById("level-guide");
const levelGuideHandEl = document.getElementById("level-guide-hand");
const levelGuideTipEl = document.getElementById("level-guide-tip");
const lockGuideEl = document.getElementById("lock-guide");
const lockGuideSpotlightEl = document.getElementById("lock-guide-spotlight");
const lockGuideTipEl = document.getElementById("lock-guide-tip");
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
const levelTestNextStepBtn = document.getElementById("level-test-next-step");
const levelTestExportStepBtn = document.getElementById("level-test-export-step");
const levelTestBatchExportBtn = document.getElementById("level-test-batch-export");
const levelTestBubbleIndexBtn = document.getElementById("level-test-bubble-index");
const levelTestHexToggleEl = document.getElementById("level-test-hex-toggle");
const levelTestAddCoinsBtn = document.getElementById("level-test-add-coins");
const outOfMovesBannerEl = document.getElementById("out-of-moves-banner");
const outOfMovesContinueMaskEl = document.getElementById("out-of-moves-continue-mask");
const outOfMovesContinueModalEl = document.getElementById("out-of-moves-continue-modal");
const outOfMovesContinueCloseEl = document.getElementById("out-of-moves-continue-close");
const outOfMovesContinueMovesEl = document.getElementById("out-of-moves-continue-moves");
const outOfMovesContinueCostEl = document.getElementById("out-of-moves-continue-cost");
const outOfMovesContinueBuyEl = document.getElementById("out-of-moves-continue-buy");
const gameplayCenterTipEl = document.getElementById("gameplay-center-tip");

const isIOSDevice = (() => {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && touchPoints > 1);
})();

if (isIOSDevice) {
  document.documentElement.classList.add("platform-ios");
  if (document.body) document.body.classList.add("platform-ios");
}

function setupHomeFloatBubbles() {
  homeScreenController.setupHomeFloatBubbles();
}

const rules = {
  worldHeight: 10,
  minSliceSegment: 0.02,
  playAreaInset: 0.18,
};
const debugHexRadius = 0.1;

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
const level1TutorialSeenStorageKey = "fruit_level1_tutorial_seen_v1";
const lockTutorialSeenStorageKey = "fruit_lock_tutorial_seen_v1";
const staminaMax = 5;
const staminaRecoverIntervalMs = 25 * 60 * 1000;
const outOfMovesBannerDurationMs = 1800;
const outOfMovesContinueCost = 50;
const outOfMovesContinueMoves = 3;
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
const gainCoinSoundUrl = "./assets/audio/pop/gain_coin.wav";
const gameWinSoundUrl = "./assets/audio/pop/gamewin.wav";
const gameLoseSoundUrl = "./assets/audio/pop/gamelose.mp3";
const selectScaleFrequencies = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
const levelBgmUrl = "./assets/audio/bgm_preview/result_win_soft_carefree.mp3";
const iphoneAspectBase = 430 / 932;
const portraitAspectMin = 9 / 20;
const portraitAspectMax = 1 / 2;
const desktopAspectSwitchWidth = 820;

const colors = [
  { id: "red", name: "红泡", base: 0xff0037 },
  { id: "orange", name: "橙泡", base: 0xff8a00 },
  { id: "green", name: "绿泡", base: 0x00d86a },
  { id: "blue", name: "蓝泡", base: 0x00a6ff },
  { id: "purple", name: "紫泡", base: 0x8a2bff },
  { id: "yellow", name: "黄泡", base: 0xffef00 },
  { id: "pink", name: "粉泡", base: 0xff3dc2 },
  { id: "teal", name: "青泡", base: 0x00d4c1 },
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
let level1TutorialSeen = readLevel1TutorialSeen();
let lockTutorialSeen = readLockTutorialSeen();
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
  lockTutorialActive: false,
  showBubbleIndexOverlay: false,
  sliceHitIds: new Set(),
  sliceQueue: [],
  pendingPops: [],
  totalClearsThisLevel: 0,
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
  outOfMovesContinueOpen: false,
  outOfMovesContinuePending: false,
  outOfMovesContinueUsedInLevel: false,
  gameplayCenterTipTimer: 0,
  showHexOverlay: false,
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
let debugHexOverlayGroup = null;
let debugHexOverlayFillMesh = null;
const debugHexOverlayCenters = [];
const debugHexOverlayTopColorIds = [];
const debugHexOverlayTopZValues = [];
const debugHexOverlayHighlighted = new Set();
const debugHexOverlayLines = [];
const debugHexOverlayLabelEls = [];
let debugHexOverlayVertexOffsets = [];
let debugHexLabelLayerEl = null;
let debugBubbleLabelLayerEl = null;
const debugBubbleIndexEntries = [];
const debugHexFillWorkColor = new THREE.Color();
const debugHexFillInvertColor = new THREE.Color();
let levelsXlsxHandle = null;
let xlsxLoaderPromise = null;
let levelTestBatchExportRunning = false;

const bounds = { left: -3, right: 3, top: 5, bottom: -5 };
const fruits = [];

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const workHit = new THREE.Vector3();
const guideProjectA = new THREE.Vector3();
const guideProjectB = new THREE.Vector3();
const lockGuideProject = new THREE.Vector3();
const lockGuideProjectEdge = new THREE.Vector3();

const levelGuideState = {
  active: false,
  phase: "swipe",
  startFruit: null,
  endFruit: null,
  anchorX: 0,
  anchorY: 0,
  cycleStartedAt: 0,
  segmentMs: 760,
  holdMs: 180,
};

const lockGuideState = {
  active: false,
  targetFruit: null,
};

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
const createBubbleMaterialForTuning = (baseColor) => createBubbleMaterial(baseColor, bubbleTuning);

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

const hexTestFlow = createHexTestFlowController({
  gameUI,
  state,
  fruits,
  colors,
  hexOverlayCenters: debugHexOverlayCenters,
  hexOverlayTopColorIds: debugHexOverlayTopColorIds,
  hexOverlayHighlighted: debugHexOverlayHighlighted,
  rebuildHexOverlay: () => rebuildDebugHexOverlay(),
  updateHexOverlayColors: () => updateDebugHexOverlayColors(),
});

const BubbleEntity = createBubbleEntityClass({
  bubbleTuning,
  bubbleBaseRadius,
  bubbleGeometry,
  wallSlideDamping,
  wallContactGain,
  burstSystem,
  createBubbleMaterialFn: createBubbleMaterialForTuning,
});

const topStatusBarController = createTopStatusBarController({
  state,
  topbarEl: gameplayTopbarEl,
  coinStatusEl: gameplayCoinStatusEl,
});

const rewardFlow = createRewardFlow({
  state,
  coinStorageKey,
  levelWinRewardBase,
  getGameUI: () => gameUI,
  homeCoinEl,
  onSetResultCoinTopbarVisible: (show) => topStatusBarController.setResultCoinTopbarVisible(show),
  onCoinArriveSfx: () => gameAudio.playGainCoinAudio(),
});

const layoutViewport = createLayoutViewportController({
  elements: {
    appEl,
    phoneFrameEl,
    resultPageEl,
    hudEl,
    gameplaySettingsRootEl,
    gameplaySettingsMaskEl,
    gameplayExitMaskEl,
    gameplayExitModalEl,
    commentaryEl,
    sliceStateEl,
    levelTestPanelEl,
  },
  constants: {
    desktopAspectSwitchWidth,
    iphoneAspectBase,
    portraitAspectMin,
    portraitAspectMax,
  },
  camera,
  bounds,
  rules,
  levelRuntime,
  getRenderer: () => renderer,
  onHideGameplaySettingsMenu: hideGameplaySettingsMenu,
  onHideGameplayExitModal: hideGameplayExitModal,
  onSetTopStatusVisible: (visible) => topStatusBarController.setHudVisible(visible),
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

const roundState = createRoundStateController({
  state,
  fruits,
  scene,
  burstSystem,
  victoryRainSystem,
  getTrail: () => trail,
  slicePopStaggerStep,
  onPlayPopAudio: () => gameAudio.playRandomPopAudio(),
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
  createHomeBubbleEntity: ({ id, colorId }) => {
    const entity = new BubbleEntity({
      id,
      colorId,
      radius: 1,
      vx: 0,
      vy: 0,
      baseColor: new THREE.Color(colors[colorId].base).offsetHSL(0, 0.1, 0),
    });
    entity.baseOpacity = 0.96;
    entity.bubbleMaterial.opacity = 0.96;
    return entity;
  },
  scene,
  bubbleBaseRadius,
  onPlayUiClick: () => gameAudio.playUiClickAudio(),
  onShowCommentary: (text, durationMs) => gameUI.showCommentary(text, durationMs),
});

const sessionFlow = createSessionFlowController({
  state,
  fruits,
  colors,
  bounds,
  scene,
  levelRuntime,
  levelFlow,
  gameAudio,
  gameUI,
  burstSystem,
  victoryRainSystem,
  getTrail: () => trail,
  clampLevelIndex,
  hasBubbleTuningOverride,
  onHideOutOfMovesBanner: hideOutOfMovesBanner,
  onTryConsumeStaminaForLevelEntry: tryConsumeStaminaForLevelEntry,
  onSettlePendingWinReward: settlePendingWinReward,
  onRestoreStaminaAfterFailedEntry: restoreStaminaAfterFailedEntry,
  onShowHomeScreen: showHomeScreen,
  onHideHomeScreen: hideHomeScreen,
  onShowHomeCenterTip: showHomeCenterTip,
  onSetLevelTestSelection: setLevelTestSelection,
  onUpdateStepsHud: updateStepsHud,
  onClearQueuedSelections: clearQueuedSelections,
  onPlayOutOfMovesBanner: playOutOfMovesBanner,
  onClearBoardEntities: clearBoardEntities,
  onPersistLevelProgress: persistLevelProgress,
  onBackHomeFromResult: backHomeFromResult,
  onAfterLevelLoaded: (index) => {
    maybeShowLevel1Guide(index);
    maybeShowLockGuide();
    if (state.showHexOverlay) {
      if (!debugHexOverlayCenters.length) rebuildDebugHexOverlay();
      updateDebugHexOverlayColors();
    }
  },
  createBubbleEntity: ({ id, colorId, radius, vx, vy, baseColor }) => new BubbleEntity({
    id,
    colorId,
    radius,
    vx,
    vy,
    baseColor,
  }),
});

const startPageController = createStartPageController({
  startBtn,
  restartBtn,
  onPlayUiClick: () => gameAudio.playUiClickAudio(),
  onStart: () => startGame(),
});

const bubblePageController = createBubblePageController({
  state,
  phoneFrameEl,
  outOfMovesBannerEl,
  initialElements: {
    maskEl: outOfMovesContinueMaskEl,
    modalEl: outOfMovesContinueModalEl,
    closeEl: outOfMovesContinueCloseEl,
    movesEl: outOfMovesContinueMovesEl,
    costEl: outOfMovesContinueCostEl,
    buyEl: outOfMovesContinueBuyEl,
    centerTipEl: gameplayCenterTipEl,
  },
  constants: {
    bannerDurationMs: outOfMovesBannerDurationMs,
    continueCost: outOfMovesContinueCost,
    continueMoves: outOfMovesContinueMoves,
  },
  onSetContinueCoinTopbarVisible: (show) => topStatusBarController.setContinueCoinTopbarVisible(show),
  onTrySpendCoins: (value) => trySpendCoins(value),
  onUpdateStepsHud: () => updateStepsHud(),
  onShowCommentary: (text, durationMs) => gameUI.showCommentary(text, durationMs),
  onEndGame: (reason, options) => endGame(reason, options),
  onClearQueuedSelections: () => clearQueuedSelections(),
  onResetTrail: () => trail?.reset(),
  onPlayUiClick: () => gameAudio.playUiClickAudio(),
});

init();

function createGameRuntime() {
  const gameHaptics = createGameHaptics();

  const resultController = createResultPage({
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
    onRetry: () => {
      gameAudio.playUiClickAudio();
      retryCurrentLevelFromResult();
    },
    onNext: () => {
      gameAudio.playUiClickAudio();
      levelFlow.continueToNextLevel();
    },
    onBack: () => {
      gameAudio.playUiClickAudio();
      backHomeFromResult();
    },
  });

  const gameUI = createGameUI({
    sliceStateEl,
    commentaryEl,
    levelGuideEl,
    levelGuideHandEl,
    levelGuideTipEl,
    gameOverEl,
    gameOverTitleEl,
    resultController,
    coinStatus: {
      rootEl: gameplayCoinStatusEl,
      valueEl: gameplayCoinTextEl,
    },
    coinFly: {
      layerEl: coinFlyLayerEl,
      frameEl: phoneFrameEl,
    },
  });

  const burstSystem = createBurstSystem({
    scene,
    colors,
    bubbleTuning,
    bubbleBaseRadius,
    burstBubbleGeometry,
    createBubbleMaterial: createBubbleMaterialForTuning,
    poolSize: 180,
  });

  const gameAudio = createGameAudio({
    popSoundUrls,
    clickSoundUrl,
    gainCoinSoundUrl,
    gameWinSoundUrl,
    gameLoseSoundUrl,
    selectScaleFrequencies,
    levelBgmUrl,
    onUiClick: () => gameHaptics.uiClick(),
    onSelectTone: () => gameHaptics.select(),
    onErrorTone: () => gameHaptics.error(),
    onPop: () => gameHaptics.pop(),
    onGainCoin: () => gameHaptics.gainCoin(),
    onWin: () => gameHaptics.win(),
    onLose: () => gameHaptics.lose(),
  });

  const victoryRainSystem = createVictoryRainSystem({
    scene,
    bounds,
    colors,
    bubbleRadiusScale,
    bubbleBaseRadius,
    emitDuration: 0.9,
    spawnRate: 108,
    maxBubbles: 88,
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
      gameAudio.playGameWinAudio();
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
      gameAudio.playGameWinAudio();
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
    referenceViewportAspect: iphoneAspectBase,
    referenceWorldHeight: rules.worldHeight,
    referencePlayAreaInset: rules.playAreaInset,
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

function readLevel1TutorialSeen() {
  if (typeof window === "undefined" || !window.localStorage) return false;

  try {
    return window.localStorage.getItem(level1TutorialSeenStorageKey) === "1";
  } catch (_err) {
    return false;
  }
}

function persistLevel1TutorialSeen() {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.setItem(level1TutorialSeenStorageKey, "1");
  } catch (_err) {}
}

function readLockTutorialSeen() {
  if (typeof window === "undefined" || !window.localStorage) return false;

  try {
    return window.localStorage.getItem(lockTutorialSeenStorageKey) === "1";
  } catch (_err) {
    return false;
  }
}

function persistLockTutorialSeen() {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.setItem(lockTutorialSeenStorageKey, "1");
  } catch (_err) {}
}

function isGuideFruitValid(fruit) {
  return Boolean(fruit && fruit.active && !fruit.sliced && fruit.group?.visible !== false);
}

function pickLevelGuidePair() {
  const byColor = new Map();
  for (let i = 0; i < fruits.length; i += 1) {
    const fruit = fruits[i];
    if (!isGuideFruitValid(fruit)) continue;
    const bucket = byColor.get(fruit.colorId);
    if (bucket) bucket.push(fruit);
    else byColor.set(fruit.colorId, [fruit]);
  }

  let best = null;
  let bestScore = -Infinity;
  for (const bucket of byColor.values()) {
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length - 1; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const a = bucket[i];
        const b = bucket[j];
        const dx = a.group.position.x - b.group.position.x;
        const dy = a.group.position.y - b.group.position.y;
        const dist = Math.hypot(dx, dy);
        const radiusSum = Math.max(0.001, a.radius + b.radius);
        const normalizedDist = dist / radiusSum;
        if (normalizedDist < 0.92 || normalizedDist > 2.35) continue;

        const midX = (a.group.position.x + b.group.position.x) * 0.5;
        const midY = (a.group.position.y + b.group.position.y) * 0.5;
        const centerBias =
          Math.abs(midX) / Math.max(0.001, Math.abs(bounds.right))
          + Math.abs(midY) / Math.max(0.001, Math.abs(bounds.top));
        const adjacencyBias = 3.4 - Math.abs(normalizedDist - 1.35) * 2.6;
        const score = adjacencyBias - centerBias;
        if (score > bestScore) {
          bestScore = score;
          best = a.group.position.x <= b.group.position.x
            ? { startFruit: a, endFruit: b }
            : { startFruit: b, endFruit: a };
        }
      }
    }
  }

  return best;
}

function worldToGuidePoint(world, outVec3) {
  if (!renderer || !phoneFrameEl) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  const frameRect = phoneFrameEl.getBoundingClientRect();
  outVec3.copy(world).project(camera);
  const x = ((outVec3.x + 1) * 0.5) * rect.width + rect.left - frameRect.left;
  const y = ((-outVec3.y + 1) * 0.5) * rect.height + rect.top - frameRect.top;
  return { x, y };
}

function isLockGuideFruitValid(fruit) {
  return Boolean(fruit && fruit.active && !fruit.sliced && fruit.locked && fruit.group?.visible !== false);
}

function stopLockGuide() {
  lockGuideState.active = false;
  lockGuideState.targetFruit = null;
  state.lockTutorialActive = false;
  lockGuideEl?.classList.add("hidden");
}

function findFirstLockedFruit() {
  for (let i = 0; i < fruits.length; i += 1) {
    const fruit = fruits[i];
    if (isLockGuideFruitValid(fruit)) return fruit;
  }
  return null;
}

function updateLockGuideOverlay() {
  if (!lockGuideState.active || !lockGuideState.targetFruit) return;
  const fruit = lockGuideState.targetFruit;
  if (!isLockGuideFruitValid(fruit) || !state.started || state.inHome || state.gameOver) {
    stopLockGuide();
    return;
  }

  const point = worldToGuidePoint(fruit.group.position, lockGuideProject);
  if (!point) return;

  lockGuideProjectEdge.copy(fruit.group.position);
  lockGuideProjectEdge.x += fruit.radius;
  const edgePoint = worldToGuidePoint(lockGuideProjectEdge, guideProjectB);
  const projectedRadius = edgePoint ? Math.hypot(edgePoint.x - point.x, edgePoint.y - point.y) : fruit.radius * 32;

  const diameter = Math.max(84, projectedRadius * 2.22);
  if (lockGuideEl) {
    lockGuideEl.style.setProperty("--lock-guide-x", `${point.x.toFixed(2)}px`);
    lockGuideEl.style.setProperty("--lock-guide-y", `${point.y.toFixed(2)}px`);
    lockGuideEl.style.setProperty("--lock-guide-r", `${(diameter * 0.5).toFixed(2)}px`);
  }
  if (lockGuideSpotlightEl) {
    lockGuideSpotlightEl.style.left = `${point.x.toFixed(2)}px`;
    lockGuideSpotlightEl.style.top = `${point.y.toFixed(2)}px`;
    lockGuideSpotlightEl.style.width = `${diameter.toFixed(1)}px`;
    lockGuideSpotlightEl.style.height = `${diameter.toFixed(1)}px`;
  }
  if (lockGuideTipEl) {
    lockGuideTipEl.style.left = `${point.x.toFixed(2)}px`;
    lockGuideTipEl.style.top = `${(point.y - diameter * 0.56).toFixed(2)}px`;
  }
}

function showLockGuide(targetFruit) {
  if (!targetFruit || !lockGuideEl) return;
  lockGuideState.active = true;
  lockGuideState.targetFruit = targetFruit;
  state.lockTutorialActive = true;
  lockGuideEl.classList.remove("hidden");
  updateLockGuideOverlay();
}

function maybeShowLockGuide() {
  if (lockTutorialSeen) {
    stopLockGuide();
    return;
  }

  const hasLockConfig = Array.isArray(state.activeLevel?.lockedBubbles) && state.activeLevel.lockedBubbles.length > 0;
  if (!hasLockConfig) {
    stopLockGuide();
    return;
  }

  const target = findFirstLockedFruit();
  if (!target) {
    stopLockGuide();
    return;
  }

  showLockGuide(target);
}

function stopLevel1Guide() {
  levelGuideState.active = false;
  levelGuideState.phase = "swipe";
  levelGuideState.startFruit = null;
  levelGuideState.endFruit = null;
  levelGuideState.anchorX = 0;
  levelGuideState.anchorY = 0;
  gameUI.hideLevelGuide();
}

function tryActivateLevel1Guide() {
  const pair = pickLevelGuidePair();
  if (!pair) {
    stopLevel1Guide();
    return false;
  }

  levelGuideState.active = true;
  levelGuideState.phase = "swipe";
  levelGuideState.startFruit = pair.startFruit;
  levelGuideState.endFruit = pair.endFruit;
  levelGuideState.cycleStartedAt = performance.now();
  gameUI.showLevelGuide();
  gameUI.setLevelGuideHandVisible(true);
  return true;
}

function updateLevel1Guide(now) {
  if (!levelGuideState.active) return;
  if (!state.started || state.gameOver || state.levelTransitioning || state.currentLevelIndex !== 0) {
    stopLevel1Guide();
    return;
  }

  if (levelGuideState.phase === "swipe") {
    if (state.sliceCommitted) {
      levelGuideState.phase = "await-warning";
      gameUI.setLevelGuideHandVisible(false);
      gameUI.hideLevelGuideTip();
    }
  }

  if (levelGuideState.phase === "swipe") {
    if (!isGuideFruitValid(levelGuideState.startFruit) || !isGuideFruitValid(levelGuideState.endFruit)) {
      if (!tryActivateLevel1Guide()) return;
    }

    const start = worldToGuidePoint(levelGuideState.startFruit.group.position, guideProjectA);
    const end = worldToGuidePoint(levelGuideState.endFruit.group.position, guideProjectB);
    if (!start || !end) return;

    levelGuideState.anchorX = start.x;
    levelGuideState.anchorY = start.y;

    const seg = levelGuideState.segmentMs;
    const hold = levelGuideState.holdMs;
    const cycle = seg * 2 + hold * 2;
    const elapsed = (now - levelGuideState.cycleStartedAt) % cycle;

    let p = 0;
    let scale = 0.98;
    if (elapsed < seg) {
      p = elapsed / seg;
    } else if (elapsed < seg + hold) {
      p = 1;
      scale = 1.06;
    } else if (elapsed < seg + hold + seg) {
      p = 1 - (elapsed - seg - hold) / seg;
    } else {
      p = 0;
      scale = 1.06;
    }

    const x = THREE.MathUtils.lerp(start.x, end.x, p);
    const y = THREE.MathUtils.lerp(start.y, end.y, p);
    gameUI.setLevelGuidePosition(x, y, scale);
    gameUI.setLevelGuideTipPosition(start.x, start.y - 38);
    return;
  }

  if (levelGuideState.phase === "await-warning") {
    let burstAnimating = false;
    for (let i = 0; i < fruits.length; i += 1) {
      const fruit = fruits[i];
      if (!fruit?.active || !fruit.sliced) continue;
      if (fruit.burstState === "PRE_BURST" || fruit.burstState === "BURST") {
        burstAnimating = true;
        break;
      }
    }

    if (!state.pointerDown && state.pendingPops.length === 0 && !burstAnimating) {
      levelGuideState.phase = "warn";
      gameUI.showLevelGuideTip("Touching a different color will clear immediately. Watch out!", "warning");
    }
  }

}

function maybeShowLevel1Guide(levelIndex) {
  if (levelIndex !== 0 || level1TutorialSeen) {
    stopLevel1Guide();
    return;
  }

  tryActivateLevel1Guide();
  gameUI.showLevelGuideTip("Keep slicing the same color to clear them together!");
  level1TutorialSeen = true;
  persistLevel1TutorialSeen();
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
  layoutViewport.applyHomeUiTuning(values);
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
  layoutViewport.applyUiLayoutDebugTuning(values);
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
  layoutViewport.applyHudDebugTuning(values);
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
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
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
    window.localStorage.removeItem(level1TutorialSeenStorageKey);
    window.localStorage.removeItem(lockTutorialSeenStorageKey);
  }

  level1TutorialSeen = false;
  lockTutorialSeen = false;
  stopLevel1Guide();
  stopLockGuide();

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

  gameUI.showCommentary("Gameplay data cleared (TopBar and bubble tuning kept).", 1400);
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
    showHomeCenterTip("Not enough stamina", 1200);
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

function ensureOutOfMovesContinueElements() {
  bubblePageController.ensureOutOfMovesContinueElements();
}

function bindHomeEnergyTip() {
  homeScreenController.bindHomeEnergyTip();
}

function hideOutOfMovesBanner() {
  bubblePageController.hideOutOfMovesBanner();
}

function playOutOfMovesBanner(onDone) {
  bubblePageController.playOutOfMovesBanner(onDone);
}

function syncOutOfMovesContinueModalUi() {
  bubblePageController.syncOutOfMovesContinueModalUi();
}

function hideOutOfMovesContinueModal() {
  bubblePageController.hideOutOfMovesContinueModal();
}

function triggerOutOfMovesContinueFlow() {
  bubblePageController.triggerOutOfMovesContinueFlow();
}

function bindOutOfMovesContinueModal() {
  bubblePageController.bindOutOfMovesContinueModal();
}

function persistCoinBalance() {
  rewardFlow.persistCoinBalance();
}

function syncCoinUi() {
  rewardFlow.syncCoinUi();
  syncOutOfMovesContinueModalUi();
}

function addCoins(value) {
  rewardFlow.addCoins(value);
}

function trySpendCoins(value) {
  return rewardFlow.trySpendCoins(value);
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
  stopLockGuide();
  homeScreenController.showHomeScreen();
}

function hideHomeScreen() {
  homeScreenController.hideHomeScreen();
}

function setGameHudVisible(visible) {
  layoutViewport.setGameHudVisible(visible);
}

function clearBoardEntities() {
  roundState.clearBoardEntities();
}

function grantLevelWinProgress(nextLevelIndex) {
  sessionFlow.grantLevelWinProgress(nextLevelIndex);
}

function retryCurrentLevelFromResult() {
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  sessionFlow.retryCurrentLevelFromResult();
}

function backHomeFromResult() {
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  sessionFlow.backHomeFromResult();
}

function startNextLevel(nextLevelIndex) {
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  sessionFlow.startNextLevel(nextLevelIndex);
}

function init() {
  ensureOutOfMovesContinueElements();
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

  startPageController.bindStartActions();
  bindHomeLevelButtons();
  bindHomeEnergyTip();
  bindHomeSettingsModal();
  bindGameplaySettingsMenu();
  bindOutOfMovesContinueModal();
  gameUI.closeResult();
  setupLevelTestControls();

  window.addEventListener("resize", resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
    window.visualViewport.addEventListener("scroll", resize);
  }
  appEl.addEventListener("pointerdown", onPointerDown);
  appEl.addEventListener("pointermove", onPointerMove);
  appEl.addEventListener("pointerup", onPointerUp);
  appEl.addEventListener("pointercancel", onPointerUp);
  appEl.style.touchAction = "none";
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  lockGuideEl?.addEventListener("pointerdown", () => {
    if (!lockGuideState.active) return;
    persistLockTutorialSeen();
    lockTutorialSeen = true;
    stopLockGuide();
  });

  setupRenderer();
}

function setupLevelTestControls() {
  if (!levelTestToggleBtn || !levelTestPanelEl || !levelTestSelectEl) {
    return;
  }

  if (levelTestHexToggleEl) {
    levelTestHexToggleEl.checked = state.showHexOverlay;
  }
  updateLevelTestFlowButtonLabel();
  updateDebugBubbleIndexButtonLabel();

  let addCoinsBtn = levelTestAddCoinsBtn;
  if (!addCoinsBtn) {
    const host = document.getElementById("level-test");
    if (host) {
      addCoinsBtn = document.createElement("button");
      addCoinsBtn.id = "level-test-add-coins";
      addCoinsBtn.className = "tool-btn";
      addCoinsBtn.type = "button";
      addCoinsBtn.textContent = "Test +50 Coins";
      host.insertBefore(addCoinsBtn, levelTestToggleBtn);
    }
  }

  levelTestSelectEl.innerHTML = "";
  for (let i = 0; i < LEVELS.length; i += 1) {
    const level = LEVELS[i];
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Level ${i + 1} ${level.name}`;
    levelTestSelectEl.appendChild(option);
  }

  levelTestToggleBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    levelTestPanelEl.classList.toggle("hidden");
  });

  const jumpToSelectedLevel = () => {
    const targetIndex = Number(levelTestSelectEl.value);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= LEVELS.length) {
      return;
    }
    jumpToLevelForTest(targetIndex);
  };

  if (levelTestJumpBtn) {
    levelTestJumpBtn.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      jumpToSelectedLevel();
    });
  } else {
    levelTestSelectEl.addEventListener("change", () => {
      gameAudio.playUiClickAudio();
      jumpToSelectedLevel();
    });
  }

  levelTestHexToggleEl?.addEventListener("change", () => {
    state.showHexOverlay = Boolean(levelTestHexToggleEl.checked);
    updateDebugHexOverlayColors();
    gameUI.showCommentary(state.showHexOverlay ? "六边形已显示" : "六边形已隐藏", 700);
  });

  levelTestNextStepBtn?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    try {
      if (!canRunLevelTestFlow()) {
        hexTestFlow.reset();
        updateLevelTestFlowButtonLabel();
        return;
      }

      ensureHexOverlayVisibleForTest();
      levelTestNextStepBtn.textContent = hexTestFlow.runNext();
    } catch (error) {
      console.error("Level test flow click failed", error);
      updateLevelTestFlowButtonLabel();
      gameUI.showCommentary("测试流程执行失败，请重试", 900);
    }
  });

  levelTestExportStepBtn?.addEventListener("click", () => {
    void calculateAndExportTheoryStep();
  });

  levelTestBatchExportBtn?.addEventListener("click", () => {
    void runBatchExportBySimulatedLevelEntry();
  });

  levelTestBubbleIndexBtn?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    state.showBubbleIndexOverlay = !state.showBubbleIndexOverlay;
    updateDebugBubbleIndexButtonLabel();
    if (state.showBubbleIndexOverlay) {
      rebuildDebugBubbleIndexLabels();
      gameUI.showCommentary("已显示泡泡Index", 800);
    } else {
      gameUI.showCommentary("已隐藏泡泡Index", 800);
    }
  });

  addCoinsBtn?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    addCoins(50);
    gameUI.showCommentary("Test: +50 coins added", 1200);
  });
}

function canRunLevelTestFlow() {
  return state.started && !state.inHome;
}

function ensureHexOverlayVisibleForTest() {
  if (state.showHexOverlay) return;
  state.showHexOverlay = true;
  if (levelTestHexToggleEl) levelTestHexToggleEl.checked = true;
}

function syncHexOverlayToggleUI() {
  if (!levelTestHexToggleEl) return;
  levelTestHexToggleEl.checked = state.showHexOverlay;
}

function updateLevelTestFlowButtonLabel() {
  if (!levelTestNextStepBtn) return;
  levelTestNextStepBtn.textContent = hexTestFlow.getLabel();
}

function loadXlsxBrowserLibrary() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxLoaderPromise) return xlsxLoaderPromise;

  xlsxLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.async = true;
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX);
      else reject(new Error("XLSX loader failed"));
    };
    script.onerror = () => reject(new Error("无法加载 xlsx 库"));
    document.head.appendChild(script);
  });

  return xlsxLoaderPromise;
}

async function getLevelsWorkbookHandle() {
  if (levelsXlsxHandle) return levelsXlsxHandle;
  if (typeof window.showOpenFilePicker !== "function") {
    throw new Error("当前浏览器不支持文件写入API");
  }

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "Excel Workbook",
        accept: {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        },
      },
    ],
    excludeAcceptAllOption: false,
  });
  levelsXlsxHandle = handle;
  return handle;
}

async function writeTheoryStepToWorkbook(levelId, stepCount) {
  const XLSX = await loadXlsxBrowserLibrary();
  const handle = await getLevelsWorkbookHandle();
  const file = await handle.getFile();
  const raw = await file.arrayBuffer();
  const workbook = XLSX.read(raw, { type: "array" });
  const sheetName = workbook.SheetNames.includes("Levels") ? "Levels" : workbook.SheetNames[0];
  if (!sheetName) throw new Error("工作簿中没有可用sheet");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const normalize = (v) => String(v ?? "").trim().toLowerCase();
  const canonical = (v) => normalize(v).replace(/[\s_\-]+/g, "").replace(/\uFEFF/g, "");
  const theoryAliases = new Set(["intheorystep", "theorystep", "理论步数", "理论步", "理论step"]);
  const headerRowIndex = rows.findIndex((row) => Array.isArray(row) && row.some((c) => canonical(c) === "id"));
  if (headerRowIndex < 0) throw new Error("未找到id列");

  const headerRow = rows[headerRowIndex];
  const idCol = headerRow.findIndex((c) => canonical(c) === "id");
  let theoryCol = headerRow.findIndex((c) => theoryAliases.has(canonical(c)));
  if (theoryCol < 0) {
    theoryCol = headerRow.length;
    headerRow[theoryCol] = "inTheoryStep";
  }

  let targetRow = -1;
  for (let r = headerRowIndex + 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    if (Number(row[idCol]) === Number(levelId)) {
      targetRow = r;
      break;
    }
  }
  if (targetRow < 0) throw new Error(`未找到关卡 id=${levelId}`);

  rows[targetRow][theoryCol] = Number(stepCount);
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);

  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const writable = await handle.createWritable();
  await writable.write(output);
  await writable.close();
}

async function calculateAndExportTheoryStep() {
  if (!state.started || state.inHome) {
    gameUI.showCommentary("请先开始战斗再计算步数", 1000);
    return;
  }

  if (!debugHexOverlayCenters.length) {
    rebuildDebugHexOverlay();
    updateDebugHexOverlayColors();
  }

  const simFruits = buildActiveFruitSnapshot();

  const stepCount = calculateTheoryStepsRecursive({
    centers: debugHexOverlayCenters,
    fruits: simFruits,
    totalClears: state.totalClearsThisLevel ?? 0,
  });
  const levelId = state.activeLevel?.id ?? state.currentLevelIndex + 1;

  try {
    await writeTheoryStepToWorkbook(levelId, stepCount);
    gameUI.showCommentary(`理论步数=${stepCount}，已写入 Levels.xlsx`, 1300);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    gameUI.showCommentary(`导出失败：${message}`, 1400);
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function runBatchExportBySimulatedLevelEntry() {
  if (levelTestBatchExportRunning) {
    gameUI.showCommentary("批量导出进行中，请稍候", 900);
    return;
  }

  levelTestBatchExportRunning = true;
  if (levelTestBatchExportBtn) {
    levelTestBatchExportBtn.disabled = true;
    levelTestBatchExportBtn.textContent = "批量导出中...";
  }

  try {
    await getLevelsWorkbookHandle();

    if (!state.started || state.inHome || state.gameOver) {
      startGame();
      await delay(120);
    }

    const warmupMs = 5000;
    for (let index = 0; index < LEVELS.length; index += 1) {
      jumpToLevelForTest(index);
      gameUI.showCommentary(`批量导出：关卡 ${index + 1}/${LEVELS.length} 预热中`, 700);
      await delay(warmupMs);
      await calculateAndExportTheoryStep();
      await delay(60);
    }

    gameUI.showCommentary("批量导出完成", 1500);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    gameUI.showCommentary(`批量导出失败：${message}`, 1500);
  } finally {
    levelTestBatchExportRunning = false;
    if (levelTestBatchExportBtn) {
      levelTestBatchExportBtn.disabled = false;
      levelTestBatchExportBtn.textContent = "批量模拟并导出步数";
    }
  }
}

function buildActiveFruitSnapshot() {
  const snapshot = [];
  for (let i = 0; i < fruits.length; i += 1) {
    const fruit = fruits[i];
    if (!fruit?.active || fruit.sliced) continue;
    snapshot.push({
      x: fruit.group.position.x,
      y: fruit.group.position.y,
      z: fruit.group.position.z + (fruit.bubble?.position.z ?? 0),
      radius: fruit.radius,
      colorId: fruit.colorId,
      active: true,
      locked: Boolean(fruit.locked),
      unlockRuleType: fruit.unlockRuleType,
      unlockTarget: fruit.unlockTarget,
    });
  }
  return snapshot;
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
  hexTestFlow.reset();
  updateDebugHexOverlayColors();
  updateLevelTestFlowButtonLabel();
  if (levelTestPanelEl) levelTestPanelEl.classList.add("hidden");
  gameUI.showCommentary(`Test mode: switched to Level ${index + 1}`, 1400);
}

function setDebugHexLineStyle(index, colorId) {
  const line = debugHexOverlayLines[index];
  if (!line || !line.material) return;

  if (colorId < 0) {
    if (debugHexOverlayFillMesh) {
      debugHexFillWorkColor.setHex(0x000000);
      debugHexOverlayFillMesh.setColorAt(index, debugHexFillWorkColor);
    }
    line.material.color.setHex(0x000000);
    line.material.opacity = 0.45;
    return;
  }

  const baseHex = colors[colorId]?.base ?? 0xffffff;
  if (debugHexOverlayHighlighted.has(index)) {
    debugHexFillInvertColor.setHex(baseHex);
    debugHexFillWorkColor.setRGB(1 - debugHexFillInvertColor.r, 1 - debugHexFillInvertColor.g, 1 - debugHexFillInvertColor.b);
    if (debugHexOverlayFillMesh) debugHexOverlayFillMesh.setColorAt(index, debugHexFillWorkColor);
    line.material.color.setRGB(1 - debugHexFillInvertColor.r, 1 - debugHexFillInvertColor.g, 1 - debugHexFillInvertColor.b);
    line.material.opacity = 0.95;
    return;
  }

  if (debugHexOverlayFillMesh) {
    debugHexFillWorkColor.setHex(baseHex);
    debugHexOverlayFillMesh.setColorAt(index, debugHexFillWorkColor);
  }
  line.material.color.setHex(baseHex);
  line.material.opacity = 0.72;
}

function ensureDebugHexLabelLayer() {
  if (debugHexLabelLayerEl) return debugHexLabelLayerEl;
  if (!appEl) return null;
  const layer = document.createElement("div");
  layer.id = "debug-hex-label-layer";
  layer.style.position = "absolute";
  layer.style.left = "0";
  layer.style.top = "0";
  layer.style.width = "100%";
  layer.style.height = "100%";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "8";
  appEl.appendChild(layer);
  debugHexLabelLayerEl = layer;
  return debugHexLabelLayerEl;
}

function clearDebugHexLabelLayer() {
  const layer = ensureDebugHexLabelLayer();
  if (!layer) return;
  layer.innerHTML = "";
  debugHexOverlayLabelEls.length = 0;
}

function ensureDebugBubbleLabelLayer() {
  if (debugBubbleLabelLayerEl) return debugBubbleLabelLayerEl;
  if (!appEl) return null;
  const layer = document.createElement("div");
  layer.id = "debug-bubble-label-layer";
  layer.style.position = "absolute";
  layer.style.left = "0";
  layer.style.top = "0";
  layer.style.width = "100%";
  layer.style.height = "100%";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "9";
  appEl.appendChild(layer);
  debugBubbleLabelLayerEl = layer;
  return debugBubbleLabelLayerEl;
}

function clearDebugBubbleIndexLabels() {
  const layer = ensureDebugBubbleLabelLayer();
  if (!layer) return;
  layer.innerHTML = "";
  debugBubbleIndexEntries.length = 0;
}

function rebuildDebugBubbleIndexLabels() {
  clearDebugBubbleIndexLabels();
  if (!state.showBubbleIndexOverlay) return;
  const layer = ensureDebugBubbleLabelLayer();
  if (!layer) return;

  for (let i = 0; i < fruits.length; i += 1) {
    const fruit = fruits[i];
    if (!fruit) continue;
    const labelEl = document.createElement("div");
    labelEl.style.position = "absolute";
    labelEl.style.transform = "translate(-50%, -50%)";
    labelEl.style.font = "700 12px/1.1 'Avenir Next', 'PingFang SC', sans-serif";
    labelEl.style.color = "#fff";
    labelEl.style.background = "rgba(16, 30, 54, 0.72)";
    labelEl.style.border = "1px solid rgba(154, 224, 255, 0.7)";
    labelEl.style.borderRadius = "10px";
    labelEl.style.padding = "1px 6px";
    labelEl.style.textAlign = "center";
    labelEl.style.textShadow = "0 1px 1px rgba(0,0,0,0.35)";
    labelEl.textContent = `#${fruit.id}`;
    layer.appendChild(labelEl);
    debugBubbleIndexEntries.push({ fruit, labelEl });
  }
}

function updateDebugBubbleIndexButtonLabel() {
  if (!levelTestBubbleIndexBtn) return;
  levelTestBubbleIndexBtn.textContent = state.showBubbleIndexOverlay ? "隐藏泡泡Index" : "显示泡泡Index";
}

function updateDebugBubbleIndexLabels() {
  const layer = ensureDebugBubbleLabelLayer();
  if (!layer) return;
  const visible = state.showBubbleIndexOverlay && state.started && !state.inHome;
  layer.style.display = visible ? "block" : "none";
  if (!visible) return;

  if (debugBubbleIndexEntries.length !== fruits.length) {
    rebuildDebugBubbleIndexLabels();
  }

  for (let i = 0; i < debugBubbleIndexEntries.length; i += 1) {
    const entry = debugBubbleIndexEntries[i];
    const fruit = entry.fruit;
    const labelEl = entry.labelEl;
    if (!fruit?.active || fruit.sliced || !fruit.group.visible) {
      labelEl.style.display = "none";
      continue;
    }

    const yOffset = fruit.radius * 0.35;
    const pos = worldToOverlayPosition(
      fruit.group.position.x,
      fruit.group.position.y + yOffset,
      fruit.group.position.z + 0.95
    );
    if (!pos) {
      labelEl.style.display = "none";
      continue;
    }

    labelEl.style.display = "block";
    labelEl.style.left = `${pos.x}px`;
    labelEl.style.top = `${pos.y}px`;
    labelEl.style.opacity = fruit.locked ? "0.92" : "0.78";
  }
}

function worldToOverlayPosition(x, y, z = 0.95) {
  if (!renderer || !camera) return null;
  const ndc = new THREE.Vector3(x, y, z).project(camera);
  const canvas = renderer.domElement;
  const width = canvas.clientWidth || 1;
  const height = canvas.clientHeight || 1;
  const px = ((ndc.x + 1) * 0.5) * width;
  const py = ((1 - ndc.y) * 0.5) * height;
  return { x: px, y: py };
}

function positionDebugHexLabelEl(labelEl, center) {
  if (!labelEl || !center) return;
  const pos = worldToOverlayPosition(center.x, center.y, 0.95);
  if (!pos) return;
  labelEl.style.left = `${pos.x}px`;
  labelEl.style.top = `${pos.y}px`;
}

function updateHexOverlayLabelEl(labelEl, colorId, highlighted) {
  if (!labelEl) return;
  if (colorId < 0) {
    labelEl.textContent = "";
    return;
  }

  labelEl.textContent = String(colorId);
  labelEl.style.color = highlighted ? "#111" : "#fff";
  labelEl.style.textShadow = "none";
}

function createHexOutlineGeometry(radius) {
  const points = [];
  for (let i = 0; i <= 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function createHexVertexOffsets(radius) {
  const offsets = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return offsets;
}

function isPointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceSqPointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 1e-12) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }

  const t = THREE.MathUtils.clamp((apx * abx + apy * aby) / lenSq, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

function circleIntersectsHex(circleX, circleY, radius, hexCenterX, hexCenterY, hexOffsets) {
  const localX = circleX - hexCenterX;
  const localY = circleY - hexCenterY;
  const radiusSq = radius * radius;

  if (isPointInPolygon(localX, localY, hexOffsets)) return true;

  for (let i = 0; i < hexOffsets.length; i += 1) {
    const vx = hexOffsets[i].x;
    const vy = hexOffsets[i].y;
    const dx = localX - vx;
    const dy = localY - vy;
    if (dx * dx + dy * dy <= radiusSq) return true;
  }

  for (let i = 0; i < hexOffsets.length; i += 1) {
    const a = hexOffsets[i];
    const b = hexOffsets[(i + 1) % hexOffsets.length];
    if (distanceSqPointToSegment(localX, localY, a.x, a.y, b.x, b.y) <= radiusSq) return true;
  }

  return false;
}

function rebuildDebugHexOverlay() {
  if (debugHexOverlayGroup) {
    scene.remove(debugHexOverlayGroup);
    debugHexOverlayGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) obj.material.dispose?.();
    });
    debugHexOverlayGroup = null;
    debugHexOverlayFillMesh = null;
  }

  debugHexOverlayCenters.length = 0;
  debugHexOverlayTopColorIds.length = 0;
  debugHexOverlayTopZValues.length = 0;
  debugHexOverlayHighlighted.clear();
  debugHexOverlayLines.length = 0;
  clearDebugHexLabelLayer();

  const group = new THREE.Group();
  group.renderOrder = 70;

  const hexLineZ = 0.95;
  const hexFillZ = 0.9;
  const r = debugHexRadius;
  const stepX = r * 1.5;
  const stepY = Math.sqrt(3) * r;
  const geometry = createHexOutlineGeometry(r);

  let viewportLeft = bounds.left;
  let viewportRight = bounds.right;
  let viewportBottom = bounds.bottom;
  let viewportTop = bounds.top;

  const overlayPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -hexLineZ);
  const viewportRaycaster = new THREE.Raycaster();
  const hit = new THREE.Vector3();
  const ndcCorners = [
    { x: -1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
  ];
  const cornerHits = [];

  for (let i = 0; i < ndcCorners.length; i += 1) {
    viewportRaycaster.setFromCamera(ndcCorners[i], camera);
    if (viewportRaycaster.ray.intersectPlane(overlayPlane, hit)) {
      cornerHits.push({ x: hit.x, y: hit.y });
    }
  }

  if (cornerHits.length === 4) {
    viewportLeft = Math.min(cornerHits[0].x, cornerHits[1].x, cornerHits[2].x, cornerHits[3].x);
    viewportRight = Math.max(cornerHits[0].x, cornerHits[1].x, cornerHits[2].x, cornerHits[3].x);
    viewportBottom = Math.min(cornerHits[0].y, cornerHits[1].y, cornerHits[2].y, cornerHits[3].y);
    viewportTop = Math.max(cornerHits[0].y, cornerHits[1].y, cornerHits[2].y, cornerHits[3].y);
  }

  const minX = viewportLeft - r;
  const maxX = viewportRight + r;
  const minY = viewportBottom - r;
  const maxY = viewportTop + r;

  const vertexOffsets = createHexVertexOffsets(r);
  debugHexOverlayVertexOffsets = vertexOffsets;

  function isHexFullyInsideBounds(centerX, centerY) {
    for (let i = 0; i < vertexOffsets.length; i += 1) {
      const vx = centerX + vertexOffsets[i].x;
      const vy = centerY + vertexOffsets[i].y;
      if (vx < viewportLeft || vx > viewportRight || vy < viewportBottom || vy > viewportTop) {
        return false;
      }
    }
    return true;
  }

  for (let col = 0, x = minX; x <= maxX + stepX; x += stepX, col += 1) {
    const offsetY = col % 2 === 0 ? 0 : stepY * 0.5;
    for (let row = 0, y = minY + offsetY; y <= maxY + stepY; y += stepY, row += 1) {
      if (!isHexFullyInsideBounds(x, y)) continue;

      const material = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false });
      const hex = new THREE.Line(geometry.clone(), material);
      hex.position.set(x, y, hexLineZ);
      group.add(hex);

      const labelLayer = ensureDebugHexLabelLayer();
      const labelEl = document.createElement("div");
      labelEl.style.position = "absolute";
      labelEl.style.transform = "translate(-50%, -50%)";
      labelEl.style.font = "700 12px Arial";
      labelEl.style.lineHeight = "1";
      labelEl.style.willChange = "transform";
      labelEl.textContent = "";
      positionDebugHexLabelEl(labelEl, { x, y });
      labelLayer?.appendChild(labelEl);

      debugHexOverlayCenters.push({ x, y, col, row });
      debugHexOverlayTopColorIds.push(-1);
      debugHexOverlayTopZValues.push(Number.NEGATIVE_INFINITY);
      debugHexOverlayLines.push(hex);
      debugHexOverlayLabelEls.push(labelEl);
    }
  }

  debugHexOverlayGroup = group;
  const fillGeometry = new THREE.CircleGeometry(r, 6);
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    vertexColors: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const fillMesh = new THREE.InstancedMesh(fillGeometry, fillMaterial, debugHexOverlayCenters.length);
  fillMesh.renderOrder = 69;
  fillMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < debugHexOverlayCenters.length; i += 1) {
    const c = debugHexOverlayCenters[i];
    matrix.makeTranslation(c.x, c.y, hexFillZ);
    fillMesh.setMatrixAt(i, matrix);
    fillMesh.setColorAt(i, new THREE.Color(0x000000));
  }
  fillMesh.instanceMatrix.needsUpdate = true;
  if (fillMesh.instanceColor) fillMesh.instanceColor.needsUpdate = true;
  debugHexOverlayFillMesh = fillMesh;
  group.add(fillMesh);
  scene.add(group);
  updateDebugHexOverlayColors();
}

function updateDebugHexOverlayVisibility() {
  if (!debugHexOverlayGroup) return;
  const visible = state.showHexOverlay && state.started && !state.inHome;
  debugHexOverlayGroup.visible = visible;
  if (debugHexLabelLayerEl) {
    debugHexLabelLayerEl.style.display = visible ? "block" : "none";
  }
}

function updateDebugHexOverlayColors() {
  updateDebugHexOverlayVisibility();
  syncHexOverlayToggleUI();
  if (!debugHexOverlayGroup || !debugHexOverlayGroup.visible) return;

  const hexOffsets = debugHexOverlayVertexOffsets.length
    ? debugHexOverlayVertexOffsets
    : createHexVertexOffsets(debugHexRadius);
  const hexOuterRadius = debugHexRadius;

  for (let i = 0; i < debugHexOverlayCenters.length; i += 1) {
    const center = debugHexOverlayCenters[i];
    let bestSurfaceZ = Number.NEGATIVE_INFINITY;
    let bestDistSq = Infinity;
    let pickedColorId = -1;

    for (let j = 0; j < fruits.length; j += 1) {
      const fruit = fruits[j];
      if (!fruit?.active || fruit.sliced || fruit.locked || !fruit.bubble.visible) continue;

      const fx = fruit.group.position.x;
      const fy = fruit.group.position.y;
      const dx = center.x - fx;
      const dy = center.y - fy;

      const quickReach = fruit.radius + hexOuterRadius;
      if (Math.abs(dx) > quickReach || Math.abs(dy) > quickReach) continue;
      if (dx * dx + dy * dy > quickReach * quickReach) continue;

      const hit = circleIntersectsHex(
        fx,
        fy,
        fruit.radius,
        center.x,
        center.y,
        hexOffsets
      );
      if (!hit) continue;

      const distSq = dx * dx + dy * dy;
      const hitRadiusSq = fruit.radius * fruit.radius;

      const centerZ = fruit.group.position.z + (fruit.bubble?.position.z ?? 0);
      const localSurfaceZ = Math.sqrt(Math.max(0, hitRadiusSq - distSq));
      const surfaceZ = centerZ + localSurfaceZ;

      if (surfaceZ > bestSurfaceZ || (surfaceZ === bestSurfaceZ && distSq < bestDistSq)) {
        bestSurfaceZ = surfaceZ;
        bestDistSq = distSq;
        pickedColorId = fruit.colorId;
      }
    }

    debugHexOverlayTopColorIds[i] = pickedColorId;
    debugHexOverlayTopZValues[i] = bestSurfaceZ;
    setDebugHexLineStyle(i, pickedColorId);
    updateHexOverlayLabelEl(debugHexOverlayLabelEls[i], pickedColorId, debugHexOverlayHighlighted.has(i));
  }

  if (debugHexOverlayFillMesh?.instanceColor) {
    debugHexOverlayFillMesh.instanceColor.needsUpdate = true;
  }
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
  rebuildDebugHexOverlay();

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
  layer.innerHTML = "<div style=\"font-size:28px;\">Cannot Start</div><div style=\"margin-top:10px;font-size:15px;opacity:0.92;\">This browser/device does not support WebGPU.<br/>Please use a newer Chrome or Edge with WebGPU support.</div>";
  appEl.appendChild(layer);
}

function startGame() {
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  sessionFlow.startGame();
}

function loadLevel(index) {
  const result = sessionFlow.loadLevel(index);
  updateDebugHexOverlayVisibility();
  rebuildDebugBubbleIndexLabels();
  return result;
}

function resetFruits(level) {
  sessionFlow.resetFruits(level);
}

function onPointerDown(ev) {
  if (!state.started || state.gameOver || state.levelTransitioning || state.lockTutorialActive || !renderer) return;
  if (ev.button !== undefined && ev.button !== 0) return;
  if (state.stepLimit > 0 && state.stepsUsed >= state.stepLimit) {
    gameUI.showCommentary("Out of moves for this level.", 1000);
    return;
  }

  gameAudio.ensureAudioUnlocked();
  if (levelGuideState.active && levelGuideState.phase === "warn") {
    stopLevel1Guide();
  }
  void gameAudio.preloadPopAudio();
  gameAudio.resetSelectToneProgression();

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
    playErrorTone: gameAudio.playErrorTone,
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
  updateDebugHexOverlayVisibility();

  collisionSystem.resolve(fruits);
  burstSystem.update(dt);
  levelFlow.updateVictory(dt);

  let remaining = 0;
  for (const fruit of fruits) {
    fruit.update(dt, bounds);
    if (fruit.active && !fruit.sliced) remaining += 1;
  }

  updateLockGuideOverlay();
  updateDebugBubbleIndexLabels();

  updateLevel1Guide(now);

  renderer.render(scene, camera);

  if (levelFlow.updateLevelClear(now, remaining)) return;

  if (
    state.started
    && !state.gameOver
    && !state.outOfMovesContinuePending
    && state.stepLimit > 0
    && state.stepsUsed >= state.stepLimit
    && remaining > 0
    && !state.pointerDown
    && state.pendingPops.length === 0
  ) {
    triggerOutOfMovesContinueFlow();
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
  roundState.settleQueuedSlices();
}

function processPendingPops(dt) {
  roundState.processPendingPops(dt);
}

function clearQueuedSelections() {
  roundState.clearQueuedSelections();
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
  layoutViewport.resize();
  rebuildDebugHexOverlay();
}

function updatePhoneAspect() {
  layoutViewport.updatePhoneAspect();
}

function endGame(reason, options = {}) {
  sessionFlow.endGame(reason, options);
}
