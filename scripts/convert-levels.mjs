import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import xlsx from "xlsx";

const INPUT_RELATIVE = path.join("src", "excel", "Levels.xlsx");
const OUTPUT_RELATIVE = path.join("src", "config", "levels.json");
const REQUIRED_COLUMNS = ["id", "name", "difficulty", "colorkindcount", "fruitcountrange", "radiusrange", "speedrange", "seed", "step"];
const OPTIONAL_COLUMNS = ["homebubblecolorid", "intheorystep", "lockedbubbles"];
const AVAILABLE_COLOR_IDS = [0, 1, 2, 3, 4, 5, 6, 7];
const BOUNDS = {
  left: -2.6325,
  right: 2.6325,
  top: 4.82,
  bottom: -4.82,
};

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value, field, rowNum) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid ${field} at row ${rowNum}`);
  }
  return num;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseRange(rawValue, field, rowNum, integer = false) {
  const text = String(rawValue ?? "").trim();
  const split = text.includes("~") ? text.split("~") : text.split(",");
  if (split.length < 2) {
    throw new Error(`Invalid ${field} at row ${rowNum}, expected "min,max"`);
  }

  let a = Number(split[0].trim());
  let b = Number(split[1].trim());
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error(`Invalid ${field} at row ${rowNum}, expected numeric range`);
  }

  if (integer) {
    a = Math.floor(a);
    b = Math.floor(b);
  }

  return [Math.min(a, b), Math.max(a, b)];
}

function parseDifficulty(raw, rowNum) {
  const text = normalize(raw);
  if (["easy", "简单", "e"].includes(text)) return "easy";
  if (["medium", "中等", "normal", "m"].includes(text)) return "medium";
  if (["hard", "困难", "h"].includes(text)) return "hard";
  throw new Error(`Invalid difficulty at row ${rowNum}, expected easy/medium/hard`);
}

function getStepOffsetByDifficulty(difficulty) {
  if (difficulty === "easy") return 3;
  if (difficulty === "medium") return 2;
  return 1;
}

function resolveStepLimit(row, col, difficulty, rowNum) {
  const stepRaw = row[col.step];
  const direct = Number(stepRaw);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.max(1, Math.floor(direct));
  }

  const inTheoryIdx = col.intheorystep;
  if (inTheoryIdx >= 0) {
    const theory = Number(row[inTheoryIdx]);
    if (Number.isFinite(theory)) {
      return Math.max(1, Math.floor(theory) + getStepOffsetByDifficulty(difficulty));
    }
  }

  throw new Error(`Invalid step at row ${rowNum}. Ensure step or inTheoryStep is numeric.`);
}

function parseHomeBubbleColorId(raw, difficulty, rowNum, id) {
  if (raw != null && String(raw).trim() !== "") {
    const value = Math.floor(toNumber(raw, "homeBubbleColorId", rowNum));
    if (value < 0 || value >= AVAILABLE_COLOR_IDS.length) {
      throw new Error(`Invalid homeBubbleColorId at row ${rowNum}, expected 0-${AVAILABLE_COLOR_IDS.length - 1}`);
    }
    return value;
  }

  if (difficulty === "hard") return 0;
  if (difficulty === "medium") return 4;

  const easyPalette = [1, 2, 3, 5, 6];
  return easyPalette[(Math.max(1, id) - 1) % easyPalette.length];
}

function findHeaderRow(rows) {
  return rows.findIndex((row) => {
    const header = row.map(normalize);
    return REQUIRED_COLUMNS.every((key) => header.includes(key));
  });
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

function pickColorIds(kindCount, rng) {
  const pool = [...AVAILABLE_COLOR_IDS];
  shuffleInPlace(pool, rng);
  return pool.slice(0, kindCount).sort((a, b) => a - b);
}

function buildEvenColorCounts(colorIds, fruitCount) {
  const counts = colorIds.map((colorId) => ({ colorId, count: 0 }));
  for (let i = 0; i < fruitCount; i += 1) {
    counts[i % counts.length].count += 1;
  }
  return counts;
}

function buildColorBag(colorCounts) {
  const bag = [];
  for (const item of colorCounts) {
    for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
  }
  return bag;
}

function generateRandomFruits({ seed, fruitCount, colorCounts, radiusMin, radiusMax, speedMin, speedMax }) {
  const rng = createSeededRandom(seed);
  const fruits = [];
  const colorBag = buildColorBag(colorCounts);
  shuffleInPlace(colorBag, rng);

  const clusterCount = clamp(Math.round(fruitCount / 6), 3, 7);
  const clusterMargin = 1.0;
  const clusters = [];
  for (let i = 0; i < clusterCount; i += 1) {
    clusters.push({
      x: lerp(BOUNDS.left + clusterMargin, BOUNDS.right - clusterMargin, rng()),
      y: lerp(BOUNDS.bottom + clusterMargin, BOUNDS.top - clusterMargin, rng()),
      spread: lerp(0.85, 1.55, rng()),
      weight: lerp(0.7, 1.4, rng()),
    });
  }

  let weightTotal = 0;
  for (const c of clusters) weightTotal += c.weight;

  for (let i = 0; i < fruitCount; i += 1) {
    const radius = lerp(radiusMin, radiusMax, rng()) * 3;
    const margin = radius + 0.01;
    const useCluster = rng() < 0.84;

    let x = 0;
    let y = 0;
    let placed = false;

    for (let k = 0; k < 180; k += 1) {
      const useEdge = rng() < 0.38;

      if (useEdge) {
        const side = Math.floor(rng() * 4);
        if (side === 0 || side === 1) {
          const maxDepth = Math.max(0, Math.min(0.9, BOUNDS.right - BOUNDS.left - margin * 2));
          const depth = Math.sqrt(rng()) * maxDepth;
          x = side === 0 ? BOUNDS.left + margin + depth : BOUNDS.right - margin - depth;
          y = lerp(BOUNDS.bottom + margin, BOUNDS.top - margin, rng());
        } else {
          const maxDepth = Math.max(0, Math.min(0.9, BOUNDS.top - BOUNDS.bottom - margin * 2));
          const depth = Math.sqrt(rng()) * maxDepth;
          y = side === 2 ? BOUNDS.bottom + margin + depth : BOUNDS.top - margin - depth;
          x = lerp(BOUNDS.left + margin, BOUNDS.right - margin, rng());
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
        x = lerp(BOUNDS.left + margin, BOUNDS.right - margin, rng());
        y = lerp(BOUNDS.bottom + margin, BOUNDS.top - margin, rng());
      }

      x = clamp(x, BOUNDS.left + margin, BOUNDS.right - margin);
      y = clamp(y, BOUNDS.bottom + margin, BOUNDS.top - margin);

      let overlap = false;
      for (const p of fruits) {
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
      x = lerp(BOUNDS.left + margin, BOUNDS.right - margin, rng());
      y = lerp(BOUNDS.bottom + margin, BOUNDS.top - margin, rng());
    }

    const angle = rng() * Math.PI * 2;
    const speed = lerp(speedMin, speedMax, rng());
    fruits.push({
      x,
      y,
      radius,
      colorId: colorBag[i],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  return fruits;
}

function cellIndex(x, y, width) {
  return y * width + x;
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

  return cells;
}

function popcountBigInt(mask) {
  let count = 0;
  let value = mask;
  while (value > 0n) {
    count += Number(value & 1n);
    value >>= 1n;
  }
  return count;
}

function buildLockTargetByIndex(fruitCount, lockedBubbles) {
  const targets = new Array(fruitCount).fill(0);
  if (!Array.isArray(lockedBubbles)) return targets;

  for (const item of lockedBubbles) {
    const index = Math.floor(Number(item?.index));
    if (!Number.isInteger(index) || index < 0 || index >= fruitCount) continue;
    const unlockType = String(item?.unlock?.type ?? "").trim();
    if (unlockType !== "totalClears") continue;
    const unlockValue = Math.max(1, Math.floor(Number(item?.unlock?.value) || 0));
    targets[index] = Math.max(targets[index], unlockValue);
  }

  return targets;
}

function collectColorComponentsForState({
  fruits,
  colorId,
  aliveMask,
  removedCount,
  lockTargetByIndex,
  cellSize,
}) {
  const targets = [];
  const blockers = [];

  for (let i = 0; i < fruits.length; i += 1) {
    const bit = 1n << BigInt(i);
    if ((aliveMask & bit) === 0n) continue;

    const unlockTarget = lockTargetByIndex[i];
    const selectable = unlockTarget <= 0 || removedCount >= unlockTarget;
    if (!selectable) continue;

    if (fruits[i].colorId === colorId) {
      targets.push({ ...fruits[i], index: i });
    } else {
      blockers.push(fruits[i]);
    }
  }

  if (!targets.length) return [];

  const grid = buildFreeMask(blockers, cellSize);
  const targetCells = targets.map((t) => cellsInsideBubble(t, grid, cellSize));
  const cellToTargets = new Map();

  for (let t = 0; t < targetCells.length; t += 1) {
    for (const idx of targetCells[t]) {
      if (!cellToTargets.has(idx)) cellToTargets.set(idx, []);
      cellToTargets.get(idx).push(t);
    }
  }

  const components = [];
  const assigned = new Uint8Array(targets.length);
  const visited = new Uint8Array(grid.width * grid.height);
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let start = 0; start < targets.length; start += 1) {
    if (assigned[start]) continue;

    const component = [targets[start].index];
    const queue = [];
    let head = 0;

    for (const idx of targetCells[start]) {
      if (!visited[idx]) {
        visited[idx] = 1;
        queue.push(idx);
      }
    }
    assigned[start] = 1;

    while (head < queue.length) {
      const idx = queue[head];
      head += 1;
      const touched = cellToTargets.get(idx);
      if (touched) {
        for (const t of touched) {
          if (assigned[t]) continue;
          assigned[t] = 1;
          component.push(targets[t].index);
          for (const seedIdx of targetCells[t]) {
            if (!visited[seedIdx]) {
              visited[seedIdx] = 1;
              queue.push(seedIdx);
            }
          }
        }
      }

      const cx = idx % grid.width;
      const cy = Math.floor(idx / grid.width);
      for (const [dx, dy] of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;
        const nidx = cellIndex(nx, ny, grid.width);
        if (visited[nidx] || !grid.free[nidx]) continue;
        visited[nidx] = 1;
        queue.push(nidx);
      }
    }

    components.push(component);
  }

  return components;
}

function estimateMinStepsBaseline(fruits) {
  const allAliveMask = (1n << BigInt(fruits.length)) - 1n;
  const lockTargetByIndex = new Array(fruits.length).fill(0);
  const colorIds = [...new Set(fruits.map((f) => f.colorId))];
  let total = 0;

  for (const colorId of colorIds) {
    const components = collectColorComponentsForState({
      fruits,
      colorId,
      aliveMask: allAliveMask,
      removedCount: 0,
      lockTargetByIndex,
      cellSize: 0.1,
    });
    total += components.length;
  }

  return Math.max(total, colorIds.length);
}

function estimateMinSteps(fruits, lockedBubbles = []) {
  const fruitCount = fruits.length;
  if (!fruitCount) return 0;
  if (!Array.isArray(lockedBubbles) || lockedBubbles.length === 0) {
    return estimateMinStepsBaseline(fruits);
  }
  if (fruitCount > 20) {
    return estimateMinStepsBaseline(fruits);
  }

  const colorIds = [...new Set(fruits.map((f) => f.colorId))];
  const lockTargetByIndex = buildLockTargetByIndex(fruitCount, lockedBubbles);
  if (!lockTargetByIndex.some((v) => v > 0)) {
    return estimateMinStepsBaseline(fruits);
  }
  const allAliveMask = (1n << BigInt(fruitCount)) - 1n;
  const memo = new Map();
  let exploredStates = 0;
  const maxSearchStates = 120000;

  function solve(aliveMask) {
    if (aliveMask === 0n) return 0;
    const key = aliveMask.toString();
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    exploredStates += 1;
    if (exploredStates > maxSearchStates) {
      throw new Error("LOCK_MIN_STEP_SEARCH_BUDGET_EXCEEDED");
    }

    const removedCount = fruitCount - popcountBigInt(aliveMask);
    const moves = [];

    for (const colorId of colorIds) {
      const components = collectColorComponentsForState({
        fruits,
        colorId,
        aliveMask,
        removedCount,
        lockTargetByIndex,
        cellSize: 0.1,
      });

      for (const component of components) {
        moves.push(component);
      }
    }

    if (!moves.length) {
      memo.set(key, Infinity);
      return Infinity;
    }

    moves.sort((a, b) => b.length - a.length);

    let best = Infinity;
    for (const component of moves) {
      let nextMask = aliveMask;
      for (const index of component) {
        nextMask &= ~(1n << BigInt(index));
      }

      const next = solve(nextMask);
      if (Number.isFinite(next)) {
        best = Math.min(best, 1 + next);
      }
    }

    memo.set(key, best);
    return best;
  }

  try {
    const solved = solve(allAliveMask);
    if (!Number.isFinite(solved)) return estimateMinStepsBaseline(fruits);
    return solved;
  } catch (error) {
    if (error && error.message === "LOCK_MIN_STEP_SEARCH_BUDGET_EXCEEDED") {
      return estimateMinStepsBaseline(fruits);
    }
    throw error;
  }
}

function validateLevels(levels) {
  const idSet = new Set();
  for (const level of levels) {
    if (idSet.has(level.id)) {
      throw new Error(`Duplicate level id: ${level.id}`);
    }
    idSet.add(level.id);
  }

  const ids = [...idSet].sort((a, b) => a - b);
  for (let i = 0; i < ids.length; i += 1) {
    if (ids[i] !== i + 1) {
      throw new Error(`Level ids must be continuous from 1, got: ${ids.join(", ")}`);
    }
  }
}

function parseLockedBubbles(raw, rowNum) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_err) {
      throw new Error(`Invalid lockedBubbles JSON at row ${rowNum}`);
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid lockedBubbles JSON at row ${rowNum}, expected array`);
    }

    const normalized = [];
    for (const item of parsed) {
      const index = Math.floor(Number(item?.index));
      const unlockType = String(item?.unlock?.type ?? "totalClears").trim();
      const unlockValue = Math.max(1, Math.floor(Number(item?.unlock?.value)));
      if (!Number.isInteger(index) || index < 0) continue;
      if (unlockType !== "totalClears") continue;
      if (!Number.isFinite(unlockValue)) continue;
      normalized.push({
        index,
        unlock: {
          type: "totalClears",
          value: unlockValue,
        },
      });
    }
    return normalized;
  }

  const byIndex = new Map();
  const parts = text.split(/[;|]/).map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const pair = part.split(":").map((token) => token.trim());
    if (pair.length !== 2) {
      throw new Error(`Invalid lockedBubbles token at row ${rowNum}: ${part}`);
    }

    const index = Math.floor(Number(pair[0]));
    const unlockValue = Math.max(1, Math.floor(Number(pair[1])));
    if (!Number.isInteger(index) || index < 0 || !Number.isFinite(unlockValue)) {
      throw new Error(`Invalid lockedBubbles token at row ${rowNum}: ${part}`);
    }

    byIndex.set(index, {
      index,
      unlock: {
        type: "totalClears",
        value: unlockValue,
      },
    });
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

export function convertLevels(projectRoot = process.cwd()) {
  const inputPath = path.join(projectRoot, INPUT_RELATIVE);
  const outputPath = path.join(projectRoot, OUTPUT_RELATIVE);

  if (!fs.existsSync(inputPath)) {
    console.warn(`[excel:sync] ${INPUT_RELATIVE} not found, keep existing json`);
    return;
  }

  const workbook = xlsx.readFile(inputPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No sheet found in Levels.xlsx");

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex < 0) {
    throw new Error(`Header row not found. Required: ${REQUIRED_COLUMNS.join(", ")}`);
  }

  const header = rows[headerRowIndex].map(normalize);
  const requiredCol = Object.fromEntries(REQUIRED_COLUMNS.map((key) => [key, header.indexOf(key)]));
  const optionalCol = Object.fromEntries(OPTIONAL_COLUMNS.map((key) => [key, header.indexOf(key)]));
  const col = { ...requiredCol, ...optionalCol };

  const levels = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const excelRowNum = i + 1;
    const idValue = row[col.id];
    if (idValue == null || String(idValue).trim() === "") continue;

    const id = Math.floor(toNumber(idValue, "id", excelRowNum));
    const name = String(row[col.name] ?? "").trim();
    const difficulty = parseDifficulty(row[col.difficulty], excelRowNum);
    const kindCount = Math.floor(toNumber(row[col.colorkindcount], "colorKindCount", excelRowNum));
    const fruitCountRange = parseRange(row[col.fruitcountrange], "fruitCountRange", excelRowNum, true);
    const radiusRange = parseRange(row[col.radiusrange], "radiusRange", excelRowNum, false);
    const speedRange = parseRange(row[col.speedrange], "speedRange", excelRowNum, false);
    const homeBubbleColorId = parseHomeBubbleColorId(
      col.homebubblecolorid >= 0 ? row[col.homebubblecolorid] : null,
      difficulty,
      excelRowNum,
      id
    );
    const lockedBubbles = parseLockedBubbles(
      col.lockedbubbles >= 0 ? row[col.lockedbubbles] : null,
      excelRowNum
    );

    const seedRaw = row[col.seed];
    const seed = (seedRaw == null || String(seedRaw).trim() === "")
      ? 20000 + id * 137
      : Math.floor(toNumber(seedRaw, "seed", excelRowNum));
    const stepLimitFromSheet = resolveStepLimit(row, col, difficulty, excelRowNum);

    if (id <= 0) throw new Error(`Invalid id at row ${excelRowNum}`);
    if (!name) throw new Error(`Empty name at row ${excelRowNum}`);
    if (kindCount < 1 || kindCount > AVAILABLE_COLOR_IDS.length) {
      throw new Error(`Invalid colorKindCount at row ${excelRowNum}`);
    }
    if (fruitCountRange[0] < kindCount || fruitCountRange[1] < fruitCountRange[0]) {
      throw new Error(`Invalid fruitCountRange at row ${excelRowNum}`);
    }

    const rng = createSeededRandom(seed);
    const colorIds = pickColorIds(kindCount, rng);
    const span = fruitCountRange[1] - fruitCountRange[0] + 1;
    const fruitCount = fruitCountRange[0] + Math.floor(rng() * span);
    const colorCounts = buildEvenColorCounts(colorIds, fruitCount);

    const previewFruits = generateRandomFruits({
      seed,
      fruitCount,
      colorCounts,
      radiusMin: radiusRange[0],
      radiusMax: radiusRange[1],
      speedMin: speedRange[0],
      speedMax: speedRange[1],
    });
    const minSteps = estimateMinSteps(previewFruits, lockedBubbles);
    const stepLimit = stepLimitFromSheet;

    levels.push({
      id,
      name,
      difficulty,
      homeBubbleColorId,
      seed,
      fruitCount,
      colorIds,
      colorCounts,
      radiusRange,
      speedRange,
      minSteps,
      stepLimit,
      lockedBubbles,
    });
  }

  if (!levels.length) throw new Error("No valid level rows found in Levels.xlsx");
  validateLevels(levels);

  const output = { source: INPUT_RELATIVE, levels };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Generated ${path.relative(projectRoot, outputPath)} from ${sheetName}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  convertLevels(process.cwd());
}
