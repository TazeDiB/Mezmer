# Pattern Stacks and Randomization

## Concept

Each gallery **wall** and **floating object** has an independent **stack** — four pattern layers plus global visual/color modes. Stacks are separate from the main 2D canvas layer config in App `params`.

Global layer **speed** params (turing, flow, symmetry offset, etc.) from App still drive time integration on gallery surfaces. Stack data chooses **which patterns and colors** each surface uses.

## Wall stacks

**Module:** `src/lib/galleryStack.js`

```javascript
export const GALLERY_FACE_COUNT = 6;
export const DEFAULT_GALLERY_WALL_STACKS = [ /* six stack objects */ ];
```

Each stack:

```javascript
{
  timeOffset: number,        // added to per-face integrated time
  uvScale: number,
  visualMode: string,        // e.g. 'glow', 'crt', 'hologram'
  globalColorMode: string,   // e.g. 'fire', 'cyberpunk'
  forceGlobalColor: boolean,
  layers: [
    {
      patternType: string,
      colorMode: string,
      symmetry: number,
      // optional: blendTargetType, blendAmount, distortion, ...
    },
    // ... 4 layers
  ],
}
```

Face index order: **+x, -x, +y, -y, +z, -z** (Three.js BoxGeometry).

## Floating object stacks

**Module:** `src/lib/galleryFloatingObjects.js`

Same structure as walls. Three defaults in `DEFAULT_FLOATING_OBJECT_STACKS` (cube, cone, sphere themes).

Layers include explicit `blendAmount` on float stacks (walls inherit from global layer config during apply).

## Applying stacks to shader

### Walls

```javascript
applyGalleryWallStack(u_layers, faceIndex, patternNameToIndex, colorModeIndex, globalParams, time, blendSpeed);
applyGalleryWallModes(shaderUniforms, faceIndex, colorModeIndex, visualModeIndex, time, blendSpeed);
```

### Floats

```javascript
applyFloatingObjectStack(...);
applyFloatingObjectModes(...);
```

Both copy layer fields into the shared `u_layers` uniform array via `copyLayerParamsToUniform()`.

## Per-surface time state

Separate from stack config — integrated each frame in `useWebGL`:

**Walls:** `galleryFaceState[gf]`

```javascript
{
  integrated: number,
  symmetry: [4 values],
  times: [{ turing, spiralNoise, flow, cube, smoothSpiral }, ...×4 layers],
}
```

**Floats:** `galleryFloatingState[oi]` — same shape, different seeds.

Seeds: `GALLERY_FACE_SEEDS`, `FLOATING_OBJECT_SEEDS`.

## Transitions

Smooth crossfade between stack configs:

```javascript
startGalleryWallTransition(toStacks, blendSpeedFactor);
startFloatingObjectTransition(toStacks, blendSpeedFactor);
```

Duration from `getGalleryTransitionDuration(blendSpeedFactor)` (~2500ms base / speed factor).

During transition:

- `getGalleryWallStacksForRender()` / `getFloatingObjectStacksForRender()` interpolate stacks
- `isGalleryContentTransitionActive()` → true
- All surfaces render every frame until transition completes

## Warmup

```javascript
markGalleryWarmup();
// next gallery frame: consumeGalleryWarmupRequest() → render all faces + floats
```

Triggered by randomize, first init, transitions.

## Randomization API

**Entry:** `randomizeGalleryWallStacks()` in `src/lib/randomizer.js`

**Profiles:** `src/lib/textureRandomize.js`

| Profile | Effect |
|---------|--------|
| `wall` | Randomize one or more wall stacks |
| `shape` | Randomize floating object stacks |
| `gallery` | Full gallery randomize (walls + floats) |

**How to randomize:** use the Controls **Randomize All** button (`onRandomize` in `App.jsx`, which calls `randomizeGalleryWallStacks()`), or enable **Auto Randomize** in the panel. **RMB** randomizes mouse FX only. **Space** is not randomize — in 3D gallery mode it moves the camera up (with **E**); see [3d-mode-lifecycle.md](./3d-mode-lifecycle.md).

Gallery stack randomize can run while 3D is off; stacks update in memory and the visual change applies on the next gallery session or warmup.

## Stack mutation API

| Function | Action |
|----------|--------|
| `getGalleryWallStacks()` | Current active wall stacks |
| `setGalleryWallStacks(stacks)` | Replace wall stacks |
| `resetGalleryWallStacks()` | Restore defaults |
| `getFloatingObjectStacks()` | Current float stacks |
| `setFloatingObjectStacks(stacks)` | Replace float stacks |
| `resetFloatingObjectStacks()` | Restore defaults |

## Presets integration

**Module:** `src/lib/presets.js` — `PRESET_VERSION = 2`

| Version | Payload |
|---------|---------|
| v1 (legacy) | No `version` field; layers + globals only |
| v2 | `version: 2`, `galleryWallStacks` (6), `floatingObjectStacks` (3) |

- **Encode:** `encodePreset({ ...params, galleryWallStacks, floatingObjectStacks })` — App passes stacks from `getGalleryWallStacks()` / `getFloatingObjectStacks()`.
- **Decode:** v1 codes load canvas params only; v2 validates stack shape via `validateGalleryStacks()` and rejects invalid payloads.
- **Apply:** `applyGalleryStacksFromPreset(decoded)` calls `setGalleryWallStacks` / `setFloatingObjectStacks` and `markGalleryWarmup()` when stacks are present.

Share URLs (`#seed=…`) round-trip full gallery appearance on v2 presets.

## Tuning constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `GALLERY_FACES_PER_FRAME` | 2 | Wall RT updates per frame |
| `FLOATING_OBJECTS_PER_FRAME` | 1 | Float RT updates per frame |
| `GALLERY_RENDER_SCALE` | 0.5 | Wall RT vs canvas size |
| `FLOATING_OBJECT_RENDER_SCALE` | 0.32 | Float RT vs canvas min dim |

Increase per-frame counts for fresher patterns at higher GPU cost.
