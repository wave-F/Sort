import * as THREE from "three/webgpu";
import { LEVELS } from "./levels.js";

const appEl = document.getElementById("app");
const titleEl = document.getElementById("title");
const scoreEl = document.getElementById("score");
const sliceStateEl = document.getElementById("slice-state");
const commentaryEl = document.getElementById("commentary");
const startScreenEl = document.getElementById("start-screen");
const gameOverEl = document.getElementById("game-over");
const gameOverTitleEl = document.getElementById("game-over-title");
const gameOverTitleTextEl = document.getElementById("game-over-title-text");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const trailCompareToggleEl = document.getElementById("trail-compare-toggle");
const controlBtn = document.getElementById("control-btn");
const controlBlockerEl = document.getElementById("control-blocker");
const controlPanelEl = document.getElementById("control-panel");
const controlCloseBtn = document.getElementById("control-close-btn");
const controlSaveBtn = document.getElementById("control-save-btn");
const showFailResultBtn = document.getElementById("show-fail-result-btn");
const showWinResultBtn = document.getElementById("show-win-result-btn");
const resultPageEl = document.getElementById("result-page");
const resultBackBtn = document.getElementById("result-back-btn");
const resultRetryBtn = document.getElementById("result-retry-btn");
const resultExitBtn = document.getElementById("result-exit-btn");
const resultPageTitleEl = document.getElementById("result-page-title");
const resultPageTitleTextEl = document.getElementById("result-page-title-text");
const resultPageTextEl = document.getElementById("result-page-text");
const ctlFailTitleEl = document.getElementById("ctl-fail-title");
const ctlFailBodyEl = document.getElementById("ctl-fail-body");
const ctlWinTitleEl = document.getElementById("ctl-win-title");
const ctlWinBodyEl = document.getElementById("ctl-win-body");
const ctlTrailWidthEl = document.getElementById("ctl-trail-width");
const ctlControlPanelXEl = document.getElementById("ctl-control-panel-x");
const ctlParticleSizeEl = document.getElementById("ctl-particle-size");
const ctlScoreFruitEl = document.getElementById("ctl-score-fruit");
const ctlControlPanelXValueEl = document.getElementById("ctl-control-panel-x-value");
const ctlTrailWidthValueEl = document.getElementById("ctl-trail-width-value");
const ctlParticleSizeValueEl = document.getElementById("ctl-particle-size-value");
const ctlScoreFruitValueEl = document.getElementById("ctl-score-fruit-value");
const ctlPanelMarginTopEl = document.getElementById("ctl-panel-margin-top");
const ctlPanelMarginRightEl = document.getElementById("ctl-panel-margin-right");
const ctlPanelMarginBottomEl = document.getElementById("ctl-panel-margin-bottom");
const ctlPanelMarginLeftEl = document.getElementById("ctl-panel-margin-left");
const ctlPanelMarginTopValueEl = document.getElementById("ctl-panel-margin-top-value");
const ctlPanelMarginRightValueEl = document.getElementById("ctl-panel-margin-right-value");
const ctlPanelMarginBottomValueEl = document.getElementById("ctl-panel-margin-bottom-value");
const ctlPanelMarginLeftValueEl = document.getElementById("ctl-panel-margin-left-value");
const ctlFailResultWidthEl = document.getElementById("ctl-fail-result-width");
const ctlFailResultHeightEl = document.getElementById("ctl-fail-result-height");
const ctlFailResultYEl = document.getElementById("ctl-fail-result-y");
const ctlFailActionsYEl = document.getElementById("ctl-fail-actions-y");
const ctlFailActionsScaleEl = document.getElementById("ctl-fail-actions-scale");
const ctlFailResultWidthValueEl = document.getElementById("ctl-fail-result-width-value");
const ctlFailResultHeightValueEl = document.getElementById("ctl-fail-result-height-value");
const ctlFailResultYValueEl = document.getElementById("ctl-fail-result-y-value");
const ctlFailActionsYValueEl = document.getElementById("ctl-fail-actions-y-value");
const ctlFailActionsScaleValueEl = document.getElementById("ctl-fail-actions-scale-value");
const ctlWinResultWidthEl = document.getElementById("ctl-win-result-width");
const ctlWinResultHeightEl = document.getElementById("ctl-win-result-height");
const ctlWinResultYEl = document.getElementById("ctl-win-result-y");
const ctlWinActionsYEl = document.getElementById("ctl-win-actions-y");
const ctlWinActionsScaleEl = document.getElementById("ctl-win-actions-scale");
const ctlWinResultWidthValueEl = document.getElementById("ctl-win-result-width-value");
const ctlWinResultHeightValueEl = document.getElementById("ctl-win-result-height-value");
const ctlWinResultYValueEl = document.getElementById("ctl-win-result-y-value");
const ctlWinActionsYValueEl = document.getElementById("ctl-win-actions-y-value");
const ctlWinActionsScaleValueEl = document.getElementById("ctl-win-actions-scale-value");
const ladderNodes = Array.from(document.querySelectorAll(".ladder-node"));

const rules = {
  worldHeight: 10,
  minSliceSegment: 0.02,
};

const scoring = {
  perFruit: 5,
  comboBonusFactor: 2,
};

const colors = [
  { id: "red", name: "红果", peel: 0xff5c5c, flesh: 0xffb7b7 },
  { id: "orange", name: "橙果", peel: 0xffa23b, flesh: 0xffd6a0 },
  { id: "green", name: "青果", peel: 0x61c85d, flesh: 0xbee8aa },
  { id: "purple", name: "紫果", peel: 0x8170df, flesh: 0xbeb3ef },
];

const selectedRingColor = 0xffdf73;
const SAVE_KEY = "fruit-save-v1";
const SAVE_TOTAL_LEVELS = 10;
const CONTROL_SAVE_KEY = "fruit-control-v1";

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
  lastPoint: null,
  nowPoint: null,
  lastMoveAt: 0,
  maxPassedLevel: 1,
  resultOutcome: "lose",
};

const levelEditor = {
  lastSeed: Math.floor(Date.now() % 1000000),
  savedLayouts: [],
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe2b8c7, 8, 18);

const camera = new THREE.OrthographicCamera();
camera.position.set(0, 0, 9);
camera.lookAt(0, 0, 0);

let renderer;
let trail;
let particles;
let currentControlValues = null;
let controlPanelBaseline = null;

const bounds = { left: -3, right: 3, top: 5, bottom: -5 };
const fruits = [];

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const workHit = new THREE.Vector3();
const workA = new THREE.Vector3();

let commentaryTimer = 0;

scene.add(new THREE.AmbientLight(0xffffff, 0.84));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(2, 5, 6);
scene.add(key);

const bgPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshBasicMaterial({ color: 0xfff3f6, transparent: true, opacity: 0.06 })
);
bgPlane.position.z = -1.5;
scene.add(bgPlane);

init();

function init() {
  readGameSave();

  if (trailCompareToggleEl) {
    state.keepFullTrailDuringDrag = trailCompareToggleEl.checked;
    trailCompareToggleEl.addEventListener("change", onTrailCompareToggleChange);
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  if (controlBtn) controlBtn.addEventListener("click", toggleControlPanel);
  if (controlCloseBtn) controlCloseBtn.addEventListener("click", discardAndHideControlPanel);
  if (controlSaveBtn) controlSaveBtn.addEventListener("click", saveAndApplyControls);
  if (showFailResultBtn) showFailResultBtn.addEventListener("click", showFailResultPreview);
  if (showWinResultBtn) showWinResultBtn.addEventListener("click", showWinResultPreview);
  if (resultBackBtn) resultBackBtn.addEventListener("click", hideResultPage);
  if (resultRetryBtn) resultRetryBtn.addEventListener("click", retryFromResultPage);
  if (resultExitBtn) resultExitBtn.addEventListener("click", exitToStartFromResultPage);

  bindControlPanel();

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onEditorHotkey);
  window.addEventListener("keydown", onUiHotkey);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  setupRenderer();
}

function bindControlPanel() {
  const saved = readControlSave();

  if (ctlTrailWidthEl) {
    ctlTrailWidthEl.value = String(saved.trailWidth);
    ctlTrailWidthEl.addEventListener("input", onTrailWidthInput);
  }
  if (ctlControlPanelXEl) {
    ctlControlPanelXEl.value = String(saved.controlPanelX);
    ctlControlPanelXEl.addEventListener("input", onControlPanelPositionInput);
  }
  if (ctlParticleSizeEl) {
    ctlParticleSizeEl.value = String(saved.particleSize);
    ctlParticleSizeEl.addEventListener("input", onParticleSizeInput);
  }
  if (ctlScoreFruitEl) {
    ctlScoreFruitEl.value = String(saved.scorePerFruit);
    ctlScoreFruitEl.addEventListener("input", onScorePerFruitInput);
  }
  if (ctlPanelMarginTopEl) {
    ctlPanelMarginTopEl.value = String(saved.sliceTop);
    ctlPanelMarginTopEl.addEventListener("input", onPanelSliceInput);
  }
  if (ctlPanelMarginRightEl) {
    ctlPanelMarginRightEl.value = String(saved.sliceRight);
    ctlPanelMarginRightEl.addEventListener("input", onPanelSliceInput);
  }
  if (ctlPanelMarginBottomEl) {
    ctlPanelMarginBottomEl.value = String(saved.sliceBottom);
    ctlPanelMarginBottomEl.addEventListener("input", onPanelSliceInput);
  }
  if (ctlPanelMarginLeftEl) {
    ctlPanelMarginLeftEl.value = String(saved.sliceLeft);
    ctlPanelMarginLeftEl.addEventListener("input", onPanelSliceInput);
  }
  if (ctlFailResultWidthEl) {
    ctlFailResultWidthEl.value = String(saved.failResultWidth);
    ctlFailResultWidthEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlFailResultHeightEl) {
    ctlFailResultHeightEl.value = String(saved.failResultHeight);
    ctlFailResultHeightEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlFailResultYEl) {
    ctlFailResultYEl.value = String(saved.failResultY);
    ctlFailResultYEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlFailActionsYEl) {
    ctlFailActionsYEl.value = String(saved.failActionsY);
    ctlFailActionsYEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlFailActionsScaleEl) {
    ctlFailActionsScaleEl.value = String(saved.failActionsScale);
    ctlFailActionsScaleEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlWinResultWidthEl) {
    ctlWinResultWidthEl.value = String(saved.winResultWidth);
    ctlWinResultWidthEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlWinResultHeightEl) {
    ctlWinResultHeightEl.value = String(saved.winResultHeight);
    ctlWinResultHeightEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlWinResultYEl) {
    ctlWinResultYEl.value = String(saved.winResultY);
    ctlWinResultYEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlWinActionsYEl) {
    ctlWinActionsYEl.value = String(saved.winActionsY);
    ctlWinActionsYEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlWinActionsScaleEl) {
    ctlWinActionsScaleEl.value = String(saved.winActionsScale);
    ctlWinActionsScaleEl.addEventListener("input", onResultLayoutInput);
  }
  if (ctlFailTitleEl) {
    ctlFailTitleEl.value = saved.failTitle;
    ctlFailTitleEl.addEventListener("input", onFailCopyInput);
  }
  if (ctlFailBodyEl) {
    ctlFailBodyEl.value = saved.failBody;
    ctlFailBodyEl.addEventListener("input", onFailCopyInput);
  }
  if (ctlWinTitleEl) {
    ctlWinTitleEl.value = saved.winTitle;
    ctlWinTitleEl.addEventListener("input", onFailCopyInput);
  }
  if (ctlWinBodyEl) {
    ctlWinBodyEl.value = saved.winBody;
    ctlWinBodyEl.addEventListener("input", onFailCopyInput);
  }

  applyControlValues(saved);
  syncControlPanelLabels();
}

function onUiHotkey(ev) {
  if (ev.repeat) return;
  if (ev.key.toLowerCase() !== "g") return;
  const tag = String(ev.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  ev.preventDefault();
  toggleControlPanel();
}

function onTrailWidthInput(ev) {
  applyControlValues(collectControlValues());
  syncControlPanelLabels();
}

function onControlPanelPositionInput() {
  applyControlValues(collectControlValues());
  syncControlPanelLabels();
}

function onParticleSizeInput(ev) {
  applyControlValues(collectControlValues());
  syncControlPanelLabels();
}

function onScorePerFruitInput(ev) {
  applyControlValues(collectControlValues());
  syncControlPanelLabels();
}

function onPanelSliceInput() {
  applyControlValues(collectControlValues());
  syncControlPanelLabels();
}

function onResultLayoutInput() {
  applyControlValues(collectControlValues());
  syncControlPanelLabels();
}

function onFailCopyInput() {
  applyControlValues(collectControlValues());
}

function syncControlPanelLabels() {
  if (ctlControlPanelXValueEl) ctlControlPanelXValueEl.textContent = String(Math.floor(Number(ctlControlPanelXEl?.value ?? 0)));
  if (ctlTrailWidthValueEl) ctlTrailWidthValueEl.textContent = (trail?.width ?? Number(ctlTrailWidthEl?.value ?? 0.12)).toFixed(2);
  if (ctlParticleSizeValueEl) ctlParticleSizeValueEl.textContent = (particles?.material?.size ?? Number(ctlParticleSizeEl?.value ?? 0.09)).toFixed(2);
  if (ctlScoreFruitValueEl) ctlScoreFruitValueEl.textContent = String(scoring.perFruit);
  if (ctlPanelMarginTopValueEl) ctlPanelMarginTopValueEl.textContent = String(Math.floor(Number(ctlPanelMarginTopEl?.value ?? 28)));
  if (ctlPanelMarginRightValueEl) ctlPanelMarginRightValueEl.textContent = String(Math.floor(Number(ctlPanelMarginRightEl?.value ?? 28)));
  if (ctlPanelMarginBottomValueEl) ctlPanelMarginBottomValueEl.textContent = String(Math.floor(Number(ctlPanelMarginBottomEl?.value ?? 28)));
  if (ctlPanelMarginLeftValueEl) ctlPanelMarginLeftValueEl.textContent = String(Math.floor(Number(ctlPanelMarginLeftEl?.value ?? 28)));
  if (ctlFailResultWidthValueEl) ctlFailResultWidthValueEl.textContent = String(Math.floor(Number(ctlFailResultWidthEl?.value ?? 320)));
  if (ctlFailResultHeightValueEl) ctlFailResultHeightValueEl.textContent = String(Math.floor(Number(ctlFailResultHeightEl?.value ?? 260)));
  if (ctlFailResultYValueEl) ctlFailResultYValueEl.textContent = String(Math.floor(Number(ctlFailResultYEl?.value ?? 0)));
  if (ctlFailActionsYValueEl) ctlFailActionsYValueEl.textContent = String(Math.floor(Number(ctlFailActionsYEl?.value ?? 0)));
  if (ctlFailActionsScaleValueEl) ctlFailActionsScaleValueEl.textContent = Number(ctlFailActionsScaleEl?.value ?? 1).toFixed(2);
  if (ctlWinResultWidthValueEl) ctlWinResultWidthValueEl.textContent = String(Math.floor(Number(ctlWinResultWidthEl?.value ?? 320)));
  if (ctlWinResultHeightValueEl) ctlWinResultHeightValueEl.textContent = String(Math.floor(Number(ctlWinResultHeightEl?.value ?? 260)));
  if (ctlWinResultYValueEl) ctlWinResultYValueEl.textContent = String(Math.floor(Number(ctlWinResultYEl?.value ?? 0)));
  if (ctlWinActionsYValueEl) ctlWinActionsYValueEl.textContent = String(Math.floor(Number(ctlWinActionsYEl?.value ?? 0)));
  if (ctlWinActionsScaleValueEl) ctlWinActionsScaleValueEl.textContent = Number(ctlWinActionsScaleEl?.value ?? 1).toFixed(2);
}

function readControlSave() {
  const defaults = {
    trailWidth: 0.12,
    controlPanelX: 0,
    particleSize: 0.09,
    scorePerFruit: 5,
    sliceTop: 28,
    sliceRight: 28,
    sliceBottom: 28,
    sliceLeft: 28,
    failResultWidth: 320,
    failResultHeight: 260,
    failResultY: 0,
    failActionsY: 0,
    failActionsScale: 1,
    winResultWidth: 320,
    winResultHeight: 260,
    winResultY: 0,
    winActionsY: 0,
    winActionsScale: 1,
    failTitle: "失败",
    failBody: "当前分数 {score} · 当前关卡 {level}",
    winTitle: "胜利",
    winBody: "当前分数 {score} · 当前关卡 {level}",
  };

  try {
    const raw = localStorage.getItem(CONTROL_SAVE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      trailWidth: THREE.MathUtils.clamp(Number(parsed?.trailWidth) || defaults.trailWidth, 0.06, 0.22),
      controlPanelX: THREE.MathUtils.clamp(Math.floor(Number(parsed?.controlPanelX) || defaults.controlPanelX), -220, 420),
      particleSize: THREE.MathUtils.clamp(Number(parsed?.particleSize) || defaults.particleSize, 0.04, 0.22),
      scorePerFruit: THREE.MathUtils.clamp(Math.floor(Number(parsed?.scorePerFruit) || defaults.scorePerFruit), 1, 15),
      sliceTop: THREE.MathUtils.clamp(Math.floor(Number(parsed?.sliceTop) || defaults.sliceTop), 8, 200),
      sliceRight: THREE.MathUtils.clamp(Math.floor(Number(parsed?.sliceRight) || defaults.sliceRight), 8, 200),
      sliceBottom: THREE.MathUtils.clamp(Math.floor(Number(parsed?.sliceBottom) || defaults.sliceBottom), 8, 200),
      sliceLeft: THREE.MathUtils.clamp(Math.floor(Number(parsed?.sliceLeft) || defaults.sliceLeft), 8, 200),
      failResultWidth: THREE.MathUtils.clamp(Math.floor(Number(parsed?.failResultWidth) || defaults.failResultWidth), 220, 420),
      failResultHeight: THREE.MathUtils.clamp(Math.floor(Number(parsed?.failResultHeight) || defaults.failResultHeight), 160, 560),
      failResultY: THREE.MathUtils.clamp(Math.floor(Number(parsed?.failResultY) || defaults.failResultY), -220, 220),
      failActionsY: THREE.MathUtils.clamp(Math.floor(Number(parsed?.failActionsY) || defaults.failActionsY), -180, 180),
      failActionsScale: THREE.MathUtils.clamp(Number(parsed?.failActionsScale) || defaults.failActionsScale, 0.1, 1.6),
      winResultWidth: THREE.MathUtils.clamp(Math.floor(Number(parsed?.winResultWidth) || defaults.winResultWidth), 220, 420),
      winResultHeight: THREE.MathUtils.clamp(Math.floor(Number(parsed?.winResultHeight) || defaults.winResultHeight), 160, 560),
      winResultY: THREE.MathUtils.clamp(Math.floor(Number(parsed?.winResultY) || defaults.winResultY), -220, 220),
      winActionsY: THREE.MathUtils.clamp(Math.floor(Number(parsed?.winActionsY) || defaults.winActionsY), -180, 180),
      winActionsScale: THREE.MathUtils.clamp(Number(parsed?.winActionsScale) || defaults.winActionsScale, 0.1, 1.6),
      failTitle: String(parsed?.failTitle ?? defaults.failTitle).slice(0, 18),
      failBody: String(parsed?.failBody ?? defaults.failBody).slice(0, 80),
      winTitle: String(parsed?.winTitle ?? defaults.winTitle).slice(0, 18),
      winBody: String(parsed?.winBody ?? defaults.winBody).slice(0, 80),
    };
  } catch (_err) {
    return defaults;
  }
}

function collectControlValues() {
  return {
    trailWidth: THREE.MathUtils.clamp(Number(ctlTrailWidthEl?.value ?? 0.12), 0.06, 0.22),
    controlPanelX: THREE.MathUtils.clamp(Math.floor(Number(ctlControlPanelXEl?.value ?? 0)), -220, 420),
    particleSize: THREE.MathUtils.clamp(Number(ctlParticleSizeEl?.value ?? 0.09), 0.04, 0.22),
    scorePerFruit: THREE.MathUtils.clamp(Math.floor(Number(ctlScoreFruitEl?.value ?? 5)), 1, 15),
    sliceTop: THREE.MathUtils.clamp(Math.floor(Number(ctlPanelMarginTopEl?.value ?? 28)), 8, 200),
    sliceRight: THREE.MathUtils.clamp(Math.floor(Number(ctlPanelMarginRightEl?.value ?? 28)), 8, 200),
    sliceBottom: THREE.MathUtils.clamp(Math.floor(Number(ctlPanelMarginBottomEl?.value ?? 28)), 8, 200),
    sliceLeft: THREE.MathUtils.clamp(Math.floor(Number(ctlPanelMarginLeftEl?.value ?? 28)), 8, 200),
    failResultWidth: THREE.MathUtils.clamp(Math.floor(Number(ctlFailResultWidthEl?.value ?? 320)), 220, 420),
    failResultHeight: THREE.MathUtils.clamp(Math.floor(Number(ctlFailResultHeightEl?.value ?? 260)), 160, 560),
    failResultY: THREE.MathUtils.clamp(Math.floor(Number(ctlFailResultYEl?.value ?? 0)), -220, 220),
    failActionsY: THREE.MathUtils.clamp(Math.floor(Number(ctlFailActionsYEl?.value ?? 0)), -180, 180),
    failActionsScale: THREE.MathUtils.clamp(Number(ctlFailActionsScaleEl?.value ?? 1), 0.1, 1.6),
    winResultWidth: THREE.MathUtils.clamp(Math.floor(Number(ctlWinResultWidthEl?.value ?? 320)), 220, 420),
    winResultHeight: THREE.MathUtils.clamp(Math.floor(Number(ctlWinResultHeightEl?.value ?? 260)), 160, 560),
    winResultY: THREE.MathUtils.clamp(Math.floor(Number(ctlWinResultYEl?.value ?? 0)), -220, 220),
    winActionsY: THREE.MathUtils.clamp(Math.floor(Number(ctlWinActionsYEl?.value ?? 0)), -180, 180),
    winActionsScale: THREE.MathUtils.clamp(Number(ctlWinActionsScaleEl?.value ?? 1), 0.1, 1.6),
    failTitle: (String(ctlFailTitleEl?.value ?? "失败").trim() || "失败").slice(0, 18),
    failBody: (String(ctlFailBodyEl?.value ?? "当前分数 {score} · 当前关卡 {level}").trim() || "当前分数 {score} · 当前关卡 {level}").slice(0, 80),
    winTitle: (String(ctlWinTitleEl?.value ?? "胜利").trim() || "胜利").slice(0, 18),
    winBody: (String(ctlWinBodyEl?.value ?? "当前分数 {score} · 当前关卡 {level}").trim() || "当前分数 {score} · 当前关卡 {level}").slice(0, 80),
  };
}

function setControlInputs(values) {
  if (ctlTrailWidthEl) ctlTrailWidthEl.value = String(values.trailWidth);
  if (ctlControlPanelXEl) ctlControlPanelXEl.value = String(values.controlPanelX);
  if (ctlParticleSizeEl) ctlParticleSizeEl.value = String(values.particleSize);
  if (ctlScoreFruitEl) ctlScoreFruitEl.value = String(values.scorePerFruit);
  if (ctlPanelMarginTopEl) ctlPanelMarginTopEl.value = String(values.sliceTop);
  if (ctlPanelMarginRightEl) ctlPanelMarginRightEl.value = String(values.sliceRight);
  if (ctlPanelMarginBottomEl) ctlPanelMarginBottomEl.value = String(values.sliceBottom);
  if (ctlPanelMarginLeftEl) ctlPanelMarginLeftEl.value = String(values.sliceLeft);
  if (ctlFailResultWidthEl) ctlFailResultWidthEl.value = String(values.failResultWidth);
  if (ctlFailResultHeightEl) ctlFailResultHeightEl.value = String(values.failResultHeight);
  if (ctlFailResultYEl) ctlFailResultYEl.value = String(values.failResultY);
  if (ctlFailActionsYEl) ctlFailActionsYEl.value = String(values.failActionsY);
  if (ctlFailActionsScaleEl) ctlFailActionsScaleEl.value = String(values.failActionsScale);
  if (ctlWinResultWidthEl) ctlWinResultWidthEl.value = String(values.winResultWidth);
  if (ctlWinResultHeightEl) ctlWinResultHeightEl.value = String(values.winResultHeight);
  if (ctlWinResultYEl) ctlWinResultYEl.value = String(values.winResultY);
  if (ctlWinActionsYEl) ctlWinActionsYEl.value = String(values.winActionsY);
  if (ctlWinActionsScaleEl) ctlWinActionsScaleEl.value = String(values.winActionsScale);
  if (ctlFailTitleEl) ctlFailTitleEl.value = values.failTitle;
  if (ctlFailBodyEl) ctlFailBodyEl.value = values.failBody;
  if (ctlWinTitleEl) ctlWinTitleEl.value = values.winTitle;
  if (ctlWinBodyEl) ctlWinBodyEl.value = values.winBody;
}

function applyControlValues(values) {
  currentControlValues = { ...values };
  if (trail) trail.width = values.trailWidth;
  if (particles?.material) particles.material.size = values.particleSize;
  scoring.perFruit = values.scorePerFruit;

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--control-panel-x", `${values.controlPanelX}px`);
  rootStyle.setProperty("--panel-slice-top", String(values.sliceTop));
  rootStyle.setProperty("--panel-slice-right", String(values.sliceRight));
  rootStyle.setProperty("--panel-slice-bottom", String(values.sliceBottom));
  rootStyle.setProperty("--panel-slice-left", String(values.sliceLeft));
  applyResultLayoutForOutcome(state.resultOutcome, values);

  if (resultPageEl && !resultPageEl.classList.contains("hidden")) {
    if (state.resultOutcome === "lose") {
      if (resultPageTitleTextEl) resultPageTitleTextEl.textContent = values.failTitle;
      if (resultPageTextEl) resultPageTextEl.textContent = formatResultBody(values.failBody);
    } else {
      if (resultPageTitleTextEl) resultPageTitleTextEl.textContent = values.winTitle;
      if (resultPageTextEl) resultPageTextEl.textContent = formatResultBody(values.winBody);
    }
  }
}

function applyResultLayoutForOutcome(outcome, values) {
  const rootStyle = document.documentElement.style;
  if (outcome === "win") {
    rootStyle.setProperty("--result-card-width", `${values.winResultWidth}px`);
    rootStyle.setProperty("--result-card-height", `${values.winResultHeight}px`);
    rootStyle.setProperty("--result-card-y", `${values.winResultY}px`);
    rootStyle.setProperty("--result-actions-y", `${values.winActionsY}px`);
    rootStyle.setProperty("--result-actions-scale", String(values.winActionsScale));
    return;
  }

  rootStyle.setProperty("--result-card-width", `${values.failResultWidth}px`);
  rootStyle.setProperty("--result-card-height", `${values.failResultHeight}px`);
  rootStyle.setProperty("--result-card-y", `${values.failResultY}px`);
  rootStyle.setProperty("--result-actions-y", `${values.failActionsY}px`);
  rootStyle.setProperty("--result-actions-scale", String(values.failActionsScale));
}

function formatResultBody(template) {
  return template
    .replaceAll("{score}", String(state.score))
    .replaceAll("{level}", String(state.currentLevelIndex + 1));
}

function saveAndApplyControls() {
  const values = collectControlValues();
  applyControlValues(values);
  controlPanelBaseline = { ...values };
  syncControlPanelLabels();
  try {
    localStorage.setItem(CONTROL_SAVE_KEY, JSON.stringify(values));
  } catch (_err) {
    // ignore save errors
  }
  hideControlPanel();
}

function toggleControlPanel() {
  if (!controlPanelEl) return;
  const willOpen = controlPanelEl.classList.contains("hidden");
  if (willOpen) {
    controlPanelBaseline = currentControlValues ? { ...currentControlValues } : collectControlValues();
    setControlInputs(controlPanelBaseline);
    syncControlPanelLabels();
    if (controlBlockerEl) controlBlockerEl.classList.remove("hidden");
    controlPanelEl.classList.remove("hidden");
    return;
  }
  if (controlBlockerEl) controlBlockerEl.classList.add("hidden");
  controlPanelEl.classList.add("hidden");
}

function hideControlPanel() {
  if (!controlPanelEl) return;
  if (controlBlockerEl) controlBlockerEl.classList.add("hidden");
  controlPanelEl.classList.add("hidden");
}

function discardAndHideControlPanel() {
  if (controlPanelBaseline) {
    applyControlValues(controlPanelBaseline);
    setControlInputs(controlPanelBaseline);
    syncControlPanelLabels();
  }
  hideControlPanel();
}

function showResultPage() {
  if (!resultPageEl) return;
  const isWin = state.resultOutcome === "win";
  const controlValues = currentControlValues || collectControlValues();
  applyResultLayoutForOutcome(state.resultOutcome, controlValues);

  if (resultPageTitleEl) {
    resultPageTitleEl.classList.toggle("is-win", isWin);
    resultPageTitleEl.classList.toggle("is-lose", !isWin);
  }
  if (resultPageTitleTextEl) {
    resultPageTitleTextEl.textContent = isWin ? controlValues.winTitle : controlValues.failTitle;
  }
  if (resultPageTextEl) {
    resultPageTextEl.textContent = isWin
      ? formatResultBody(controlValues.winBody)
      : formatResultBody(controlValues.failBody);
  }

  if (resultRetryBtn) resultRetryBtn.classList.toggle("hidden", isWin);
  if (resultExitBtn) resultExitBtn.classList.toggle("hidden", isWin);
  if (resultBackBtn) resultBackBtn.classList.toggle("hidden", !isWin);

  resultPageEl.classList.remove("hidden");
}

function showFailResultPreview() {
  state.resultOutcome = "lose";
  showResultPage();
}

function showWinResultPreview() {
  state.resultOutcome = "win";
  showResultPage();
}

function hideResultPage() {
  if (!resultPageEl) return;
  resultPageEl.classList.add("hidden");
}

function retryFromResultPage() {
  hideResultPage();

  state.started = true;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.sliceColorId = null;
  state.sliceBroken = false;
  state.sliceCommitted = false;
  clearQueuedSelections();
  state.sliceHitIds.clear();
  state.sliceQueue.length = 0;
  state.lastPoint = null;
  state.nowPoint = null;

  trail.reset();
  particles.reset();
  gameOverEl.classList.add("hidden");
  startScreenEl.classList.add("hidden");

  loadLevel(state.currentLevelIndex);
}

function exitToStartFromResultPage() {
  hideResultPage();

  state.started = false;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.sliceColorId = null;
  state.sliceBroken = false;
  state.sliceCommitted = false;
  clearQueuedSelections();
  state.sliceHitIds.clear();
  state.sliceQueue.length = 0;
  state.lastPoint = null;
  state.nowPoint = null;

  trail.reset();
  particles.reset();
  for (const fruit of fruits) {
    scene.remove(fruit.group);
  }
  fruits.length = 0;

  gameOverEl.classList.add("hidden");
  startScreenEl.classList.remove("hidden");
}

async function setupRenderer() {
  renderer = await createRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  appEl.appendChild(renderer.domElement);
  resize();

  trail = new SliceTrail(64);
  trail.setKeepFullMode(state.keepFullTrailDuringDrag);
  particles = new JuiceParticles(680);
  scene.add(trail.mesh);
  scene.add(particles.points);

  applyControlValues(collectControlValues());
  syncControlPanelLabels();

  renderer.setAnimationLoop(tick);
}

async function createRenderer() {
  if (!navigator.gpu) {
    showWebGpuUnsupported();
    throw new Error("WebGPU is not supported in this browser.");
  }

  const webgpu = new THREE.WebGPURenderer({ antialias: true, alpha: true });
  await webgpu.init();
  if (titleEl) titleEl.textContent = "刀切水果 (WebGPU)";
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
  readGameSave();
  hideResultPage();
  hideControlPanel();

  state.started = true;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.currentLevelIndex = Math.min(Math.max(state.maxPassedLevel - 1, 0), Math.max(LEVELS.length - 1, 0));
  state.activeLevel = null;
  state.resultOutcome = "lose";
  state.score = 0;
  state.pointerDown = false;
  state.sliceColorId = null;
  state.sliceBroken = false;
  state.sliceCommitted = false;
  clearQueuedSelections();
  state.sliceHitIds.clear();
  state.sliceQueue.length = 0;
  state.lastPoint = null;
  state.nowPoint = null;

  trail.reset();
  particles.reset();

  startScreenEl.classList.add("hidden");
  gameOverEl.classList.add("hidden");

  updateHud();
  loadLevel(state.currentLevelIndex);
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
  state.lastPoint = null;
  state.nowPoint = null;

  trail.reset();
  particles.reset();

  setSliceStatus(`状态: 第${index + 1}关`);
  showCommentary(
    `第${index + 1}/${LEVELS.length}关 · ${level.name} · 颜色${level.colorIds.length}种 数量${level.fruitCount}（R随机/S保存/E导出）`,
    2400
  );

  resetFruits(level);
}

function resetFruits(level) {
  for (const fruit of fruits) scene.remove(fruit.group);
  fruits.length = 0;

  const defs = level?.fruits ?? [];
  for (let i = 0; i < defs.length; i += 1) {
    const def = defs[i];
    const colorIndex = THREE.MathUtils.clamp(def.colorId, 0, colors.length - 1);
    const fruit = new FruitEntity({
      id: i,
      colorId: colorIndex,
      radius: THREE.MathUtils.clamp(def.radius ?? 0.42, 0.28, 0.62),
      vx: def.vx ?? 0,
      vy: def.vy ?? 0,
      peel: new THREE.Color(colors[colorIndex].peel),
      flesh: new THREE.Color(colors[colorIndex].flesh),
    });
    fruit.setPosition(
      THREE.MathUtils.clamp(def.x, bounds.left + 0.45, bounds.right - 0.45),
      THREE.MathUtils.clamp(def.y, bounds.bottom + 0.45, bounds.top - 0.45),
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
  particles.reset();
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
  const radiusRange = normalizeRange(level.radiusRange, inferRadiusRangeFromFruits(fruitsDef), 0.28, 0.62);
  const speedRange = normalizeRange(level.speedRange, inferSpeedRangeFromFruits(fruitsDef, index), 0, 0.9);
  const seed = Math.floor(level.seed ?? 1000 + (level.id ?? index + 1) * 137);

  const fruits = fruitsDef.length
    ? fruitsDef.map((f) => ({
        x: f.x,
        y: f.y,
        colorId: f.colorId,
        radius: f.radius,
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

  for (let i = 0; i < fruitCount; i += 1) {
    const radius = lerp(radiusMin, radiusMax, rng());
    const margin = radius + 0.06;

    let x = 0;
    let y = 0;
    let placed = false;
    for (let k = 0; k < 180; k += 1) {
      x = lerp(bounds.left + margin, bounds.right - margin, rng());
      y = lerp(bounds.bottom + margin, bounds.top - margin, rng());

      let overlap = false;
      for (const p of fruitsDef) {
        const minDist = Math.max(0.76, radius + p.radius + 0.08);
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
  setSliceStatus("状态: 开刀");
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

  resolveFruitCollisions();

  let alive = 0;
  for (const fruit of fruits) {
    fruit.update(dt, bounds);
    if (fruit.active) alive += 1;
  }

  particles.update(dt);
  renderer.render(scene, camera);

  if (state.started && !state.gameOver && alive === 0) {
    handleLevelCleared();
  }
}

function handleLevelCleared() {
  if (state.gameOver || state.levelTransitioning) return;

  const justCleared = state.currentLevelIndex;
  markLevelPassed(justCleared + 1);
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

  // Follow 1.html style: top-most scan order and first hit wins.
  const ax = state.lastPoint.x;
  const ay = state.lastPoint.y;
  const bx = state.nowPoint.x;
  const by = state.nowPoint.y;
  for (let i = fruits.length - 1; i >= 0; i -= 1) {
    const fruit = fruits[i];
    if (!fruit.active || fruit.sliced || state.sliceHitIds.has(fruit.id)) continue;

    const dist = distSegmentToPointNumeric(ax, ay, bx, by, fruit.group.position.x, fruit.group.position.y);
    if (dist > fruit.radius) continue;

    if (state.sliceColorId === null) {
      if (!state.sliceCommitted) {
        state.sliceCommitted = true;
      }
      state.sliceColorId = fruit.colorId;
      setSliceStatus(`状态: 锁定${colors[fruit.colorId].name}`);
      showCommentary(`这刀只切${colors[fruit.colorId].name}。`, 1200);
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
      showCommentary(`碰到${colors[fruit.colorId].name}，已结算已选水果。`, 1500);
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

function settleQueuedSlices() {
  if (!state.sliceQueue.length) return;

  let gain = 0;
  for (let i = 0; i < state.sliceQueue.length; i += 1) {
    const entry = state.sliceQueue[i];
    const fruit = entry.fruit;
    if (!fruit || !fruit.active || fruit.sliced) continue;

    fruit.setSelected(false);
    fruit.slice(entry.sliceDir, entry.speed);
    particles.spawnBurst(fruit.group.position, entry.sliceDir, fruit.peel);
    gain += 1;
  }

  clearQueuedSelections();

  if (gain > 0) {
    const sliceScore = scoring.perFruit * gain + scoring.comboBonusFactor * gain * (gain - 1);
    state.score += sliceScore;
    updateHud();
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
      const minDist = d1.radius + d2.radius;
      if (dist >= minDist) continue;

      let nx = dx;
      let ny = dy;
      if (dist === 0) {
        nx = 1;
        ny = 0;
        dist = 1;
      }

      nx /= dist;
      ny /= dist;
      const overlap = minDist - dist;

      const m1 = d1.radius * d1.radius;
      const m2 = d2.radius * d2.radius;
      const totalM = m1 + m2;
      const r1 = m2 / totalM;
      const r2 = m1 / totalM;

      d1.group.position.x -= nx * overlap * r1;
      d1.group.position.y -= ny * overlap * r1;
      d2.group.position.x += nx * overlap * r2;
      d2.group.position.y += ny * overlap * r2;

      const kx = d1.vel.x - d2.vel.x;
      const ky = d1.vel.y - d2.vel.y;
      const p = (2.0 * (nx * kx + ny * ky)) / (m1 + m2);
      d1.vel.x -= p * m2 * nx * 0.8;
      d1.vel.y -= p * m2 * ny * 0.8;
      d2.vel.x += p * m1 * nx * 0.8;
      d2.vel.y += p * m1 * ny * 0.8;
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
  const worldHalfH = rules.worldHeight / 2;
  const worldHalfW = worldHalfH * aspect;

  camera.left = -worldHalfW;
  camera.right = worldHalfW;
  camera.top = worldHalfH;
  camera.bottom = -worldHalfH;
  camera.near = 0.1;
  camera.far = 50;
  camera.updateProjectionMatrix();

  bounds.left = camera.left + 0.5;
  bounds.right = camera.right - 0.5;
  bounds.top = camera.top - 0.5;
  bounds.bottom = camera.bottom + 0.5;
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

function readGameSave() {
  let parsed = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (_err) {
    parsed = null;
  }

  const value = Number(parsed?.maxPassedLevel);
  if (!Number.isFinite(value)) {
    state.maxPassedLevel = 1;
    writeGameSave();
    renderLadderProgress();
    return;
  }
  state.maxPassedLevel = THREE.MathUtils.clamp(Math.floor(value), 1, SAVE_TOTAL_LEVELS);
  if (Number(parsed?.totalLevels) !== SAVE_TOTAL_LEVELS) writeGameSave();
  renderLadderProgress();
}

function writeGameSave() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        totalLevels: SAVE_TOTAL_LEVELS,
        maxPassedLevel: state.maxPassedLevel,
      })
    );
  } catch (_err) {
    // ignore save failures
  }
}

function markLevelPassed(levelNo) {
  if (!Number.isFinite(levelNo)) return;
  const currentLevel = THREE.MathUtils.clamp(Math.floor(levelNo), 1, SAVE_TOTAL_LEVELS);
  if (currentLevel !== state.maxPassedLevel) return;
  if (currentLevel >= SAVE_TOTAL_LEVELS) return;
  state.maxPassedLevel = currentLevel + 1;
  writeGameSave();
  renderLadderProgress();
}

function renderLadderProgress() {
  if (!ladderNodes.length) return;

  for (let i = 0; i < ladderNodes.length; i += 1) {
    const node = ladderNodes[i];
    const levelNo = i + 1;
    node.classList.remove("is-passed", "is-current");

    if (levelNo < state.maxPassedLevel) {
      node.classList.add("is-passed");
    } else if (levelNo === state.maxPassedLevel) {
      node.classList.add("is-current");
    }
  }
}

function endGame(reason) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.levelTransitioning = false;
  state.pointerDown = false;
  clearQueuedSelections();
  trail.reset();

  if (reason.startsWith("全部")) {
    state.resultOutcome = "win";
    if (gameOverTitleTextEl) gameOverTitleTextEl.textContent = `恭喜通关！总分 ${state.score}`;
    else gameOverTitleEl.textContent = `恭喜通关！总分 ${state.score}`;
  } else {
    state.resultOutcome = "lose";
    if (gameOverTitleTextEl) gameOverTitleTextEl.textContent = `本局结束！本局分数 ${state.score}`;
    else gameOverTitleEl.textContent = `本局结束！本局分数 ${state.score}`;
  }
  gameOverEl.classList.add("hidden");
  showResultPage();
  setSliceStatus(`状态: ${reason}`);
}

class FruitEntity {
  constructor({ id, colorId, radius, vx = 0, vy = 0, peel, flesh }) {
    this.id = id;
    this.colorId = colorId;
    this.radius = radius;
    this.peel = peel;
    this.flesh = flesh;

    this.active = true;
    this.sliced = false;
    this.life = 0;
    this.selected = false;
    this.selectedPulse = 0;
    this.wrongFlash = 0;
    this.wrongShake = 0;

    this.vel = new THREE.Vector3(vx, vy, 0);
    this.velA = new THREE.Vector3();
    this.velB = new THREE.Vector3();

    this.group = new THREE.Group();
    this.whole = this.createWhole();
    this.halfA = this.createHalf(0, Math.PI);
    this.halfB = this.createHalf(Math.PI, Math.PI);
    this.selectRing = this.createSelectRing();
    this.halfA.visible = false;
    this.halfB.visible = false;
    this.group.add(this.whole, this.halfA, this.halfB, this.selectRing);
  }

  createWhole() {
    const g = new THREE.Group();
    const peelDisk = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius, 28),
      new THREE.MeshStandardMaterial({ color: this.peel, roughness: 0.55, metalness: 0.02 })
    );
    const fleshDisk = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius * 0.78, 26),
      new THREE.MeshStandardMaterial({ color: this.flesh, roughness: 0.74, metalness: 0.0 })
    );
    fleshDisk.position.z = 0.01;

    const seed = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius * 0.08, 10),
      new THREE.MeshBasicMaterial({ color: 0x3a2b1f })
    );
    seed.position.set(this.radius * 0.12, -this.radius * 0.1, 0.02);

    const leaf = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius * 0.2, 14, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x4ca45f })
    );
    leaf.position.set(0, this.radius * 0.92, 0.02);

    g.add(peelDisk, fleshDisk, seed, leaf);
    return g;
  }

  createHalf(thetaStart, thetaLength) {
    const g = new THREE.Group();
    const peelHalf = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius, 24, thetaStart, thetaLength),
      new THREE.MeshStandardMaterial({ color: this.peel, roughness: 0.55, metalness: 0.02 })
    );
    const fleshHalf = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius * 0.78, 22, thetaStart, thetaLength),
      new THREE.MeshStandardMaterial({ color: this.flesh, roughness: 0.74, metalness: 0.0 })
    );
    fleshHalf.position.z = 0.01;
    g.add(peelHalf, fleshHalf);
    return g;
  }

  createSelectRing() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(this.radius * 1.03, this.radius * 1.22, 36),
      new THREE.MeshBasicMaterial({
        color: selectedRingColor,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      })
    );
    ring.visible = false;
    ring.position.z = 0.03;
    return ring;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  slice(sliceDir, speed) {
    this.setSelected(false);
    this.sliced = true;
    this.life = 0;
    this.whole.visible = false;
    this.halfA.visible = true;
    this.halfB.visible = true;
    this.halfA.position.set(0, 0, 0);
    this.halfB.position.set(0, 0, 0);

    const angle = Math.atan2(sliceDir.y, sliceDir.x);
    this.halfA.rotation.z = angle;
    this.halfB.rotation.z = angle;

    const normal = new THREE.Vector3(-sliceDir.y, sliceDir.x, 0).normalize();
    const force = THREE.MathUtils.clamp(speed * 0.26, 2.2, 5.5);
    this.velA.copy(normal).multiplyScalar(force).add(new THREE.Vector3(0, 1.1, 0));
    this.velB.copy(normal).multiplyScalar(-force).add(new THREE.Vector3(0, 1.1, 0));
  }

  update(dt, worldBounds) {
    if (!this.active) return;

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
      this.whole.rotation.z += dt * 0.35;

      if (this.selected) {
        this.selectedPulse += dt * 10;
        const pulse = 1 + Math.sin(this.selectedPulse) * 0.07;
        this.selectRing.visible = true;
        this.selectRing.material.color.setHex(selectedRingColor);
        this.selectRing.scale.set(pulse, pulse, 1);
        this.selectRing.material.opacity = 0.52 + Math.sin(this.selectedPulse * 1.4) * 0.16;
        this.whole.position.set(0, 0, 0);
        this.selectRing.position.x = 0;
        this.selectRing.position.y = 0;
      } else if (this.wrongFlash > 0) {
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
        this.selectRing.scale.set(1.08 + (1 - t) * 0.1, 1.08 + (1 - t) * 0.1, 1);
        this.selectRing.material.opacity = 0.28 + t * 0.68;
        this.whole.position.set(shakeX, shakeY, 0);
        this.selectRing.position.x = shakeX;
        this.selectRing.position.y = shakeY;
      } else {
        this.selectRing.visible = false;
        this.whole.position.set(0, 0, 0);
        this.selectRing.position.x = 0;
        this.selectRing.position.y = 0;
      }
      return;
    }

    this.life += dt;
    this.velA.y -= 7 * dt;
    this.velB.y -= 7 * dt;
    this.halfA.position.addScaledVector(this.velA, dt);
    this.halfB.position.addScaledVector(this.velB, dt);
    this.halfA.rotation.z += dt * 0.8;
    this.halfB.rotation.z -= dt * 0.8;

    if (this.life > 1.1) {
      this.setSelected(false);
      this.wrongFlash = 0;
      this.active = false;
      this.group.visible = false;
    }
  }

  setSelected(flag) {
    const next = Boolean(flag) && this.active && !this.sliced;
    this.selected = next;
    if (!next) {
      this.selectRing.visible = false;
      this.selectRing.material.opacity = 0;
      this.selectRing.scale.set(1, 1, 1);
      this.whole.position.set(0, 0, 0);
      this.selectRing.position.x = 0;
      this.selectRing.position.y = 0;
    } else {
      this.selectedPulse = 0;
      this.selectRing.material.color.setHex(selectedRingColor);
      this.selectRing.visible = true;
      this.selectRing.material.opacity = 0.62;
    }
  }

  flashWrongHit() {
    if (!this.active || this.sliced) return;
    this.wrongFlash = 0.22;
    this.wrongShake = 0.22;
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

function onTrailCompareToggleChange(ev) {
  const enabled = ev?.target?.checked !== false;
  state.keepFullTrailDuringDrag = enabled;
  if (trail) trail.setKeepFullMode(enabled);
  if (enabled && !state.pointerDown) trail?.reset();
}

class JuiceParticles {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = [];
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);

    for (let i = 0; i < capacity; i += 1) {
      this.items.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        ttl: 0,
        color: new THREE.Color(),
      });
    }
  }

  spawnBurst(origin, sliceDir, baseColor) {
    const normal = new THREE.Vector3(-sliceDir.y, sliceDir.x, 0).normalize();
    for (let i = 0; i < 22; i += 1) {
      const p = this.alloc();
      if (!p) return;

      p.active = true;
      p.life = 0;
      p.ttl = THREE.MathUtils.randFloat(0.2, 0.45);
      p.pos.copy(origin).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.2), THREE.MathUtils.randFloatSpread(0.2), 0));
      p.vel.copy(normal).multiplyScalar(THREE.MathUtils.randFloat(1.2, 3.6));
      p.vel.y += THREE.MathUtils.randFloat(0.2, 1.8);
      p.vel.x += THREE.MathUtils.randFloatSpread(0.8);
      p.color.copy(baseColor).offsetHSL(0.02, -0.12, 0.14);
    }
  }

  alloc() {
    for (let i = 0; i < this.capacity; i += 1) {
      if (!this.items[i].active) return this.items[i];
    }
    return null;
  }

  update(dt) {
    let count = 0;
    for (let i = 0; i < this.capacity; i += 1) {
      const p = this.items[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.ttl) {
        p.active = false;
        continue;
      }

      p.vel.y -= 7 * dt;
      p.pos.addScaledVector(p.vel, dt);

      const o = count * 3;
      this.positions[o] = p.pos.x;
      this.positions[o + 1] = p.pos.y;
      this.positions[o + 2] = p.pos.z;
      this.colors[o] = p.color.r;
      this.colors[o + 1] = p.color.g;
      this.colors[o + 2] = p.color.b;
      count += 1;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }

  reset() {
    for (let i = 0; i < this.capacity; i += 1) this.items[i].active = false;
    this.geometry.setDrawRange(0, 0);
  }
}
