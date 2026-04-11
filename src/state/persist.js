const SAVE_KEY = "fruit-save-v1";
const CONTROL_KEY = "fruit-control-v1";

const defaultGameSave = {
  maxPassedLevel: 1,
  coins: 16,
};

const defaultControlSettings = {
  resultOffsetX: 0,
  resultOffsetY: 0,
  resultScale: 1,
  buttonOffsetY: 0,
  maskOpacity: 0.55,
};

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function readSave() {
  const raw = window.localStorage.getItem(SAVE_KEY);
  const parsed = safeParse(raw);
  if (!parsed) return { ...defaultGameSave };
  return {
    maxPassedLevel: Math.floor(clampNumber(parsed.maxPassedLevel, 1, 999, defaultGameSave.maxPassedLevel)),
    coins: Math.floor(clampNumber(parsed.coins, 0, 999999, defaultGameSave.coins)),
  };
}

export function writeSave(partial = {}) {
  const current = readSave();
  const next = {
    maxPassedLevel: Math.floor(clampNumber(partial.maxPassedLevel ?? current.maxPassedLevel, 1, 999, current.maxPassedLevel)),
    coins: Math.floor(clampNumber(partial.coins ?? current.coins, 0, 999999, current.coins)),
  };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

export function readControlSettings() {
  const raw = window.localStorage.getItem(CONTROL_KEY);
  const parsed = safeParse(raw);
  if (!parsed) return { ...defaultControlSettings };
  return {
    resultOffsetX: clampNumber(parsed.resultOffsetX, -160, 160, defaultControlSettings.resultOffsetX),
    resultOffsetY: clampNumber(parsed.resultOffsetY, -220, 220, defaultControlSettings.resultOffsetY),
    resultScale: clampNumber(parsed.resultScale, 0.75, 1.25, defaultControlSettings.resultScale),
    buttonOffsetY: clampNumber(parsed.buttonOffsetY, -40, 100, defaultControlSettings.buttonOffsetY),
    maskOpacity: clampNumber(parsed.maskOpacity, 0.15, 0.9, defaultControlSettings.maskOpacity),
  };
}

export function writeControlSettings(partial = {}) {
  const current = readControlSettings();
  const next = {
    resultOffsetX: clampNumber(partial.resultOffsetX ?? current.resultOffsetX, -160, 160, current.resultOffsetX),
    resultOffsetY: clampNumber(partial.resultOffsetY ?? current.resultOffsetY, -220, 220, current.resultOffsetY),
    resultScale: clampNumber(partial.resultScale ?? current.resultScale, 0.75, 1.25, current.resultScale),
    buttonOffsetY: clampNumber(partial.buttonOffsetY ?? current.buttonOffsetY, -40, 100, current.buttonOffsetY),
    maskOpacity: clampNumber(partial.maskOpacity ?? current.maskOpacity, 0.15, 0.9, current.maskOpacity),
  };
  window.localStorage.setItem(CONTROL_KEY, JSON.stringify(next));
  return next;
}

export function getDefaultControlSettings() {
  return { ...defaultControlSettings };
}
