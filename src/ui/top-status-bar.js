export function createTopStatusBarController({
  state,
  topbarEl,
  coinStatusEl,
} = {}) {
  function clearFloatingFlags() {
    topbarEl?.classList.remove("is-floating-over-result");
    topbarEl?.classList.remove("is-floating-over-continue");
  }

  function setHudVisible(visible) {
    const hidden = !visible;
    topbarEl?.classList.toggle("hidden", hidden);
    coinStatusEl?.classList.toggle("hidden", hidden);
    clearFloatingFlags();
    coinStatusEl?.classList.toggle("is-hidden-in-gameplay", visible);
  }

  function setCoinTopbarVisible(show, mode = "result") {
    if (!topbarEl || !coinStatusEl) return;

    if (show) {
      topbarEl.classList.remove("hidden");
      coinStatusEl.classList.remove("hidden");
      coinStatusEl.classList.remove("is-hidden-in-gameplay");
      clearFloatingFlags();
      if (mode === "continue") {
        topbarEl.classList.add("is-floating-over-continue");
      } else {
        topbarEl.classList.add("is-floating-over-result");
      }
      return;
    }

    clearFloatingFlags();
    if (!state?.inHome) {
      coinStatusEl.classList.add("is-hidden-in-gameplay");
    }
  }

  function setResultCoinTopbarVisible(show) {
    setCoinTopbarVisible(show, "result");
  }

  function setContinueCoinTopbarVisible(show) {
    setCoinTopbarVisible(show, "continue");
  }

  return {
    setHudVisible,
    setResultCoinTopbarVisible,
    setContinueCoinTopbarVisible,
  };
}
