# Bubble Pop Audio Pack

This folder stores the production bubble pop sounds used by the game.

## Runtime usage

- Source list is managed in `src/main.js` via `popSoundFiles`.
- The game preloads all files on first interaction and plays one random file per pop event.

## Files

- `oga-pop1.ogg`
- `oga-pop2.ogg`
- `oga-pop3.ogg`
- `oga-pop4.ogg`
- `oga-pop5.ogg`
- `oga-pop6.ogg`
- `oga-pop7.ogg`
- `oga-pop8.ogg`
- `oga-pop9.ogg`
- `oga-pop10.ogg`

## Build integration

- Capacitor build copies this folder to `www/assets/audio/pop`.
- Standalone build copies this folder to `dist/assets/audio/pop`.
