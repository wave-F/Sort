# Architecture Overview

This project is moving from a single-file game loop to a modular runtime while preserving existing feel and behavior.

## Runtime Composition

Main entry is still `src/main.js`, but systems are now created through `createGameRuntime()`.

Current runtime modules:

- `src/flow/level-flow.js`
  - Level clear delay
  - Per-level win flow
  - Win overlay timing and continue behavior

- `src/systems/collision-system.js`
  - Bubble collision broadphase (grid)
  - Contact resolution and velocity response

- `src/systems/slice-system.js`
  - Slice segment processing
  - Candidate filtering + raycast top-hit logic
  - Color-lock / break-slice behavior

- `src/systems/victory-rain-system.js`
  - Win bubble-rain effect
  - Pooling, spawn, update, reset

- `src/systems/burst-system.js`
  - Pop burst micro-bubbles
  - Global pool management and update

- `src/ui/game-ui.js`
  - Slice status text
  - Commentary text + timer
  - Win and game-over overlays

- `src/audio/game-audio.js`
  - Audio unlock and preload
  - Pop SFX playback
  - Select tone progression and synth

- `src/content/level-runtime.js`
  - Level runtime normalization
  - Procedural spawn generation
  - Runtime level cache and cache invalidation hooks

## Data/Domain

- Level data source: `src/config/levels.json`
- Level schema normalization: `src/levels.js`
- Runtime level construction/cache: `src/content/level-runtime.js`

## Update Order (Per Frame)

1. Trail update
2. Pending pop scheduling
3. Collision system
4. Burst system
5. Level flow victory effect update
6. Bubble entity update
7. Render
8. Level clear / fail checks

## Extension Rules

When adding new gameplay features:

1. Prefer adding a new module under `src/systems/` or `src/flow/`
2. Keep `src/main.js` as orchestration and wiring
3. Avoid modifying gameplay constants unless feature explicitly requires it
4. Preserve existing interaction feel (slice hit rules, collision response)

## Next Recommended Refactors

1. Add lightweight perf instrumentation per system
2. Consider splitting `BubbleEntity` into render + state parts
3. Add integration tests for slice/collision/level-flow invariants
