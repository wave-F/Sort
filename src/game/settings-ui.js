export function readGameSettings({ storageKey, defaultSettings } = {}) {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...defaultSettings };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return {
      musicEnabled: Boolean(parsed.musicEnabled ?? defaultSettings.musicEnabled),
      sfxEnabled: Boolean(parsed.sfxEnabled ?? defaultSettings.sfxEnabled),
    };
  } catch (_err) {
    return { ...defaultSettings };
  }
}

export function createSettingsUiController({
  elements,
  gameSettings,
  defaultGameSettings,
  storageKey,
  gameAudio,
  gameUI,
  onFillStaminaToMax,
  onClearGameplayDataOnly,
  onExitGameplayToHome,
} = {}) {
  function saveGameSettings() {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(storageKey, JSON.stringify(gameSettings));
  }

  function applyGameSettings() {
    gameAudio.setMusicEnabled(gameSettings.musicEnabled);
    gameAudio.setSfxEnabled(gameSettings.sfxEnabled);
  }

  function syncSettingsUi() {
    if (elements.settingMusicToggleEl) elements.settingMusicToggleEl.checked = gameSettings.musicEnabled;
    if (elements.settingSfxToggleEl) elements.settingSfxToggleEl.checked = gameSettings.sfxEnabled;
  }

  function showHomeSettingsModal() {
    syncSettingsUi();
    elements.homeSettingsModalEl?.classList.remove("hidden");
  }

  function hideHomeSettingsModal() {
    elements.homeSettingsModalEl?.classList.add("hidden");
  }

  function setGameplaySettingsMenuOpen(open) {
    if (!elements.gameplaySettingsRootEl) return;
    const isOpen = Boolean(open);
    elements.gameplaySettingsRootEl.classList.toggle("open", isOpen);
    elements.gameplaySettingsMaskEl?.classList.toggle("hidden", !isOpen);
  }

  function hideGameplaySettingsMenu() {
    setGameplaySettingsMenuOpen(false);
  }

  function showGameplayExitModal() {
    hideGameplaySettingsMenu();
    elements.gameplayExitMaskEl?.classList.remove("hidden");
    elements.gameplayExitModalEl?.classList.remove("hidden");
  }

  function hideGameplayExitModal() {
    elements.gameplayExitMaskEl?.classList.add("hidden");
    elements.gameplayExitModalEl?.classList.add("hidden");
  }

  function syncGameplaySettingsButtons() {
    if (elements.gameplaySettingsMusicEl) {
      elements.gameplaySettingsMusicEl.classList.toggle("is-off", !gameSettings.musicEnabled);
      elements.gameplaySettingsMusicEl.setAttribute("aria-label", gameSettings.musicEnabled ? "Music on" : "Music off");
    }
    if (elements.gameplaySettingsSfxEl) {
      elements.gameplaySettingsSfxEl.classList.toggle("is-off", !gameSettings.sfxEnabled);
      elements.gameplaySettingsSfxEl.setAttribute("aria-label", gameSettings.sfxEnabled ? "SFX on" : "SFX off");
    }
  }

  function bindGameplaySettingsMenu() {
    if (!elements.gameplaySettingsRootEl || !elements.gameplaySettingsToggleEl) return;

    syncGameplaySettingsButtons();
    elements.gameplaySettingsToggleEl.addEventListener("click", (ev) => {
      ev.stopPropagation();
      gameAudio.playUiClickAudio();
      const isOpen = elements.gameplaySettingsRootEl.classList.contains("open");
      setGameplaySettingsMenuOpen(!isOpen);
    });

    elements.gameplaySettingsMusicEl?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      gameAudio.playUiClickAudio();
      gameSettings.musicEnabled = !gameSettings.musicEnabled;
      saveGameSettings();
      applyGameSettings();
      syncSettingsUi();
      syncGameplaySettingsButtons();
    });

    elements.gameplaySettingsSfxEl?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      gameAudio.playUiClickAudio();
      gameSettings.sfxEnabled = !gameSettings.sfxEnabled;
      saveGameSettings();
      applyGameSettings();
      syncSettingsUi();
      syncGameplaySettingsButtons();
    });

    elements.gameplaySettingsExitEl?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      gameAudio.playUiClickAudio();
      showGameplayExitModal();
    });

    elements.gameplaySettingsMaskEl?.addEventListener("click", () => {
      hideGameplaySettingsMenu();
    });

    elements.gameplayExitMaskEl?.addEventListener("click", () => {
      hideGameplayExitModal();
    });

    elements.gameplayExitCloseEl?.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      hideGameplayExitModal();
    });

    elements.gameplayExitCancelEl?.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      hideGameplayExitModal();
    });

    elements.gameplayExitConfirmEl?.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      hideGameplayExitModal();
      onExitGameplayToHome?.();
    });

    window.addEventListener("pointerdown", (ev) => {
      if (!elements.gameplaySettingsRootEl.classList.contains("open")) return;
      const target = ev.target;
      if (target instanceof Node && (elements.gameplaySettingsRootEl.contains(target) || elements.gameplaySettingsMaskEl?.contains(target))) return;
      hideGameplaySettingsMenu();
    });
  }

  function bindHomeSettingsModal() {
    if (!elements.homeSettingsBtn || !elements.homeSettingsModalEl) return;

    syncSettingsUi();

    elements.homeSettingsBtn.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      showHomeSettingsModal();
    });
    elements.homeSettingsCloseBtn?.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      hideHomeSettingsModal();
    });

    elements.homeSettingsModalEl.addEventListener("click", (ev) => {
      if (ev.target === elements.homeSettingsModalEl) {
        gameAudio.playUiClickAudio();
        hideHomeSettingsModal();
      }
    });

    elements.settingMusicToggleEl?.addEventListener("change", () => {
      gameSettings.musicEnabled = Boolean(elements.settingMusicToggleEl.checked);
      saveGameSettings();
      applyGameSettings();
      syncGameplaySettingsButtons();
      gameUI.showCommentary("Music setting saved", 1000);
    });

    elements.settingSfxToggleEl?.addEventListener("change", () => {
      gameSettings.sfxEnabled = Boolean(elements.settingSfxToggleEl.checked);
      saveGameSettings();
      applyGameSettings();
      syncGameplaySettingsButtons();
    });

    elements.homeFillStaminaBtn?.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      onFillStaminaToMax?.();
      gameUI.showCommentary("Test stamina: refilled to max", 1000);
    });

    elements.homeClearDataBtn?.addEventListener("click", () => {
      gameAudio.playUiClickAudio();
      const ok = typeof window !== "undefined" ? window.confirm("Clear level progress, coins, and settings?") : true;
      if (!ok) return;

      gameSettings.musicEnabled = defaultGameSettings.musicEnabled;
      gameSettings.sfxEnabled = defaultGameSettings.sfxEnabled;
      onClearGameplayDataOnly?.();
      hideHomeSettingsModal();
    });
  }

  return {
    saveGameSettings,
    applyGameSettings,
    syncSettingsUi,
    showHomeSettingsModal,
    hideHomeSettingsModal,
    setGameplaySettingsMenuOpen,
    hideGameplaySettingsMenu,
    showGameplayExitModal,
    hideGameplayExitModal,
    syncGameplaySettingsButtons,
    bindGameplaySettingsMenu,
    bindHomeSettingsModal,
  };
}
