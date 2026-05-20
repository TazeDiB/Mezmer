# Floating Objects

## Overview

Three floating props sit inside the gallery room. Each has:

- Its own **pattern stack** (layers, visual mode, color mode)
- Its own **render target bundle** (feedback, blend output, height map)
- **Flat** and **displaced** materials that share shape-aware sampling logic

## Object definitions

From `useThreeDMode.js` `floatingDefs`:

| Index | Geometry | Position `[x,y,z]` | Phase | Preset |
|-------|----------|-------------------|-------|--------|
| 0 | `BoxGeometry(1.15³, 48³ seg)` | `[-2.4, 1.45, -0.6]` | 0.4 | `box` |
| 1 | `ConeGeometry(0.72, 1.45, 32, 48)` | `[2.15, 1.25, 0.85]` | 2.3 | `cone` |
| 2 | `SphereGeometry(0.82, 48, 36)` | `[0.15, 1.05, 2.35]` | 4.1 | `sphere` |

Created via:

```javascript
createDisplaceableMesh({ geometry, displacementPreset, meshOptions })
addDisplaceableMeshToScene(scene, entry)
```

## Animation

In `threeDStateRef.update(delta)`:

- Vertical bob: `baseY + sin(time * speed + phase) * amplitude`
- Slow Y rotation on each mesh

Phase stored in `mesh.userData.phase`, base height in `mesh.userData.baseY`.

## Pattern stacks

`DEFAULT_FLOATING_OBJECT_STACKS` in `galleryFloatingObjects.js` — three entries mirroring wall stack shape:

```javascript
{
  timeOffset: number,
  uvScale: number,
  visualMode: string,
  globalColorMode: string,
  forceGlobalColor: boolean,
  layers: [ /* 4 layer configs */ ],
}
```

API mirrors walls:

- `getFloatingObjectStacks()` / `setFloatingObjectStacks()`
- `startFloatingObjectTransition(toStacks, blendSpeedFactor)`
- `getFloatingObjectStacksForRender(now, blendSpeedFactor)`
- `isFloatingObjectTransitionActive()`

`isGalleryContentTransitionActive()` returns true if **either** wall or float transition is running → forces full redraw.

## Render targets

`createFloatingObjectTargets()` per object:

| RT | Purpose |
|----|---------|
| `fbA`, `fbB` | Feedback ping-pong (HalfFloat RGBA) |
| `outA`, `outB` | Blend output ping-pong |
| `heightMap` | Luminance height (UnsignedByte) |
| `latestTexture` | Last blend output pointer (critical for binding) |

Resolution: `getFloatingObjectRenderSize()` — square, `max(192, min(canvasW, canvasH) * 0.32)`.

## Rendering one float per frame

`renderFloatingObjectTexture()` in `galleryFloatingObjects.js`:

1. `applyFloatingObjectStack()` — push stack layers into `u_layers`
2. `applyFloatingObjectModes()` — visual mode + global color for this object
3. Set `u_galleryFaceIndex = -1` (flat 2D UV — **not** wall face projection)
4. Set `u_galleryFaceSeed` from `FLOATING_OBJECT_SEEDS[oi]`
5. Run feedback + `blend.frag` passes into object's RTs
6. Return `latestTexture` for binding

In `useWebGL.js`, only **one** float index updates per frame unless warmup/transition (same round-robin pattern as walls).

## Material differences by shape

| Preset | Flat material | Displaced material | Sampling |
|--------|---------------|-------------------|----------|
| `box` | `MeshBasicMaterial` | Custom shader | Built-in box UV |
| `sphere` | Floating shader | Floating shader | Triplanar |
| `cone` | Floating shader | Floating shader | Unified cone UV + custom disp direction |

Box uses `MeshBasicMaterial` for flat mode (no custom shader). Sphere and cone always use `FLOATING_SHAPE_FRAG` for display consistency with displacement.

See [displacement-system.md](./displacement-system.md) for shader details.

## Texture binding

```javascript
bindDisplaceableMeshTextures(objEntry, {
  displayTexture: galleryFloatingOutputs[oi] ?? objTarget.latestTexture,
  heightMapTexture: objTarget.heightMap.texture,
  useHeightmap: displacementEnabled,
});
```

**Flicker fix (important):** when only one float renders per frame, `galleryFloatingOutputs[oi]` may be undefined for non-updated objects. Binding falls back to `latestTexture` on the RT bundle and skips null texture binds — never set `u_display` to null.

Display textures get `RepeatWrapping` on S/T for seamless sampling on curved surfaces.

## Adding a fourth floating object

1. Increment `FLOATING_OBJECT_COUNT`
2. Add geometry def in `useThreeDMode.js`
3. Add default stack in `DEFAULT_FLOATING_OBJECT_STACKS`
4. Add seed in `FLOATING_OBJECT_SEEDS`
5. Ensure `createFloatingObjectTargets` loop and `useWebGL` bind/render loops cover the new index
6. If new shape type: extend `FLOATING_SHAPE_KIND` and GLSL in `galleryDisplacement.js`

## Randomization

`textureRandomize.js` profiles include `shape` and `gallery` — randomize can retarget float stacks via `randomizeGalleryWallStacks()` in `randomizer.js`, which calls `markGalleryWarmup()`.

Space bar randomize in App can run even when 3D is off; stacks update in memory and apply on next gallery entry/warmup.
