# iOS Mobile Adaptation Guide

This project uses a unified iOS-first adaptation entry so all pages scale consistently on iPhone notch screens.

## Unified Entry

- Entry function: `updatePhoneAspect()` in `src/main.js`
- It updates:
  - `--phone-aspect-live`: live frame aspect ratio
  - `--ui-scale`: global UI scale factor based on live frame height
- Trigger points:
  - `init()`
  - `resize()`
  - `visualViewport` resize and scroll listeners

## Core CSS Contract

All page-level UI should be based on these variables in `:root`:

- `--safe-top/right/bottom/left` for notch and home indicator safe areas
- `--phone-aspect-live` for frame geometry
- `--ui-scale` for component sizing

Recommended pattern:

```css
.component {
  font-size: clamp(12px, calc(14px * var(--ui-scale)), 16px);
  padding: clamp(8px, calc(10px * var(--ui-scale)), 12px);
}
```

## Home Screen Rules

- Home level bubbles and PLAY button must not use fixed-only px sizes.
- Use variables:
  - `--home-level-size`
  - `--home-level-size-current`
  - `--home-level-gap`
  - `--home-level-strip-min-h`
  - `--home-play-font`
  - `--home-play-pad-x/y`
  - `--home-play-margin-top`
- Keep notch spacing by always adding `var(--safe-*)` to edge padding.

## Data-Safety Rule for Reset

When implementing "clear data":

- Clear only gameplay data keys:
  - `fruit_level_progress_v1`
  - `fruit_coin_balance_v1`
  - `fruit_game_settings_v1`
- Never clear tuning keys:
  - `fruit_home_ui_tuning_v1`
  - `bubble_tuning_v1`

## QA Checklist (iPhone-first)

- iPhone 16 Pro Max class (tall)
- iPhone 15/14 class (standard notch)
- iPhone SE class (short screen)
- Safari address bar expanded/collapsed
- Orientation stays portrait-only behavior as expected

## Future Development Requirement

For new overlays/pages/components:

1. Bind size/spacing to `--ui-scale`
2. Respect `--safe-*` in edge layout
3. Avoid hardcoded layout-critical px values without `clamp()`
