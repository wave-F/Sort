import * as THREE from "three/webgpu";

export function createBurstSystem({
  scene,
  colors,
  bubbleTuning,
  bubbleBaseRadius,
  burstBubbleGeometry,
  createBubbleMaterial,
  poolSize = 180,
  mistPoolSize = 420,
} = {}) {
  const pool = {
    initialized: false,
    entries: [],
    materialsByColor: {},
    mistEntries: [],
    mistMaterialsByColor: {},
    mistTexture: null,
  };

  function createRoundSpriteTexture(size = 64) {
    if (typeof document === "undefined") return null;
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
    gradient.addColorStop(0.82, "rgba(255,255,255,0.36)");
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

  function ensurePool() {
    if (pool.initialized) return;
    pool.mistTexture = createRoundSpriteTexture(64);

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

      const mistMaterial = new THREE.SpriteMaterial({
        color: new THREE.Color(color.base),
        alphaMap: pool.mistTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
      });
      pool.mistMaterialsByColor[color.id] = mistMaterial;
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

    for (let i = 0; i < mistPoolSize; i += 1) {
      const sprite = new THREE.Sprite(pool.mistMaterialsByColor[colors[0].id]);
      sprite.visible = false;
      scene.add(sprite);
      pool.mistEntries.push({
        sprite,
        vel: new THREE.Vector3(),
        life: 0,
        lifeMax: 1,
        baseScale: 0.03,
        baseOpacity: 0.66,
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
    const mistTargetCount = entity.minMistParticleCount
      + Math.floor(Math.random() * (entity.maxMistParticleCount - entity.minMistParticleCount + 1));
    entity.activeBurstBubbleCount = 0;
    entity.activeMistParticleCount = 0;

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
      const speed = (0.9 + Math.random() * 1.05) * (entity.burstSpeedMultiplier || 1);
      entry.vel.copy(velocityDir).multiplyScalar(speed);

      const innerRadius = bubbleBaseRadius * entity.preBurstScaleMax * 0.9;
      const spawnRadius = innerRadius * Math.cbrt(Math.random());

      entry.mesh.material = pool.materialsByColor[colors[entity.colorId].id] ?? pool.materialsByColor[colors[0].id];
      entry.mesh.position.copy(entity.group.position)
        .add(entity.bubble.position)
        .addScaledVector(spawnDir, spawnRadius * entity.baseScale);

      const startScale = (0.03 + Math.random() * 0.06) * entity.baseScale;
      entry.baseScale = startScale;
      entry.mesh.scale.setScalar(startScale);
      entry.mesh.material.opacity = 0;
      entry.mesh.visible = true;

      entry.life = (0.58 + Math.random() * 0.62) * (entity.burstLifeMultiplier || 1);
      entry.lifeMax = entry.life;
      entry.baseOpacity = entity.baseOpacity;
      entry.active = true;
      entry.owner = entity;
      entity.activeBurstBubbleCount += 1;
    }

    for (let i = 0; i < mistTargetCount; i += 1) {
      let entry = null;
      for (let j = 0; j < pool.mistEntries.length; j += 1) {
        if (!pool.mistEntries[j].active) {
          entry = pool.mistEntries[j];
          break;
        }
      }
      if (!entry) break;

      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();

      const speed = (1.45 + Math.random() * 1.55) * (entity.mistSpeedMultiplier || 1);
      entry.vel.copy(dir).multiplyScalar(speed);

      const spawnRadius = bubbleBaseRadius * entity.preBurstScaleMax * (0.22 + Math.random() * 0.28);
      entry.sprite.material = pool.mistMaterialsByColor[colors[entity.colorId].id] ?? pool.mistMaterialsByColor[colors[0].id];
      entry.sprite.position.copy(entity.group.position)
        .add(entity.bubble.position)
        .addScaledVector(dir, spawnRadius * entity.baseScale);

      const startScale = (0.014 + Math.random() * 0.042) * entity.baseScale;
      entry.baseScale = startScale;
      entry.sprite.scale.setScalar(startScale);
      entry.sprite.material.opacity = 0;
      entry.sprite.visible = true;

      entry.life = (0.9 + Math.random() * 1.15) * (entity.mistLifeMultiplier || 1);
      entry.lifeMax = entry.life;
      entry.baseOpacity = entity.mistOpacityScale || 0.66;
      entry.active = true;
      entry.owner = entity;
      entity.activeMistParticleCount += 1;
    }

    entity.burstPointsVisible = entity.activeBurstBubbleCount > 0 || entity.activeMistParticleCount > 0;
  }

  function update(delta) {
    if (!pool.initialized) return;

    for (let i = 0; i < pool.entries.length; i += 1) {
      const entry = pool.entries[i];
      if (!entry.active) continue;

      entry.life -= delta;
      entry.vel.multiplyScalar(Math.pow(0.91, delta * 60));
      entry.vel.y -= delta * 0.22;
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
          entry.owner.burstPointsVisible = entry.owner.activeBurstBubbleCount > 0 || entry.owner.activeMistParticleCount > 0;
        }
        entry.owner = null;
      }
    }

    for (let i = 0; i < pool.mistEntries.length; i += 1) {
      const entry = pool.mistEntries[i];
      if (!entry.active) continue;

      entry.life -= delta;
      entry.vel.multiplyScalar(Math.pow(0.92, delta * 60));
      entry.vel.y += delta * 0.2;
      entry.sprite.position.addScaledVector(entry.vel, delta);

      const lifeRatio = Math.max(entry.life, 0) / Math.max(entry.lifeMax, 0.0001);
      const age = Math.max(entry.lifeMax - entry.life, 0);
      const appear = Math.min(age / 0.1, 1);
      const fade = Math.pow(lifeRatio, 1.25);
      const scaleNow = entry.baseScale * (0.82 + 0.95 * (1 - fade));

      entry.sprite.scale.setScalar(scaleNow);
      entry.sprite.material.opacity = entry.baseOpacity * fade * appear;

      if (entry.life <= 0) {
        entry.sprite.visible = false;
        entry.sprite.material.opacity = 0;
        entry.active = false;

        if (entry.owner) {
          entry.owner.activeMistParticleCount = Math.max(0, entry.owner.activeMistParticleCount - 1);
          entry.owner.burstPointsVisible = entry.owner.activeBurstBubbleCount > 0 || entry.owner.activeMistParticleCount > 0;
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
      }
      entry.owner = null;
      entry.active = false;
      entry.life = 0;
      entry.mesh.visible = false;
      entry.mesh.material.opacity = 0;
    }

    for (let i = 0; i < pool.mistEntries.length; i += 1) {
      const entry = pool.mistEntries[i];
      if (entry.owner) {
        entry.owner.activeMistParticleCount = 0;
        entry.owner.burstPointsVisible = false;
      }
      entry.owner = null;
      entry.active = false;
      entry.life = 0;
      entry.sprite.visible = false;
      entry.sprite.material.opacity = 0;
    }
  }

  return {
    spawnForEntity,
    update,
    clear,
  };
}
