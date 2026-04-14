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

const BubbleBurstState = {
  IDLE: "IDLE",
  PRE_BURST: "PRE_BURST",
  BURST: "BURST",
  DISSIPATE: "DISSIPATE",
  RESET: "RESET",
};

export function createBubbleMaterial(baseColor, bubbleTuning) {
  const accentColor = baseColor.clone().offsetHSL(0, 0.1, 0.2);
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

export function createBubbleEntityClass({
  bubbleTuning,
  bubbleBaseRadius,
  bubbleGeometry,
  wallSlideDamping,
  wallContactGain,
  burstSystem,
  createBubbleMaterialFn,
} = {}) {
  const createMaterial = createBubbleMaterialFn || ((baseColor) => createBubbleMaterial(baseColor, bubbleTuning));

  return class BubbleEntity {
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

      const nodeMaterialData = createMaterial(baseColor);
      this.bubbleMaterial = nodeMaterialData.material;
      this.springUniform = nodeMaterialData.springUniform;
      this.crackGlowUniform = nodeMaterialData.crackGlowUniform;
      this.contactDirUniform = nodeMaterialData.contactDirUniform;
      this.contactStrengthUniform = nodeMaterialData.contactStrengthUniform;
      this.tintUniform = nodeMaterialData.tintUniform;
      this.accentUniform = nodeMaterialData.accentUniform;
      this.baseScale = this.radius;
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
      const accent = color.clone().offsetHSL(0, 0.1, 0.2);
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
  };
}
