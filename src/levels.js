import levelsConfig from "./config/levels.json" with { type: "json" };

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRange(range, fallbackMin, fallbackMax) {
  if (!Array.isArray(range) || range.length < 2) {
    return [fallbackMin, fallbackMax];
  }

  const a = asNumber(range[0], fallbackMin);
  const b = asNumber(range[1], fallbackMax);
  return [Math.min(a, b), Math.max(a, b)];
}

function normalizeColorCounts(rawCounts) {
  if (!Array.isArray(rawCounts)) return [];

  const counts = [];
  for (const row of rawCounts) {
    const colorId = Math.floor(asNumber(row?.colorId, -1));
    const count = Math.floor(asNumber(row?.count, 0));
    if (colorId < 0 || count <= 0) continue;
    counts.push({ colorId, count });
  }

  return counts;
}

function normalizeFruits(rawFruits) {
  if (!Array.isArray(rawFruits)) return [];

  const fruits = [];
  for (const item of rawFruits) {
    if (!item) continue;
    const colorId = Math.floor(asNumber(item.colorId, -1));
    if (colorId < 0) continue;

    fruits.push({
      x: asNumber(item.x, 0),
      y: asNumber(item.y, 0),
      colorId,
      radius: asNumber(item.radius, 0.34),
      vx: asNumber(item.vx, 0),
      vy: asNumber(item.vy, 0),
    });
  }

  return fruits;
}

function normalizeLockedBubbles(rawLockedBubbles) {
  if (!Array.isArray(rawLockedBubbles)) return [];

  const normalized = [];
  for (const item of rawLockedBubbles) {
    if (!item) continue;
    const index = Math.floor(asNumber(item.index, -1));
    if (index < 0) continue;

    const unlockType = String(item.unlock?.type ?? "").trim();
    if (unlockType !== "totalClears") continue;
    const unlockValue = Math.max(1, Math.floor(asNumber(item.unlock?.value, 1)));

    normalized.push({
      index,
      unlock: {
        type: unlockType,
        value: unlockValue,
      },
    });
  }

  return normalized;
}

function normalizeLevel(rawLevel, index) {
  const id = Math.floor(asNumber(rawLevel?.id, index + 1));
  const stepLimit = Math.max(1, Math.floor(asNumber(rawLevel?.stepLimit, 8)));
  const seed = Math.floor(asNumber(rawLevel?.seed, 10000 + id * 137));
  const name = String(rawLevel?.name ?? `关卡${id}`).trim() || `关卡${id}`;
  const rawDifficulty = String(rawLevel?.difficulty ?? "easy").toLowerCase();
  const difficulty = ["easy", "medium", "hard"].includes(rawDifficulty) ? rawDifficulty : "easy";
  const rawHomeBubbleColorId = Math.floor(asNumber(rawLevel?.homeBubbleColorId, -1));
  const homeBubbleColorId = rawHomeBubbleColorId >= 0 && rawHomeBubbleColorId <= 7 ? rawHomeBubbleColorId : null;
  const colorCounts = normalizeColorCounts(rawLevel?.colorCounts);
  const fruits = normalizeFruits(rawLevel?.fruits);
  const lockedBubbles = normalizeLockedBubbles(rawLevel?.lockedBubbles);

  if (!colorCounts.length) {
    throw new Error(`Invalid levels config: level id=${id} has empty colorCounts`);
  }

  return {
    id,
    name,
    difficulty,
    homeBubbleColorId,
    stepLimit,
    seed,
    colorCounts,
    lockedBubbles,
    radiusRange: normalizeRange(rawLevel?.radiusRange, 0.34, 0.44),
    speedRange: normalizeRange(rawLevel?.speedRange, 0, 0.16),
    fruits,
  };
}

const rawLevels = Array.isArray(levelsConfig?.levels) ? levelsConfig.levels : [];

if (!rawLevels.length) {
  throw new Error("Invalid levels config: src/config/levels.json has no levels");
}

export const LEVELS = rawLevels.map(normalizeLevel);
