export function createCoinStatus({ rootEl, valueEl } = {}) {
  let shownValue = Number.parseInt(valueEl?.textContent || "0", 10);
  if (!Number.isFinite(shownValue)) shownValue = 0;
  let animationFrame = 0;

  function renderValue(value) {
    const safe = Math.max(0, Math.floor(value));
    shownValue = safe;
    if (valueEl) valueEl.textContent = String(safe);
  }

  function stopAnimation() {
    if (!animationFrame || typeof window === "undefined") return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function easeOutCubic(t) {
    const p = Math.min(1, Math.max(0, t));
    return 1 - (1 - p) ** 3;
  }

  function setCoins(nextValue) {
    const safe = Math.max(0, Math.floor(nextValue ?? 0));
    if (!valueEl) {
      shownValue = safe;
      return;
    }
    if (safe === shownValue) return;

    stopAnimation();

    if (typeof window === "undefined") {
      renderValue(safe);
      return;
    }

    const from = shownValue;
    const delta = Math.abs(safe - from);
    const durationMs = Math.min(520, Math.max(180, delta * 22));
    const startAt = performance.now();

    const tick = (now) => {
      const t = (now - startAt) / durationMs;
      const eased = easeOutCubic(t);
      const current = from + (safe - from) * eased;
      renderValue(current);

      if (t < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      } else {
        animationFrame = 0;
        renderValue(safe);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
  }

  function getAnchorRect() {
    if (!rootEl) return null;
    const icon = rootEl.querySelector(".home-status-badge.coin");
    const target = icon || rootEl;
    return target.getBoundingClientRect();
  }

  return {
    setCoins,
    getAnchorRect,
  };
}
