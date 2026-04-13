export function createCoinStatus({ rootEl, valueEl } = {}) {
  function setCoins(nextValue) {
    const safe = Math.max(0, Math.floor(nextValue ?? 0));
    if (valueEl) valueEl.textContent = String(safe);
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
