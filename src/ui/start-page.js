export function createStartPageController({
  startBtn,
  restartBtn,
  onPlayUiClick,
  onStart,
} = {}) {
  function bindStartActions() {
    const handleStart = () => {
      onPlayUiClick?.();
      onStart?.();
    };

    startBtn?.addEventListener("click", handleStart);
    restartBtn?.addEventListener("click", handleStart);
  }

  return {
    bindStartActions,
  };
}
