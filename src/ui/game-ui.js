import { createResultPage } from "./result-page.js";
import { createCoinStatus } from "./coin-status.js";
import { createCoinFly } from "./coin-fly.js";

export function createGameUI({
  sliceStateEl,
  commentaryEl,
  gameOverEl,
  gameOverTitleEl,
  resultPage,
  coinStatus,
  coinFly,
  onResultRetry,
  onResultNext,
  onResultBack,
} = {}) {
  let commentaryTimer = 0;

  const result = createResultPage({
    ...(resultPage || {}),
    onRetry: onResultRetry,
    onNext: onResultNext,
    onBack: onResultBack,
  });
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
    if (!commentaryEl) return;
    commentaryEl.textContent = text;
    commentaryEl.classList.add("show");
    if (commentaryTimer) clearTimeout(commentaryTimer);
    commentaryTimer = window.setTimeout(() => commentaryEl.classList.remove("show"), durationMs);
  }

  function showGameOver(reason = "本局结束") {
    if (gameOverTitleEl) gameOverTitleEl.textContent = reason;
    gameOverEl?.classList.remove("hidden");
  }

  function hideGameOver() {
    gameOverEl?.classList.add("hidden");
  }

  function setCoins(value) {
    coins.setCoins(value);
  }

  function openResult(outcome, options) {
    result.openResult(outcome, options);
  }

  function closeResult() {
    result.closeResult();
  }

  function getResultRewardRect() {
    return result.getRewardAnchorRect();
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
    setCoins,
    openResult,
    closeResult,
    playCoinFly,
    isCoinFlyPlaying,
    getCoinAnchorRect,
    getResultRewardRect,
  };
}
