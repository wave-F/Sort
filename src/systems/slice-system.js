import * as THREE from "three/webgpu";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createSliceSystem({
  camera,
  raycaster,
  minSliceSegment = 0.02,
} = {}) {
  const workA = new THREE.Vector3();
  const workProject = new THREE.Vector3();
  const workSliceMeshes = [];

  function getFruitSliceHitRadius(fruit) {
    const baseRadius = fruit.radius * Math.max(1, fruit.selectionScale ?? 1);
    const layerCount = Math.max(1, Math.floor(Number(fruit.layerCount) || 1));
    const layerRemaining = Math.max(1, Math.floor(Number(fruit.layerRemaining ?? fruit.layerCount) || 1));
    if (layerCount <= 1 || layerRemaining > 1) return baseRadius;

    const rawScale = Number(fruit.doubleLayerInnerScale);
    const innerScale = Number.isFinite(rawScale) && rawScale > 0 && rawScale < 1 ? rawScale : 0.6;
    return baseRadius * innerScale;
  }

  function pickTopFruitAtWorldPoint(worldX, worldY, bubbleMeshes) {
    workProject.set(worldX, worldY, 0).project(camera);
    raycaster.setFromCamera({ x: workProject.x, y: workProject.y }, camera);

    const intersections = raycaster.intersectObjects(bubbleMeshes, false);
    if (!intersections.length) return null;

    for (let i = 0; i < intersections.length; i += 1) {
      const fruit = intersections[i].object.userData.fruit ?? null;
      if (!fruit || !fruit.active || fruit.sliced || fruit.locked) continue;
      return fruit;
    }

    return null;
  }

  function collectSliceMeshes(fruits, out) {
    out.length = 0;
    for (let i = 0; i < fruits.length; i += 1) {
      const fruit = fruits[i];
      if (!fruit?.active || fruit.sliced || fruit.locked || !fruit.bubble?.visible) continue;
      if (fruit.outerShell?.visible) out.push(fruit.outerShell);
      out.push(fruit.bubble);
    }
    return out.length;
  }

  function collectSliceHitsSorted(ax, ay, bx, by, fruits) {
    const result = [];
    const seen = new Set();
    const len = Math.hypot(bx - ax, by - ay);
    const sampleCount = Math.max(1, Math.ceil(len / 0.08));
    if (collectSliceMeshes(fruits, workSliceMeshes) <= 0) return result;

    for (let i = 1; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      const x = lerp(ax, bx, t);
      const y = lerp(ay, by, t);
      const fruit = pickTopFruitAtWorldPoint(x, y, workSliceMeshes);
      if (!fruit || seen.has(fruit.id)) continue;

      seen.add(fruit.id);
      const hitRadius = getFruitSliceHitRadius(fruit);
      result.push({ fruit, hitRadius });
    }

    return result;
  }

  function processSliceSegment({
    state,
    fruits,
    dt,
    trail,
    consumeStep,
    settleQueuedSlices,
    resetSelectToneProgression,
    playSelectTone,
    playErrorTone,
  }) {
    if (!state.pointerDown || state.gameOver || state.sliceBroken || !state.lastPoint || !state.nowPoint) return;

    workA.copy(state.nowPoint).sub(state.lastPoint);
    const len = workA.length();
    if (len < minSliceSegment) return;

    const sliceDir = workA.multiplyScalar(1 / len);
    const speed = Math.min(len / Math.max(dt, 0.001), 14);

    const ax = state.lastPoint.x;
    const ay = state.lastPoint.y;
    const bx = state.nowPoint.x;
    const by = state.nowPoint.y;
    const hits = collectSliceHitsSorted(ax, ay, bx, by, fruits);
    for (let i = 0; i < hits.length; i += 1) {
      const { fruit, hitRadius } = hits[i];

      if (state.sliceHitIds.has(fruit.id)) {
        const dx = bx - fruit.group.position.x;
        const dy = by - fruit.group.position.y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return;
        }
        continue;
      }

      if (state.sliceColorId === null) {
        if (!state.sliceCommitted) {
          state.sliceCommitted = true;
          consumeStep();
        }
        state.sliceColorId = fruit.colorId;
      }

      if (fruit.colorId !== state.sliceColorId) {
        fruit.flashWrongHit();
        playErrorTone?.();
        settleQueuedSlices();
        if (state.keepFullTrailDuringDrag) trail.reset();
        state.sliceBroken = true;
        state.pointerDown = false;
        state.lastPoint = null;
        state.nowPoint = null;
        resetSelectToneProgression();
        return;
      }

      state.sliceHitIds.add(fruit.id);
      state.sliceQueue.push({
        fruit,
        sliceDir: sliceDir.clone(),
        speed,
      });
      fruit.setSelected(true);
      playSelectTone();
      return;
    }
  }

  return { processSliceSegment };
}
