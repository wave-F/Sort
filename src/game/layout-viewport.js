import * as THREE from "three/webgpu";

export function createLayoutViewportController({
  elements,
  constants,
  camera,
  bounds,
  rules,
  levelRuntime,
  getRenderer,
  onHideGameplaySettingsMenu,
  onHideGameplayExitModal,
} = {}) {
  function applyHomeUiTuning(values) {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--home-energy-text-size", `${values.energyTextSize}px`);
    rootStyle.setProperty("--home-energy-text-x", `${values.energyTextX}px`);
    rootStyle.setProperty("--home-energy-text-y", `${values.energyTextY}px`);
    rootStyle.setProperty("--home-coin-text-size", `${values.coinTextSize}px`);
    rootStyle.setProperty("--home-coin-icon-x", `${values.coinIconX}px`);
    rootStyle.setProperty("--home-coin-icon-y", `${values.coinIconY}px`);
    rootStyle.setProperty("--home-coin-text-x", `${values.coinTextX}px`);
    rootStyle.setProperty("--home-coin-text-y", `${values.coinTextY}px`);
  }

  function applyUiLayoutDebugTuning(values) {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--dbg-win-width", `${values.winWidth}px`);
    rootStyle.setProperty("--dbg-win-height", `${values.winHeight}px`);
    rootStyle.setProperty("--dbg-win-x", `${values.winX}px`);
    rootStyle.setProperty("--dbg-win-y", `${values.winY}px`);
    rootStyle.setProperty("--dbg-win-scale", String(values.winScale));
    rootStyle.setProperty("--dbg-title-y", `${values.titleY}px`);
    rootStyle.setProperty("--dbg-title-scale", String(values.titleScale));
    rootStyle.setProperty("--dbg-perfect-y", `${values.perfectY}px`);
    rootStyle.setProperty("--dbg-perfect-scale", String(values.perfectScale));
    rootStyle.setProperty("--dbg-reward-y", `${values.rewardY}px`);
    rootStyle.setProperty("--dbg-reward-scale", String(values.rewardScale));
    rootStyle.setProperty("--dbg-coin-num-x", `${values.coinNumX}px`);
    rootStyle.setProperty("--dbg-coin-num-y", `${values.coinNumY}px`);
    rootStyle.setProperty("--dbg-actions-y", `${values.actionsY}px`);
    rootStyle.setProperty("--dbg-continue-scale", String(values.continueScale));

    const winCardEl = elements.resultPageEl?.querySelector?.(".result-card.is-win");
    if (winCardEl instanceof HTMLElement) {
      winCardEl.style.width = `min(90%, calc(350px + ${values.winWidth}px))`;
      winCardEl.style.minHeight = `calc(452px + ${values.winHeight}px)`;
      winCardEl.style.transform = `translate(${values.winX}px, ${values.winY}px) scale(${values.winScale})`;
    }

    const perfectEl = elements.resultPageEl?.querySelector?.(".result-card.is-win .result-win-perfect");
    if (perfectEl instanceof HTMLElement) {
      perfectEl.style.transform = `translateY(${values.perfectY}px) scale(${values.perfectScale})`;
    }

    const titleEl = elements.resultPageEl?.querySelector?.(".result-card.is-win .result-title");
    if (titleEl instanceof HTMLElement) {
      titleEl.style.transform = `translateY(${values.titleY}px) scale(${values.titleScale})`;
    }

    const rewardStackEl = elements.resultPageEl?.querySelector?.(".result-card.is-win .result-reward-stack");
    if (rewardStackEl instanceof HTMLElement) {
      rewardStackEl.style.transform = `translateY(${values.rewardY}px) scale(${values.rewardScale})`;
    }

    const actionsEl = elements.resultPageEl?.querySelector?.(".result-card.is-win .result-actions");
    if (actionsEl instanceof HTMLElement) {
      actionsEl.style.transform = `translateY(${values.actionsY}px)`;
    }

    const coinNumEl = elements.resultPageEl?.querySelector?.(".result-card.is-win .result-coin-gain");
    if (coinNumEl instanceof HTMLElement) {
      coinNumEl.style.transform = `translate(${values.coinNumX}px, ${values.coinNumY}px)`;
    }

    const continueBtnEl = elements.resultPageEl?.querySelector?.(".result-card.is-win #result-next-btn");
    if (continueBtnEl instanceof HTMLElement) {
      continueBtnEl.style.transform = `scale(${values.continueScale})`;
    }
  }

  function applyHudDebugTuning(values) {
    document.documentElement.style.setProperty("--hud-level-offset-x", `${values.hudLevelOffsetX}px`);
  }

  function setGameHudVisible(visible) {
    const hidden = !visible;
    elements.hudEl?.classList.toggle("hidden", hidden);
    elements.gameplayTopbarEl?.classList.toggle("hidden", hidden);
    elements.gameplayTopbarEl?.classList.remove("is-floating-over-result");
    elements.gameplayCoinStatusEl?.classList.toggle("hidden", hidden);
    elements.gameplayCoinStatusEl?.classList.toggle("is-hidden-in-gameplay", visible);
    elements.gameplaySettingsRootEl?.classList.toggle("hidden", hidden);
    elements.gameplaySettingsMaskEl?.classList.toggle("hidden", true);
    elements.gameplayExitMaskEl?.classList.toggle("hidden", true);
    elements.gameplayExitModalEl?.classList.toggle("hidden", true);
    if (hidden) {
      onHideGameplaySettingsMenu?.();
      onHideGameplayExitModal?.();
    }
    elements.commentaryEl?.classList.add("hidden");
    elements.sliceStateEl?.classList.add("hidden");
    if (hidden) {
      elements.levelTestPanelEl?.classList.add("hidden");
    }
  }

  function updatePhoneAspect() {
    if (!elements.phoneFrameEl) return;

    const visualViewport = window.visualViewport;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    if (!viewportWidth || !viewportHeight) return;

    const rawAspect = viewportWidth / viewportHeight;
    const shouldLockToIphonePreview = viewportWidth >= constants.desktopAspectSwitchWidth;
    const targetAspect = shouldLockToIphonePreview
      ? constants.iphoneAspectBase
      : THREE.MathUtils.clamp(rawAspect, constants.portraitAspectMin, constants.portraitAspectMax);

    const framePadding = 24;
    const maxFrameWidth = 470;
    const availableWidth = Math.max(280, viewportWidth - framePadding);
    const availableHeight = Math.max(560, viewportHeight - framePadding);
    const widthByHeight = availableHeight * targetAspect;
    const frameWidth = Math.min(maxFrameWidth, availableWidth, widthByHeight);
    const frameHeight = frameWidth / targetAspect;
    const uiScale = THREE.MathUtils.clamp(frameHeight / 932, 0.76, 1.06);
    const compactWidthScale = frameWidth <= 330
      ? 0.85
      : frameWidth <= 360
        ? 0.9
        : frameWidth <= 430
          ? 0.96
          : 1;
    const fontScale = THREE.MathUtils.clamp(compactWidthScale * (0.96 + (uiScale - 0.9) * 0.22), 0.82, 1.05);
    const spaceScale = THREE.MathUtils.clamp(compactWidthScale * (0.98 + (uiScale - 0.9) * 0.2), 0.84, 1.04);
    const titleScale = THREE.MathUtils.clamp(fontScale * (frameWidth <= 360 ? 0.95 : 1), 0.8, 1.03);
    const labelScale = THREE.MathUtils.clamp(fontScale * 0.97, 0.82, 1.04);

    let homeLevelBoost = 1.5;
    if (rawAspect <= 0.48) homeLevelBoost = 1.5;
    else if (rawAspect <= 0.52) homeLevelBoost = 1.3;
    else if (rawAspect <= 0.58) homeLevelBoost = 1.2;

    if (viewportHeight < 700) homeLevelBoost = Math.min(homeLevelBoost, 1.2);
    if (viewportHeight < 620) homeLevelBoost = 1.1;

    const homeLevelOffsetY = Math.round(16 * uiScale * (homeLevelBoost - 1));

    document.documentElement.style.setProperty("--phone-aspect-live", `${targetAspect}`);
    document.documentElement.style.setProperty("--phone-frame-width", `${frameWidth.toFixed(2)}px`);
    document.documentElement.style.setProperty("--ui-scale", `${uiScale.toFixed(4)}`);
    document.documentElement.style.setProperty("--font-scale", `${fontScale.toFixed(4)}`);
    document.documentElement.style.setProperty("--space-scale", `${spaceScale.toFixed(4)}`);
    document.documentElement.style.setProperty("--title-scale", `${titleScale.toFixed(4)}`);
    document.documentElement.style.setProperty("--label-scale", `${labelScale.toFixed(4)}`);
    document.documentElement.style.setProperty("--home-level-boost", `${homeLevelBoost.toFixed(2)}`);
    document.documentElement.style.setProperty("--home-level-offset-y", `${homeLevelOffsetY}px`);
  }

  function resize() {
    updatePhoneAspect();
    const renderer = getRenderer?.();
    if (!renderer) {
      return;
    }
    const rect = elements.appEl.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);

    const aspect = rect.width / rect.height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    const worldHalfH = rules.worldHeight / 2;
    const worldHalfW = worldHalfH * aspect;
    bounds.left = -worldHalfW + rules.playAreaInset;
    bounds.right = worldHalfW - rules.playAreaInset;
    bounds.top = worldHalfH - rules.playAreaInset;
    bounds.bottom = -worldHalfH + rules.playAreaInset;
    levelRuntime.clearCache();
  }

  return {
    applyHomeUiTuning,
    applyUiLayoutDebugTuning,
    applyHudDebugTuning,
    setGameHudVisible,
    updatePhoneAspect,
    resize,
  };
}
