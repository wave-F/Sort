export function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function createLevelIndexClamper(levelCount) {
  return function clampLevelIndex(index, fallback = 0) {
    const maxIndex = Math.max(0, levelCount - 1);
    const fallbackIndex = Number.isFinite(Number(fallback)) ? Math.floor(Number(fallback)) : 0;
    const n = Number(index);
    if (!Number.isFinite(n)) {
      return Math.min(maxIndex, Math.max(0, fallbackIndex));
    }
    return Math.min(maxIndex, Math.max(0, Math.floor(n)));
  };
}

export function createPersistenceController({
  state,
  storageKeys,
  levelCount,
  staminaMax,
  staminaRecoverIntervalMs,
} = {}) {
  function getStorage() {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  }

  function hydrateLevelProgress() {
    const storage = getStorage();
    if (!storage) {
      state.currentPlayableLevelIndex = 0;
      state.highestPassedLevelIndex = -1;
      state.selectedHomeLevelIndex = 0;
      return;
    }

    try {
      const raw = storage.getItem(storageKeys.levelProgress);
      if (!raw) {
        state.currentPlayableLevelIndex = 0;
        state.highestPassedLevelIndex = -1;
        state.selectedHomeLevelIndex = 0;
        return;
      }

      const parsed = JSON.parse(raw);
      const maxIndex = Math.max(0, levelCount - 1);
      const playableRaw = Number(parsed.currentPlayableLevelIndex);
      const playable = Number.isFinite(playableRaw) ? Math.floor(playableRaw) : 0;
      const passedRaw = Number(parsed.highestPassedLevelIndex);
      const passed = Number.isFinite(passedRaw) ? Math.floor(passedRaw) : -1;
      state.currentPlayableLevelIndex = Math.min(maxIndex, Math.max(0, playable));
      state.highestPassedLevelIndex = Math.min(maxIndex, Math.max(-1, passed));
      state.selectedHomeLevelIndex = state.currentPlayableLevelIndex;
    } catch (_err) {
      state.currentPlayableLevelIndex = 0;
      state.highestPassedLevelIndex = -1;
      state.selectedHomeLevelIndex = 0;
    }
  }

  function persistLevelProgress() {
    const storage = getStorage();
    if (!storage) return;
    const payload = {
      currentPlayableLevelIndex: state.currentPlayableLevelIndex,
      highestPassedLevelIndex: state.highestPassedLevelIndex,
    };
    storage.setItem(storageKeys.levelProgress, JSON.stringify(payload));
  }

  function hydrateCoinBalance() {
    const storage = getStorage();
    if (!storage) {
      state.coins = 0;
      return;
    }

    const raw = storage.getItem(storageKeys.coin);
    const parsed = Number(raw);
    state.coins = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  function persistStamina() {
    const storage = getStorage();
    if (!storage) return;
    const payload = {
      stamina: Math.min(staminaMax, Math.max(0, Math.floor(state.stamina))),
      lastRecoverAt: Math.max(0, Math.floor(state.staminaLastRecoverAt || Date.now())),
    };
    storage.setItem(storageKeys.stamina, JSON.stringify(payload));
  }

  function settleStaminaRecovery(now = Date.now()) {
    const safeNow = Number.isFinite(now) ? Math.floor(now) : Date.now();
    state.stamina = Math.min(staminaMax, Math.max(0, Math.floor(state.stamina)));

    if (!Number.isFinite(state.staminaLastRecoverAt) || state.staminaLastRecoverAt <= 0) {
      state.staminaLastRecoverAt = safeNow;
      persistStamina();
      return;
    }

    if (safeNow < state.staminaLastRecoverAt) {
      state.staminaLastRecoverAt = safeNow;
      persistStamina();
      return;
    }

    if (state.stamina >= staminaMax) {
      if (state.staminaLastRecoverAt !== safeNow) {
        state.staminaLastRecoverAt = safeNow;
        persistStamina();
      }
      return;
    }

    const elapsed = safeNow - state.staminaLastRecoverAt;
    const gain = Math.floor(elapsed / staminaRecoverIntervalMs);
    if (gain <= 0) return;

    state.stamina = Math.min(staminaMax, state.stamina + gain);
    state.staminaLastRecoverAt += gain * staminaRecoverIntervalMs;
    if (state.stamina >= staminaMax) {
      state.staminaLastRecoverAt = safeNow;
    }
    persistStamina();
  }

  function hydrateStamina() {
    const now = Date.now();
    const storage = getStorage();
    if (!storage) {
      state.stamina = staminaMax;
      state.staminaLastRecoverAt = now;
      return;
    }

    try {
      const raw = storage.getItem(storageKeys.stamina);
      if (!raw) {
        state.stamina = staminaMax;
        state.staminaLastRecoverAt = now;
        persistStamina();
        return;
      }

      const parsed = JSON.parse(raw);
      const loadedStamina = Math.floor(Number(parsed.stamina));
      const loadedRecoverAt = Number(parsed.lastRecoverAt);
      state.stamina = Number.isFinite(loadedStamina)
        ? Math.min(staminaMax, Math.max(0, loadedStamina))
        : staminaMax;
      state.staminaLastRecoverAt = Number.isFinite(loadedRecoverAt)
        ? Math.max(0, Math.floor(loadedRecoverAt))
        : now;
    } catch (_err) {
      state.stamina = staminaMax;
      state.staminaLastRecoverAt = now;
      persistStamina();
    }

    settleStaminaRecovery(now);
  }

  return {
    hydrateLevelProgress,
    persistLevelProgress,
    hydrateCoinBalance,
    hydrateStamina,
    persistStamina,
    settleStaminaRecovery,
  };
}
