import * as THREE from "three/webgpu";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
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

export function createLevelRuntime({
  levels,
  colors,
  bounds,
  bubbleRadiusScale,
  spawnEdgePadding,
  spawnEdgeBias,
  spawnEdgeBand,
} = {}) {
  const cache = new Map();

  function normalizeColorIds(colorIds, fruitsDef) {
    if (Array.isArray(colorIds) && colorIds.length) {
      const valid = [];
      for (const id of colorIds) {
        const v = Math.floor(id);
        if (v >= 0 && v < colors.length && !valid.includes(v)) valid.push(v);
      }
      if (valid.length) return valid;
    }

    const set = new Set();
    for (const def of fruitsDef) set.add(Math.floor(def.colorId));
    const inferred = [];
    for (const id of set) {
      if (id >= 0 && id < colors.length) inferred.push(id);
    }
    if (inferred.length) return inferred;
    return colors.map((_c, idx) => idx);
  }

  function normalizeColorCounts(colorCounts) {
    if (!Array.isArray(colorCounts) || colorCounts.length === 0) return [];

    const merged = new Map();
    for (const item of colorCounts) {
      if (!item) continue;
      const colorId = Math.floor(item.colorId);
      const count = Math.floor(item.count);
      if (colorId < 0 || colorId >= colors.length || count <= 0) continue;
      merged.set(colorId, (merged.get(colorId) ?? 0) + count);
    }

    const result = [];
    for (const [colorId, count] of merged.entries()) {
      result.push({ colorId, count });
    }
    result.sort((a, b) => a.colorId - b.colorId);
    return result;
  }

  function sumColorCounts(colorCounts) {
    let total = 0;
    for (const item of colorCounts) total += item.count;
    return total;
  }

  function buildEvenColorCounts(colorIds, fruitCount) {
    const ids = Array.isArray(colorIds) && colorIds.length ? colorIds : colors.map((_c, idx) => idx);
    const counts = ids.map((colorId) => ({ colorId, count: 0 }));
    for (let i = 0; i < fruitCount; i += 1) {
      const idx = i % counts.length;
      counts[idx].count += 1;
    }
    return counts;
  }

  function inferRadiusRangeFromFruits(fruitsDef) {
    let min = Infinity;
    let max = -Infinity;
    for (const def of fruitsDef) {
      min = Math.min(min, def.radius ?? 0.4);
      max = Math.max(max, def.radius ?? 0.4);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0.34, max: 0.44 };
    }
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return {
      min: THREE.MathUtils.clamp(lo, 0.28, 0.58),
      max: THREE.MathUtils.clamp(hi, 0.3, 0.62),
    };
  }

  function inferSpeedRangeFromFruits(fruitsDef, levelIndex) {
    let sum = 0;
    let count = 0;
    for (const def of fruitsDef) {
      const vx = def.vx ?? 0;
      const vy = def.vy ?? 0;
      sum += Math.hypot(vx, vy);
      count += 1;
    }
    const avg = count > 0 ? sum / count : 0;
    const base = Math.max(avg + 0.08, 0.14 + levelIndex * 0.04);
    return {
      min: 0,
      max: THREE.MathUtils.clamp(base, 0.12, 0.58),
    };
  }

  function normalizeRange(inputRange, fallbackRange, clampMin, clampMax) {
    const src = Array.isArray(inputRange) && inputRange.length >= 2 ? { min: inputRange[0], max: inputRange[1] } : fallbackRange;
    const lo = THREE.MathUtils.clamp(Math.min(src.min, src.max), clampMin, clampMax);
    const hi = THREE.MathUtils.clamp(Math.max(src.min, src.max), clampMin, clampMax);
    return { min: lo, max: hi };
  }

  function buildColorBag(colorCounts, fruitCount) {
    const normalized = normalizeColorCounts(colorCounts);
    const bag = [];

    for (const item of normalized) {
      for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
    }

    if (bag.length === 0) {
      for (let i = 0; i < fruitCount; i += 1) bag.push(i % colors.length);
      return bag;
    }

    if (bag.length > fruitCount) return bag.slice(0, fruitCount);
    if (bag.length < fruitCount) {
      const fallbackColor = bag[bag.length - 1] ?? 0;
      while (bag.length < fruitCount) bag.push(fallbackColor);
    }
    return bag;
  }

  function generateRandomFruits({ seed, fruitCount, colorCounts, radiusMin, radiusMax, speedMin, speedMax }) {
    const rng = createSeededRandom(seed);
    const fruitsDef = [];
    const colorBag = buildColorBag(colorCounts, fruitCount);
    shuffleInPlace(colorBag, rng);

    const clusterCount = THREE.MathUtils.clamp(Math.round(fruitCount / 6), 3, 7);
    const clusterMargin = 1.0;
    const clusters = [];
    for (let i = 0; i < clusterCount; i += 1) {
      clusters.push({
        x: lerp(bounds.left + clusterMargin, bounds.right - clusterMargin, rng()),
        y: lerp(bounds.bottom + clusterMargin, bounds.top - clusterMargin, rng()),
        spread: lerp(0.85, 1.55, rng()),
        weight: lerp(0.7, 1.4, rng()),
      });
    }

    let weightTotal = 0;
    for (const c of clusters) weightTotal += c.weight;

    for (let i = 0; i < fruitCount; i += 1) {
      const radius = lerp(radiusMin, radiusMax, rng());
      const margin = radius + spawnEdgePadding;

      let x = 0;
      let y = 0;
      let placed = false;
      const useCluster = rng() < 0.84;

      for (let k = 0; k < 180; k += 1) {
        const useEdge = rng() < spawnEdgeBias;

        if (useEdge) {
          const side = Math.floor(rng() * 4);
          if (side === 0 || side === 1) {
            const maxDepth = Math.max(0, Math.min(spawnEdgeBand, bounds.right - bounds.left - margin * 2));
            const depth = Math.sqrt(rng()) * maxDepth;
            x = side === 0 ? bounds.left + margin + depth : bounds.right - margin - depth;
            y = lerp(bounds.bottom + margin, bounds.top - margin, rng());
          } else {
            const maxDepth = Math.max(0, Math.min(spawnEdgeBand, bounds.top - bounds.bottom - margin * 2));
            const depth = Math.sqrt(rng()) * maxDepth;
            y = side === 2 ? bounds.bottom + margin + depth : bounds.top - margin - depth;
            x = lerp(bounds.left + margin, bounds.right - margin, rng());
          }
        } else if (useCluster) {
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
          x = lerp(bounds.left + margin, bounds.right - margin, rng());
          y = lerp(bounds.bottom + margin, bounds.top - margin, rng());
        }

        x = THREE.MathUtils.clamp(x, bounds.left + margin, bounds.right - margin);
        y = THREE.MathUtils.clamp(y, bounds.bottom + margin, bounds.top - margin);

        let overlap = false;
        for (const p of fruitsDef) {
          const minDist = Math.max(0.42, (radius + p.radius) * 0.55);
          if (Math.hypot(x - p.x, y - p.y) < minDist) {
            overlap = true;
            break;
          }
        }
        if (!overlap) {
          placed = true;
          break;
        }
      }

      if (!placed) {
        x = lerp(bounds.left + margin, bounds.right - margin, rng());
        y = lerp(bounds.bottom + margin, bounds.top - margin, rng());
      }

      const angle = rng() * Math.PI * 2;
      const speed = lerp(speedMin, speedMax, rng());

      fruitsDef.push({
        x,
        y,
        colorId: colorBag[i],
        radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }

    return fruitsDef;
  }

  function normalizeLevelDefinition(level, index) {
    const fruitsDef = Array.isArray(level.fruits) ? level.fruits : [];
    const parsedColorCounts = normalizeColorCounts(level.colorCounts);
    const hasColorCounts = parsedColorCounts.length > 0;
    const fruitCountFromCounts = hasColorCounts ? sumColorCounts(parsedColorCounts) : 0;
    const fallbackFruitCount = fruitsDef.length > 0 ? fruitsDef.length : 20;
    const fruitCount = hasColorCounts ? fruitCountFromCounts : Math.max(4, Math.floor(level.fruitCount ?? fallbackFruitCount));
    const colorIds = hasColorCounts ? parsedColorCounts.map((item) => item.colorId) : normalizeColorIds(level.colorIds, fruitsDef);
    const colorCounts = hasColorCounts ? parsedColorCounts : buildEvenColorCounts(colorIds, fruitCount);
    const baseRadiusRange = normalizeRange(level.radiusRange, inferRadiusRangeFromFruits(fruitsDef), 0.28, 0.62);
    const radiusRange = {
      min: baseRadiusRange.min * bubbleRadiusScale,
      max: baseRadiusRange.max * bubbleRadiusScale,
    };
    const speedRange = normalizeRange(level.speedRange, inferSpeedRangeFromFruits(fruitsDef, index), 0, 0.9);
    const seed = Math.floor(level.seed ?? 1000 + (level.id ?? index + 1) * 137);
    const stepLimit = Math.max(1, Math.floor(level.stepLimit ?? 8));

    const fruits = fruitsDef.length
      ? fruitsDef.map((f) => ({
          x: f.x,
          y: f.y,
          colorId: f.colorId,
          radius: f.radius ?? 0.42 * bubbleRadiusScale,
          vx: f.vx ?? 0,
          vy: f.vy ?? 0,
        }))
      : generateRandomFruits({
          seed,
          fruitCount,
          colorCounts,
          radiusMin: radiusRange.min,
          radiusMax: radiusRange.max,
          speedMin: speedRange.min,
          speedMax: speedRange.max,
        });

    return {
      id: level.id,
      name: level.name,
      seed,
      fruitCount,
      colorIds,
      colorCounts,
      radiusRange,
      speedRange,
      stepLimit,
      fruits,
    };
  }

  function cloneNormalizedLevel(level) {
    return {
      ...level,
      colorIds: level.colorIds.map((id) => id),
      colorCounts: level.colorCounts.map((item) => ({ colorId: item.colorId, count: item.count })),
      radiusRange: { min: level.radiusRange.min, max: level.radiusRange.max },
      speedRange: { min: level.speedRange.min, max: level.speedRange.max },
      fruits: level.fruits.map((fruit) => ({
        x: fruit.x,
        y: fruit.y,
        colorId: fruit.colorId,
        radius: fruit.radius,
        vx: fruit.vx,
        vy: fruit.vy,
      })),
    };
  }

  function getNormalizedLevel(index) {
    const baseLevel = levels[index];
    if (!baseLevel) return null;

    const key = `${index}|${bounds.left.toFixed(3)}|${bounds.right.toFixed(3)}|${bounds.top.toFixed(3)}|${bounds.bottom.toFixed(3)}`;
    const cached = cache.get(key);
    if (cached) return cloneNormalizedLevel(cached);

    const normalized = normalizeLevelDefinition(baseLevel, index);
    cache.set(key, normalized);
    return cloneNormalizedLevel(normalized);
  }

  function clearCache() {
    cache.clear();
  }

  return {
    getNormalizedLevel,
    clearCache,
  };
}
