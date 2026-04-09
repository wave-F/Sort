import * as THREE from "three/webgpu";

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
  fruitCount: 40,
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

const state = {
  started: false,
  gameOver: false,
  score: 0,
  pointerDown: false,
  sliceColorId: null,
  sliceBroken: false,
  sliceCommitted: false,
  sliceHitIds: new Set(),
  sliceQueue: [],
  lastPoint: null,
  nowPoint: null,
  lastMoveAt: 0,
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x91aac6, 8, 18);

const camera = new THREE.OrthographicCamera();
camera.position.set(0, 0, 9);
camera.lookAt(0, 0, 0);

let renderer;
let trail;
let particles;

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
  new THREE.MeshBasicMaterial({ color: 0x98c2eb, transparent: true, opacity: 0.16 })
);
bgPlane.position.z = -1.5;
scene.add(bgPlane);

init();

function init() {
  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  window.addEventListener("resize", resize);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  setupRenderer();
}

async function setupRenderer() {
  renderer = await createRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  appEl.appendChild(renderer.domElement);
  resize();

  trail = new SliceTrail(64);
  particles = new JuiceParticles(680);
  scene.add(trail.mesh);
  scene.add(particles.points);

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
  state.started = true;
  state.gameOver = false;
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
  setSliceStatus("状态: 待机");
  showCommentary("先锁定一种颜色再连切。", 1600);

  resetFruits();
}

function resetFruits() {
  for (const fruit of fruits) scene.remove(fruit.group);
  fruits.length = 0;

  const colorIds = [];
  while (colorIds.length < rules.fruitCount) {
    for (let i = 0; i < colors.length && colorIds.length < rules.fruitCount; i += 1) colorIds.push(i);
  }

  for (let i = colorIds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [colorIds[i], colorIds[j]] = [colorIds[j], colorIds[i]];
  }

  const placed = [];
  for (let i = 0; i < rules.fruitCount; i += 1) {
    const colorIndex = colorIds[i];
    const radius = THREE.MathUtils.randFloat(0.32, 0.56);
    let pos = null;

    for (let k = 0; k < 36; k += 1) {
      const c = new THREE.Vector3(
        THREE.MathUtils.randFloat(bounds.left + 0.7, bounds.right - 0.7),
        THREE.MathUtils.randFloat(bounds.bottom + 0.7, bounds.top - 0.7),
        0
      );
      const ok = placed.every((p) => p.distanceTo(c) > 0.8);
      if (ok) {
        pos = c;
        break;
      }
    }

    if (!pos) {
      pos = new THREE.Vector3(
        THREE.MathUtils.randFloat(bounds.left + 0.7, bounds.right - 0.7),
        THREE.MathUtils.randFloat(bounds.bottom + 0.7, bounds.top - 0.7),
        0
      );
    }

    const fruit = new FruitEntity({
      id: i,
      colorId: colorIndex,
      radius,
      peel: new THREE.Color(colors[colorIndex].peel),
      flesh: new THREE.Color(colors[colorIndex].flesh),
    });
    fruit.setPosition(pos.x, pos.y, 0);
    fruits.push(fruit);
    scene.add(fruit.group);
    placed.push(pos);
  }
}

function onPointerDown(ev) {
  if (!state.started || state.gameOver || !renderer) return;

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
    endGame("清屏成功");
  }
}

function updateTrail(now) {
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

function endGame(reason) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.pointerDown = false;
  clearQueuedSelections();
  trail.reset();

  gameOverTitleEl.textContent =
    reason === "清屏成功" ? `清屏成功！本局分数 ${state.score}` : `本局结束！本局分数 ${state.score}`;
  gameOverEl.classList.remove("hidden");
  setSliceStatus(`状态: ${reason}`);
}

class FruitEntity {
  constructor({ id, colorId, radius, peel, flesh }) {
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

    this.vel = new THREE.Vector3(THREE.MathUtils.randFloatSpread(1.2), THREE.MathUtils.randFloatSpread(1.2), 0);
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
    this.maxPoints = maxPoints;
    this.points = [];
    this.width = 0.12;

    this.positions = new Float32Array(maxPoints * 2 * 3);
    this.colors = new Float32Array(maxPoints * 2 * 3);
    this.indices = [];

    for (let i = 0; i < maxPoints - 1; i += 1) {
      const o = i * 2;
      this.indices.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setIndex(this.indices);
    this.geometry.setDrawRange(0, 0);

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
    if (this.points.length > this.maxPoints) this.points.shift();
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
