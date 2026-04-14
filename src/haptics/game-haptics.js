export function createGameHaptics() {
  const state = {
    initTried: false,
    enabled: true,
    supportChecked: false,
    hasHaptics: false,
    lastAtByKey: new Map(),
  };

  function getCustomHaptics() {
    return window.Capacitor?.Plugins?.CustomHaptics ?? null;
  }

  function fallbackVibrate(ms) {
    if (typeof navigator?.vibrate !== "function") return;
    navigator.vibrate(ms);
  }

  async function init() {
    if (state.initTried) return;
    state.initTried = true;

    try {
      const haptics = getCustomHaptics();
      if (!haptics?.checkSupport) {
        state.hasHaptics = typeof navigator?.vibrate === "function";
      } else {
        const support = await haptics.checkSupport();
        state.hasHaptics = Boolean(support?.haptics);
      }
      state.supportChecked = true;
    } catch (_err) {
      state.hasHaptics = typeof navigator?.vibrate === "function";
      state.supportChecked = true;
    }
  }

  function shouldRun(key, cooldownMs) {
    const now = performance.now();
    const lastAt = state.lastAtByKey.get(key) || 0;
    if (now - lastAt < cooldownMs) return false;
    state.lastAtByKey.set(key, now);
    return true;
  }

  function fire(task, key, cooldownMs = 40) {
    if (!state.enabled) return;
    void init();
    if (!shouldRun(key, cooldownMs)) return;

    try {
      const maybe = task();
      if (maybe && typeof maybe.catch === "function") {
        maybe.catch(() => {});
      }
    } catch (_err) {}
  }

  function uiClick() {
    fire(() => {
      const haptics = getCustomHaptics();
      if (haptics?.selection) return haptics.selection();
      fallbackVibrate(10);
      return null;
    }, "uiClick", 35);
  }

  function select() {
    fire(() => {
      const haptics = getCustomHaptics();
      if (haptics?.selection) return haptics.selection();
      fallbackVibrate(8);
      return null;
    }, "select", 26);
  }

  function error() {
    fire(() => {
      const haptics = getCustomHaptics();
      if (haptics?.notification) return haptics.notification({ type: "error" });
      fallbackVibrate([16, 28, 16]);
      return null;
    }, "error", 90);
  }

  function pop() {
    fire(() => {
      const haptics = getCustomHaptics();
      if (haptics?.playTransient) {
        return haptics.playTransient({ intensity: 0.42, sharpness: 0.58 });
      }
      if (haptics?.impact) return haptics.impact({ style: "soft" });
      fallbackVibrate(8);
      return null;
    }, "pop", 20);
  }

  function win() {
    fire(() => {
      const haptics = getCustomHaptics();
      if (haptics?.notification) return haptics.notification({ type: "success" });
      fallbackVibrate([18, 30, 24]);
      return null;
    }, "win", 220);
  }

  function lose() {
    fire(() => {
      const haptics = getCustomHaptics();
      if (haptics?.notification) return haptics.notification({ type: "warning" });
      fallbackVibrate([24, 38, 24, 38, 24]);
      return null;
    }, "lose", 220);
  }

  return {
    init,
    uiClick,
    select,
    error,
    pop,
    win,
    lose,
  };
}
