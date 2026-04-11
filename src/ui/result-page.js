export function createResultPage({
  maskEl,
  cardEl,
  titleEl,
  titleTextEl,
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
  function openResult(outcome, options = {}) {
    const reward = Math.max(0, Math.floor(options.reward ?? 0));
    const levelNumber = Math.max(1, Math.floor(options.level ?? 1));
    const score = Math.max(0, Math.floor(options.score ?? 0));
    const canNext = options.canNext === true;
    const isFinal = options.isFinal === true;

    if (outcome === "win") {
      if (titleTextEl) titleTextEl.textContent = isFinal ? "全部通关" : "胜利";
      descEl.textContent = isFinal ? `总步数 ${score}` : `通关第${levelNumber}关`;
      rewardEl.textContent = reward > 0 ? `+${reward}` : "+0";
      cardEl.classList.remove("is-lose");
      cardEl.classList.add("is-win");
      titleEl.classList.remove("is-lose");
      titleEl.classList.add("is-win");
      rewardEl.classList.remove("hidden");
      coinIconEl?.classList.remove("hidden");

      retryBtn?.classList.add("hidden");
      if (canNext) nextBtn?.classList.remove("hidden");
      else nextBtn?.classList.add("hidden");
      backBtn?.classList.remove("hidden");
    } else {
      if (titleTextEl) titleTextEl.textContent = "失败";
      descEl.textContent = `当前分数 ${score} · 当前关卡 ${levelNumber}`;
      rewardEl.textContent = "+0";
      cardEl.classList.remove("is-win");
      cardEl.classList.add("is-lose");
      titleEl.classList.remove("is-win");
      titleEl.classList.add("is-lose");
      rewardEl.classList.add("hidden");
      coinIconEl?.classList.add("hidden");

      retryBtn?.classList.remove("hidden");
      nextBtn?.classList.add("hidden");
      backBtn?.classList.remove("hidden");
    }

    maskEl?.classList.remove("hidden");
    cardEl?.classList.remove("hidden");
  }

  function closeResult() {
    maskEl?.classList.add("hidden");
    cardEl?.classList.add("hidden");
  }

  function applyControlSettings(settings = {}) {
    void settings;
  }

  retryBtn?.addEventListener("click", () => onRetry?.());
  nextBtn?.addEventListener("click", () => onNext?.());
  backBtn?.addEventListener("click", () => onBack?.());

  return {
    openResult,
    closeResult,
    applyControlSettings,
  };
}
