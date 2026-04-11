import { createStartScreen } from "./start-screen.js";
import { createResultPage } from "./result-page.js";
import { createCoinStatus } from "./coin-status.js";
import { createCoinFly } from "./coin-fly.js";

export function createGameUI({
  sliceStateEl,
  commentaryEl,
  startScreen,
  resultPage,
  coinStatus,
  coinFly,
  levelCount,
} = {}) {
  let commentaryTimer = 0;

  const start = createStartScreen(startScreen);
  const result = createResultPage(resultPage);
  const coins = createCoinStatus(coinStatus);
  const fly = createCoinFly(coinFly);

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

  function setCoins(value) {
    coins.setCoins(value);
  }

  function showStartScreen(meta = {}) {
    start.setMeta({ levelCount, ...meta });
    start.show();
  }

  function hideStartScreen() {
    start.hide();
  }

  function openResult(outcome, options) {
    result.openResult(outcome, options);
  }

  function closeResult() {
    result.closeResult();
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
    setCoins,
    showStartScreen,
    hideStartScreen,
    openResult,
    closeResult,
    playCoinFly,
    isCoinFlyPlaying,
    getCoinAnchorRect,
    getSelectedLevelIndex: start.getSelectedLevelIndex,
    updateStartMeta: start.setMeta,
  };
}
