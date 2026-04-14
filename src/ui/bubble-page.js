export function createBubblePageController({
  state,
  phoneFrameEl,
  outOfMovesBannerEl,
  initialElements,
  constants,
  onSetContinueCoinTopbarVisible,
  onTrySpendCoins,
  onUpdateStepsHud,
  onShowCommentary,
  onEndGame,
  onClearQueuedSelections,
  onResetTrail,
  onPlayUiClick,
} = {}) {
  const outOfMovesContinueCost = Math.max(0, Math.floor(constants?.continueCost ?? 50));
  const outOfMovesContinueMoves = Math.max(1, Math.floor(constants?.continueMoves ?? 3));
  const outOfMovesBannerDurationMs = Math.max(300, Math.floor(constants?.bannerDurationMs ?? 1800));

  let outOfMovesContinueMaskEl = initialElements?.maskEl ?? null;
  let outOfMovesContinueModalEl = initialElements?.modalEl ?? null;
  let outOfMovesContinueCloseEl = initialElements?.closeEl ?? null;
  let outOfMovesContinueMovesEl = initialElements?.movesEl ?? null;
  let outOfMovesContinueCostEl = initialElements?.costEl ?? null;
  let outOfMovesContinueBuyEl = initialElements?.buyEl ?? null;
  let gameplayCenterTipEl = initialElements?.centerTipEl ?? null;

  let outOfMovesBannerTimer = 0;
  let outOfMovesBannerAnimation = null;
  let gameplayCenterTipTimer = 0;

  function ensureOutOfMovesContinueElements() {
    if (!phoneFrameEl) return;

    if (!outOfMovesContinueMaskEl) {
      const mask = document.createElement("div");
      mask.id = "out-of-moves-continue-mask";
      mask.className = "hidden";
      mask.setAttribute("aria-hidden", "true");
      phoneFrameEl.appendChild(mask);
      outOfMovesContinueMaskEl = mask;
    }

    if (!outOfMovesContinueModalEl) {
      const modal = document.createElement("div");
      modal.id = "out-of-moves-continue-modal";
      modal.className = "hidden";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Continue modal");
      modal.innerHTML = `
      <button id="out-of-moves-continue-close" class="out-of-moves-continue-close" type="button" aria-label="Close">✕</button>
      <div class="out-of-moves-continue-body">
        <div class="out-of-moves-continue-title">Continue?</div>
        <div class="out-of-moves-continue-center">
          <div class="out-of-moves-continue-badge">+<span id="out-of-moves-continue-moves">3</span></div>
          <p class="out-of-moves-continue-desc">Spend coins to add moves and keep playing!</p>
        </div>
        <button id="out-of-moves-continue-buy" class="out-of-moves-continue-buy" type="button">
          <span class="out-of-moves-continue-buy-text">Play On</span>
          <img class="out-of-moves-continue-buy-coin" src="./assets/images/currency128_Coin.png" alt="Coin" />
          <span id="out-of-moves-continue-cost" class="out-of-moves-continue-buy-cost">50</span>
        </button>
      </div>
    `;
      phoneFrameEl.appendChild(modal);
      outOfMovesContinueModalEl = modal;
    }

    outOfMovesContinueCloseEl = document.getElementById("out-of-moves-continue-close");
    outOfMovesContinueMovesEl = document.getElementById("out-of-moves-continue-moves");
    outOfMovesContinueCostEl = document.getElementById("out-of-moves-continue-cost");
    outOfMovesContinueBuyEl = document.getElementById("out-of-moves-continue-buy");
  }

  function clearOutOfMovesBannerTimer() {
    if (!outOfMovesBannerTimer) return;
    window.clearTimeout(outOfMovesBannerTimer);
    outOfMovesBannerTimer = 0;
  }

  function clearOutOfMovesBannerAnimation() {
    if (!outOfMovesBannerAnimation) return;
    outOfMovesBannerAnimation.cancel();
    outOfMovesBannerAnimation = null;
  }

  function hideOutOfMovesBanner() {
    clearOutOfMovesBannerAnimation();
    clearOutOfMovesBannerTimer();
    if (!outOfMovesBannerEl) return;
    outOfMovesBannerEl.classList.remove("show");
    outOfMovesBannerEl.classList.add("hidden");
    outOfMovesBannerEl.style.opacity = "";
    outOfMovesBannerEl.style.transform = "";
  }

  function playOutOfMovesBanner(onDone) {
    if (!outOfMovesBannerEl) {
      onDone?.();
      return;
    }

    hideOutOfMovesBanner();
    outOfMovesBannerEl.classList.remove("hidden");
    outOfMovesBannerEl.style.opacity = "1";
    outOfMovesBannerEl.style.transform = "translateY(-50%)";

    if (typeof outOfMovesBannerEl.animate === "function") {
      const animation = outOfMovesBannerEl.animate(
        [
          { transform: "translateY(-260%)", opacity: 0, offset: 0 },
          { transform: "translateY(-50%)", opacity: 1, offset: 0.24 },
          { transform: "translateY(-50%)", opacity: 1, offset: 0.62 },
          { transform: "translateY(220%)", opacity: 0, offset: 1 },
        ],
        {
          duration: outOfMovesBannerDurationMs,
          easing: "cubic-bezier(0.22, 0.82, 0.22, 1)",
          fill: "both",
        }
      );
      outOfMovesBannerAnimation = animation;
      animation.onfinish = () => {
        outOfMovesBannerAnimation = null;
        hideOutOfMovesBanner();
        onDone?.();
      };
      animation.oncancel = () => {
        outOfMovesBannerAnimation = null;
      };
      return;
    }

    outOfMovesBannerEl.classList.remove("show");
    void outOfMovesBannerEl.offsetWidth;
    outOfMovesBannerEl.classList.add("show");
    outOfMovesBannerTimer = window.setTimeout(() => {
      hideOutOfMovesBanner();
      onDone?.();
    }, outOfMovesBannerDurationMs);
  }

  function syncOutOfMovesContinueModalUi() {
    if (outOfMovesContinueMovesEl) outOfMovesContinueMovesEl.textContent = String(outOfMovesContinueMoves);
    if (outOfMovesContinueCostEl) outOfMovesContinueCostEl.textContent = String(outOfMovesContinueCost);
  }

  function setOutOfMovesContinueCoinTopbarVisible(show) {
    onSetContinueCoinTopbarVisible?.(show);
  }

  function ensureGameplayCenterTipEl() {
    if (gameplayCenterTipEl) return gameplayCenterTipEl;
    if (!phoneFrameEl) return null;
    const el = document.createElement("div");
    el.id = "gameplay-center-tip";
    el.className = "gameplay-center-tip";
    phoneFrameEl.appendChild(el);
    gameplayCenterTipEl = el;
    return gameplayCenterTipEl;
  }

  function clearGameplayCenterTip() {
    if (gameplayCenterTipTimer) {
      window.clearTimeout(gameplayCenterTipTimer);
      gameplayCenterTipTimer = 0;
    }
    gameplayCenterTipEl?.classList.remove("show");
  }

  function showGameplayCenterTip(text, durationMs = 1200) {
    const tipEl = ensureGameplayCenterTipEl();
    if (!tipEl) return;
    clearGameplayCenterTip();
    tipEl.textContent = text;
    tipEl.classList.add("show");
    gameplayCenterTipTimer = window.setTimeout(() => {
      tipEl.classList.remove("show");
      gameplayCenterTipTimer = 0;
    }, durationMs);
  }

  function hideOutOfMovesContinueModal() {
    outOfMovesContinueMaskEl?.classList.add("hidden");
    outOfMovesContinueModalEl?.classList.add("hidden");
    setOutOfMovesContinueCoinTopbarVisible(false);
    clearGameplayCenterTip();
    state.outOfMovesContinueOpen = false;
  }

  function openOutOfMovesContinueModal() {
    ensureOutOfMovesContinueElements();
    if (!outOfMovesContinueMaskEl || !outOfMovesContinueModalEl || !outOfMovesContinueBuyEl || !outOfMovesContinueCloseEl) {
      state.outOfMovesContinuePending = false;
      state.levelTransitioning = false;
      onEndGame?.(`Level ${state.currentLevelIndex + 1} failed: out of moves`);
      return;
    }

    syncOutOfMovesContinueModalUi();
    outOfMovesContinueMaskEl.classList.remove("hidden");
    outOfMovesContinueModalEl.classList.remove("hidden");
    setOutOfMovesContinueCoinTopbarVisible(true);
    state.outOfMovesContinueOpen = true;
  }

  function resolveOutOfMovesAsLose() {
    hideOutOfMovesContinueModal();
    state.outOfMovesContinuePending = false;
    state.levelTransitioning = false;
    onEndGame?.(`Level ${state.currentLevelIndex + 1} failed: out of moves`);
  }

  function continueAfterOutOfMoves() {
    if (state.outOfMovesContinueUsedInLevel) {
      resolveOutOfMovesAsLose();
      return;
    }

    if (!onTrySpendCoins?.(outOfMovesContinueCost)) {
      syncOutOfMovesContinueModalUi();
      showGameplayCenterTip("Not enough coins", 1200);
      return;
    }

    state.stepLimit = Math.max(1, state.stepLimit + outOfMovesContinueMoves);
    state.outOfMovesContinueUsedInLevel = true;
    state.gameOver = false;
    state.levelTransitioning = false;
    state.outOfMovesContinuePending = false;
    hideOutOfMovesContinueModal();
    syncOutOfMovesContinueModalUi();
    onUpdateStepsHud?.();
    onShowCommentary?.(`+${outOfMovesContinueMoves} moves`, 1000);
  }

  function triggerOutOfMovesContinueFlow() {
    if (state.outOfMovesContinuePending || state.outOfMovesContinueOpen || state.gameOver) return;
    if (state.outOfMovesContinueUsedInLevel) {
      onEndGame?.(`Level ${state.currentLevelIndex + 1} failed: out of moves`, { showOutOfMovesBanner: true });
      return;
    }

    state.pointerDown = false;
    state.levelTransitioning = true;
    state.outOfMovesContinuePending = true;
    onClearQueuedSelections?.();
    onResetTrail?.();
    playOutOfMovesBanner(() => {
      openOutOfMovesContinueModal();
    });
  }

  function bindOutOfMovesContinueModal() {
    ensureOutOfMovesContinueElements();

    outOfMovesContinueBuyEl?.addEventListener("click", () => {
      onPlayUiClick?.();
      continueAfterOutOfMoves();
    });

    outOfMovesContinueCloseEl?.addEventListener("click", () => {
      onPlayUiClick?.();
      resolveOutOfMovesAsLose();
    });
  }

  return {
    ensureOutOfMovesContinueElements,
    bindOutOfMovesContinueModal,
    hideOutOfMovesBanner,
    playOutOfMovesBanner,
    syncOutOfMovesContinueModalUi,
    hideOutOfMovesContinueModal,
    triggerOutOfMovesContinueFlow,
  };
}
