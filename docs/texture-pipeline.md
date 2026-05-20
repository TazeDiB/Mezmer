# Texture Pipeline

## Overview

Gallery mode does **not** sample `main.frag` directly on mesh surfaces. Instead, each wall and floating object has a miniature copy of the 2D pipeline: feedback RTs → layer blend → output texture → optional height blit → bind to Three.js material.

**Stress test modes** reuse the same RT bundle shape at scale **N** (one per tile/cube/castle part/particle). See [stress-test-system.md](./stress-test-system.md).

## Wall RT bundle

`createGalleryFaceTargets()` in `galleryStack.js` creates **six** bundles:

```javascript
{
  w, h,                    // aspect-correct render size
  fbA, fbB,                // feedback ping-pong
  fbIdx,                   // current feedback read index
  outA, outB,              // blend output ping-pong
  blendFlip,
  heightMap,               // luminance RT
  latestTexture,           // pointer to current blend output
}
```

### Render size

`getGalleryFaceRenderSize(faceIndex, canvasW, canvasH, scale=0.5)`:

- Base dimension: `max(256, floor(max(canvasW, canvasH) * 0.5))`
- Other dimension scaled by face aspect from `GALLERY_FACE_DIMENSIONS`

## Single wall face update (inside animate)

When `galleryReady`, for each face `gf` in `facesThisFrame`:

1. **Advance local time state** — per-face integrated time + per-layer symmetry/turing/flow/etc. (same layer param keys as 2D)

2. **Apply stack** — `applyGalleryWallStack(u_layers, gf, ...)` + `applyGalleryWallModes(...)`

3. **Set gallery uniforms on main shader:**
   - `u_galleryFaceIndex = gf`
   - `u_galleryFaceSeed = GALLERY_FACE_SEEDS[gf]`
   - `u_galleryNeighborIntegratedTime` / `u_galleryNeighborDistortion` from edge-neighbor helpers

4. **Feedback pass** — render `main.frag` to `fbWrite`

5. **Blend pass** — `blend.frag` composites layers into `outA`/`outB` ping-pong

6. **Store** `face.latestTexture = blendWrite.texture`

7. **Height blit** (if displacement enabled) — `blitPatternHeightMap(..., latestTexture, heightMap)`

## Face selection per frame

```javascript
if (warmup || transition) {
  facesThisFrame = [0,1,2,3,4,5];
} else {
  if (brushFace >= 0) facesThisFrame.push(brushFace);
  round-robin until length === GALLERY_FACES_PER_FRAME (2);
}
galleryFaceCursor = (galleryFaceCursor + facesThisFrame.length) % 6;
```

## Floating object update

Same pattern via `renderFloatingObjectTexture()`:

- `u_galleryFaceIndex = -1`
- Object-specific stack/modes
- One object per frame unless warmup

## Post-generation bind phase

After all RT updates for the frame:

```javascript
// Walls
for (gf = 0..5) {
  bindDisplaceableMeshTextures(wallEntry, {
    displayTexture: face.latestTexture,
    heightMapTexture: face.heightMap.texture,
    useHeightmap: patternDisplacementEnabled,
  });
}

// Floats
for (oi = 0..2) {
  bindDisplaceableMeshTextures(objEntry, {
    displayTexture: output ?? objTarget.latestTexture,
    heightMapTexture: objTarget.heightMap.texture,
    useHeightmap,
  });
}

// Sync displacement strength + audio pulse
td.setDisplacementEnabled(...);
td.setBaseDisplacement(...);
td.update(delta);

renderer.render(td.scene, td.camera);
```

## Height blit

`blitPatternHeightMap()` uses `HEIGHT_BLIT_FRAG`:

```glsl
float h = dot(texture2D(u_src, vUv).rgb, vec3(0.299, 0.587, 0.114));
gl_FragColor = vec4(h, h, h, 1.0);
```

Luminance is stored in all RGB channels of `heightMap` RT. Vertex shaders read `.r`.

## Main canvas when gallery is off

Standard path:

- Dual fullscreen RT feedback ping-pong
- Blend to output
- Display on canvas quad material (`b.current.map`)

Gallery path **skips** this final composite — the Three.js scene is the visible output.

## State saved/restored around gallery RT passes

`useWebGL` saves and restores main canvas uniforms when entering gallery RT sub-loop:

- `u_integratedTime`, `u_uvScale`
- Main layer configs `je.current`
- `u_resolution`
- Visual mode indices, global color, pixelation, ascii

This prevents gallery per-face/per-object overrides from leaking into 2D mode when toggling back.

## Initialization and warmup

On first `galleryReady`:

- All RTs cleared
- `galleryWarmup = true` → all surfaces render once
- `galleryInitialized = true`

`consumeGalleryWarmupRequest()` also sets warmup after randomize/transitions.

## Resize

On window resize:

- `resizeGalleryFaceTargets(galleryFacesRT, w, h)`
- `resizeFloatingObjectTargets(galleryFloatingRT, w, h)`
- `td.updateSize()` for camera aspect

## Debugging tips

| Issue | Check |
|-------|-------|
| Black walls | `latestTexture` null? RT cleared but never rendered? |
| Stale patterns | Incremental render — wait ~3 frames or force warmup |
| Flickering floats | Null `u_display` bind — verify `latestTexture` fallback |
| Wrong face pattern | `u_galleryFaceIndex` during RT pass vs `faceIndex` on mesh |
| Displacement flat | `heightMap` blit running? `useHeightmap` true on bind? |
