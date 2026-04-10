export function createGameUI({
  sliceStateEl,
  commentaryEl,
  gameOverEl,
  gameOverTitleEl,
  levelWinEl,
  levelWinTitleEl,
  levelWinDescEl,
} = {}) {
  let commentaryTimer = 0;

  function setSliceStatus(text) {
    if (!sliceStateEl) return;
    sliceStateEl.textContent = text;
  }

  function showCommentary(text, durationMs) {
    if (!commentaryEl) return;
    commentaryEl.textContent = text;
    commentaryEl.classList.add("show");
    if (commentaryTimer) clearTimeout(commentaryTimer);
    commentaryTimer = window.setTimeout(() => commentaryEl.classList.remove("show"), durationMs);
  }

  function showLevelWin(currentLevel, nextLevel) {
    if (!levelWinEl || !levelWinTitleEl || !levelWinDescEl) return false;
    levelWinTitleEl.textContent = `第${currentLevel}关胜利！`;
    levelWinDescEl.textContent = `彩色泡泡雨已送达，准备进入第${nextLevel}关。`;
    levelWinEl.classList.remove("hidden");
    return true;
  }

  function hideLevelWin() {
    if (levelWinEl) levelWinEl.classList.add("hidden");
  }

  function hideGameOver() {
    if (gameOverEl) gameOverEl.classList.add("hidden");
  }

  function showGameOver(reason) {
    if (gameOverTitleEl) {
      gameOverTitleEl.textContent = reason.startsWith("全部") ? "恭喜通关！" : "本局结束";
    }
    if (gameOverEl) gameOverEl.classList.remove("hidden");
  }

  return {
    setSliceStatus,
    showCommentary,
    showLevelWin,
    hideLevelWin,
    hideGameOver,
    showGameOver,
  };
}
