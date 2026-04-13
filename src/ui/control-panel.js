export function createControlPanel({
  rootEl,
  toggleBtn,
  closeBtn,
  saveBtn,
  resetBtn,
  fields,
  getCurrentSettings,
  onApply,
  onSave,
} = {}) {
  function open() {
    rootEl?.classList.remove("hidden");
  }

  function close() {
    rootEl?.classList.add("hidden");
  }

  function readFormValues() {
    return {
      resultOffsetX: Number(fields.resultOffsetX?.value ?? 0),
      resultOffsetY: Number(fields.resultOffsetY?.value ?? 0),
      resultScale: Number(fields.resultScale?.value ?? 1),
      buttonOffsetY: Number(fields.buttonOffsetY?.value ?? 0),
      maskOpacity: Number(fields.maskOpacity?.value ?? 0.55),
    };
  }

  function writeFormValues(settings = {}) {
    if (fields.resultOffsetX) fields.resultOffsetX.value = String(settings.resultOffsetX ?? 0);
    if (fields.resultOffsetY) fields.resultOffsetY.value = String(settings.resultOffsetY ?? 0);
    if (fields.resultScale) fields.resultScale.value = String(settings.resultScale ?? 1);
    if (fields.buttonOffsetY) fields.buttonOffsetY.value = String(settings.buttonOffsetY ?? 0);
    if (fields.maskOpacity) fields.maskOpacity.value = String(settings.maskOpacity ?? 0.55);
  }

  function syncFromCurrent() {
    writeFormValues(getCurrentSettings?.() || {});
  }

  function bindLiveInput(field) {
    if (!field) return;
    field.addEventListener("input", () => {
      onApply?.(readFormValues());
    });
  }

  bindLiveInput(fields.resultOffsetX);
  bindLiveInput(fields.resultOffsetY);
  bindLiveInput(fields.resultScale);
  bindLiveInput(fields.buttonOffsetY);
  bindLiveInput(fields.maskOpacity);

  toggleBtn?.addEventListener("click", () => {
    if (rootEl?.classList.contains("hidden")) {
      syncFromCurrent();
      open();
    } else {
      close();
    }
  });

  closeBtn?.addEventListener("click", close);
  rootEl?.addEventListener("click", (event) => {
    if (event.target === rootEl) close();
  });

  saveBtn?.addEventListener("click", () => {
    onSave?.(readFormValues());
    close();
  });

  resetBtn?.addEventListener("click", () => {
    const reset = {
      resultOffsetX: 0,
      resultOffsetY: 0,
      resultScale: 1,
      buttonOffsetY: 0,
      maskOpacity: 0.55,
    };
    writeFormValues(reset);
    onApply?.(reset);
  });

  return {
    syncFromCurrent,
    close,
    open,
  };
}
