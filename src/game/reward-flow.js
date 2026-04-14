export function createRewardFlow({
  state,
  coinStorageKey,
  levelWinRewardBase,
  getGameUI,
  homeCoinEl,
  onSetResultCoinTopbarVisible,
} = {}) {
  function persistCoinBalance() {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(coinStorageKey, String(Math.max(0, Math.floor(state.coins))));
  }

  function syncCoinUi() {
    const safe = Math.max(0, Math.floor(state.coins));
    const gameUI = getGameUI();
    gameUI?.setCoins(safe);
    if (homeCoinEl) homeCoinEl.textContent = String(safe);
  }

  function addCoins(value) {
    const gain = Math.max(0, Math.floor(value));
    if (gain <= 0) return;
    state.coins += gain;
    persistCoinBalance();
    syncCoinUi();
  }

  function trySpendCoins(cost) {
    const safeCost = Math.max(0, Math.floor(cost));
    if (safeCost <= 0) return true;
    if (state.coins < safeCost) return false;
    state.coins = Math.max(0, state.coins - safeCost);
    persistCoinBalance();
    syncCoinUi();
    return true;
  }

  function getLevelWinReward(levelIndex) {
    void levelIndex;
    return levelWinRewardBase;
  }

  function setGameplayCoinTopbarVisible(show) {
    onSetResultCoinTopbarVisible?.(show);
  }

  function settlePendingWinReward(playFx = false) {
    if (state.rewardAppliedThisRound) return;
    const reward = Math.max(0, Math.floor(state.pendingWinReward));
    if (reward <= 0) {
      state.rewardAppliedThisRound = true;
      return;
    }

    state.rewardAppliedThisRound = true;
    state.pendingWinReward = 0;
    addCoins(reward);

    const gameUI = getGameUI();
    if (!playFx || !gameUI || gameUI.isCoinFlyPlaying()) return;

    const originRect = gameUI.getResultRewardRect();
    setGameplayCoinTopbarVisible(true);
    gameUI.playCoinFly(reward, {
      originRect,
      onDone: () => {
        setGameplayCoinTopbarVisible(false);
      },
    });

    if (!gameUI.isCoinFlyPlaying()) {
      setGameplayCoinTopbarVisible(false);
    }
  }

  function playWinCoinFly() {
    settlePendingWinReward(true);
  }

  return {
    persistCoinBalance,
    syncCoinUi,
    addCoins,
    trySpendCoins,
    getLevelWinReward,
    setGameplayCoinTopbarVisible,
    settlePendingWinReward,
    playWinCoinFly,
  };
}
