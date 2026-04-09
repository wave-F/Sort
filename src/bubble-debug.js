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

const defaults = {
  transmission: 0.86,
  roughness: 0.13,
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

const springUniform = uniform(0);
const tintUniform = uniform(new THREE.Color(0xff2f63));
const accentUniform = uniform(new THREE.Color(0xffb3ca));
const flowSpeedUniform = uniform(defaults.flow);
const wobbleAmplitudeUniform = uniform(defaults.wobble);
const dyeContrastUniform = uniform(defaults.dye);
const edgeGlowUniform = uniform(defaults.edge);
const iridescenceUniform = uniform(defaults.iri);
const dyeEnabledUniform = uniform(1.0);
const edgeEnabledUniform = uniform(1.0);
const iridescenceEnabledUniform = uniform(1.0);
const iridescenceBaseUniform = uniform(90.0);
const iridescenceSpanUniform = uniform(520.0);

const material = new MeshPhysicalNodeMaterial({
  transmission: defaults.transmission,
  thickness: 1.42,
  roughness: defaults.roughness,
  metalness: 0.0,
  clearcoat: defaults.clearcoat,
  clearcoatRoughness: 0.16,
  ior: 1.2,
  envMapIntensity: 0.72,
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
material.emissiveNode = tintUniform.mul(edgeGlow.mul(edgeGlowUniform).mul(edgeEnabledUniform));

material.iridescenceNode = iridescenceUniform.mul(iridescenceEnabledUniform);
material.iridescenceIORNode = uniform(1.3);
material.iridescenceThicknessNode = dyeMix.mul(iridescenceSpanUniform).add(iridescenceBaseUniform);

const bubble = new THREE.Mesh(bubbleGeometry, material);
scene.add(bubble);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const palette = [0xff2f63, 0xff8a00, 0x00c36e, 0x6a4dff];

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
});

window.addEventListener("pointerdown", (event) => {
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

  renderer.setAnimationLoop(() => {
    springVel += (0 - springVal) * tension;
    springVel *= damping;
    springVal += springVel;
    springUniform.value = springVal;

    controls.update();
    renderer.render(scene, camera);
  });
}

bootstrap();
