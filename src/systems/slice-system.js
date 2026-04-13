import * as THREE from "three/webgpu";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function gridCoord(value, cellSize) {
  return Math.floor(value / cellSize);
}

function gridKey(cellX, cellY) {
  return `${cellX},${cellY}`;
}

export function createSliceSystem({
  camera,
  raycaster,
  minSliceSegment = 0.02,
  sliceGridCellSize = 1.2,
} = {}) {
  const workA = new THREE.Vector3();
  const workProject = new THREE.Vector3();
  const workSliceGrid = new Map();
  const workSliceCandidates = [];
  const workSliceMeshes = [];

  function pickTopFruitAtWorldPoint(worldX, worldY, bubbleMeshes) {
    workProject.set(worldX, worldY, 0).project(camera);
    raycaster.setFromCamera({ x: workProject.x, y: workProject.y }, camera);

    const intersections = raycaster.intersectObjects(bubbleMeshes, false);
    if (!intersections.length) return null;

    return intersections[0].object.userData.fruit ?? null;
  }

  function buildSliceSpatialIndex(fruits) {
    workSliceGrid.clear();
    let maxRadius = 0;

    for (let i = 0; i < fruits.length; i += 1) {
      const fruit = fruits[i];
      if (!fruit.active || fruit.sliced || !fruit.bubble.visible) continue;

      const px = fruit.group.position.x;
      const py = fruit.group.position.y;
      const cellX = gridCoord(px, sliceGridCellSize);
      const cellY = gridCoord(py, sliceGridCellSize);
      const key = gridKey(cellX, cellY);
      const bucket = workSliceGrid.get(key);
      if (bucket) bucket.push(fruit);
      else workSliceGrid.set(key, [fruit]);

      const hitRadius = fruit.radius * Math.max(1, fruit.selectionScale ?? 1);
      if (hitRadius > maxRadius) maxRadius = hitRadius;
    }

    return { grid: workSliceGrid, maxRadius };
  }

  function collectSliceCandidatesAtPoint(x, y, spatial, out) {
    out.length = 0;
    if (!spatial.grid.size || spatial.maxRadius <= 0) return 0;

    const queryPadding = 0.28;
    const queryRadius = spatial.maxRadius + queryPadding;
    const rangeCells = Math.max(1, Math.ceil(queryRadius / sliceGridCellSize));
    const centerCellX = gridCoord(x, sliceGridCellSize);
    const centerCellY = gridCoord(y, sliceGridCellSize);

    for (let oy = -rangeCells; oy <= rangeCells; oy += 1) {
      for (let ox = -rangeCells; ox <= rangeCells; ox += 1) {
        const bucket = spatial.grid.get(gridKey(centerCellX + ox, centerCellY + oy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const fruit = bucket[i];
          const hitRadius = fruit.radius * Math.max(1, fruit.selectionScale ?? 1) + queryPadding;
          const dx = x - fruit.group.position.x;
          const dy = y - fruit.group.position.y;
          if (dx * dx + dy * dy <= hitRadius * hitRadius) {
            out.push(fruit);
          }
        }
      }
    }

    return out.length;
  }

  function collectSliceHitsSorted(ax, ay, bx, by, fruits) {
    const result = [];
    const seen = new Set();
    const len = Math.hypot(bx - ax, by - ay);
    const sampleCount = Math.max(1, Math.ceil(len / 0.08));
    const spatial = buildSliceSpatialIndex(fruits);
    if (spatial.maxRadius <= 0) return result;

    for (let i = 1; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      const x = lerp(ax, bx, t);
      const y = lerp(ay, by, t);
      const candidateCount = collectSliceCandidatesAtPoint(x, y, spatial, workSliceCandidates);
      if (candidateCount === 0) continue;
      workSliceMeshes.length = 0;
      for (let k = 0; k < candidateCount; k += 1) {
        workSliceMeshes.push(workSliceCandidates[k].bubble);
      }

      const fruit = pickTopFruitAtWorldPoint(x, y, workSliceMeshes);
      if (!fruit || seen.has(fruit.id)) continue;

      seen.add(fruit.id);
      const hitRadius = fruit.radius * Math.max(1, fruit.selectionScale ?? 1);
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
