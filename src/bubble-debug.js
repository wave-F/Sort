import * as THREE from "three";
import { WebGPURenderer, MeshPhysicalNodeMaterial } from "three/webgpu";
import {
  normalLocal,
  normalView,
  positionLocal,
  positionViewDirection,
  time,
  uniform,
  vec3,
} from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const compatEl = document.getElementById("compat");
const swatches = Array.from(document.querySelectorAll(".swatch"));
const controlsPanel = document.getElementById("controls");
const backBtn = document.getElementById("back-btn");
const syncBtn = document.getElementById("sync-btn");
const popBtn = document.getElementById("pop-btn");
const popProgressInput = document.getElementById("p-pop-progress");
const popProgressValue = document.querySelector('[data-value-for="p-pop-progress"]');
const lockRemainingInput = document.getElementById("p-lock-remaining");
const lockRemainingValue = document.querySelector('[data-value-for="p-lock-remaining"]');
const tuningStorageKey = "bubble_tuning_v1";
const debugBuildTag = "jelly-burst-v4-film-spray-2026-04-15";
if (compatEl) compatEl.textContent = `调试页版本: ${debugBuildTag}`;

const defaults = {
  transmission: 0.93,
  roughness: 0.1,
  clearcoat: 0.42,
  wobble: 0.022,
  flow: 1.15,
  dye: 1.12,
  edge: 0.3,
  dissolveEdge: 0.045,
  dissolveFreq: 4.8,
  dissolveEmissive: 9.0,
  iri: 0.75,
  springTension: 0.12,
  springDamping: 0.84,
  lightKey: 1.25,
  lightAmbient: 0.62,
  toggleDye: true,
  toggleEdge: true,
  toggleIri: true,
  toggleRandom: true,
  toggleBomb: false,
  toggleLock: false,
  lockRemaining: 3,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef6ff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.3, 5.5);

const renderer = new WebGPURenderer({ antialias: true, forceWebGL: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 2.1;
controls.maxDistance = 12;
controls.target.set(0, 0.2, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, defaults.lightAmbient);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, defaults.lightKey);
keyLight.position.set(4, 7, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8ce7ff, 0.82);
rimLight.position.set(-6, 4, -5);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xff9ec8, 0.44);
fillLight.position.set(2, -4, 3);
scene.add(fillLight);

const bubbleGeometry = new THREE.SphereGeometry(1.2, 120, 120);

let springVal = 0;
let springVel = 0;
let tension = defaults.springTension;
let damping = defaults.springDamping;
let transmissionControlValue = defaults.transmission;
let randomClickColorEnabled = defaults.toggleRandom;
let bombModeEnabled = defaults.toggleBomb;
let lockModeEnabled = defaults.toggleLock;
let lockRemaining = defaults.lockRemaining;
let activeColorIndex = 0;
const clock = new THREE.Clock();

const springUniform = uniform(0);
const tintUniform = uniform(new THREE.Color(0xff1f4b));
const accentUniform = uniform(new THREE.Color(0xffb3ca));
const flowSpeedUniform = uniform(defaults.flow);
const wobbleAmplitudeUniform = uniform(defaults.wobble);
const dyeContrastUniform = uniform(defaults.dye);
const edgeGlowUniform = uniform(defaults.edge);
const crackGlowUniform = uniform(0.0);
const dissolveProgressUniform = uniform(-1.1);
const dissolveEdgeUniform = uniform(defaults.dissolveEdge);
const dissolveFreqUniform = uniform(defaults.dissolveFreq);
const dissolveEmissiveUniform = uniform(defaults.dissolveEmissive);
const dissolveEnabledUniform = uniform(0.0);
const iridescenceUniform = uniform(defaults.iri);
const dyeEnabledUniform = uniform(1.0);
const edgeEnabledUniform = uniform(1.0);
const iridescenceEnabledUniform = uniform(1.0);
const iridescenceBaseUniform = uniform(90.0);
const iridescenceSpanUniform = uniform(520.0);

const material = new MeshPhysicalNodeMaterial({
  transmission: defaults.transmission,
  thickness: 1.35,
  roughness: defaults.roughness,
  metalness: 0.0,
  clearcoat: defaults.clearcoat,
  clearcoatRoughness: 0.16,
  ior: 1.2,
  envMapIntensity: 0.72,
  transparent: true,
  opacity: 0.95,
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

material.positionNode = positionLocal
  .add(normalLocal.mul(wobble))
  .mul(vec3(squishX, squishY, squishZ));

const dyeBlend = dyeMix.pow(dyeContrastUniform);
const dyeColor = tintUniform.mix(accentUniform, dyeBlend);
material.colorNode = tintUniform.mix(dyeColor, dyeEnabledUniform);

const dissolveFlow = time.mul(0.65);
const dissolvePos = positionLocal.mul(dissolveFreqUniform);
const dissolveN1 = dissolvePos.x.mul(1.17).add(dissolveFlow.mul(0.22)).sin();
const dissolveN2 = dissolvePos.y.mul(1.43).sub(dissolveFlow.mul(0.17)).cos();
const dissolveN3 = dissolvePos.z.mul(1.69).add(dissolveFlow.mul(0.13)).sin();
const dissolveN4 = dissolvePos.x.add(dissolvePos.y.mul(0.58)).add(dissolvePos.z.mul(0.31)).mul(1.9).sin();
const dissolveNoise = dissolveN1.mul(0.36).add(dissolveN2.mul(0.28)).add(dissolveN3.mul(0.24)).add(dissolveN4.mul(0.22)).clamp(-1.0, 1.0);
const dissolveEdgeSafe = dissolveEdgeUniform.max(0.0001);
const dissolveSurvive = dissolveNoise.sub(dissolveProgressUniform).div(dissolveEdgeSafe).clamp(0.0, 1.0);
const dissolveEdgeMask = dissolveSurvive.mul(dissolveSurvive.mul(-1).add(1.0)).mul(4.0);
const dissolveAlpha = dissolveEnabledUniform.mul(dissolveSurvive).add(dissolveEnabledUniform.mul(-1).add(1.0));
material.opacityNode = dissolveAlpha;
material.alphaTest = 0.02;

const viewDot = normalView.dot(positionViewDirection.negate()).abs().clamp(0.0, 1.0);
const edgeGlow = viewDot.mul(-1.0).add(1.0).pow(2.8);
const baseEmissive = tintUniform.mul(edgeGlow.mul(edgeGlowUniform.add(crackGlowUniform)).mul(edgeEnabledUniform));
const dissolveEdgeEmissive = tintUniform.mul(dissolveEdgeMask.mul(dissolveEmissiveUniform).mul(dissolveEnabledUniform));
material.emissiveNode = baseEmissive.add(dissolveEdgeEmissive);

material.iridescenceNode = iridescenceUniform.mul(iridescenceEnabledUniform);
material.iridescenceIORNode = uniform(1.3);
material.iridescenceThicknessNode = dyeMix.mul(iridescenceSpanUniform).add(iridescenceBaseUniform);

const bubble = new THREE.Mesh(bubbleGeometry, material);
scene.add(bubble);

const bombGroup = new THREE.Group();
const bombCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.72, 44, 44),
  new THREE.MeshStandardMaterial({
    color: 0x252a33,
    roughness: 0.38,
    metalness: 0.14,
  })
);
const bombCap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.18, 0.2, 22),
  new THREE.MeshStandardMaterial({
    color: 0x303844,
    roughness: 0.32,
    metalness: 0.2,
  })
);
bombCap.position.set(0, 0.67, 0);

const bombFuse = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.05, 0.38, 14),
  new THREE.MeshStandardMaterial({
    color: 0xe7b96e,
    roughness: 0.9,
    metalness: 0.02,
  })
);
bombFuse.position.set(0.04, 0.89, 0);
bombFuse.rotation.z = -0.35;

const bombSpark = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 16, 16),
  new THREE.MeshBasicMaterial({
    color: 0xff7b39,
    transparent: true,
    opacity: 0.9,
  })
);
bombSpark.position.set(-0.08, 1.07, 0);

const bombRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.95, 0.05, 18, 72),
  new THREE.MeshBasicMaterial({
    color: 0xff6a3a,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
);
bombRing.rotation.x = Math.PI * 0.5;

bombGroup.add(bombCore);
bombGroup.add(bombCap);
bombGroup.add(bombFuse);
bombGroup.add(bombSpark);
bombGroup.add(bombRing);
bombGroup.visible = false;
bubble.add(bombGroup);

const lockGroup = new THREE.Group();
const lockBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.38, 0.38, 0.34, 32),
  new THREE.MeshStandardMaterial({
    color: 0xcbe9ff,
    roughness: 0.26,
    metalness: 0.44,
    emissive: 0x12283a,
    emissiveIntensity: 0.18,
  })
);
lockBody.position.set(0, -0.04, 0.14);

const shackleCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.2, 0, 0),
  new THREE.Vector3(-0.2, 0.2, 0),
  new THREE.Vector3(0, 0.33, 0),
  new THREE.Vector3(0.2, 0.2, 0),
  new THREE.Vector3(0.2, 0, 0),
]);
const lockShackle = new THREE.Mesh(
  new THREE.TubeGeometry(shackleCurve, 48, 0.055, 14, false),
  new THREE.MeshStandardMaterial({
    color: 0xf2fbff,
    roughness: 0.14,
    metalness: 0.78,
    emissive: 0x244d6b,
    emissiveIntensity: 0.2,
  })
);
lockShackle.position.set(0, 0.12, 0.2);

const lockShackleStemL = new THREE.Mesh(
  new THREE.CylinderGeometry(0.045, 0.045, 0.15, 14),
  new THREE.MeshStandardMaterial({
    color: 0xe6f6ff,
    roughness: 0.16,
    metalness: 0.74,
    emissive: 0x244d6b,
    emissiveIntensity: 0.18,
  })
);
lockShackleStemL.position.set(-0.2, 0.04, 0.18);

const lockShackleStemR = lockShackleStemL.clone();
lockShackleStemR.position.x = 0.2;

const lockKeyHole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16),
  new THREE.MeshStandardMaterial({
    color: 0x0d1624,
    roughness: 0.5,
    metalness: 0.12,
  })
);
lockKeyHole.rotation.x = Math.PI * 0.5;
lockKeyHole.position.set(0, -0.03, 0.24);

const lockKeySlot = new THREE.Mesh(
  new THREE.BoxGeometry(0.07, 0.12, 0.03),
  new THREE.MeshStandardMaterial({
    color: 0x0d1624,
    roughness: 0.5,
    metalness: 0.12,
  })
);
lockKeySlot.position.set(0, -0.12, 0.24);

lockGroup.add(lockBody);
lockGroup.add(lockShackle);
lockGroup.add(lockShackleStemL);
lockGroup.add(lockShackleStemR);
lockGroup.add(lockKeyHole);
lockGroup.add(lockKeySlot);
lockGroup.scale.set(0.62, 0.62, 0.38);
lockGroup.position.set(0, 0, 0.86);
lockGroup.visible = false;
bubble.add(lockGroup);

const lockCountCanvas = document.createElement("canvas");
lockCountCanvas.width = 96;
lockCountCanvas.height = 96;
const lockCountCtx = lockCountCanvas.getContext("2d");
const lockCountTexture = new THREE.CanvasTexture(lockCountCanvas);
lockCountTexture.generateMipmaps = false;
lockCountTexture.needsUpdate = true;
const lockCountSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: lockCountTexture,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
}));
lockCountSprite.visible = false;
lockCountSprite.scale.set(0.44, 0.44, 1);
lockCountSprite.position.set(0, -0.44, 0.92);
bubble.add(lockCountSprite);
let lockCountLastText = "";

const BubbleState = {
  IDLE: "IDLE",
  PRE_BURST: "PRE_BURST",
  BURST: "BURST",
  DISSIPATE: "DISSIPATE",
  RESET: "RESET",
};

let bubbleState = BubbleState.IDLE;
let stateElapsed = 0;
let previewModeEnabled = false;

const preBurstDuration = 0.11;
const burstDuration = 0.26;
const dissipateDuration = 1.6;
const resetDelay = 0.2;
const preBurstScaleMax = 1.08;
const burstBubbleFadeInDuration = 0.16;
const previewDuration = preBurstDuration + burstDuration + dissipateDuration;
const dissolveProgressStart = -1.1;
const dissolveProgressEnd = 1.15;

const burstBubbleCount = 32;
const minBurstBubbleCount = 22;
const maxBurstBubbleCount = 32;
let activeBurstBubbleCount = 26;
const burstBubbleVelocities = [];
const burstBubbleStartPositions = [];
const burstBubbleStartVelocities = [];
const burstBubbleLife = new Array(burstBubbleCount).fill(0);
const burstBubbleLifeMax = new Array(burstBubbleCount).fill(1);
const burstBubbleBaseScale = new Array(burstBubbleCount).fill(0.08);
const burstBubbleMeshes = [];

const mistCount = 120;
let activeMistCount = 0;
const mistVelocities = [];
const mistStartPositions = [];
const mistStartVelocities = [];
const mistLife = new Array(mistCount).fill(0);
const mistLifeMax = new Array(mistCount).fill(1);
const mistBaseScale = new Array(mistCount).fill(0.04);
const mistMeshes = [];

const burstPoints = { visible: false };
const bubbleRadius = 1.2;
const burstBubbleGeometry = new THREE.SphereGeometry(1, 22, 22);

function createRoundSpriteTexture(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const c = size * 0.5;
  const r = size * 0.5;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, r);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.82, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const roundSpriteTexture = createRoundSpriteTexture(128);

for (let i = 0; i < burstBubbleCount; i += 1) {
  const burstBubbleMaterial = material.clone();
  burstBubbleMaterial.transparent = true;
  burstBubbleMaterial.opacity = 0;
  burstBubbleMaterial.depthWrite = false;
  burstBubbleMaterial.side = THREE.DoubleSide;

  const burstBubbleMesh = new THREE.Mesh(burstBubbleGeometry, burstBubbleMaterial);
  burstBubbleMesh.visible = false;
  scene.add(burstBubbleMesh);
  burstBubbleMeshes.push(burstBubbleMesh);
  burstBubbleVelocities.push(new THREE.Vector3());
  burstBubbleStartPositions.push(new THREE.Vector3());
  burstBubbleStartVelocities.push(new THREE.Vector3());
}

for (let i = 0; i < mistCount; i += 1) {
  const mistMaterial = new THREE.SpriteMaterial({
    color: 0xff8fb5,
    alphaMap: roundSpriteTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
  const mistMesh = new THREE.Sprite(mistMaterial);
  mistMesh.visible = false;
  scene.add(mistMesh);
  mistMeshes.push(mistMesh);
  mistVelocities.push(new THREE.Vector3());
  mistStartPositions.push(new THREE.Vector3());
  mistStartVelocities.push(new THREE.Vector3());
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const palette = [0xff1f4b, 0xff9800, 0x12cf5b, 0x1b8fff];

function setBubbleColor(hexValue) {
  const base = new THREE.Color(hexValue);
  const accent = base.clone().offsetHSL(0, -0.12, 0.26);
  tintUniform.value.copy(base);
  accentUniform.value.copy(accent);
}

function applyPaletteIndex(index) {
  activeColorIndex = ((index % palette.length) + palette.length) % palette.length;
  const color = palette[activeColorIndex];
  setBubbleColor(color);
  swatches.forEach((btn, idx) => btn.classList.toggle("is-active", idx === activeColorIndex));
}

swatches.forEach((button, index) => {
  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    applyPaletteIndex(index);
  });
});

controlsPanel.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

backBtn.addEventListener("click", () => {
  window.location.href = "./index.html";
});

popBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  triggerBubblePop();
});

if (popProgressInput) {
  popProgressInput.addEventListener("input", () => {
    const t = THREE.MathUtils.clamp(Number(popProgressInput.value), 0, 1);
    previewModeEnabled = true;
    if (bubbleState === BubbleState.IDLE) {
      resetBurstArtifacts();
      initBurstParticles();
    }
    applyPreviewFrame(t);
    setPopProgressUI(t);
  });
}

if (lockRemainingInput) {
  lockRemainingInput.addEventListener("input", () => {
    setLockRemaining(lockRemainingInput.value);
  });
}

syncBtn.addEventListener("click", () => {
  const payload = {
    transmission: material.transmission,
    roughness: material.roughness,
    clearcoat: material.clearcoat,
    wobble: wobbleAmplitudeUniform.value,
    flow: flowSpeedUniform.value,
    dye: dyeContrastUniform.value,
    edge: edgeGlowUniform.value,
    iri: iridescenceUniform.value,
    springTension: tension,
    springDamping: damping,
    lightKey: keyLight.intensity,
    lightAmbient: ambientLight.intensity,
    toggleDye: dyeEnabledUniform.value > 0.5,
    toggleEdge: edgeEnabledUniform.value > 0.5,
    toggleIri: iridescenceEnabledUniform.value > 0.5,
  };

  try {
    window.localStorage.setItem(tuningStorageKey, JSON.stringify(payload));
    compatEl.textContent = "已同步到主游戏。返回后开局会自动应用。";
  } catch (_err) {
    compatEl.textContent = "同步失败：浏览器不允许写入本地存储。";
  }
});

function setControlValue(id, value) {
  const input = document.getElementById(id);
  const valueView = document.querySelector(`[data-value-for="${id}"]`);
  if (!input || !valueView) return;
  input.value = String(value);
  valueView.textContent = Number(value).toFixed(input.step && Number(input.step) < 0.01 ? 3 : 2);
}

function bindControl(id, onUpdate) {
  const input = document.getElementById(id);
  const valueView = document.querySelector(`[data-value-for="${id}"]`);
  if (!input || !valueView) return;

  const handle = () => {
    const value = Number(input.value);
    valueView.textContent = value.toFixed(input.step && Number(input.step) < 0.01 ? 3 : 2);
    onUpdate(value);
  };

  input.addEventListener("input", handle);
  handle();
}

function setToggleValue(id, checked) {
  const input = document.getElementById(id);
  if (!input) return;
  input.checked = checked;
}

function bindToggle(id, onUpdate) {
  const input = document.getElementById(id);
  if (!input) return;

  const handle = () => onUpdate(input.checked);
  input.addEventListener("change", handle);
  handle();
}

bindControl("p-transmission", (value) => {
  transmissionControlValue = value;
  if (!lockModeEnabled) material.transmission = value;
});
bindControl("p-roughness", (value) => {
  material.roughness = value;
});
bindControl("p-clearcoat", (value) => {
  material.clearcoat = value;
});
bindControl("p-wobble", (value) => {
  wobbleAmplitudeUniform.value = value;
});
bindControl("p-flow", (value) => {
  flowSpeedUniform.value = value;
});
bindControl("p-dye", (value) => {
  dyeContrastUniform.value = value;
});
bindControl("p-edge", (value) => {
  edgeGlowUniform.value = value;
});
bindControl("p-dissolve-edge", (value) => {
  dissolveEdgeUniform.value = value;
});
bindControl("p-dissolve-freq", (value) => {
  dissolveFreqUniform.value = value;
});
bindControl("p-dissolve-emissive", (value) => {
  dissolveEmissiveUniform.value = value;
});
bindControl("p-iri", (value) => {
  iridescenceUniform.value = value;
});
bindControl("p-spring-tension", (value) => {
  tension = value;
});
bindControl("p-spring-damping", (value) => {
  damping = value;
});
bindControl("p-light-key", (value) => {
  keyLight.intensity = value;
});
bindControl("p-light-ambient", (value) => {
  ambientLight.intensity = value;
});

bindToggle("t-dye", (checked) => {
  dyeEnabledUniform.value = checked ? 1 : 0;
});
bindToggle("t-edge", (checked) => {
  edgeEnabledUniform.value = checked ? 1 : 0;
});
bindToggle("t-iri", (checked) => {
  iridescenceEnabledUniform.value = checked ? 1 : 0;
});
bindToggle("t-random", (checked) => {
  randomClickColorEnabled = checked;
});
bindToggle("t-bomb", (checked) => {
  bombModeEnabled = checked;
  updateBombVisualState(clock.elapsedTime);
});
bindToggle("t-lock", (checked) => {
  lockModeEnabled = checked;
  updateLockVisualState(clock.elapsedTime);
});

document.getElementById("reset-btn").addEventListener("click", () => {
  setControlValue("p-transmission", defaults.transmission);
  setControlValue("p-roughness", defaults.roughness);
  setControlValue("p-clearcoat", defaults.clearcoat);
  setControlValue("p-wobble", defaults.wobble);
  setControlValue("p-flow", defaults.flow);
  setControlValue("p-dye", defaults.dye);
  setControlValue("p-edge", defaults.edge);
  setControlValue("p-dissolve-edge", defaults.dissolveEdge);
  setControlValue("p-dissolve-freq", defaults.dissolveFreq);
  setControlValue("p-dissolve-emissive", defaults.dissolveEmissive);
  setControlValue("p-iri", defaults.iri);
  setControlValue("p-spring-tension", defaults.springTension);
  setControlValue("p-spring-damping", defaults.springDamping);
  setControlValue("p-light-key", defaults.lightKey);
  setControlValue("p-light-ambient", defaults.lightAmbient);
  setControlValue("p-lock-remaining", defaults.lockRemaining);
  setToggleValue("t-dye", defaults.toggleDye);
  setToggleValue("t-edge", defaults.toggleEdge);
  setToggleValue("t-iri", defaults.toggleIri);
  setToggleValue("t-random", defaults.toggleRandom);
  setToggleValue("t-bomb", defaults.toggleBomb);
  setToggleValue("t-lock", defaults.toggleLock);

  material.transmission = defaults.transmission;
  transmissionControlValue = defaults.transmission;
  material.roughness = defaults.roughness;
  material.clearcoat = defaults.clearcoat;
  material.opacity = 0.95;
  wobbleAmplitudeUniform.value = defaults.wobble;
  flowSpeedUniform.value = defaults.flow;
  dyeContrastUniform.value = defaults.dye;
  edgeGlowUniform.value = defaults.edge;
  dissolveEdgeUniform.value = defaults.dissolveEdge;
  dissolveFreqUniform.value = defaults.dissolveFreq;
  dissolveEmissiveUniform.value = defaults.dissolveEmissive;
  dissolveProgressUniform.value = dissolveProgressStart;
  dissolveEnabledUniform.value = 0;
  iridescenceUniform.value = defaults.iri;
  tension = defaults.springTension;
  damping = defaults.springDamping;
  keyLight.intensity = defaults.lightKey;
  ambientLight.intensity = defaults.lightAmbient;
  dyeEnabledUniform.value = defaults.toggleDye ? 1 : 0;
  edgeEnabledUniform.value = defaults.toggleEdge ? 1 : 0;
  iridescenceEnabledUniform.value = defaults.toggleIri ? 1 : 0;
  randomClickColorEnabled = defaults.toggleRandom;
  bombModeEnabled = defaults.toggleBomb;
  lockModeEnabled = defaults.toggleLock;
  setLockRemaining(defaults.lockRemaining);
  previewModeEnabled = false;
  bubbleState = BubbleState.IDLE;
  stateElapsed = 0;
  crackGlowUniform.value = 0;
  resetBurstArtifacts();
  bubble.visible = true;
  bubble.scale.setScalar(1);
  material.opacity = 0.95;
  setPopProgressUI(0);
  updateBombVisualState(clock.elapsedTime);
  updateLockVisualState(clock.elapsedTime);
});

window.addEventListener("pointerdown", (event) => {
  if (bubbleState !== BubbleState.IDLE || previewModeEnabled) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(bubble);

  if (hit.length > 0) {
    springVel -= 0.85;
    if (randomClickColorEnabled) {
      applyPaletteIndex(Math.floor(Math.random() * palette.length));
    } else {
      applyPaletteIndex(activeColorIndex + 1);
    }
  }
});

function triggerBubblePop() {
  if (bubbleState !== BubbleState.IDLE) return;
  previewModeEnabled = false;
  stateElapsed = 0;
  bubbleState = BubbleState.PRE_BURST;
  crackGlowUniform.value = 0.12;
  setDissolvePhase(0);
  bubble.visible = true;
  material.opacity = 0.95;
  bubble.scale.setScalar(1);
  springVel -= 1.1;
}

function setDissolvePhase(phase01) {
  const t = THREE.MathUtils.clamp(phase01, 0, 1);
  dissolveEnabledUniform.value = 1;
  dissolveProgressUniform.value = THREE.MathUtils.lerp(dissolveProgressStart, dissolveProgressEnd, t);
}

function updateBombVisualState(elapsedTime) {
  const bubbleAlive = bubble.visible && bubbleState !== BubbleState.DISSIPATE;
  bombGroup.visible = bombModeEnabled && bubbleAlive;
  if (!bombGroup.visible) return;

  const dangerBoost = bubbleState === BubbleState.PRE_BURST || bubbleState === BubbleState.BURST ? 1.0 : 0.0;
  const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * (4.8 + dangerBoost * 5.2));
  const ringPulse = 0.5 + 0.5 * Math.sin(elapsedTime * (3.2 + dangerBoost * 6.4));

  bombCore.scale.setScalar(0.98 + pulse * (0.04 + dangerBoost * 0.06));
  bombRing.material.opacity = 0.2 + ringPulse * (0.25 + dangerBoost * 0.35);
  bombRing.scale.setScalar(0.9 + ringPulse * (0.12 + dangerBoost * 0.2));

  const sparkMat = bombSpark.material;
  sparkMat.opacity = 0.35 + Math.random() * (0.35 + dangerBoost * 0.25);
  bombSpark.scale.setScalar(0.9 + Math.random() * (0.35 + dangerBoost * 0.35));

  const jitter = dangerBoost * 0.018;
  bombGroup.position.set((Math.random() * 2 - 1) * jitter, (Math.random() * 2 - 1) * jitter, 0);
}

function updateLockVisualState(elapsedTime) {
  const bubbleAlive = bubble.visible && bubbleState !== BubbleState.DISSIPATE;
  const show = lockModeEnabled && bubbleAlive;
  lockGroup.visible = show;
  lockCountSprite.visible = show;

  if (!show) {
    material.transmission = transmissionControlValue;
    material.thickness = 1.35;
    lockCountSprite.material.opacity = 0;
    return;
  }

  const dangerBoost = bubbleState === BubbleState.PRE_BURST || bubbleState === BubbleState.BURST ? 1.0 : 0.0;
  const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * (2.6 + dangerBoost * 3.2));
  const sway = Math.sin(elapsedTime * 0.85) * 0.04;

  lockGroup.rotation.z = sway;
  const s = 0.62 + pulse * (0.03 + dangerBoost * 0.03);
  lockGroup.scale.set(s, s, s * 0.62);
  lockBody.material.emissiveIntensity = 0.12 + pulse * 0.16;
  lockShackle.material.emissiveIntensity = 0.1 + pulse * 0.12;
  lockShackleStemL.material.emissiveIntensity = 0.1 + pulse * 0.12;
  lockShackleStemR.material.emissiveIntensity = 0.1 + pulse * 0.12;

  lockCountSprite.position.y = -0.44 + Math.sin(elapsedTime * 1.2) * 0.008;
  lockCountSprite.material.opacity = 0.76 + pulse * 0.2;
  material.transmission = Math.max(0.2, transmissionControlValue * 0.36);
  material.thickness = 0.46;
}

function updatePopState(dt) {
  if (previewModeEnabled) {
    applyPreviewFrame(THREE.MathUtils.clamp(Number(popProgressInput?.value ?? 0), 0, 1));
    return;
  }

  if (bubbleState === BubbleState.IDLE) {
    crackGlowUniform.value = 0;
    dissolveEnabledUniform.value = 0;
    dissolveProgressUniform.value = dissolveProgressStart;
    bubble.visible = true;
    material.opacity = 0.95;
    bubble.scale.setScalar(1);
    return;
  }

  stateElapsed += dt;

  if (bubbleState === BubbleState.PRE_BURST) {
    const t = Math.min(stateElapsed / preBurstDuration, 1);
    const smooth = t * t * (3 - 2 * t);
    bubble.visible = true;
    setDissolvePhase(0);
    bubble.scale.setScalar(1 + (preBurstScaleMax - 1) * smooth);
    crackGlowUniform.value = 0.12 * smooth;
    material.opacity = 0.95;

    if (t >= 1) {
      bubbleState = BubbleState.BURST;
      stateElapsed = 0;
      initBurstParticles();
    }
    return;
  }

  if (bubbleState === BubbleState.BURST) {
    const t = Math.min(stateElapsed / burstDuration, 1);
    setDissolvePhase(t * 0.9);
    crackGlowUniform.value = (1 - t) * 0.12;
    material.opacity = 0.95;
    bubble.scale.setScalar(preBurstScaleMax + t * 0.03);
    updateBurstParticles(dt);
    bubble.visible = true;

    if (t >= 1) {
      bubbleState = BubbleState.DISSIPATE;
      stateElapsed = 0;
    }
    return;
  }

  if (bubbleState === BubbleState.DISSIPATE) {
    const t = Math.min(stateElapsed / Math.max(dissipateDuration * 0.24, 0.0001), 1);
    setDissolvePhase(0.9 + t * 0.1);
    crackGlowUniform.value = 0;
    bubble.visible = true;
    material.opacity = 0.95;
    updateBurstParticles(dt);

    if (stateElapsed >= dissipateDuration && !burstPoints.visible) {
      bubble.visible = false;
      bubbleState = BubbleState.RESET;
      stateElapsed = 0;
    }
    return;
  }

  if (bubbleState === BubbleState.RESET) {
    if (stateElapsed >= resetDelay) {
      bubbleState = BubbleState.IDLE;
      stateElapsed = 0;
      crackGlowUniform.value = 0;
      dissolveEnabledUniform.value = 0;
      dissolveProgressUniform.value = dissolveProgressStart;
      bubble.visible = true;
      bubble.scale.setScalar(1);
      material.opacity = 0.95;
      resetBurstArtifacts();
    }
  }
}

function setPopProgressUI(t) {
  if (popProgressInput) popProgressInput.value = String(t);
  if (popProgressValue) popProgressValue.textContent = `${Math.round(t * 100)}%`;
}

function drawLockCounter(value) {
  if (!lockCountCtx) return;
  const text = String(Math.max(0, Math.floor(value)));
  if (text === lockCountLastText) return;
  lockCountLastText = text;

  const ctx = lockCountCtx;
  const width = lockCountCanvas.width;
  const height = lockCountCanvas.height;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const radius = width * 0.34;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(13, 29, 51, 0.72)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(146, 221, 255, 0.95)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#f1fbff";
  ctx.font = "700 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 1);

  lockCountTexture.needsUpdate = true;
}

function setLockRemaining(value) {
  lockRemaining = THREE.MathUtils.clamp(Math.floor(Number(value) || 0), 0, 20);
  if (lockRemainingInput) lockRemainingInput.value = String(lockRemaining);
  if (lockRemainingValue) lockRemainingValue.textContent = String(lockRemaining);
  drawLockCounter(lockRemaining);
}

function resetBurstArtifacts() {
  activeBurstBubbleCount = 0;
  activeMistCount = 0;
  for (let i = 0; i < burstBubbleCount; i += 1) {
    burstBubbleLife[i] = 0;
    burstBubbleLifeMax[i] = 1;
    const burstBubbleMesh = burstBubbleMeshes[i];
    burstBubbleMesh.visible = false;
    burstBubbleMesh.position.set(9999, 9999, 9999);
    burstBubbleMesh.scale.setScalar(0.0001);
    burstBubbleMesh.material.opacity = 0;
  }

  for (let i = 0; i < mistCount; i += 1) {
    mistLife[i] = 0;
    mistLifeMax[i] = 1;
    const mistMesh = mistMeshes[i];
    mistMesh.visible = false;
    mistMesh.position.set(9999, 9999, 9999);
    mistMesh.scale.setScalar(0.0001);
    mistMesh.material.opacity = 0;
  }

  burstPoints.visible = false;
}

function initBurstParticles() {
  activeBurstBubbleCount = minBurstBubbleCount + Math.floor(Math.random() * (maxBurstBubbleCount - minBurstBubbleCount + 1));
  activeMistCount = 70 + Math.floor(Math.random() * 42);
  const baseTint = tintUniform.value.clone();

  for (let i = 0; i < burstBubbleCount; i += 1) {
    const burstBubbleMesh = burstBubbleMeshes[i];
    const burstBubbleMaterial = burstBubbleMesh.material;
    if (i >= activeBurstBubbleCount) {
      burstBubbleLife[i] = 0;
      burstBubbleLifeMax[i] = 1;
      burstBubbleMesh.visible = false;
      burstBubbleMaterial.opacity = 0;
      continue;
    }

    burstBubbleMaterial.positionNode = material.positionNode;
    burstBubbleMaterial.colorNode = material.colorNode;
    burstBubbleMaterial.emissiveNode = material.emissiveNode;
    burstBubbleMaterial.iridescenceNode = material.iridescenceNode;
    burstBubbleMaterial.iridescenceIORNode = material.iridescenceIORNode;
    burstBubbleMaterial.iridescenceThicknessNode = material.iridescenceThicknessNode;
    burstBubbleMaterial.transmission = material.transmission;
    burstBubbleMaterial.roughness = Math.min(0.26, material.roughness + 0.02);
    burstBubbleMaterial.thickness = Math.min(0.7, material.thickness * 0.5);
    burstBubbleMaterial.ior = material.ior;
    burstBubbleMaterial.clearcoat = material.clearcoat;
    burstBubbleMaterial.clearcoatRoughness = material.clearcoatRoughness;
    burstBubbleMaterial.envMapIntensity = material.envMapIntensity;

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

    const speed = 1.1 + Math.random() * 1.2;
    burstBubbleVelocities[i].copy(velocityDir).multiplyScalar(speed);
    burstBubbleStartVelocities[i].copy(burstBubbleVelocities[i]);

    const innerRadius = bubbleRadius * preBurstScaleMax * 0.9;
    const spawnRadius = innerRadius * Math.cbrt(Math.random());
    burstBubbleMesh.position.copy(bubble.position).addScaledVector(spawnDir, spawnRadius);
    burstBubbleStartPositions[i].copy(burstBubbleMesh.position);

    const startScale = 0.028 + Math.random() * 0.055;
    burstBubbleBaseScale[i] = startScale;
    burstBubbleMesh.scale.setScalar(startScale);
    burstBubbleMaterial.opacity = 0;
    burstBubbleMesh.visible = true;

    burstBubbleLife[i] = 0.58 + Math.random() * 0.56;
    burstBubbleLifeMax[i] = burstBubbleLife[i];
  }

  for (let i = 0; i < mistCount; i += 1) {
    const mistMesh = mistMeshes[i];
    const mistMaterial = mistMesh.material;
    if (i >= activeMistCount) {
      mistLife[i] = 0;
      mistLifeMax[i] = 1;
      mistMesh.visible = false;
      mistMaterial.opacity = 0;
      continue;
    }

    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const speed = 1.45 + Math.random() * 1.55;
    mistVelocities[i].copy(dir).multiplyScalar(speed);
    mistStartVelocities[i].copy(mistVelocities[i]);

    const spawnRadius = bubbleRadius * preBurstScaleMax * (0.22 + Math.random() * 0.26);
    mistMesh.position.copy(bubble.position).addScaledVector(dir, spawnRadius);
    mistStartPositions[i].copy(mistMesh.position);

    const startScale = 0.014 + Math.random() * 0.042;
    mistBaseScale[i] = startScale;
    mistMesh.scale.setScalar(startScale);
    mistMaterial.color.copy(baseTint);
    mistMaterial.opacity = 0;
    mistMesh.visible = true;

    mistLife[i] = 0.9 + Math.random() * 1.15;
    mistLifeMax[i] = mistLife[i];
  }

  burstPoints.visible = true;
}

function updateBurstParticles(delta) {
  let aliveCount = 0;

  for (let i = 0; i < burstBubbleCount; i += 1) {
    if (burstBubbleLife[i] <= 0) continue;

    aliveCount += 1;
    const burstBubbleMesh = burstBubbleMeshes[i];
    burstBubbleLife[i] -= delta;

    burstBubbleVelocities[i].multiplyScalar(Math.pow(0.91, delta * 60));
    burstBubbleVelocities[i].y -= delta * 0.24;
    burstBubbleMesh.position.addScaledVector(burstBubbleVelocities[i], delta);

    const lifeRatio = Math.max(burstBubbleLife[i], 0) / Math.max(burstBubbleLifeMax[i], 0.0001);
    const age = Math.max(burstBubbleLifeMax[i] - burstBubbleLife[i], 0);
    const appear = Math.min(age / burstBubbleFadeInDuration, 1);
    const fade = Math.pow(lifeRatio, 0.62);
    const scaleNow = burstBubbleBaseScale[i] * (0.68 + 0.32 * fade);

    burstBubbleMesh.scale.setScalar(scaleNow);
    burstBubbleMesh.material.opacity = 0.82 * fade * appear;

    if (burstBubbleLife[i] <= 0) {
      burstBubbleMesh.visible = false;
      burstBubbleMesh.material.opacity = 0;
    }
  }

  for (let i = 0; i < mistCount; i += 1) {
    if (mistLife[i] <= 0) continue;
    aliveCount += 1;
    const mistMesh = mistMeshes[i];
    mistLife[i] -= delta;

    mistVelocities[i].multiplyScalar(Math.pow(0.92, delta * 60));
    mistVelocities[i].y += delta * 0.2;
    mistMesh.position.addScaledVector(mistVelocities[i], delta);

    const lifeRatio = Math.max(mistLife[i], 0) / Math.max(mistLifeMax[i], 0.0001);
    const age = Math.max(mistLifeMax[i] - mistLife[i], 0);
    const appear = Math.min(age / 0.1, 1);
    const fade = Math.pow(lifeRatio, 1.25);
    mistMesh.scale.setScalar(mistBaseScale[i] * (0.82 + 0.95 * (1 - fade)));
    mistMesh.material.opacity = 0.66 * fade * appear;

    if (mistLife[i] <= 0) {
      mistMesh.visible = false;
      mistMesh.material.opacity = 0;
    }
  }

  if (aliveCount === 0) burstPoints.visible = false;
}

function applyPreviewFrame(progress01) {
  const safeProgress = THREE.MathUtils.clamp(progress01, 0, 1);
  const tSec = safeProgress * previewDuration;
  setDissolvePhase(safeProgress);

  if (tSec <= preBurstDuration) {
    const p = preBurstDuration > 0 ? tSec / preBurstDuration : 1;
    const smooth = p * p * (3 - 2 * p);
    bubble.visible = true;
    bubble.scale.setScalar(1 + (preBurstScaleMax - 1) * smooth);
    material.opacity = 0.95;
    crackGlowUniform.value = 0.08 * smooth;
    burstPoints.visible = false;
    return;
  }

  const burstElapsed = tSec - preBurstDuration;
  const burstT = Math.min(burstElapsed / burstDuration, 1);
  bubble.scale.setScalar(preBurstScaleMax + 0.03 * burstT);
  material.opacity = 0.95;
  crackGlowUniform.value = Math.max(0, 0.1 * (1 - burstT));
  bubble.visible = safeProgress < 1;

  let alive = 0;
  for (let i = 0; i < burstBubbleCount; i += 1) {
    const burstBubbleMesh = burstBubbleMeshes[i];
    if (i >= activeBurstBubbleCount) {
      burstBubbleMesh.visible = false;
      burstBubbleMesh.material.opacity = 0;
      continue;
    }

    const lifeMax = burstBubbleLifeMax[i];
    const lifeRemain = 1 - burstElapsed / Math.max(lifeMax, 0.0001);
    if (lifeRemain <= 0) {
      burstBubbleMesh.visible = false;
      burstBubbleMesh.material.opacity = 0;
      continue;
    }

    alive += 1;
    burstBubbleMesh.visible = true;
    const fade = Math.pow(lifeRemain, 0.62);
    const appear = Math.min(burstElapsed / burstBubbleFadeInDuration, 1);
    const previewMove = burstElapsed * 0.92;

    burstBubbleMesh.position.set(
      burstBubbleStartPositions[i].x + burstBubbleStartVelocities[i].x * previewMove,
      burstBubbleStartPositions[i].y + burstBubbleStartVelocities[i].y * previewMove,
      burstBubbleStartPositions[i].z + burstBubbleStartVelocities[i].z * previewMove
    );
    burstBubbleMesh.scale.setScalar(burstBubbleBaseScale[i] * (0.68 + 0.32 * fade));
    burstBubbleMesh.material.opacity = 0.82 * fade * appear;
  }

  for (let i = 0; i < mistCount; i += 1) {
    const mistMesh = mistMeshes[i];
    if (i >= activeMistCount) {
      mistMesh.visible = false;
      mistMesh.material.opacity = 0;
      continue;
    }

    const lifeMax = mistLifeMax[i];
    const lifeRemain = 1 - burstElapsed / Math.max(lifeMax, 0.0001);
    if (lifeRemain <= 0) {
      mistMesh.visible = false;
      mistMesh.material.opacity = 0;
      continue;
    }

    alive += 1;
    mistMesh.visible = true;
    const fade = Math.pow(lifeRemain, 1.22);
    const appear = Math.min(burstElapsed / 0.1, 1);
    const previewMove = burstElapsed * 0.96;
    mistMesh.position.set(
      mistStartPositions[i].x + mistStartVelocities[i].x * previewMove,
      mistStartPositions[i].y + mistStartVelocities[i].y * previewMove + burstElapsed * 0.08,
      mistStartPositions[i].z + mistStartVelocities[i].z * previewMove
    );
    mistMesh.scale.setScalar(mistBaseScale[i] * (0.82 + 0.95 * (1 - fade)));
    mistMesh.material.opacity = 0.66 * fade * appear;
  }

  burstPoints.visible = alive > 0;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

async function bootstrap() {
  try {
    await renderer.init();
  } catch (error) {
    compatEl.textContent = "初始化失败：浏览器可能不支持 WebGPU/WebGL2。";
    throw error;
  }

  applyPaletteIndex(0);
  resetBurstArtifacts();
  setPopProgressUI(0);
  setLockRemaining(defaults.lockRemaining);
  updateLockVisualState(0);

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const elapsed = clock.elapsedTime;

    springVel += (0 - springVal) * tension;
    springVel *= damping;
    springVal += springVel;
    springUniform.value = springVal;

    updatePopState(dt);
    updateBombVisualState(elapsed);
    updateLockVisualState(elapsed);

    controls.update();
    renderer.render(scene, camera);
  });
}

bootstrap();
