# capacitor-haptic-plugin

Capacitor 8 plugin for iOS CoreHaptics. Supports UIFeedbackGenerator presets, parametric CoreHaptics control, and custom AHAP/HAHAP file playback.

On non-iOS platforms, automatically falls back to `navigator.vibrate()` (Android) or silent no-op (Desktop).

## Install

```bash
npm install capacitor-haptic-plugin
npx cap sync
```

That's it. No AppDelegate changes, no Info.plist edits, no Storyboard modifications.

### Capacitor 8 SPM Note

This plugin ships with a root-level `Package.swift` for Capacitor 8's Swift Package Manager integration. The package name is `CapacitorHapticPlugin` (matching Capacitor's PascalCase convention from the npm name). If you see a warning like `does not have a Package.swift` during `cap sync`, make sure you are using the latest version of this plugin.

## Usage

```typescript
import { CustomHaptics } from 'capacitor-haptic-plugin';

// Check support
const { haptics } = await CustomHaptics.checkSupport();

// Tier 1 — System presets
await CustomHaptics.impact({ style: 'light' });       // light | medium | heavy | rigid | soft
await CustomHaptics.notification({ type: 'success' }); // success | warning | error
await CustomHaptics.selection();

// Tier 2 — CoreHaptics parametric
await CustomHaptics.playTransient({ intensity: 0.8, sharpness: 0.5 });
await CustomHaptics.playContinuous({ intensity: 0.6, sharpness: 0.3, duration: 0.5 });

// Tier 3 — AHAP / HAHAP file
await CustomHaptics.playPattern({ ahapJson: JSON.stringify(myPattern) });
await CustomHaptics.playBundled({ name: 'damage' });

// Stop
await CustomHaptics.stop();
```

## AHAP Files

`.ahap` and `.hahap` files use identical JSON format following [Apple's AHAP spec](https://developer.apple.com/documentation/corehaptics/representing-haptic-patterns-in-ahap-files).

### Included presets (in `assets/`)

| File | Pattern |
|------|---------|
| `tap.ahap` | Single transient pulse |
| `cardSwap.hahap` | Double pulse with fade |
| `damage.ahap` | Impact + sustained decay curve |
| `cabo.hahap` | Triple escalating pulses |
| `suddenDeath.ahap` | Intense pulse sequence + rumble |

### Playing AHAP from file

```typescript
// Fetch the file, pass JSON string to native
const response = await fetch('./assets/damage.ahap');
const ahapJson = await response.text();
await CustomHaptics.playPattern({ ahapJson });
```

### Playing from iOS Bundle

`playBundled` searches for the file in this order:

1. `ahap/` subdirectory in the app bundle (both `.ahap` and `.hahap`)
2. Root of the app bundle (both extensions)
3. `public/assets/` — the Capacitor web assets directory (both extensions)

Since `cap sync` automatically copies your web assets into `public/`, AHAP files in your project's web asset directory are found automatically without manual Xcode configuration.

You can also place files manually in Xcode's **Copy Bundle Resources** for more control.

```typescript
await CustomHaptics.playBundled({ name: 'damage' }); // Reads damage.ahap or damage.hahap from Bundle
```

> **Web/Android fallback**: On non-iOS platforms, `playBundled` falls back to a single `navigator.vibrate(20)` pulse since the native bundle is not accessible. Use `playPattern` with fetched JSON for cross-platform AHAP playback.

## API

### `checkSupport()`

```typescript
checkSupport() => Promise<{ haptics: boolean; audio: boolean }>
```

### `impact(options?)`

```typescript
impact(options?: { style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' }) => Promise<void>
```

### `notification(options?)`

```typescript
notification(options?: { type?: 'success' | 'warning' | 'error' }) => Promise<void>
```

### `selection()`

```typescript
selection() => Promise<void>
```

### `playTransient(options?)`

```typescript
playTransient(options?: { intensity?: number; sharpness?: number }) => Promise<void>
```

- **intensity** — 0.0 ~ 1.0 (strength)
- **sharpness** — 0.0 ~ 1.0 (crispness)

### `playContinuous(options?)`

```typescript
playContinuous(options?: { intensity?: number; sharpness?: number; duration?: number }) => Promise<void>
```

### `playPattern(options)`

```typescript
playPattern(options: { ahapJson: string }) => Promise<void>
```

### `playBundled(options)`

```typescript
playBundled(options: { name: string }) => Promise<void>
```

### `stop()`

```typescript
stop() => Promise<void>
```

## Platform Support

| Platform | Engine | Capability |
|----------|--------|-----------|
| iOS Capacitor (iPhone 8+) | CoreHaptics | Full AHAP + parametric control |
| Android / Web | `navigator.vibrate()` | Duration-based approximation |
| Desktop / iOS Safari | Silent | No-op |

## Requirements

- Capacitor 8.x
- iOS 14+
- Real device for testing (Simulator has no Taptic Engine)

## License

MIT
