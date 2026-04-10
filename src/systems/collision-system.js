function lerp(a, b, t) {
  return a + (b - a) * t;
}

function gridCoord(value, cellSize) {
  return Math.floor(value / cellSize);
}

function gridKey(cellX, cellY) {
  return `${cellX},${cellY}`;
}

export function createCollisionSystem({ cellSize = 1.2, neighborRange = 2 } = {}) {
  const workGrid = new Map();
  const workActive = [];

  function buildSpatialIndex(fruits) {
    workGrid.clear();
    workActive.length = 0;

    for (let i = 0; i < fruits.length; i += 1) {
      const fruit = fruits[i];
      if (!fruit.active || fruit.sliced) continue;

      workActive.push(fruit);
      const cellX = gridCoord(fruit.group.position.x, cellSize);
      const cellY = gridCoord(fruit.group.position.y, cellSize);
      const key = gridKey(cellX, cellY);
      const bucket = workGrid.get(key);
      if (bucket) bucket.push(fruit);
      else workGrid.set(key, [fruit]);
    }

    return workActive.length;
  }

  function resolve(fruits) {
    const activeCount = buildSpatialIndex(fruits);
    if (activeCount < 2) return;

    for (let i = 0; i < activeCount; i += 1) {
      const d1 = workActive[i];
      const baseCellX = gridCoord(d1.group.position.x, cellSize);
      const baseCellY = gridCoord(d1.group.position.y, cellSize);

      for (let oy = -neighborRange; oy <= neighborRange; oy += 1) {
        for (let ox = -neighborRange; ox <= neighborRange; ox += 1) {
          const bucket = workGrid.get(gridKey(baseCellX + ox, baseCellY + oy));
          if (!bucket) continue;

          for (let j = 0; j < bucket.length; j += 1) {
            const d2 = bucket[j];
            if (d2.id <= d1.id || !d2.active || d2.sliced) continue;

            const dx = d2.group.position.x - d1.group.position.x;
            const dy = d2.group.position.y - d1.group.position.y;
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
            d1.group.position.x -= nx * separation * r1;
            d1.group.position.y -= ny * separation * r1;
            d2.group.position.x += nx * separation * r2;
            d2.group.position.y += ny * separation * r2;

            d1.applyContact(-nx, -ny, overlap);
            d2.applyContact(nx, ny, overlap);

            const kx = d1.vel.x - d2.vel.x;
            const ky = d1.vel.y - d2.vel.y;
            const p = (2.0 * (nx * kx + ny * ky)) / (m1 + m2);
            const restitution = 0.12;
            d1.vel.x -= p * m2 * nx * restitution;
            d1.vel.y -= p * m2 * ny * restitution;
            d2.vel.x += p * m1 * nx * restitution;
            d2.vel.y += p * m1 * ny * restitution;

            const stickiness = 0.22;
            const avgVX = (d1.vel.x + d2.vel.x) * 0.5;
            const avgVY = (d1.vel.y + d2.vel.y) * 0.5;
            d1.vel.x = lerp(d1.vel.x, avgVX, stickiness);
            d1.vel.y = lerp(d1.vel.y, avgVY, stickiness);
            d2.vel.x = lerp(d2.vel.x, avgVX, stickiness);
            d2.vel.y = lerp(d2.vel.y, avgVY, stickiness);
          }
        }
      }
    }
  }

  return { resolve };
}
