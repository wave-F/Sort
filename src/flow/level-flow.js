export function createLevelFlowController({
  levelCount,
  isStarted,
  isGameOver,
  isLevelTransitioning,
  setLevelTransitioning,
  getCurrentLevelIndex,
  onAllLevelsCleared,
  onPrepareLevelWin,
  onVictoryFxStart,
  onVictoryFxUpdate,
  onShowLevelWinOverlay,
  onHideLevelWinOverlay,
  onContinueToLevel,
  showCommentary,
  clearDelayMs = 500,
  overlayDelaySec = 1.12,
} = {}) {
  let levelClearReadyAt = 0;
  let victoryFxActive = false;
  let victoryFxElapsed = 0;
  let victoryUiShown = false;
  let pendingNextLevelIndex = -1;

  function reset() {
    levelClearReadyAt = 0;
    victoryFxActive = false;
    victoryFxElapsed = 0;
    victoryUiShown = false;
    pendingNextLevelIndex = -1;
    onHideLevelWinOverlay?.();
  }

  function updateVictory(dt) {
    if (!victoryFxActive || isGameOver?.()) return;

    victoryFxElapsed += dt;
    onVictoryFxUpdate?.(dt);

    if (!victoryUiShown && victoryFxElapsed >= overlayDelaySec) {
      victoryUiShown = true;
      const current = (getCurrentLevelIndex?.() ?? 0) + 1;
      const next = pendingNextLevelIndex + 1;
      const shown = onShowLevelWinOverlay?.(current, next) === true;
      if (!shown) continueToNextLevel();
    }
  }

  function updateLevelClear(now, remainingCount) {
    if (isStarted?.() && !isGameOver?.() && !isLevelTransitioning?.() && remainingCount === 0) {
      if (levelClearReadyAt <= 0) {
        levelClearReadyAt = now + clearDelayMs;
      } else if (now >= levelClearReadyAt) {
        handleLevelCleared();
        return true;
      }
    } else {
      levelClearReadyAt = 0;
    }

    return false;
  }

  function handleLevelCleared() {
    if (isGameOver?.() || isLevelTransitioning?.()) return;

    const justCleared = getCurrentLevelIndex?.() ?? 0;
    const next = justCleared + 1;
    const lastLevel = next >= levelCount;

    if (lastLevel) {
      onAllLevelsCleared?.(levelCount);
      return;
    }

    setLevelTransitioning?.(true);
    levelClearReadyAt = 0;
    onPrepareLevelWin?.();
    beginLevelWinSequence(justCleared, next);
  }

  function beginLevelWinSequence(justCleared, nextLevelIndex) {
    victoryFxActive = true;
    victoryFxElapsed = 0;
    victoryUiShown = false;
    pendingNextLevelIndex = nextLevelIndex;

    onVictoryFxStart?.();
    showCommentary?.(`第${justCleared + 1}关胜利！泡泡雨喷发中...`, 1300);
  }

  function continueToNextLevel() {
    if (!isStarted?.() || isGameOver?.()) return;
    const next = pendingNextLevelIndex;
    if (!Number.isInteger(next) || next < 0 || next >= levelCount) return;

    onHideLevelWinOverlay?.();
    victoryFxActive = false;
    victoryFxElapsed = 0;
    victoryUiShown = false;
    onContinueToLevel?.(next);
  }

  return {
    reset,
    updateVictory,
    updateLevelClear,
    continueToNextLevel,
  };
}
