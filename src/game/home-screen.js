export function createHomeScreenController({
  state,
  elements,
  levels,
  colors,
  homeEasyColorIds,
  homeMediumColorId,
  homeHardColorId,
  clampLevelIndex,
  staminaMax,
  formatCountdownMmSs,
  getStaminaRecoverCountdownMs,
  onSyncStaminaUi,
  onSettleStaminaRecovery,
  onSetGameHudVisible,
  onHideHomeSettingsModal,
  getRenderer,
  getTrail,
  screenToWorld,
  createHomeBubbleEntity,
  scene,
  bubbleBaseRadius,
  onPlayUiClick,
  onShowCommentary,
} = {}) {
  const homeBubbles = [];
  const homeBubbleBounds = { left: -999, right: 999, top: 999, bottom: -999 };

  function setupHomeFloatBubbles() {
    if (!elements.homeScreenEl) return;

    let layer = elements.homeScreenEl.querySelector("#home-float-layer");
    if (!(layer instanceof HTMLElement)) {
      layer = document.createElement("div");
      layer.id = "home-float-layer";
      layer.setAttribute("aria-hidden", "true");
      elements.homeScreenEl.prepend(layer);
    }

    if (layer.childElementCount > 0) return;

    const bubbleCount = 16;
    for (let i = 0; i < bubbleCount; i += 1) {
      const bubble = document.createElement("span");
      bubble.className = "home-float-bubble";

      const size = 10 + Math.random() * 32;
      const left = 4 + Math.random() * 92;
      const duration = 9 + Math.random() * 10;
      const delay = -Math.random() * duration;
      const drift = -18 + Math.random() * 36;
      const alpha = 0.42 + Math.random() * 0.38;

      bubble.style.setProperty("--size", `${size.toFixed(1)}px`);
      bubble.style.setProperty("--left", `${left.toFixed(2)}%`);
      bubble.style.setProperty("--dur", `${duration.toFixed(2)}s`);
      bubble.style.setProperty("--delay", `${delay.toFixed(2)}s`);
      bubble.style.setProperty("--drift", `${drift.toFixed(1)}px`);
      bubble.style.setProperty("--alpha", alpha.toFixed(2));

      layer.appendChild(bubble);
    }
  }

  function getHomeEnergyTipEl() {
    if (!elements.homeEnergyStatusEl) return null;
    let tipEl = elements.homeEnergyStatusEl.querySelector(".home-energy-tip");
    if (tipEl instanceof HTMLElement) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "home-energy-tip";
    elements.homeEnergyStatusEl.appendChild(tipEl);
    return tipEl;
  }

  function getHomeCenterTipEl() {
    if (!elements.homeScreenEl) return null;
    let tipEl = elements.homeScreenEl.querySelector(".home-center-tip");
    if (tipEl instanceof HTMLElement) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "home-center-tip";
    elements.homeScreenEl.appendChild(tipEl);
    return tipEl;
  }

  function hideHomeCenterTip() {
    if (state.homeCenterTipTimer) {
      window.clearTimeout(state.homeCenterTipTimer);
      state.homeCenterTipTimer = 0;
    }
    const tipEl = getHomeCenterTipEl();
    if (tipEl) {
      tipEl.classList.remove("show");
    }
  }

  function showHomeCenterTip(text, durationMs = 1200) {
    const tipEl = getHomeCenterTipEl();
    if (!tipEl) return;
    hideHomeCenterTip();
    tipEl.textContent = text;
    tipEl.classList.add("show");
    state.homeCenterTipTimer = window.setTimeout(() => {
      tipEl.classList.remove("show");
      state.homeCenterTipTimer = 0;
    }, durationMs);
  }

  function hideHomeEnergyRecoverTip() {
    if (state.staminaTipHideTimer) {
      window.clearTimeout(state.staminaTipHideTimer);
      state.staminaTipHideTimer = 0;
    }
    if (state.staminaTipTickTimer) {
      window.clearInterval(state.staminaTipTickTimer);
      state.staminaTipTickTimer = 0;
    }
    const tipEl = getHomeEnergyTipEl();
    if (tipEl) {
      tipEl.classList.remove("show");
    }
  }

  function refreshHomeEnergyRecoverTipText() {
    onSettleStaminaRecovery?.();
    const tipEl = getHomeEnergyTipEl();
    if (!tipEl) return;

    if (state.stamina >= staminaMax) {
      hideHomeEnergyRecoverTip();
      return;
    }

    const leftMs = getStaminaRecoverCountdownMs();
    tipEl.textContent = `${formatCountdownMmSs(leftMs)}后恢复1点`;
  }

  function showHomeEnergyRecoverTip() {
    const tipEl = getHomeEnergyTipEl();
    if (!tipEl) return;

    hideHomeEnergyRecoverTip();
    refreshHomeEnergyRecoverTipText();
    if (state.stamina >= staminaMax) return;

    tipEl.classList.add("show");
    state.staminaTipTickTimer = window.setInterval(() => {
      refreshHomeEnergyRecoverTipText();
    }, 250);
    state.staminaTipHideTimer = window.setTimeout(() => {
      hideHomeEnergyRecoverTip();
    }, 3000);
  }

  function bindHomeEnergyTip() {
    if (!elements.homeEnergyStatusEl) return;
    elements.homeEnergyStatusEl.addEventListener("click", () => {
      onSettleStaminaRecovery?.();
      onSyncStaminaUi?.();
      if (state.stamina >= staminaMax) return;
      showHomeEnergyRecoverTip();
    });
  }

  function bindHomeLevelButtons() {
    const onTap = (ev) => {
      onPlayUiClick?.();
      const button = ev.currentTarget;
      if (!(button instanceof HTMLElement)) return;

      const raw = Number(button.dataset.levelIndex);
      if (!Number.isInteger(raw) || raw < 0 || raw >= levels.length) return;

      const current = clampLevelIndex(state.currentPlayableLevelIndex);
      if (raw > current) {
        onShowCommentary?.(`第${raw + 1}关尚未解锁`, 900);
        return;
      }

      onShowCommentary?.(`当前可挑战：第${current + 1}关`, 900);
    };

    elements.homeLevelPrevBtn?.addEventListener("click", onTap);
    elements.homeLevelCurrentBtn?.addEventListener("click", onTap);
    elements.homeLevelNextBtn?.addEventListener("click", onTap);
  }

  function renderHomeBubble(button, index, role) {
    if (!button) return;

    if (!Number.isInteger(index) || index < 0 || index >= levels.length) {
      button.dataset.levelIndex = "";
      button.textContent = "";
      button.className = "home-level-bubble";
      button.disabled = true;
      return;
    }

    const level = levels[index];
    const classes = ["home-level-bubble", "live", role];
    if (level.difficulty === "hard") classes.push("hard");
    if (level.difficulty === "medium") classes.push("medium");
    if (role === "upcoming" && index > state.currentPlayableLevelIndex) classes.push("locked");

    button.dataset.levelIndex = String(index);
    button.className = classes.join(" ");
    button.disabled = false;
    button.textContent = String(index + 1);

    const oldTag = button.querySelector(".home-level-tag");
    if (oldTag) oldTag.remove();

    if (level.difficulty === "medium" || level.difficulty === "hard") {
      const tag = document.createElement("span");
      tag.className = `home-level-tag ${level.difficulty}`;
      tag.textContent = level.difficulty === "hard" ? "HARD" : "MED";
      button.appendChild(tag);
    }
  }

  function pickHomeBubbleColorId(level, fallbackIndex) {
    const configured = Math.floor(level?.homeBubbleColorId ?? -1);
    if (configured >= 0 && configured < colors.length) {
      return configured;
    }

    const difficulty = String(level?.difficulty ?? "easy").toLowerCase();
    if (difficulty === "hard") return homeHardColorId;
    if (difficulty === "medium") return homeMediumColorId;

    const step = Math.max(0, Math.floor((level?.id ?? fallbackIndex + 1) - 1));
    return homeEasyColorIds[step % homeEasyColorIds.length];
  }

  function clearHomeBubbles() {
    for (const bubble of homeBubbles) {
      scene.remove(bubble.group);
    }
    homeBubbles.length = 0;
  }

  function rebuildHomeBubbles(specs) {
    if (!getRenderer?.() || !getTrail?.()) return;
    clearHomeBubbles();
    for (let i = 0; i < specs.length; i += 1) {
      const spec = specs[i];
      if (!spec || !spec.anchorEl || !spec.level) continue;
      const colorId = pickHomeBubbleColorId(spec.level, spec.levelIndex);
      const entity = createHomeBubbleEntity({ id: -100 - i, colorId });
      if (!entity) continue;
      entity.homeAnchorEl = spec.anchorEl;
      entity.homeLevelIndex = spec.levelIndex;
      entity.homeColorId = colorId;
      entity.selectRing.visible = false;
      scene.add(entity.group);
      homeBubbles.push(entity);
    }
  }

  function syncHomeBubbleLayout() {
    if (!getRenderer?.() || !state.inHome) return;

    for (const bubble of homeBubbles) {
      const anchor = bubble.homeAnchorEl;
      if (!anchor) continue;

      const rect = anchor.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        bubble.group.visible = false;
        continue;
      }

      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const center = screenToWorld(centerX, centerY);
      const edge = screenToWorld(centerX + rect.width * 0.5, centerY);
      const radius = Math.max(0.32, center.distanceTo(edge));

      bubble.group.visible = true;
      bubble.radius = radius;
      bubble.baseScale = radius / bubbleBaseRadius;
      bubble.bubble.scale.setScalar(bubble.baseScale * bubble.selectionScale);
      bubble.selectRing.scale.setScalar(radius);
      bubble.selectRing.position.z = radius * 0.04;
      bubble.vel.set(0, 0, 0);
      bubble.setPosition(center.x, center.y, 0);
    }
  }

  function updateHomeBubbles(dt) {
    if (!state.inHome || !homeBubbles.length) return;
    syncHomeBubbleLayout();
    for (const bubble of homeBubbles) {
      bubble.update(dt, homeBubbleBounds);
    }
  }

  function renderHomeScreen() {
    onSyncStaminaUi?.();
    const current = clampLevelIndex(state.currentPlayableLevelIndex);
    state.selectedHomeLevelIndex = current;

    const nextIndex = current + 1;
    const next2Index = current + 2;
    renderHomeBubble(elements.homeLevelPrevBtn, current, "current");
    renderHomeBubble(elements.homeLevelCurrentBtn, nextIndex, "upcoming");
    renderHomeBubble(elements.homeLevelNextBtn, next2Index, "upcoming");

    rebuildHomeBubbles([
      { anchorEl: elements.homeLevelPrevBtn, levelIndex: current, level: levels[current] },
      { anchorEl: elements.homeLevelCurrentBtn, levelIndex: nextIndex, level: levels[nextIndex] },
      { anchorEl: elements.homeLevelNextBtn, levelIndex: next2Index, level: levels[next2Index] },
    ]);
  }

  function showHomeScreen() {
    state.inHome = true;
    onSetGameHudVisible?.(false);
    if (elements.homeScreenEl) elements.homeScreenEl.classList.remove("hidden");
    renderHomeScreen();
  }

  function hideHomeScreen() {
    state.inHome = false;
    hideHomeEnergyRecoverTip();
    hideHomeCenterTip();
    onSetGameHudVisible?.(true);
    if (elements.homeScreenEl) elements.homeScreenEl.classList.add("hidden");
    onHideHomeSettingsModal?.();
    clearHomeBubbles();
  }

  return {
    setupHomeFloatBubbles,
    showHomeCenterTip,
    hideHomeCenterTip,
    hideHomeEnergyRecoverTip,
    bindHomeEnergyTip,
    bindHomeLevelButtons,
    updateHomeBubbles,
    renderHomeScreen,
    showHomeScreen,
    hideHomeScreen,
    clearHomeBubbles,
  };
}
