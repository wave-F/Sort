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
const tuningStorageKey = "bubble_tuning_v1";
const debugBuildTag = "jelly-burst-2026-04-09";
if (compatEl) compatEl.textContent = `调试页版本: ${debugBuildTag}`;

const defaults = {
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
  toggleRandom: true,
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
let randomClickColorEnabled = defaults.toggleRandom;
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

const viewDot = normalView.dot(positionViewDirection.negate()).abs().clamp(0.0, 1.0);
const edgeGlow = viewDot.mul(-1.0).add(1.0).pow(2.8);
material.emissiveNode = tintUniform.mul(edgeGlow.mul(edgeGlowUniform.add(crackGlowUniform)).mul(edgeEnabledUniform));

material.iridescenceNode = iridescenceUniform.mul(iridescenceEnabledUniform);
material.iridescenceIORNode = uniform(1.3);
material.iridescenceThicknessNode = dyeMix.mul(iridescenceSpanUniform).add(iridescenceBaseUniform);

const bubble = new THREE.Mesh(bubbleGeometry, material);
scene.add(bubble);

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

const preBurstDuration = 0.09;
const burstDuration = 0.18;
const dissipateDuration = 1.6;
const resetDelay = 0.2;
const preBurstScaleMax = 1.08;
const burstBubbleFadeInDuration = 0.16;
const previewDuration = preBurstDuration + burstDuration + dissipateDuration;

const burstBubbleCount = 10;
const minBurstBubbleCount = 7;
const maxBurstBubbleCount = 10;
let activeBurstBubbleCount = 8;
const burstBubbleVelocities = [];
const burstBubbleStartPositions = [];
const burstBubbleStartVelocities = [];
const burstBubbleLife = new Array(burstBubbleCount).fill(0);
const burstBubbleLifeMax = new Array(burstBubbleCount).fill(1);
const burstBubbleBaseScale = new Array(burstBubbleCount).fill(0.08);
const burstBubbleMeshes = [];
const burstPoints = { visible: false };
const bubbleRadius = 1.2;
const burstBubbleGeometry = new THREE.SphereGeometry(1, 22, 22);

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
  material.transmission = value;
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

document.getElementById("reset-btn").addEventListener("click", () => {
  setControlValue("p-transmission", defaults.transmission);
  setControlValue("p-roughness", defaults.roughness);
  setControlValue("p-clearcoat", defaults.clearcoat);
  setControlValue("p-wobble", defaults.wobble);
  setControlValue("p-flow", defaults.flow);
  setControlValue("p-dye", defaults.dye);
  setControlValue("p-edge", defaults.edge);
  setControlValue("p-iri", defaults.iri);
  setControlValue("p-spring-tension", defaults.springTension);
  setControlValue("p-spring-damping", defaults.springDamping);
  setControlValue("p-light-key", defaults.lightKey);
  setControlValue("p-light-ambient", defaults.lightAmbient);
  setToggleValue("t-dye", defaults.toggleDye);
  setToggleValue("t-edge", defaults.toggleEdge);
  setToggleValue("t-iri", defaults.toggleIri);
  setToggleValue("t-random", defaults.toggleRandom);

  material.transmission = defaults.transmission;
  material.roughness = defaults.roughness;
  material.clearcoat = defaults.clearcoat;
  material.opacity = 0.95;
  wobbleAmplitudeUniform.value = defaults.wobble;
  flowSpeedUniform.value = defaults.flow;
  dyeContrastUniform.value = defaults.dye;
  edgeGlowUniform.value = defaults.edge;
  iridescenceUniform.value = defaults.iri;
  tension = defaults.springTension;
  damping = defaults.springDamping;
  keyLight.intensity = defaults.lightKey;
  ambientLight.intensity = defaults.lightAmbient;
  dyeEnabledUniform.value = defaults.toggleDye ? 1 : 0;
  edgeEnabledUniform.value = defaults.toggleEdge ? 1 : 0;
  iridescenceEnabledUniform.value = defaults.toggleIri ? 1 : 0;
  randomClickColorEnabled = defaults.toggleRandom;
  previewModeEnabled = false;
  bubbleState = BubbleState.IDLE;
  stateElapsed = 0;
  crackGlowUniform.value = 0;
  resetBurstArtifacts();
  bubble.visible = true;
  bubble.scale.setScalar(1);
  material.opacity = 0.95;
  setPopProgressUI(0);
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
  bubble.visible = true;
  material.opacity = 0.95;
  bubble.scale.setScalar(1);
  springVel -= 1.1;
}

function updatePopState(dt) {
  if (previewModeEnabled) {
    applyPreviewFrame(THREE.MathUtils.clamp(Number(popProgressInput?.value ?? 0), 0, 1));
    return;
  }

  if (bubbleState === BubbleState.IDLE) {
    crackGlowUniform.value = 0;
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
    crackGlowUniform.value = (1 - t) * 0.12;
    material.opacity = Math.max(0, 0.95 * (1 - t * 1.85));
    bubble.scale.setScalar(preBurstScaleMax + t * 0.03);
    updateBurstParticles(dt);

    if (t > 0.5) bubble.visible = false;

    if (t >= 1) {
      bubbleState = BubbleState.DISSIPATE;
      stateElapsed = 0;
      material.opacity = 0;
    }
    return;
  }

  if (bubbleState === BubbleState.DISSIPATE) {
    crackGlowUniform.value = 0;
    bubble.visible = false;
    updateBurstParticles(dt);

    if (stateElapsed >= dissipateDuration && !burstPoints.visible) {
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

function resetBurstArtifacts() {
  for (let i = 0; i < burstBubbleCount; i += 1) {
    burstBubbleLife[i] = 0;
    burstBubbleLifeMax[i] = 1;
    const burstBubbleMesh = burstBubbleMeshes[i];
    burstBubbleMesh.visible = false;
    burstBubbleMesh.position.set(9999, 9999, 9999);
    burstBubbleMesh.scale.setScalar(0.0001);
    burstBubbleMesh.material.opacity = 0;
  }
  burstPoints.visible = false;
}

function initBurstParticles() {
  activeBurstBubbleCount = minBurstBubbleCount + Math.floor(Math.random() * (maxBurstBubbleCount - minBurstBubbleCount + 1));

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

    const speed = 0.34 + Math.random() * 0.5;
    burstBubbleVelocities[i].copy(velocityDir).multiplyScalar(speed);
    burstBubbleStartVelocities[i].copy(burstBubbleVelocities[i]);

    const innerRadius = bubbleRadius * preBurstScaleMax * 0.9;
    const spawnRadius = innerRadius * Math.cbrt(Math.random());
    burstBubbleMesh.position.copy(bubble.position).addScaledVector(spawnDir, spawnRadius);
    burstBubbleStartPositions[i].copy(burstBubbleMesh.position);

    const startScale = 0.055 + Math.random() * 0.11;
    burstBubbleBaseScale[i] = startScale;
    burstBubbleMesh.scale.setScalar(startScale);
    burstBubbleMaterial.opacity = 0;
    burstBubbleMesh.visible = true;

    burstBubbleLife[i] = 1.05 + Math.random() * 0.75;
    burstBubbleLifeMax[i] = burstBubbleLife[i];
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

    burstBubbleVelocities[i].multiplyScalar(Math.pow(0.94, delta * 60));
    burstBubbleMesh.position.addScaledVector(burstBubbleVelocities[i], delta);

    const lifeRatio = Math.max(burstBubbleLife[i], 0) / Math.max(burstBubbleLifeMax[i], 0.0001);
    const age = Math.max(burstBubbleLifeMax[i] - burstBubbleLife[i], 0);
    const appear = Math.min(age / burstBubbleFadeInDuration, 1);
    const fade = Math.pow(lifeRatio, 0.62);
    const scaleNow = burstBubbleBaseScale[i] * (0.68 + 0.32 * fade);

    burstBubbleMesh.scale.setScalar(scaleNow);
    burstBubbleMesh.material.opacity = 0.9 * fade * appear;

    if (burstBubbleLife[i] <= 0) {
      burstBubbleMesh.visible = false;
      burstBubbleMesh.material.opacity = 0;
    }
  }

  if (aliveCount === 0) burstPoints.visible = false;
}

function applyPreviewFrame(progress01) {
  const tSec = THREE.MathUtils.clamp(progress01, 0, 1) * previewDuration;

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
  material.opacity = Math.max(0, 0.95 * (1 - burstT * 1.85));
  crackGlowUniform.value = Math.max(0, 0.1 * (1 - burstT));
  bubble.visible = burstT < 0.5;

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
    const previewMove = burstElapsed * 0.62;

    burstBubbleMesh.position.set(
      burstBubbleStartPositions[i].x + burstBubbleStartVelocities[i].x * previewMove,
      burstBubbleStartPositions[i].y + burstBubbleStartVelocities[i].y * previewMove,
      burstBubbleStartPositions[i].z + burstBubbleStartVelocities[i].z * previewMove
    );
    burstBubbleMesh.scale.setScalar(burstBubbleBaseScale[i] * (0.68 + 0.32 * fade));
    burstBubbleMesh.material.opacity = 0.9 * fade * appear;
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

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 30);

    springVel += (0 - springVal) * tension;
    springVel *= damping;
    springVal += springVel;
    springUniform.value = springVal;

    updatePopState(dt);

    controls.update();
    renderer.render(scene, camera);
  });
}

bootstrap();
