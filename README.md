# Fruit Slice MVP (WebGPU + Three.js)

Minimal playable prototype:

- Fruits are pre-placed in the scene.
- Player slices via mouse/touch drag.
- Hit fruit swaps from whole mesh to two halves.
- Halves split, spin, and spawn a short juice particle burst.

## Run

Use any static server in this folder.

```bash
python3 -m http.server 4173
```

Then open:

`http://localhost:4173`

## Notes

- Requires a browser with WebGPU support.
- Core logic lives in `src/main.js`.
