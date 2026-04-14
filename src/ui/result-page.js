export function createResultPage({
  maskEl,
  cardEl,
  titleEl,
  titleTextEl,
  winCloseBtn,
  perfectEl,
  rewardLabelEl,
  descEl,
  rewardEl,
  coinIconEl,
  retryBtn,
  nextBtn,
  backBtn,
  onRetry,
  onNext,
  onBack,
} = {}) {
  const cardBodyEl = cardEl?.querySelector?.(".result-card") ?? cardEl;

  function openResult(outcome, options = {}) {
    const reward = Math.max(0, Math.floor(options.reward ?? 0));
    const levelNumber = Math.max(1, Math.floor(options.level ?? 1));
    const canNext = options.canNext === true;
    const isFinal = options.isFinal === true;
    let shouldRunWinDone = false;

    if (outcome === "win") {
      if (titleTextEl) titleTextEl.textContent = isFinal ? "All Clear" : `Level ${levelNumber}`;
      if (descEl) {
        descEl.textContent = "";
        descEl.classList.add("hidden");
      }
      rewardEl.textContent = "0";
      cardBodyEl?.classList.remove("is-lose");
      cardBodyEl?.classList.add("is-win");
      titleEl.classList.remove("is-lose");
      titleEl.classList.add("is-win");
      winCloseBtn?.classList.remove("hidden");
      perfectEl?.classList.remove("hidden");
      rewardLabelEl?.classList.remove("hidden");
      rewardEl.classList.remove("hidden");
      coinIconEl?.classList.remove("hidden");

      retryBtn?.classList.add("hidden");
      if (canNext) {
        nextBtn?.classList.remove("hidden");
        if (nextBtn) nextBtn.textContent = "Continue";
        backBtn?.classList.add("hidden");
      } else {
        nextBtn?.classList.add("hidden");
        backBtn?.classList.remove("hidden");
        if (backBtn) backBtn.textContent = "Home";
      }
      if (retryBtn) retryBtn.textContent = "Retry";

      rewardEl.textContent = `${reward}`;
      shouldRunWinDone = true;
    } else {
      if (titleTextEl) titleTextEl.textContent = `Level ${levelNumber}`;
      if (descEl) {
        descEl.textContent = "Level Failed!";
        descEl.classList.remove("hidden");
      }
      rewardEl.textContent = "0";
      cardBodyEl?.classList.remove("is-win");
      cardBodyEl?.classList.add("is-lose");
      titleEl.classList.remove("is-win");
      titleEl.classList.add("is-lose");
      winCloseBtn?.classList.remove("hidden");
      perfectEl?.classList.add("hidden");
      rewardLabelEl?.classList.add("hidden");
      rewardEl.classList.add("hidden");
      coinIconEl?.classList.add("hidden");

      retryBtn?.classList.remove("hidden");
      nextBtn?.classList.add("hidden");
      backBtn?.classList.remove("hidden");
      if (retryBtn) retryBtn.textContent = "Retry";
      if (backBtn) backBtn.textContent = "Home";

    }

    maskEl?.classList.remove("hidden");
    cardEl?.classList.remove("hidden");

    if (shouldRunWinDone && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        options.onWinCountDone?.();
      });
    }
  }

  function closeResult() {
    maskEl?.classList.add("hidden");
    cardEl?.classList.add("hidden");
  }

  function getRewardAnchorRect() {
    const target = coinIconEl || rewardEl;
    return target?.getBoundingClientRect?.() ?? null;
  }

  retryBtn?.addEventListener("click", () => onRetry?.());
  nextBtn?.addEventListener("click", () => onNext?.());
  backBtn?.addEventListener("click", () => onBack?.());
  winCloseBtn?.addEventListener("click", () => onBack?.());

  return {
    openResult,
    closeResult,
    getRewardAnchorRect,
  };
}
