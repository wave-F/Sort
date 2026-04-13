import * as THREE from "three/webgpu";

export function createGameAudio({ popSoundUrls = [], selectScaleFrequencies = [] } = {}) {
  const state = {
    context: null,
    unlocked: false,
    loadingPromise: null,
    popBuffers: [],
    selectStep: 0,
    selectLastAt: 0,
    selectNoiseBuffer: null,
    musicEnabled: true,
    sfxEnabled: true,
  };

  function setMusicEnabled(next) {
    state.musicEnabled = Boolean(next);
  }

  function setSfxEnabled(next) {
    state.sfxEnabled = Boolean(next);
  }

  function ensureAudioUnlocked() {
    if (typeof window === "undefined") return false;
    if (!window.AudioContext && !window.webkitAudioContext) return false;

    if (!state.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      state.context = new AudioContextCtor();
    }

    if (state.context.state === "suspended") {
      void state.context.resume();
    }

    state.unlocked = state.context.state === "running";
    return state.unlocked;
  }

  async function decodeAudioBuffer(ctx, arrayBuffer) {
    if (ctx.decodeAudioData.length === 1) {
      return ctx.decodeAudioData(arrayBuffer);
    }
    return new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  async function preloadPopAudio() {
    if (!ensureAudioUnlocked()) return;
    if (state.popBuffers.length) return;
    if (state.loadingPromise) {
      await state.loadingPromise;
      return;
    }

    state.loadingPromise = (async () => {
      const ctx = state.context;
      const tasks = popSoundUrls.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          if (!res.ok) return null;
          const arr = await res.arrayBuffer();
          const buffer = await decodeAudioBuffer(ctx, arr);
          return buffer;
        } catch (_err) {
          return null;
        }
      });

      const decoded = await Promise.all(tasks);
      state.popBuffers = decoded.filter(Boolean);
    })();

    await state.loadingPromise;
  }

  function playRandomPopAudio() {
    if (!state.sfxEnabled) return;
    if (!ensureAudioUnlocked()) return;
    const ctx = state.context;
    const buffers = state.popBuffers;
    if (!ctx || !buffers.length) return;

    const buffer = buffers[Math.floor(Math.random() * buffers.length)];
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = THREE.MathUtils.lerp(0.94, 1.08, Math.random());

    const gain = ctx.createGain();
    gain.gain.value = THREE.MathUtils.lerp(0.2, 0.33, Math.random());

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  function resetSelectToneProgression() {
    state.selectStep = 0;
    state.selectLastAt = 0;
  }

  function getSelectNoiseBuffer(ctx) {
    if (state.selectNoiseBuffer) return state.selectNoiseBuffer;
    const length = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    state.selectNoiseBuffer = buffer;
    return buffer;
  }

  function playSelectTone() {
    if (!state.sfxEnabled) return;
    if (!ensureAudioUnlocked()) return;
    const ctx = state.context;
    if (!ctx) return;

    const nowMs = performance.now();
    if (nowMs - state.selectLastAt < 22) return;
    state.selectLastAt = nowMs;

    const noteIndex = Math.min(state.selectStep, selectScaleFrequencies.length - 1);
    const freq = selectScaleFrequencies[noteIndex];
    state.selectStep = Math.min(state.selectStep + 1, selectScaleFrequencies.length - 1);

    const now = ctx.currentTime;
    const attack = 0.003;
    const release = 0.165;
    const endAt = now + attack + release;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.108, now + attack);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(freq * 1.11, now);
    body.frequency.exponentialRampToValueAtTime(freq, now + 0.055);

    const sparkle = ctx.createOscillator();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(freq * 1.76, now);
    sparkle.frequency.exponentialRampToValueAtTime(freq * 1.42, now + 0.06);

    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.8;
    const sparkleGain = ctx.createGain();
    sparkleGain.gain.value = 0.055;

    const toneColor = ctx.createBiquadFilter();
    toneColor.type = "lowpass";
    toneColor.frequency.value = 1750;
    toneColor.Q.value = 0.22;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = getSelectNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 920;
    noiseFilter.Q.value = 0.45;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.008, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    const safety = ctx.createBiquadFilter();
    safety.type = "highpass";
    safety.frequency.value = 120;

    body.connect(bodyGain);
    sparkle.connect(sparkleGain);
    bodyGain.connect(masterGain);
    sparkleGain.connect(masterGain);
    masterGain.connect(toneColor);
    toneColor.connect(safety);
    safety.connect(ctx.destination);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(safety);

    body.start(now);
    sparkle.start(now);
    noiseSource.start(now);
    body.stop(endAt + 0.012);
    sparkle.stop(endAt);
    noiseSource.stop(now + 0.042);
  }

  return {
    ensureAudioUnlocked,
    preloadPopAudio,
    setMusicEnabled,
    setSfxEnabled,
    playRandomPopAudio,
    resetSelectToneProgression,
    playSelectTone,
  };
}
