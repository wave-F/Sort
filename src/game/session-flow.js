import * as THREE from "three/webgpu";

export function createSessionFlowController({
  state,
  fruits,
  colors,
  bounds,
  scene,
  levelRuntime,
  levelFlow,
  gameAudio,
  gameUI,
  burstSystem,
  victoryRainSystem,
  getTrail,
  clampLevelIndex,
  hasBubbleTuningOverride,
  onHideOutOfMovesBanner,
  onTryConsumeStaminaForLevelEntry,
  onSettlePendingWinReward,
  onRestoreStaminaAfterFailedEntry,
  onShowHomeScreen,
  onHideHomeScreen,
  onShowHomeCenterTip,
  onSetLevelTestSelection,
  onUpdateStepsHud,
  onClearQueuedSelections,
  onPlayOutOfMovesBanner,
  onClearBoardEntities,
  onPersistLevelProgress,
  onBackHomeFromResult,
  onAfterLevelLoaded,
  createBubbleEntity,
} = {}) {
  function grantLevelWinProgress(nextLevelIndex) {
    const justCleared = state.currentLevelIndex;
    state.highestPassedLevelIndex = Math.max(state.highestPassedLevelIndex, justCleared);
    state.currentPlayableLevelIndex = clampLevelIndex(nextLevelIndex);
    state.selectedHomeLevelIndex = state.currentPlayableLevelIndex;
    onPersistLevelProgress?.();
  }

  function resetFruits(level) {
    burstSystem.clear();
    state.pendingPops.length = 0;
    for (const fruit of fruits) scene.remove(fruit.group);
    fruits.length = 0;

    const defs = level?.fruits ?? [];
    for (let i = 0; i < defs.length; i += 1) {
      const def = defs[i];
      const colorIndex = THREE.MathUtils.clamp(def.colorId, 0, colors.length - 1);
      const fruit = createBubbleEntity({
        id: i,
        colorId: colorIndex,
        radius: THREE.MathUtils.clamp(def.radius ?? 0.42, 0.84, 1.86),
        vx: def.vx ?? 0,
        vy: def.vy ?? 0,
        baseColor: new THREE.Color(colors[colorIndex].base),
      });
      const spawnMargin = fruit.radius + 0.06;
      fruit.setPosition(
        THREE.MathUtils.clamp(def.x, bounds.left + spawnMargin, bounds.right - spawnMargin),
        THREE.MathUtils.clamp(def.y, bounds.bottom + spawnMargin, bounds.top - spawnMargin),
        0
      );
      fruits.push(fruit);
      scene.add(fruit.group);
    }

    const lockedBubbles = Array.isArray(level?.lockedBubbles) ? level.lockedBubbles : [];
    for (let i = 0; i < lockedBubbles.length; i += 1) {
      const item = lockedBubbles[i];
      const bubbleIndex = Math.floor(item?.index ?? -1);
      if (bubbleIndex < 0 || bubbleIndex >= fruits.length) continue;
      const target = fruits[bubbleIndex];
      target.setLockRule(item.unlock);
      target.applyTotalClears(state.totalClearsThisLevel ?? 0);
    }
  }

  function loadLevel(index) {
    const level = levelRuntime.getNormalizedLevel(index);
    if (!level) return false;

    state.currentLevelIndex = index;
    state.selectedHomeLevelIndex = index;
    state.activeLevel = level;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.sliceColorId = null;
    state.sliceBroken = false;
    state.sliceCommitted = false;
    gameAudio.resetSelectToneProgression();
    gameUI.hideLevelGuide?.();
    onClearQueuedSelections?.();
    state.pendingPops.length = 0;
    state.totalClearsThisLevel = 0;
    state.lastPoint = null;
    state.nowPoint = null;
    state.stepLimit = Math.max(1, Math.floor(level.stepLimit ?? 1));
    state.stepsUsed = 0;
    state.outOfMovesContinueUsedInLevel = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    levelFlow.reset();
    burstSystem.clear();
    victoryRainSystem.reset();
    onSetLevelTestSelection?.(index);
    onUpdateStepsHud?.();

    getTrail?.()?.reset();
    resetFruits(level);
    onAfterLevelLoaded?.(index, level);
    return true;
  }

  function startGame() {
    onHideOutOfMovesBanner?.();
    if (!onTryConsumeStaminaForLevelEntry?.()) return;
    gameAudio.ensureAudioUnlocked();
    void gameAudio.preloadPopAudio();
    gameAudio.resetSelectToneProgression();

    const startIndex = clampLevelIndex(state.currentPlayableLevelIndex);

    state.started = true;
    state.gameOver = false;
    state.inHome = false;
    state.levelTransitioning = false;
    state.currentLevelIndex = startIndex;
    state.activeLevel = null;
    state.pointerDown = false;
    state.sliceColorId = null;
    state.sliceBroken = false;
    state.sliceCommitted = false;
    onClearQueuedSelections?.();
    state.sliceHitIds.clear();
    state.sliceQueue.length = 0;
    state.pendingPops.length = 0;
    state.totalClearsThisLevel = 0;
    state.lastPoint = null;
    state.nowPoint = null;
    state.stepLimit = 0;
    state.stepsUsed = 0;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    levelFlow.reset();
    burstSystem.clear();
    victoryRainSystem.reset();

    getTrail?.()?.reset();
    onHideHomeScreen?.();
    gameUI.hideGameOver();
    gameUI.closeResult();

    if (hasBubbleTuningOverride) {
      gameUI.showCommentary("Debug tuning synced from the tuning page.", 1300);
    }

    const loaded = loadLevel(startIndex);
    if (!loaded) {
      onRestoreStaminaAfterFailedEntry?.();
      state.started = false;
      state.inHome = true;
      onShowHomeScreen?.();
      gameUI.showCommentary("Level failed to load. Please try again.", 1200);
    }
  }

  function retryCurrentLevelFromResult() {
    if (!state.started) return;
    onHideOutOfMovesBanner?.();
    if (!onTryConsumeStaminaForLevelEntry?.()) {
      gameUI.closeResult();
      state.started = false;
      state.gameOver = false;
      state.levelTransitioning = false;
      state.pointerDown = false;
      state.pendingWinReward = 0;
      state.rewardAppliedThisRound = true;
      onClearBoardEntities?.();
      onShowHomeScreen?.();
      onShowHomeCenterTip?.("Not enough stamina", 1200);
      return;
    }

    gameUI.closeResult();
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    const loaded = loadLevel(state.currentLevelIndex);
    if (!loaded) {
      onRestoreStaminaAfterFailedEntry?.();
      state.started = false;
      onShowHomeScreen?.();
    }
  }

  function backHomeFromResult() {
    onHideOutOfMovesBanner?.();
    onSettlePendingWinReward?.(false);
    gameUI.closeResult();
    gameUI.hideLevelGuide?.();
    state.started = false;
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    onClearBoardEntities?.();
    onShowHomeScreen?.();
  }

  function startNextLevel(nextLevelIndex) {
    onHideOutOfMovesBanner?.();
    if (!onTryConsumeStaminaForLevelEntry?.()) return;
    onSettlePendingWinReward?.(false);
    gameUI.closeResult();
    gameUI.hideLevelGuide?.();
    const next = clampLevelIndex(nextLevelIndex);
    state.started = true;
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    const loaded = loadLevel(next);
    if (!loaded) {
      onRestoreStaminaAfterFailedEntry?.();
      onBackHomeFromResult?.();
    }
  }

  function endGame(reason, options = {}) {
    void reason;
    if (state.gameOver) return;
    state.gameOver = true;
    state.levelTransitioning = false;
    state.pointerDown = false;
    levelFlow.reset();
    burstSystem.clear();
    onClearQueuedSelections?.();
    state.pendingPops.length = 0;
    victoryRainSystem.reset();
    getTrail?.()?.reset();
    gameUI.hideLevelGuide?.();

    const openLoseResult = () => {
      gameAudio.playGameLoseAudio?.();
      gameUI.openResult("lose", {
        level: state.currentLevelIndex + 1,
        score: Math.max(0, state.stepLimit - state.stepsUsed),
        reward: 0,
        canNext: false,
        isFinal: false,
      });
    };

    if (options.showOutOfMovesBanner === true) {
      onPlayOutOfMovesBanner?.(openLoseResult);
      return;
    }

    openLoseResult();
  }

  return {
    grantLevelWinProgress,
    retryCurrentLevelFromResult,
    backHomeFromResult,
    startNextLevel,
    startGame,
    loadLevel,
    resetFruits,
    endGame,
  };
}
