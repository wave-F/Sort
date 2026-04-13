import { writeFile } from "node:fs/promises";

const BOUNDS = {
  left: -2.6325,
  right: 2.6325,
  top: 4.82,
  bottom: -4.82,
};

const DEFAULTS = {
  seedStart: 20000,
  samples: 600,
  maxResults: 8,
  radiusRange: [0.33, 0.42],
  speedRange: [0, 0],
  cellSize: 0.12,
  refineIterations: 0,
};

function parseArgs(argv) {
  const args = {
    command: argv[2] ?? "help",
    flags: {},
  };

  for (let i = 3; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args.flags[key] = true;
      continue;
    }
    args.flags[key] = next;
    i += 1;
  }

  return args;
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseRange(input, fallback) {
  if (!input || typeof input !== "string") return fallback;
  const parts = input.split(",").map((v) => Number(v.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return fallback;
  const lo = Math.min(parts[0], parts[1]);
  const hi = Math.max(parts[0], parts[1]);
  return [lo, hi];
}

function parseColorCounts(input) {
  if (!input || typeof input !== "string") {
    throw new Error("Missing --colorCounts. Example: --colorCounts 0:8,1:8,2:7,3:7");
  }
  const out = [];
  const parts = input.split(",");
  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (!part) continue;
    const [colorStr, countStr] = part.split(":");
    const colorId = Number(colorStr);
    const count = Number(countStr);
    if (!Number.isInteger(colorId) || colorId < 0) {
      throw new Error(`Invalid colorId in --colorCounts: ${part}`);
    }
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`Invalid count in --colorCounts: ${part}`);
    }
    out.push({ colorId, count });
  }
  if (!out.length) throw new Error("--colorCounts parsed empty.");
  return out;
}

function createSeededRandom(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildColorBag(colorCounts) {
  const bag = [];
  for (const item of colorCounts) {
    for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
  }
  return bag;
}

function canPlaceFruit(fruits, idx, x, y, radius, spacingFactor = 0.72) {
  for (let i = 0; i < fruits.length; i += 1) {
    if (i === idx) continue;
    const p = fruits[i];
    if (!p) continue;
    const minDist = Math.max(0.42, (radius + p.radius) * spacingFactor);
    if (Math.hypot(x - p.x, y - p.y) < minDist) {
      return false;
    }
  }
  return true;
}

function createBaseClusters(rng) {
  const cx = 0;
  const cy = 0;
  const horizontal = (BOUNDS.right - BOUNDS.left) * 0.41;
  const vertical = (BOUNDS.top - BOUNDS.bottom) * 0.38;

  const anchors = [
    { x: cx, y: cy, spread: 1.05, weight: 0.55 },
    { x: cx - horizontal, y: cy, spread: 0.9, weight: 1.35 },
    { x: cx + horizontal, y: cy, spread: 0.9, weight: 1.35 },
    { x: cx, y: cy - vertical, spread: 0.92, weight: 1.25 },
    { x: cx, y: cy + vertical, spread: 0.92, weight: 1.25 },
    { x: cx - horizontal, y: cy + vertical, spread: 0.78, weight: 1.15 },
    { x: cx + horizontal, y: cy + vertical, spread: 0.78, weight: 1.15 },
    { x: cx - horizontal, y: cy - vertical, spread: 0.78, weight: 1.15 },
    { x: cx + horizontal, y: cy - vertical, spread: 0.78, weight: 1.15 },
  ];

  for (let i = 0; i < anchors.length; i += 1) {
    anchors[i].x += (rng() * 2 - 1) * 0.24;
    anchors[i].y += (rng() * 2 - 1) * 0.24;
  }
  return anchors;
}

function enforceEdgeLocks(fruits, rng) {
  if (fruits.length < 8) return;
  const target = clamp(Math.round(fruits.length * 0.55), 8, 22);

  for (let e = 0; e < target; e += 1) {
    const idx = Math.floor(rng() * fruits.length);
    const f = fruits[idx];
    if (!f) continue;

    const oldX = f.x;
    const oldY = f.y;
    let placed = false;
    for (let k = 0; k < 120; k += 1) {
      const edge = Math.floor(rng() * 4);
      const inset = f.radius + lerp(0.03, 0.12, rng());
      let x = f.x;
      let y = f.y;
      if (edge === 0) {
        x = BOUNDS.left + inset;
        y = lerp(BOUNDS.bottom + f.radius + 0.04, BOUNDS.top - f.radius - 0.04, rng());
      } else if (edge === 1) {
        x = BOUNDS.right - inset;
        y = lerp(BOUNDS.bottom + f.radius + 0.04, BOUNDS.top - f.radius - 0.04, rng());
      } else if (edge === 2) {
        y = BOUNDS.top - inset;
        x = lerp(BOUNDS.left + f.radius + 0.04, BOUNDS.right - f.radius - 0.04, rng());
      } else {
        y = BOUNDS.bottom + inset;
        x = lerp(BOUNDS.left + f.radius + 0.04, BOUNDS.right - f.radius - 0.04, rng());
      }

      if (canPlaceFruit(fruits, idx, x, y, f.radius, 0.6)) {
        f.x = x;
        f.y = y;
        placed = true;
        break;
      }
    }

    if (!placed) {
      f.x = oldX;
      f.y = oldY;
    }
  }
}

function generateRandomFruits({ seed, colorCounts, radiusRange, speedRange }) {
  const fruitCount = colorCounts.reduce((sum, item) => sum + item.count, 0);
  const [radiusMin, radiusMax] = radiusRange;
  const [speedMin, speedMax] = speedRange;
  const rng = createSeededRandom(seed);
  const fruits = [];
  const colorBag = buildColorBag(colorCounts);
  shuffleInPlace(colorBag, rng);

  const clusters = createBaseClusters(rng);
  const extraClusters = clamp(Math.round(fruitCount / 8), 3, 7);
  for (let i = 0; i < extraClusters; i += 1) {
    clusters.push({
      x: lerp(BOUNDS.left + 0.4, BOUNDS.right - 0.4, rng()),
      y: lerp(BOUNDS.bottom + 0.4, BOUNDS.top - 0.4, rng()),
      spread: lerp(0.54, 1.18, rng()),
      weight: lerp(0.7, 1.28, rng()),
    });
  }

  let weightTotal = 0;
  for (const c of clusters) weightTotal += c.weight;

  for (let i = 0; i < fruitCount; i += 1) {
    const radius = lerp(radiusMin, radiusMax, rng()) * 3;
    const margin = radius + 0.04;

    let x = 0;
    let y = 0;
    let placed = false;
    const useCluster = rng() < 0.92;

    for (let k = 0; k < 180; k += 1) {
      if (useCluster) {
        let pick = rng() * weightTotal;
        let cluster = clusters[0];
        for (let c = 0; c < clusters.length; c += 1) {
          pick -= clusters[c].weight;
          if (pick <= 0) {
            cluster = clusters[c];
            break;
          }
        }

        const angle = rng() * Math.PI * 2;
        const radial = Math.sqrt(rng()) * cluster.spread;
        x = cluster.x + Math.cos(angle) * radial;
        y = cluster.y + Math.sin(angle) * radial;
      } else {
        x = lerp(BOUNDS.left + margin, BOUNDS.right - margin, rng());
        y = lerp(BOUNDS.bottom + margin, BOUNDS.top - margin, rng());
      }

      x = clamp(x, BOUNDS.left + margin, BOUNDS.right - margin);
      y = clamp(y, BOUNDS.bottom + margin, BOUNDS.top - margin);

      if (canPlaceFruit(fruits, -1, x, y, radius, 0.72)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      x = lerp(BOUNDS.left + margin, BOUNDS.right - margin, rng());
      y = lerp(BOUNDS.bottom + margin, BOUNDS.top - margin, rng());
    }

    const angle = rng() * Math.PI * 2;
    const speed = lerp(speedMin, speedMax, rng());
    fruits.push({
      id: i,
      x,
      y,
      colorId: colorBag[i],
      radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  enforceEdgeLocks(fruits, rng);

  return fruits;
}

function cellIndex(cx, cy, width) {
  return cy * width + cx;
}

function buildFreeMask(blockers, cellSize) {
  const width = Math.floor((BOUNDS.right - BOUNDS.left) / cellSize) + 1;
  const height = Math.floor((BOUNDS.top - BOUNDS.bottom) / cellSize) + 1;
  const free = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = BOUNDS.left + x * cellSize;
      const py = BOUNDS.bottom + y * cellSize;
      let blocked = false;
      for (const b of blockers) {
        if (Math.hypot(px - b.x, py - b.y) <= b.radius) {
          blocked = true;
          break;
        }
      }
      free[cellIndex(x, y, width)] = blocked ? 0 : 1;
    }
  }

  return { free, width, height };
}

function cellsInsideBubble(bubble, grid, cellSize) {
  const cells = [];
  const minX = clamp(Math.floor((bubble.x - bubble.radius - BOUNDS.left) / cellSize), 0, grid.width - 1);
  const maxX = clamp(Math.ceil((bubble.x + bubble.radius - BOUNDS.left) / cellSize), 0, grid.width - 1);
  const minY = clamp(Math.floor((bubble.y - bubble.radius - BOUNDS.bottom) / cellSize), 0, grid.height - 1);
  const maxY = clamp(Math.ceil((bubble.y + bubble.radius - BOUNDS.bottom) / cellSize), 0, grid.height - 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const idx = cellIndex(x, y, grid.width);
      if (!grid.free[idx]) continue;
      const px = BOUNDS.left + x * cellSize;
      const py = BOUNDS.bottom + y * cellSize;
      if (Math.hypot(px - bubble.x, py - bubble.y) <= bubble.radius) {
        cells.push(idx);
      }
    }
  }

  if (cells.length > 0) return cells;

  let nearestIdx = -1;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const idx = cellIndex(x, y, grid.width);
      if (!grid.free[idx]) continue;
      const px = BOUNDS.left + x * cellSize;
      const py = BOUNDS.bottom + y * cellSize;
      const d = Math.hypot(px - bubble.x, py - bubble.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = idx;
      }
    }
  }

  return nearestIdx >= 0 ? [nearestIdx] : [];
}

function computeGrid(widthCell) {
  const width = Math.floor((BOUNDS.right - BOUNDS.left) / widthCell) + 1;
  const height = Math.floor((BOUNDS.top - BOUNDS.bottom) / widthCell) + 1;
  return { width, height, size: width * height };
}

function topFruitAtPoint(fruits, activeMask, px, py) {
  let best = -1;
  let bestZ = -Infinity;
  for (let i = 0; i < fruits.length; i += 1) {
    if (((activeMask >> BigInt(i)) & 1n) === 0n) continue;
    const f = fruits[i];
    const dx = px - f.x;
    const dy = py - f.y;
    const d2 = dx * dx + dy * dy;
    const r2 = f.radius * f.radius;
    if (d2 > r2) continue;
    const z = Math.sqrt(Math.max(0, r2 - d2));
    if (z > bestZ) {
      bestZ = z;
      best = i;
    }
  }
  return best;
}

function buildTopGridIds(fruits, activeMask, cellSize, grid) {
  const topIds = new Int16Array(grid.size);
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const px = BOUNDS.left + x * cellSize;
      const py = BOUNDS.bottom + y * cellSize;
      topIds[cellIndex(x, y, grid.width)] = topFruitAtPoint(fruits, activeMask, px, py);
    }
  }
  return topIds;
}

function collectGroupsForColor(fruits, activeMask, colorId, topIds, grid) {
  const visited = new Uint8Array(grid.size);
  const groups = [];
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const isPassable = (idx) => {
    const topId = topIds[idx];
    if (topId < 0) return true;
    return fruits[topId].colorId === colorId;
  };

  for (let seed = 0; seed < grid.size; seed += 1) {
    if (visited[seed] || !isPassable(seed)) continue;
    let mask = 0n;
    const queue = [seed];
    visited[seed] = 1;
    let head = 0;

    while (head < queue.length) {
      const idx = queue[head];
      head += 1;

      const topId = topIds[idx];
      if (topId >= 0 && fruits[topId].colorId === colorId) {
        mask |= 1n << BigInt(topId);
      }

      const cx = idx % grid.width;
      const cy = Math.floor(idx / grid.width);
      for (const [dx, dy] of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
        const nidx = cellIndex(nx, ny, grid.width);
        if (visited[nidx] || !isPassable(nidx)) continue;
        visited[nidx] = 1;
        queue.push(nidx);
      }
    }

    if (mask !== 0n) groups.push(mask);
  }

  return groups;
}

function collectAvailableActions(fruits, activeMask, cellSize, grid, topGridCache) {
  const key = activeMask.toString();
  let topIds = topGridCache.get(key);
  if (!topIds) {
    topIds = buildTopGridIds(fruits, activeMask, cellSize, grid);
    topGridCache.set(key, topIds);
  }

  const colorSet = new Set();
  for (let i = 0; i < fruits.length; i += 1) {
    if (((activeMask >> BigInt(i)) & 1n) === 0n) continue;
    colorSet.add(fruits[i].colorId);
  }

  const actions = [];
  for (const colorId of colorSet) {
    const groups = collectGroupsForColor(fruits, activeMask, colorId, topIds, grid);
    for (const g of groups) actions.push({ colorId, removeMask: g });
  }
  return actions;
}

function estimateMinSteps(fruits, cellSize) {
  const n = fruits.length;
  const initialMask = (1n << BigInt(n)) - 1n;
  const grid = computeGrid(cellSize);
  const topGridCache = new Map();
  const actionCache = new Map();

  const dist = new Map();
  const queue = [initialMask];
  let head = 0;
  dist.set(initialMask, 0);

  while (head < queue.length) {
    const mask = queue[head];
    head += 1;
    const step = dist.get(mask);
    if (mask === 0n) return { minSteps: step, byColor: [] };

    const key = mask.toString();
    let actions = actionCache.get(key);
    if (!actions) {
      actions = collectAvailableActions(fruits, mask, cellSize, grid, topGridCache);
      actionCache.set(key, actions);
    }

    for (const action of actions) {
      const next = mask & ~action.removeMask;
      if (next === mask) continue;
      if (dist.has(next)) continue;
      dist.set(next, step + 1);
      queue.push(next);
    }
  }

  return { minSteps: Number.POSITIVE_INFINITY, byColor: [] };
}

function roundFruitDef(def) {
  return {
    x: Math.round(def.x * 1000) / 1000,
    y: Math.round(def.y * 1000) / 1000,
    colorId: def.colorId,
    radius: Math.round(def.radius * 1000) / 1000,
    vx: Math.round(def.vx * 1000) / 1000,
    vy: Math.round(def.vy * 1000) / 1000,
  };
}

function cloneFruits(fruits) {
  return fruits.map((f) => ({ ...f }));
}

function minPlacementDistance(a, b) {
  return Math.max(0.42, (a.radius + b.radius) * 0.55);
}

function hasOverlapAtIndex(fruits, idx) {
  const a = fruits[idx];
  for (let i = 0; i < fruits.length; i += 1) {
    if (i === idx) continue;
    const b = fruits[i];
    const minDist = minPlacementDistance(a, b);
    if (Math.hypot(a.x - b.x, a.y - b.y) < minDist) {
      return true;
    }
  }
  return false;
}

function relaxFruitsPositions(fruits, iterations = 120) {
  for (let it = 0; it < iterations; it += 1) {
    let moved = false;
    for (let i = 0; i < fruits.length; i += 1) {
      const a = fruits[i];
      for (let j = i + 1; j < fruits.length; j += 1) {
        const b = fruits[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const minDist = minPlacementDistance(a, b);
        if (dist >= minDist) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        const push = overlap * 0.5;

        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;

        a.x = clamp(a.x, BOUNDS.left + a.radius + 0.02, BOUNDS.right - a.radius - 0.02);
        a.y = clamp(a.y, BOUNDS.bottom + a.radius + 0.02, BOUNDS.top - a.radius - 0.02);
        b.x = clamp(b.x, BOUNDS.left + b.radius + 0.02, BOUNDS.right - b.radius - 0.02);
        b.y = clamp(b.y, BOUNDS.bottom + b.radius + 0.02, BOUNDS.top - b.radius - 0.02);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function settleFruitsPhysics(fruits, frames = 120, dt = 1 / 60) {
  const worldBounds = BOUNDS;
  for (let step = 0; step < frames; step += 1) {
    for (let i = 0; i < fruits.length; i += 1) {
      const d1 = fruits[i];
      for (let j = i + 1; j < fruits.length; j += 1) {
        const d2 = fruits[j];

        const dx = d2.x - d1.x;
        const dy = d2.y - d1.y;
        let dist = Math.hypot(dx, dy);
        const hardDist = d1.radius + d2.radius;
        const softContactDist = hardDist * 0.42;
        if (dist >= softContactDist) continue;

        let nx = dx;
        let ny = dy;
        if (dist === 0) {
          nx = 1;
          ny = 0;
          dist = 1;
        }

        nx /= dist;
        ny /= dist;
        const overlap = softContactDist - dist;

        const m1 = d1.radius * d1.radius;
        const m2 = d2.radius * d2.radius;
        const totalM = m1 + m2;
        const r1 = m2 / totalM;
        const r2 = m1 / totalM;

        const separation = overlap * 0.12;
        d1.x -= nx * separation * r1;
        d1.y -= ny * separation * r1;
        d2.x += nx * separation * r2;
        d2.y += ny * separation * r2;

        const kvx = (d1.vx ?? 0) - (d2.vx ?? 0);
        const kvy = (d1.vy ?? 0) - (d2.vy ?? 0);
        const p = (2.0 * (nx * kvx + ny * kvy)) / (m1 + m2);
        const restitution = 0.12;
        d1.vx = (d1.vx ?? 0) - p * m2 * nx * restitution;
        d1.vy = (d1.vy ?? 0) - p * m2 * ny * restitution;
        d2.vx = (d2.vx ?? 0) + p * m1 * nx * restitution;
        d2.vy = (d2.vy ?? 0) + p * m1 * ny * restitution;
      }
    }

    for (let i = 0; i < fruits.length; i += 1) {
      const f = fruits[i];
      f.x += (f.vx ?? 0) * dt;
      f.y += (f.vy ?? 0) * dt;

      if (f.x < worldBounds.left + f.radius) {
        f.x = worldBounds.left + f.radius;
        if ((f.vx ?? 0) < 0) f.vx *= -0.5;
      }
      if (f.x > worldBounds.right - f.radius) {
        f.x = worldBounds.right - f.radius;
        if ((f.vx ?? 0) > 0) f.vx *= -0.5;
      }
      if (f.y < worldBounds.bottom + f.radius) {
        f.y = worldBounds.bottom + f.radius;
        if ((f.vy ?? 0) < 0) f.vy *= -0.5;
      }
      if (f.y > worldBounds.top - f.radius) {
        f.y = worldBounds.top - f.radius;
        if ((f.vy ?? 0) > 0) f.vy *= -0.5;
      }

      f.vx = (f.vx ?? 0) * 0.985;
      f.vy = (f.vy ?? 0) * 0.985;
    }
  }
}

function prepareFruitsForSolve(fruits) {
  const prepared = cloneFruits(fruits);
  settleFruitsPhysics(prepared, 120, 1 / 60);
  return prepared;
}

function mutateFruitsInPlace(fruits, rng) {
  if (fruits.length < 2) return;
  const moveCount = rng() < 0.75 ? 1 : 2;
  for (let i = 0; i < moveCount; i += 1) {
    const idx = Math.floor(rng() * fruits.length);
    const f = fruits[idx];
    const ox = f.x;
    const oy = f.y;
    const jitter = rng() < 0.5 ? 0.45 : 0.85;
    f.x = clamp(f.x + (rng() * 2 - 1) * jitter, BOUNDS.left + f.radius + 0.02, BOUNDS.right - f.radius - 0.02);
    f.y = clamp(f.y + (rng() * 2 - 1) * jitter, BOUNDS.bottom + f.radius + 0.02, BOUNDS.top - f.radius - 0.02);
    if (hasOverlapAtIndex(fruits, idx)) {
      f.x = ox;
      f.y = oy;
    }
  }

  if (rng() < 0.55 && fruits.length >= 2) {
    const a = Math.floor(rng() * fruits.length);
    let b = Math.floor(rng() * fruits.length);
    if (a === b) b = (b + 1) % fruits.length;
    const ca = fruits[a].colorId;
    fruits[a].colorId = fruits[b].colorId;
    fruits[b].colorId = ca;
  }
}

function refineLayoutToTarget({ fruits, targetSteps, iterations, cellSize, seed }) {
  relaxFruitsPositions(fruits);

  if (iterations <= 0) {
    const solved = estimateMinSteps(fruits, cellSize);
    return { fruits, solved };
  }

  const rng = createSeededRandom(seed ^ 0x9e3779b9);
  let current = cloneFruits(fruits);
  let currentSolved = estimateMinSteps(current, cellSize);
  let best = cloneFruits(current);
  let bestSolved = currentSolved;

  for (let i = 0; i < iterations; i += 1) {
    const trial = cloneFruits(current);
    mutateFruitsInPlace(trial, rng);
    const trialSolved = estimateMinSteps(trial, cellSize);

    const trialGap = Math.abs(trialSolved.minSteps - targetSteps);
    const currentGap = Math.abs(currentSolved.minSteps - targetSteps);
    const bestGap = Math.abs(bestSolved.minSteps - targetSteps);

    if (trialGap < bestGap || (trialGap === bestGap && trialSolved.minSteps > bestSolved.minSteps)) {
      best = cloneFruits(trial);
      bestSolved = trialSolved;
    }

    const better = trialGap < currentGap || (trialGap === currentGap && trialSolved.minSteps >= currentSolved.minSteps);
    if (better || rng() < 0.08) {
      current = trial;
      currentSolved = trialSolved;
    }

    if (bestSolved.minSteps === targetSteps) break;
  }

  relaxFruitsPositions(best);
  bestSolved = estimateMinSteps(best, cellSize);
  return { fruits: best, solved: bestSolved };
}

function printUsage() {
  console.log(`
Usage:
  node scripts/step-level-lab.mjs analyze --seed 12401 --colorCounts 0:8,1:8,2:7,3:7 --radiusRange 0.31,0.38

  node scripts/step-level-lab.mjs generate --targetSteps 6 --samples 1200 --seedStart 30000 \
    --colorCounts 0:8,1:8,2:7,3:7 --radiusRange 0.31,0.38 --maxResults 5 --refineIterations 400 --out ./dist/step-candidates.json

Notes:
  - speed is ignored by the step estimator (static assumption), but still included in generated data.
  - minSteps is estimated by grid path connectivity with color blockers.
  - refineIterations > 0 enables local-search refinement to better match targetSteps.
`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv);
  if (command === "help" || command === "--help") {
    printUsage();
    return;
  }

  const seed = Math.floor(toNumber(flags.seed, DEFAULTS.seedStart));
  const seedStart = Math.floor(toNumber(flags.seedStart, DEFAULTS.seedStart));
  const samples = Math.max(1, Math.floor(toNumber(flags.samples, DEFAULTS.samples)));
  const maxResults = Math.max(1, Math.floor(toNumber(flags.maxResults, DEFAULTS.maxResults)));
  const targetSteps = Math.floor(toNumber(flags.targetSteps, -1));
  const radiusRange = parseRange(flags.radiusRange, DEFAULTS.radiusRange);
  const speedRange = parseRange(flags.speedRange, DEFAULTS.speedRange);
  const cellSize = clamp(toNumber(flags.cellSize, DEFAULTS.cellSize), 0.04, 0.2);
  const refineIterations = Math.max(0, Math.floor(toNumber(flags.refineIterations, DEFAULTS.refineIterations)));
  const colorCounts = parseColorCounts(flags.colorCounts);

  if (command === "analyze") {
    const rawFruits = generateRandomFruits({ seed, colorCounts, radiusRange, speedRange });
    const fruits = prepareFruitsForSolve(rawFruits);
    const solved = estimateMinSteps(fruits, cellSize);
    const report = {
      seed,
      colorCounts,
      radiusRange,
      speedRange,
      fruitCount: fruits.length,
      minSteps: solved.minSteps,
      byColor: solved.byColor,
      passBudget: {
        hard: solved.minSteps + 2,
        easy: solved.minSteps + 5,
      },
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (command === "generate") {
    if (targetSteps < 1) {
      throw new Error("generate mode requires --targetSteps >= 1");
    }

    const hits = [];
    for (let i = 0; i < samples; i += 1) {
      const runSeed = seedStart + i;
      const fruits = generateRandomFruits({
        seed: runSeed,
        colorCounts,
        radiusRange,
        speedRange,
      });

      const prepared = prepareFruitsForSolve(fruits);

      const refined = refineLayoutToTarget({
        fruits: prepared,
        targetSteps,
        iterations: refineIterations,
        cellSize,
        seed: runSeed,
      });
      const solved = refined.solved;
      if (solved.minSteps !== targetSteps) continue;

      hits.push({
        seed: runSeed,
        minSteps: solved.minSteps,
        byColor: solved.byColor,
        passBudget: {
          hard: solved.minSteps + 2,
          easy: solved.minSteps + 5,
        },
        colorCounts,
        radiusRange,
        speedRange,
        fruits: refined.fruits.map(roundFruitDef),
      });

      if (hits.length >= maxResults) break;
    }

    const summary = {
      targetSteps,
      searchedSeeds: [seedStart, seedStart + samples - 1],
      colorCounts,
      radiusRange,
      speedRange,
      cellSize,
      hitCount: hits.length,
      hits,
    };

    if (flags.out) {
      await writeFile(flags.out, JSON.stringify(summary, null, 2), "utf8");
      console.log(`Wrote ${hits.length} candidate(s) to ${flags.out}`);
    } else {
      console.log(JSON.stringify(summary, null, 2));
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
