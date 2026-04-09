# HapticForWeb

iOS CoreHaptics / AHAP haptic feedback for web and Capacitor apps.

Two independent packages — use whichever fits your project:

## Which package?

| Your project | Use | Install |
|-------------|-----|---------|
| **Capacitor 8 iOS app** | `capacitor-haptic-plugin` | `npm install capacitor-haptic-plugin && npx cap sync` |
| **Any web project** (no Capacitor) | `haptic-module` | `<script src="haptic-module.js">` or `npm install haptic-module` |
| **Both** | Install each separately | They are independent, no shared dependency |

## Packages

### [haptic-module/](./haptic-module/)

Zero-dependency JavaScript module. Works anywhere via `<script>` tag.

- iOS Capacitor: full CoreHaptics (requires native plugin)
- Android: `navigator.vibrate()` fallback
- Desktop: silent no-op

```javascript
HapticModule.init();
HapticModule.impact('light');
await HapticModule.playFile('./assets/damage.ahap');
```

### [capacitor-haptic-plugin/](./capacitor-haptic-plugin/)

Standard Capacitor 8 native plugin. `npm install + cap sync` — zero manual config.

- iOS: CoreHaptics with full AHAP/HAHAP support
- Web/Android: automatic `navigator.vibrate()` fallback
- TypeScript definitions included

```typescript
import { CustomHaptics } from 'capacitor-haptic-plugin';
await CustomHaptics.impact({ style: 'light' });
await CustomHaptics.playPattern({ ahapJson: '...' });
```

## Using Both Packages Together (Capacitor iOS)

For a Capacitor iOS project that wants the convenience of `haptic-module`'s unified API with full native CoreHaptics:

```bash
npm install haptic-module capacitor-haptic-plugin
npx cap sync
```

```javascript
// haptic-module auto-detects the native plugin at runtime
await HapticModule.init();
// All three tiers now use CoreHaptics on iOS
HapticModule.impact('heavy');
await HapticModule.playFile('./assets/damage.ahap');
await HapticModule.playBundled('damage');
```

`haptic-module` detects `capacitor-haptic-plugin` via `window.Capacitor.Plugins.CustomHaptics` — no manual wiring required.

## AHAP File Deployment

Both packages include 5 preset AHAP files in their `assets/` directories. In a Capacitor project:

- **`playFile(url)`** — Fetches the file via HTTP from your web assets. Place `.ahap`/`.hahap` files alongside your HTML (e.g. `assets/damage.ahap`). They are served by Capacitor's built-in web server automatically after `cap sync`.

- **`playBundled(name)`** — Reads directly from the iOS app bundle (lowest latency). The plugin searches the Capacitor web assets directory (`public/assets/`) automatically, so files deployed via `cap sync` are found without manual Xcode configuration. You can also add files to Xcode's **Copy Bundle Resources** or an `ahap/` subdirectory for explicit control.

## Features

- 3 tiers: UIFeedbackGenerator presets / CoreHaptics parametric / AHAP file playback
- `.ahap` and `.hahap` file support (identical format, both recognized)
- 5 preset haptic patterns included
- Automatic platform detection and graceful fallback
- All assets bundled locally — no network requests, App Store safe

## License

MIT
