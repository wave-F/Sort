# haptic-module

Zero-dependency haptic feedback module for web. Supports three tiers:

1. **UIFeedbackGenerator** presets (impact / notification / selection)
2. **CoreHaptics** parametric control (playTransient / playContinuous)
3. **AHAP / HAHAP** file playback (playFile / playPattern / playBundled)

## Install

```bash
npm install haptic-module
```

Or use directly via `<script>`:

```html
<script src="haptic-module.js"></script>
```

## Usage

```javascript
// Initialize once
await HapticModule.init();

// Tier 1 — System presets
HapticModule.impact('light');           // light | medium | heavy | rigid | soft
HapticModule.notification('success');   // success | warning | error
HapticModule.selection();

// Tier 2 — Parametric control
HapticModule.playTransient({ intensity: 0.8, sharpness: 0.5 });
HapticModule.playContinuous({ intensity: 0.6, sharpness: 0.3, duration: 0.5 });

// Tier 3 — AHAP / HAHAP files
await HapticModule.playFile('./assets/damage.ahap');
await HapticModule.playFile('./assets/cabo.hahap');
await HapticModule.playPattern({ Version: 1.0, Pattern: [...] });

// Control
HapticModule.stop();
HapticModule.setEnabled(false);
```

## Platform Support

| Platform | Backend | Capability |
|----------|---------|-----------|
| iOS Capacitor App (with `capacitor-haptic-plugin`) | `corehaptics` | Full CoreHaptics + AHAP |
| Android Chrome/Firefox | `vibration` | `navigator.vibrate()` approximation |
| iOS Safari / Desktop | `none` | Silent no-op |

## AHAP File Format

`.ahap` and `.hahap` files are identical in format (JSON), following [Apple's AHAP spec](https://developer.apple.com/documentation/corehaptics/representing-haptic-patterns-in-ahap-files).

```json
{
  "Version": 1.0,
  "Pattern": [
    {
      "Event": {
        "Time": 0.0,
        "EventType": "HapticTransient",
        "EventParameters": [
          { "ParameterID": "HapticIntensity", "ParameterValue": 0.8 },
          { "ParameterID": "HapticSharpness", "ParameterValue": 0.6 }
        ]
      }
    }
  ]
}
```

## Included Assets

| File | Pattern |
|------|---------|
| `tap.ahap` | Single transient pulse |
| `cardSwap.hahap` | Double pulse with fade |
| `damage.ahap` | Impact + sustained decay curve |
| `cabo.hahap` | Triple escalating pulses |
| `suddenDeath.ahap` | Intense pulse sequence + rumble |

## API

| Method | Description |
|--------|------------|
| `HapticModule.init()` | Initialize, detect platform. Returns `{backend, haptics}` |
| `HapticModule.impact(style)` | Impact feedback |
| `HapticModule.notification(type)` | Notification feedback |
| `HapticModule.selection()` | Selection feedback |
| `HapticModule.playTransient({intensity, sharpness})` | Single transient haptic |
| `HapticModule.playContinuous({intensity, sharpness, duration})` | Sustained haptic |
| `HapticModule.playFile(url)` | Load and play .ahap/.hahap file |
| `HapticModule.playPattern(json)` | Play AHAP JSON object directly |
| `HapticModule.playBundled(name)` | Play from iOS Bundle (native only, see below) |
| `HapticModule.stop()` | Stop current haptic |
| `HapticModule.setEnabled(bool)` | Global toggle (persisted to localStorage) |
| `HapticModule.isEnabled` | Whether haptics are currently enabled |
| `HapticModule.isSupported` | Whether current platform has haptic capability |
| `HapticModule.backend` | `'corehaptics'` \| `'vibration'` \| `'none'` |

## Using with Capacitor (iOS CoreHaptics)

`haptic-module` works standalone on any web page, but for full iOS CoreHaptics support it needs the native bridge provided by [`capacitor-haptic-plugin`](../capacitor-haptic-plugin/).

```bash
# 1. Install both packages in your Capacitor project
npm install haptic-module
npm install capacitor-haptic-plugin
npx cap sync
```

At runtime, `HapticModule.init()` automatically detects Capacitor via `window.Capacitor.Plugins.CustomHaptics`. No extra wiring needed — if the native plugin is installed, all three tiers work at full fidelity.

## playBundled — Prerequisites

`playBundled(name)` reads `.ahap` / `.hahap` files directly from the iOS app bundle via the native plugin. This is the lowest-latency path but requires the files to be present in the bundle.

In a Capacitor project, AHAP files placed in your web assets directory (e.g. `assets/`) are automatically copied to the app bundle during `cap sync`, so `playBundled` can find them without manual Xcode configuration.

On non-iOS platforms, `playBundled` falls back to a single 20 ms vibration pulse via `navigator.vibrate()` since the native bundle is not accessible.

## License

MIT
