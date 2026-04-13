import { CountUp } from "countup.js";

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
  let rewardCountUp = null;

  function openResult(outcome, options = {}) {
    const reward = Math.max(0, Math.floor(options.reward ?? 0));
    const levelNumber = Math.max(1, Math.floor(options.level ?? 1));
    const score = Math.max(0, Math.floor(options.score ?? 0));
    const canNext = options.canNext === true;
    const isFinal = options.isFinal === true;

    if (outcome === "win") {
      if (titleTextEl) titleTextEl.textContent = isFinal ? "全部通关" : "胜利";
      descEl.textContent = isFinal ? `总步数 ${score}` : `通关第${levelNumber}关`;
      rewardEl.textContent = "+0";
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

      if (rewardCountUp) {
        try {
          rewardCountUp.reset();
        } catch (_err) {
          // ignore reset errors
        }
        rewardCountUp = null;
      }

      rewardCountUp = new CountUp(rewardEl, reward, {
        startVal: 0,
        duration: 1.0,
        decimalPlaces: 0,
        useGrouping: false,
        formattingFn: (value) => `+${Math.floor(value)}`,
      });

      if (rewardCountUp.error) {
        rewardEl.textContent = `+${reward}`;
        options.onWinCountDone?.();
      } else {
        window.requestAnimationFrame(() => {
          if (!rewardCountUp) return;
          rewardCountUp.start(() => {
            rewardCountUp = null;
            rewardEl.textContent = `+${reward}`;
            options.onWinCountDone?.();
          });
        });
      }
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

      if (rewardCountUp) {
        try {
          rewardCountUp.reset();
        } catch (_err) {
          // ignore reset errors
        }
        rewardCountUp = null;
      }
    }

    maskEl?.classList.remove("hidden");
    cardEl?.classList.remove("hidden");
  }

  function closeResult() {
    if (rewardCountUp) {
      try {
        rewardCountUp.reset();
      } catch (_err) {
        // ignore reset errors
      }
      rewardCountUp = null;
    }
    maskEl?.classList.add("hidden");
    cardEl?.classList.add("hidden");
  }

  function getRewardAnchorRect() {
    const target = coinIconEl || rewardEl;
    return target?.getBoundingClientRect?.() ?? null;
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
    getRewardAnchorRect,
    applyControlSettings,
  };
}
