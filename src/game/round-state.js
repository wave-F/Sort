export function createRoundStateController({
  state,
  fruits,
  scene,
  burstSystem,
  victoryRainSystem,
  getTrail,
  slicePopStaggerStep,
  onPlayPopAudio,
} = {}) {
  function clearQueuedSelections() {
    for (let i = 0; i < state.sliceQueue.length; i += 1) {
      const fruit = state.sliceQueue[i].fruit;
      if (fruit) fruit.setSelected(false);
    }
    state.sliceQueue.length = 0;
    state.sliceHitIds.clear();
  }

  function settleQueuedSlices() {
    if (!state.sliceQueue.length) return;

    let gain = 0;
    for (let i = 0; i < state.sliceQueue.length; i += 1) {
      const entry = state.sliceQueue[i];
      const fruit = entry.fruit;
      if (!fruit || !fruit.active || fruit.sliced) continue;

      fruit.setSelected(false);
      state.pendingPops.push({
        fruit,
        sliceDir: entry.sliceDir,
        speed: entry.speed,
        delay: gain * slicePopStaggerStep,
      });
      gain += 1;
    }

    clearQueuedSelections();
  }

  function processPendingPops(dt) {
    if (!state.pendingPops.length) return;
    for (let i = 0; i < state.pendingPops.length; ) {
      const item = state.pendingPops[i];
      item.delay -= dt;
      if (item.delay > 0) {
        i += 1;
        continue;
      }

      const fruit = item.fruit;
      if (fruit && fruit.active && !fruit.sliced) {
        fruit.pop(item.sliceDir, item.speed);
        onPlayPopAudio?.();
      }
      state.pendingPops.splice(i, 1);
    }
  }

  function clearBoardEntities() {
    burstSystem.clear();
    state.pendingPops.length = 0;
    clearQueuedSelections();
    for (const fruit of fruits) scene.remove(fruit.group);
    fruits.length = 0;
    victoryRainSystem.reset();
    getTrail?.()?.reset();
  }

  return {
    clearQueuedSelections,
    settleQueuedSlices,
    processPendingPops,
    clearBoardEntities,
  };
}
