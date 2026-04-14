import { createCoinStatus } from "./coin-status.js";
import { createCoinFly } from "./coin-fly.js";

export function createGameUI({
  sliceStateEl,
  levelGuideEl,
  levelGuideHandEl,
  levelGuideTipEl,
  gameOverEl,
  gameOverTitleEl,
  resultController,
  coinStatus,
  coinFly,
} = {}) {
  const result = resultController;
  const coins = createCoinStatus(coinStatus);
  const fly = createCoinFly({
    ...(coinFly || {}),
    getTargetRect: () => coins.getAnchorRect(),
  });

  function setSliceStatus(text) {
    if (!sliceStateEl) return;
    sliceStateEl.textContent = text;
  }

  function showCommentary(text, durationMs = 1200) {
    void text;
    void durationMs;
  }

  function showGameOver(reason = "本局结束") {
    if (gameOverTitleEl) gameOverTitleEl.textContent = reason;
    gameOverEl?.classList.remove("hidden");
  }

  function showLevelGuide() {
    if (!levelGuideEl) return;
    levelGuideEl.classList.remove("hidden");
    levelGuideHandEl?.classList.remove("hidden");
  }

  function hideLevelGuide() {
    levelGuideTipEl?.classList.remove("show");
    levelGuideEl?.classList.add("hidden");
  }

  function setLevelGuidePosition(x, y, scale = 1) {
    if (!levelGuideHandEl) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    levelGuideHandEl.style.left = `${x.toFixed(2)}px`;
    levelGuideHandEl.style.top = `${y.toFixed(2)}px`;
    levelGuideHandEl.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
  }

  function setLevelGuideHandVisible(visible) {
    levelGuideHandEl?.classList.toggle("hidden", !visible);
  }

  function showLevelGuideTip(text, mode = "bubble") {
    if (!levelGuideTipEl) return;
    levelGuideTipEl.textContent = text;
    const warning = mode === "warning";
    levelGuideTipEl.classList.toggle("is-warning", warning);
    if (warning) {
      levelGuideTipEl.style.left = "";
      levelGuideTipEl.style.top = "";
    }
    levelGuideTipEl.classList.add("show");
  }

  function hideLevelGuideTip() {
    levelGuideTipEl?.classList.remove("show");
  }

  function setLevelGuideTipPosition(x, y) {
    if (!levelGuideTipEl) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    levelGuideTipEl.style.left = `${x.toFixed(2)}px`;
    levelGuideTipEl.style.top = `${y.toFixed(2)}px`;
  }

  function hideGameOver() {
    gameOverEl?.classList.add("hidden");
  }

  function setCoins(value) {
    coins.setCoins(value);
  }

  function openResult(outcome, options) {
    result?.openResult(outcome, options);
  }

  function closeResult() {
    result?.closeResult();
  }

  function getResultRewardRect() {
    return result?.getRewardAnchorRect?.() ?? null;
  }

  function playCoinFly(reward, options = {}) {
    fly.playCoinFly(reward, options);
  }

  function isCoinFlyPlaying() {
    return fly.isPlaying();
  }

  function getCoinAnchorRect() {
    return coins.getAnchorRect();
  }

  return {
    setSliceStatus,
    showCommentary,
    showGameOver,
    hideGameOver,
    showLevelGuide,
    hideLevelGuide,
    setLevelGuidePosition,
    setLevelGuideHandVisible,
    showLevelGuideTip,
    hideLevelGuideTip,
    setLevelGuideTipPosition,
    setCoins,
    openResult,
    closeResult,
    playCoinFly,
    isCoinFlyPlaying,
    getCoinAnchorRect,
    getResultRewardRect,
  };
}
