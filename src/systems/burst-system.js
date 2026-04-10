import * as THREE from "three/webgpu";

export function createBurstSystem({
  scene,
  colors,
  bubbleTuning,
  bubbleBaseRadius,
  burstBubbleGeometry,
  createBubbleMaterial,
  poolSize = 180,
} = {}) {
  const pool = {
    initialized: false,
    entries: [],
    materialsByColor: {},
  };

  function ensurePool() {
    if (pool.initialized) return;

    for (let i = 0; i < colors.length; i += 1) {
      const color = colors[i];
      const nodeData = createBubbleMaterial(new THREE.Color(color.base));
      const material = nodeData.material;
      material.transparent = true;
      material.opacity = 0;
      material.depthWrite = false;
      material.side = THREE.DoubleSide;
      material.transmission = bubbleTuning.transmission;
      material.roughness = Math.min(0.26, bubbleTuning.roughness + 0.02);
      material.thickness = Math.min(0.7, 1.35 * 0.5);
      material.ior = 1.2;
      material.clearcoat = bubbleTuning.clearcoat;
      material.clearcoatRoughness = 0.16;
      material.envMapIntensity = 0.72;
      pool.materialsByColor[color.id] = material;
    }

    for (let i = 0; i < poolSize; i += 1) {
      const mesh = new THREE.Mesh(burstBubbleGeometry, pool.materialsByColor[colors[0].id]);
      mesh.visible = false;
      scene.add(mesh);
      pool.entries.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        lifeMax: 1,
        baseScale: 0.08,
        baseOpacity: 0.9,
        active: false,
        owner: null,
      });
    }

    pool.initialized = true;
  }

  function spawnForEntity(entity) {
    ensurePool();

    const targetCount = entity.minBurstBubbleCount
      + Math.floor(Math.random() * (entity.maxBurstBubbleCount - entity.minBurstBubbleCount + 1));
    entity.activeBurstBubbleCount = 0;

    for (let i = 0; i < targetCount; i += 1) {
      let entry = null;
      for (let j = 0; j < pool.entries.length; j += 1) {
        if (!pool.entries[j].active) {
          entry = pool.entries[j];
          break;
        }
      }
      if (!entry) break;

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
      entry.vel.copy(velocityDir).multiplyScalar(speed);

      const innerRadius = bubbleBaseRadius * entity.preBurstScaleMax * 0.9;
      const spawnRadius = innerRadius * Math.cbrt(Math.random());

      entry.mesh.material = pool.materialsByColor[colors[entity.colorId].id] ?? pool.materialsByColor[colors[0].id];
      entry.mesh.position.copy(entity.group.position)
        .add(entity.bubble.position)
        .addScaledVector(spawnDir, spawnRadius * entity.baseScale);

      const startScale = (0.055 + Math.random() * 0.11) * entity.baseScale;
      entry.baseScale = startScale;
      entry.mesh.scale.setScalar(startScale);
      entry.mesh.material.opacity = 0;
      entry.mesh.visible = true;

      entry.life = 1.05 + Math.random() * 0.75;
      entry.lifeMax = entry.life;
      entry.baseOpacity = entity.baseOpacity;
      entry.active = true;
      entry.owner = entity;
      entity.activeBurstBubbleCount += 1;
    }

    entity.burstPointsVisible = entity.activeBurstBubbleCount > 0;
  }

  function update(delta) {
    if (!pool.initialized) return;

    for (let i = 0; i < pool.entries.length; i += 1) {
      const entry = pool.entries[i];
      if (!entry.active) continue;

      entry.life -= delta;
      entry.vel.multiplyScalar(Math.pow(0.94, delta * 60));
      entry.mesh.position.addScaledVector(entry.vel, delta);

      const lifeRatio = Math.max(entry.life, 0) / Math.max(entry.lifeMax, 0.0001);
      const age = Math.max(entry.lifeMax - entry.life, 0);
      const appear = Math.min(age / 0.16, 1);
      const fade = Math.pow(lifeRatio, 0.62);
      const scaleNow = entry.baseScale * (0.68 + 0.32 * fade);

      entry.mesh.scale.setScalar(scaleNow);
      entry.mesh.material.opacity = entry.baseOpacity * fade * appear;

      if (entry.life <= 0) {
        entry.mesh.visible = false;
        entry.mesh.material.opacity = 0;
        entry.active = false;

        if (entry.owner) {
          entry.owner.activeBurstBubbleCount = Math.max(0, entry.owner.activeBurstBubbleCount - 1);
          entry.owner.burstPointsVisible = entry.owner.activeBurstBubbleCount > 0;
        }
        entry.owner = null;
      }
    }
  }

  function clear() {
    if (!pool.initialized) return;

    for (let i = 0; i < pool.entries.length; i += 1) {
      const entry = pool.entries[i];
      if (entry.owner) {
        entry.owner.activeBurstBubbleCount = 0;
        entry.owner.burstPointsVisible = false;
      }
      entry.owner = null;
      entry.active = false;
      entry.life = 0;
      entry.mesh.visible = false;
      entry.mesh.material.opacity = 0;
    }
  }

  return {
    spawnForEntity,
    update,
    clear,
  };
}
