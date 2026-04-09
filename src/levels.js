const C = {
  RED: 0,
  ORANGE: 1,
  GREEN: 2,
  PURPLE: 3,
};

export const LEVELS = [
  {
    id: 1,
    name: "双色入门",
    targetScore: 100,
    seed: 12031,
    colorCounts: [
      { colorId: C.RED, count: 7 },
      { colorId: C.ORANGE, count: 7 },
    ],
    radiusRange: [0.39, 0.46],
    speedRange: [0.0, 0.12],
  },
  {
    id: 2,
    name: "三色试炼",
    targetScore: 170,
    seed: 12079,
    colorCounts: [
      { colorId: C.RED, count: 6 },
      { colorId: C.ORANGE, count: 6 },
      { colorId: C.GREEN, count: 6 },
    ],
    radiusRange: [0.37, 0.44],
    speedRange: [0.02, 0.18],
  },
  {
    id: 3,
    name: "三色加速",
    targetScore: 250,
    seed: 12137,
    colorCounts: [
      { colorId: C.RED, count: 8 },
      { colorId: C.ORANGE, count: 7 },
      { colorId: C.GREEN, count: 7 },
    ],
    radiusRange: [0.35, 0.42],
    speedRange: [0.06, 0.24],
  },
  {
    id: 4,
    name: "四色混切",
    targetScore: 340,
    seed: 12211,
    colorCounts: [
      { colorId: C.RED, count: 6 },
      { colorId: C.ORANGE, count: 6 },
      { colorId: C.GREEN, count: 6 },
      { colorId: C.PURPLE, count: 6 },
    ],
    radiusRange: [0.34, 0.41],
    speedRange: [0.08, 0.28],
  },
  {
    id: 5,
    name: "高压连切",
    targetScore: 450,
    seed: 12319,
    colorCounts: [
      { colorId: C.RED, count: 8 },
      { colorId: C.ORANGE, count: 7 },
      { colorId: C.GREEN, count: 6 },
      { colorId: C.PURPLE, count: 6 },
    ],
    radiusRange: [0.32, 0.39],
    speedRange: [0.1, 0.32],
  },
  {
    id: 6,
    name: "终局冲分",
    targetScore: 580,
    seed: 12401,
    colorCounts: [
      { colorId: C.RED, count: 8 },
      { colorId: C.ORANGE, count: 8 },
      { colorId: C.GREEN, count: 7 },
      { colorId: C.PURPLE, count: 7 },
    ],
    radiusRange: [0.31, 0.38],
    speedRange: [0.12, 0.36],
  },
];
