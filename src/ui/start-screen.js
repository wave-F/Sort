export function createStartScreen({
  rootEl,
  ladderEl,
  startBtn,
  onStart,
} = {}) {
  let selectedLevelIndex = 0;
  let maxPassedLevel = 1;
  let levelCount = 1;

  function getWindowStart(total, currentLevel) {
    const visibleCount = Math.min(5, total);
    const maxStart = Math.max(1, total - visibleCount + 1);
    if (currentLevel < 3) return 1;
    if (currentLevel > total - 3) return maxStart;
    return Math.min(maxStart, currentLevel - 2);
  }

  function renderLadder() {
    if (!ladderEl) return;
    ladderEl.innerHTML = "";
    const nextLevel = Math.min(levelCount, Math.max(1, maxPassedLevel));
    const startLevel = getWindowStart(levelCount, nextLevel);
    const visibleCount = Math.min(5, levelCount);

    for (let i = 0; i < visibleCount; i += 1) {
      const levelNumber = startLevel + i;
      const unlocked = levelNumber <= maxPassedLevel;
      const button = document.createElement("button");
      button.type = "button";
      const isCurrent = levelNumber === nextLevel;
      button.className = `start-ladder-node${isCurrent ? " is-selected" : ""}`;
      button.textContent = String(levelNumber);
      button.disabled = !unlocked;
      if (!unlocked) button.classList.add("is-locked");
      if (levelNumber < maxPassedLevel) button.classList.add("is-cleared");
      ladderEl.appendChild(button);
    }

    selectedLevelIndex = Math.max(0, nextLevel - 1);
  }

  function show() {
    if (rootEl) rootEl.classList.remove("hidden");
  }

  function hide() {
    if (rootEl) rootEl.classList.add("hidden");
  }

  function setMeta({ levelCount: nextLevelCount, maxPassedLevel: nextMaxPassedLevel, selectedLevelIndex: nextSelectedLevelIndex } = {}) {
    if (Number.isInteger(nextLevelCount) && nextLevelCount > 0) {
      levelCount = nextLevelCount;
    }
    if (Number.isInteger(nextMaxPassedLevel) && nextMaxPassedLevel > 0) {
      maxPassedLevel = Math.min(levelCount, nextMaxPassedLevel);
    }
    if (Number.isInteger(nextSelectedLevelIndex) && nextSelectedLevelIndex >= 0 && nextMaxPassedLevel === undefined) {
      selectedLevelIndex = Math.min(levelCount - 1, nextSelectedLevelIndex);
    }

    if (selectedLevelIndex + 1 > maxPassedLevel) {
      selectedLevelIndex = Math.max(0, maxPassedLevel - 1);
    }

    renderLadder();
  }

  function getSelectedLevelIndex() {
    return selectedLevelIndex;
  }

  startBtn?.addEventListener("click", () => {
    onStart?.(getSelectedLevelIndex());
  });

  return {
    show,
    hide,
    setMeta,
    getSelectedLevelIndex,
  };
}
