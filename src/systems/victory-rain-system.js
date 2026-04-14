import * as THREE from "three/webgpu";

export function createVictoryRainSystem({
  scene,
  bounds,
  colors,
  bubbleRadiusScale,
  bubbleBaseRadius,
  emitDuration = 0.78,
  spawnRate = 74,
  maxBubbles = 56,
} = {}) {
  const geometry = new THREE.SphereGeometry(1, 14, 14);
  const state = {
    active: false,
    elapsed: 0,
    emitDuration,
    spawnRate,
    maxBubbles,
    spawnCarry: 0,
    bubbles: [],
    pool: [],
    materials: [],
    initialized: false,
  };

  function ensureResources() {
    if (state.initialized) return;

    for (let i = 0; i < colors.length; i += 1) {
      const color = colors[i];
      state.materials[color.id] = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color.base),
        transmission: 0.88,
        thickness: 1.1,
        roughness: 0.15,
        metalness: 0,
        clearcoat: 0.36,
        clearcoatRoughness: 0.24,
        ior: 1.2,
        envMapIntensity: 0.68,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      });
    }

    for (let i = 0; i < state.maxBubbles; i += 1) {
      const mesh = new THREE.Mesh(geometry, state.materials[colors[0].id]);
      mesh.visible = false;
      scene.add(mesh);
      state.pool.push({
        mesh,
        active: false,
        baseScale: 1,
        life: 0,
        lifeMax: 1,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
      });
    }

    state.initialized = true;
  }

  function start() {
    ensureResources();
    reset();
    state.active = true;
    state.elapsed = 0;
    state.spawnCarry = 0;
  }

  function update(dt) {
    if (state.active) {
      state.elapsed += dt;
      if (state.elapsed <= state.emitDuration) {
        state.spawnCarry += state.spawnRate * dt;
        while (state.spawnCarry >= 1) {
          state.spawnCarry -= 1;
          spawnBubble();
        }
      } else {
        state.active = false;
      }
    }

    for (let i = state.bubbles.length - 1; i >= 0; i -= 1) {
      const bubble = state.bubbles[i];
      bubble.life -= dt;

      bubble.vel.y -= 1.45 * dt;
      bubble.vel.multiplyScalar(Math.pow(0.988, dt * 60));
      bubble.mesh.position.addScaledVector(bubble.vel, dt);

      bubble.mesh.rotation.x += bubble.spin.x * dt;
      bubble.mesh.rotation.y += bubble.spin.y * dt;
      bubble.mesh.rotation.z += bubble.spin.z * dt;
      const age = bubble.lifeMax - bubble.life;
      const appear = Math.min(age / 0.09, 1);
      const lifeRatio = Math.max(0, bubble.life / bubble.lifeMax);
      const scaleFade = (0.66 + 0.34 * lifeRatio) * appear;
      bubble.mesh.scale.setScalar(bubble.baseScale * scaleFade);

      if (bubble.life <= 0 || bubble.mesh.position.y > bounds.top + 3.6) {
        bubble.active = false;
        bubble.mesh.visible = false;
        state.bubbles.splice(i, 1);
      }
    }
  }

  function spawnBubble() {
    if (state.bubbles.length >= state.maxBubbles) return;

    const pooled = state.pool.find((entry) => !entry.active);
    if (!pooled) return;

    const color = colors[Math.floor(Math.random() * colors.length)];
    const mesh = pooled.mesh;
    mesh.material = state.materials[color.id];

    const radius = (0.08 + Math.random() * 0.22) * bubbleRadiusScale;
    const baseScale = radius / bubbleBaseRadius;
    mesh.scale.setScalar(baseScale * 0.2);
    mesh.position.set(
      THREE.MathUtils.lerp(bounds.left + radius, bounds.right - radius, Math.random()),
      bounds.bottom - radius - Math.random() * 0.8,
      -0.45 + Math.random() * 1.1
    );
    mesh.visible = true;

    const lifeMax = 1.08 + Math.random() * 0.52;
    pooled.baseScale = baseScale;
    pooled.life = lifeMax;
    pooled.lifeMax = lifeMax;
    pooled.active = true;
    pooled.vel.set(
      (Math.random() * 2 - 1) * 0.72,
      7.4 + Math.random() * 3.9,
      (Math.random() * 2 - 1) * 0.18
    );
    pooled.spin.set(
      (Math.random() * 2 - 1) * 2,
      (Math.random() * 2 - 1) * 1.8,
      (Math.random() * 2 - 1) * 1.6
    );

    state.bubbles.push(pooled);
  }

  function reset() {
    state.active = false;
    state.elapsed = 0;
    state.spawnCarry = 0;

    for (let i = 0; i < state.bubbles.length; i += 1) {
      const bubble = state.bubbles[i];
      bubble.active = false;
      bubble.mesh.visible = false;
    }
    state.bubbles.length = 0;
  }

  return { start, update, reset };
}
