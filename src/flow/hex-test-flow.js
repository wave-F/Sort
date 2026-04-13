export const HEX_TEST_FLOW1_LABEL = "测试流程1(最大联通区域)";
export const HEX_TEST_FLOW2_LABEL = "测试流程2(可达区域)";
export const HEX_TEST_FLOW3_LABEL = "测试流程3(消除)";

function getHexNeighborCells(col, row) {
  if (col % 2 === 0) {
    return [
      [col, row - 1],
      [col, row + 1],
      [col - 1, row - 1],
      [col - 1, row],
      [col + 1, row - 1],
      [col + 1, row],
    ];
  }
  return [
    [col, row - 1],
    [col, row + 1],
    [col - 1, row],
    [col - 1, row + 1],
    [col + 1, row],
    [col + 1, row + 1],
  ];
}

function buildHexIndexByCell(centers) {
  const keyOfCell = (col, row) => `${col},${row}`;
  const indexByCell = new Map();
  for (let i = 0; i < centers.length; i += 1) {
    const c = centers[i];
    indexByCell.set(keyOfCell(c.col, c.row), i);
  }
  return { indexByCell, keyOfCell };
}

function computeTopColorIdsByZ(centers, simFruits) {
  const topColorIds = new Array(centers.length).fill(-1);

  for (let i = 0; i < centers.length; i += 1) {
    const center = centers[i];
    let bestSurfaceZ = Number.NEGATIVE_INFINITY;
    let bestColorId = -1;
    let bestDistSq = Infinity;

    for (let j = 0; j < simFruits.length; j += 1) {
      const fruit = simFruits[j];
      if (!fruit?.active) continue;

      const dx = center.x - fruit.x;
      const dy = center.y - fruit.y;
      const distSq = dx * dx + dy * dy;
      const hitRadiusSq = fruit.radius * fruit.radius;
      if (distSq > hitRadiusSq) continue;

      const localSurfaceZ = Math.sqrt(Math.max(0, hitRadiusSq - distSq));
      const surfaceZ = fruit.z + localSurfaceZ;
      if (surfaceZ > bestSurfaceZ || (surfaceZ === bestSurfaceZ && distSq < bestDistSq)) {
        bestSurfaceZ = surfaceZ;
        bestDistSq = distSq;
        bestColorId = fruit.colorId;
      }
    }

    topColorIds[i] = bestColorId;
  }

  return topColorIds;
}

function findLargestConnectedRegion(centers, topColorIds) {
  const { indexByCell, keyOfCell } = buildHexIndexByCell(centers);
  const visited = new Uint8Array(centers.length);
  let bestRegion = [];
  let bestColorId = -1;

  for (let i = 0; i < centers.length; i += 1) {
    if (visited[i]) continue;
    const colorId = topColorIds[i];
    if (colorId < 0) {
      visited[i] = 1;
      continue;
    }

    const region = [];
    const queue = [i];
    visited[i] = 1;

    for (let q = 0; q < queue.length; q += 1) {
      const idx = queue[q];
      region.push(idx);
      const center = centers[idx];
      const neighbors = getHexNeighborCells(center.col, center.row);

      for (let k = 0; k < neighbors.length; k += 1) {
        const nextIdx = indexByCell.get(keyOfCell(neighbors[k][0], neighbors[k][1]));
        if (nextIdx === undefined || visited[nextIdx]) continue;
        if (topColorIds[nextIdx] !== colorId) continue;
        visited[nextIdx] = 1;
        queue.push(nextIdx);
      }
    }

    if (region.length > bestRegion.length) {
      bestRegion = region;
      bestColorId = colorId;
    }
  }

  return { region: bestRegion, colorId: bestColorId };
}

function findReachableSameColorRegion(centers, topColorIds, seedRegion, targetColorId) {
  const { indexByCell, keyOfCell } = buildHexIndexByCell(centers);
  const visited = new Uint8Array(centers.length);
  const queue = [];
  const result = new Set();

  for (const idx of seedRegion) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= centers.length) continue;
    if (visited[idx]) continue;
    visited[idx] = 1;
    queue.push(idx);
    result.add(idx);
  }

  for (let q = 0; q < queue.length; q += 1) {
    const idx = queue[q];
    const center = centers[idx];
    const neighbors = getHexNeighborCells(center.col, center.row);

    for (let k = 0; k < neighbors.length; k += 1) {
      const nextIdx = indexByCell.get(keyOfCell(neighbors[k][0], neighbors[k][1]));
      if (nextIdx === undefined || visited[nextIdx]) continue;

      const nextColor = topColorIds[nextIdx];
      if (nextColor !== -1 && nextColor !== targetColorId) continue;

      visited[nextIdx] = 1;
      queue.push(nextIdx);
      if (nextColor === targetColorId) result.add(nextIdx);
    }
  }

  return result;
}

function eliminateFruitsBySelectedHexes(simFruits, centers, selectedHexes, targetColorId) {
  let removed = 0;

  for (let i = 0; i < simFruits.length; i += 1) {
    const fruit = simFruits[i];
    if (!fruit?.active) continue;
    if (fruit.colorId !== targetColorId) continue;

    const hitRadiusSq = fruit.radius * fruit.radius;
    let covered = false;
    for (const idx of selectedHexes) {
      const center = centers[idx];
      if (!center) continue;
      const dx = center.x - fruit.x;
      const dy = center.y - fruit.y;
      if (dx * dx + dy * dy <= hitRadiusSq) {
        covered = true;
        break;
      }
    }

    if (!covered) continue;
    fruit.active = false;
    removed += 1;
  }

  return removed;
}

function countActiveFruits(simFruits) {
  let active = 0;
  for (let i = 0; i < simFruits.length; i += 1) {
    if (simFruits[i]?.active) active += 1;
  }
  return active;
}

export function calculateTheoryStepsRecursive({ centers, fruits, maxDepth = 2048 } = {}) {
  const simFruits = Array.isArray(fruits)
    ? fruits.map((f) => ({
        x: Number(f.x) || 0,
        y: Number(f.y) || 0,
        z: Number(f.z) || 0,
        radius: Math.max(0, Number(f.radius) || 0),
        colorId: Number.isInteger(f.colorId) ? f.colorId : -1,
        active: f.active !== false,
      }))
    : [];

  function recurse(stepCount, depth) {
    const activeCount = countActiveFruits(simFruits);
    if (activeCount === 0) return stepCount;
    if (depth >= maxDepth) return stepCount;

    const topColorIds = computeTopColorIdsByZ(centers, simFruits);
    const flow1 = findLargestConnectedRegion(centers, topColorIds);
    if (!flow1.region.length || flow1.colorId < 0) return stepCount;

    const flow2 = findReachableSameColorRegion(centers, topColorIds, flow1.region, flow1.colorId);
    const selectedHexes = new Set(flow1.region);
    for (const idx of flow2) selectedHexes.add(idx);

    const removed = eliminateFruitsBySelectedHexes(simFruits, centers, selectedHexes, flow1.colorId);
    if (removed <= 0) return stepCount;
    return recurse(stepCount + 1, depth + 1);
  }

  return recurse(0, 0);
}

export function createHexTestFlowController({
  gameUI,
  fruits,
  colors,
  hexOverlayCenters,
  hexOverlayTopColorIds,
  hexOverlayHighlighted,
  rebuildHexOverlay,
  updateHexOverlayColors,
} = {}) {
  let flowMode = 1;
  const flow1Region = new Set();
  const flow2Region = new Set();
  let flow1ColorId = -1;

  function reset() {
    flowMode = 1;
    flow1Region.clear();
    flow2Region.clear();
    flow1ColorId = -1;
    hexOverlayHighlighted.clear();
  }

  function runFlow1() {
    updateHexOverlayColors();

    hexOverlayHighlighted.clear();
    flow1Region.clear();
    flow2Region.clear();
    flow1ColorId = -1;
    if (!hexOverlayCenters.length || !hexOverlayTopColorIds.length) {
      updateHexOverlayColors();
      gameUI.showCommentary("流程1：六边形数据为空", 900);
      return;
    }

    const { indexByCell, keyOfCell } = buildHexIndexByCell(hexOverlayCenters);

    const visited = new Uint8Array(hexOverlayCenters.length);
    let bestRegion = [];

    for (let i = 0; i < hexOverlayCenters.length; i += 1) {
      if (visited[i]) continue;
      const colorId = hexOverlayTopColorIds[i];
      if (colorId < 0) {
        visited[i] = 1;
        continue;
      }

      const region = [];
      const queue = [i];
      visited[i] = 1;

      for (let q = 0; q < queue.length; q += 1) {
        const idx = queue[q];
        region.push(idx);
        const center = hexOverlayCenters[idx];

        const neighbors = getHexNeighborCells(center.col, center.row);
        for (let k = 0; k < neighbors.length; k += 1) {
          const nextIdx = indexByCell.get(keyOfCell(neighbors[k][0], neighbors[k][1]));
          if (nextIdx === undefined || visited[nextIdx]) continue;
          if (hexOverlayTopColorIds[nextIdx] !== colorId) continue;
          visited[nextIdx] = 1;
          queue.push(nextIdx);
        }
      }

      if (region.length > bestRegion.length) {
        bestRegion = region;
      }
    }

    for (let i = 0; i < bestRegion.length; i += 1) {
      hexOverlayHighlighted.add(bestRegion[i]);
      flow1Region.add(bestRegion[i]);
    }
    if (bestRegion.length > 0) {
      const first = bestRegion[0];
      flow1ColorId = hexOverlayTopColorIds[first] ?? -1;
    }

    updateHexOverlayColors();
    if (bestRegion.length > 0) gameUI.showCommentary(`流程1：最大同色连通 ${bestRegion.length} 格`, 900);
    else gameUI.showCommentary("流程1：未找到同色连通区域", 900);
  }

  function runFlow2() {
    updateHexOverlayColors();

    if (!flow1Region.size || flow1ColorId < 0) {
      gameUI.showCommentary("请先执行流程1", 900);
      return;
    }

    const { indexByCell, keyOfCell } = buildHexIndexByCell(hexOverlayCenters);
    const visited = new Uint8Array(hexOverlayCenters.length);
    const queue = [];
    const result = new Set();

    for (const idx of flow1Region) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= hexOverlayCenters.length) continue;
      if (visited[idx]) continue;
      visited[idx] = 1;
      queue.push(idx);
      result.add(idx);
    }

    for (let q = 0; q < queue.length; q += 1) {
      const idx = queue[q];
      const center = hexOverlayCenters[idx];
      const neighbors = getHexNeighborCells(center.col, center.row);

      for (let k = 0; k < neighbors.length; k += 1) {
        const nextIdx = indexByCell.get(keyOfCell(neighbors[k][0], neighbors[k][1]));
        if (nextIdx === undefined || visited[nextIdx]) continue;

        const nextColor = hexOverlayTopColorIds[nextIdx];
        if (nextColor !== -1 && nextColor !== flow1ColorId) continue;

        visited[nextIdx] = 1;
        queue.push(nextIdx);
        if (nextColor === flow1ColorId) result.add(nextIdx);
      }
    }

    hexOverlayHighlighted.clear();
    flow2Region.clear();
    for (const idx of result) {
      flow2Region.add(idx);
      hexOverlayHighlighted.add(idx);
    }
    updateHexOverlayColors();
    gameUI.showCommentary(`流程2：可达同色区域 ${result.size} 格`, 900);
  }

  function runFlow3() {
    updateHexOverlayColors();

    if (flow1ColorId < 0 || (!flow1Region.size && !flow2Region.size)) {
      gameUI.showCommentary("请先执行流程1和流程2", 900);
      return;
    }

    const selectedHexes = new Set();
    for (const idx of flow1Region) selectedHexes.add(idx);
    for (const idx of flow2Region) selectedHexes.add(idx);

    let removed = 0;
    for (let i = 0; i < fruits.length; i += 1) {
      const fruit = fruits[i];
      if (!fruit?.active || fruit.sliced) continue;
      if (fruit.colorId !== flow1ColorId) continue;

      let shouldRemove = false;
      const hitRadiusSq = fruit.radius * fruit.radius;
      for (const idx of selectedHexes) {
        const center = hexOverlayCenters[idx];
        if (!center) continue;
        const dx = center.x - fruit.group.position.x;
        const dy = center.y - fruit.group.position.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= hitRadiusSq) {
          shouldRemove = true;
          break;
        }
      }

      if (!shouldRemove) continue;
      fruit.setSelected(false);
      fruit.sliced = true;
      fruit.active = false;
      fruit.group.visible = false;
      removed += 1;
    }

    reset();
    rebuildHexOverlay();
    updateHexOverlayColors();
    gameUI.showCommentary(`流程3：已消除 ${removed} 个同色泡泡`, 1000);
  }

  function runNext() {
    if (flowMode === 1) {
      runFlow1();
      flowMode = 2;
      return HEX_TEST_FLOW2_LABEL;
    }
    if (flowMode === 2) {
      runFlow2();
      flowMode = 3;
      return HEX_TEST_FLOW3_LABEL;
    }

    runFlow3();
    flowMode = 1;
    return HEX_TEST_FLOW1_LABEL;
  }

  return {
    reset,
    runNext,
    getLabel: () => (flowMode === 1 ? HEX_TEST_FLOW1_LABEL : flowMode === 2 ? HEX_TEST_FLOW2_LABEL : HEX_TEST_FLOW3_LABEL),
  };
}
