# Gallery Edge Neighbor Motion Sync

## Goal

When six walls each render an **independent** pattern texture, edges can show visible discontinuities in animation phase and distortion. The edge-neighbor system supplies per-face neighbor data so `main.frag` can blend integrated time and distortion near face edges during RT generation.

**Color seam compositing** (post-process blit across neighbor face textures) was removed; walls bind `latestTexture` directly.

## Current status

| Component | Status |
|-----------|--------|
| `GALLERY_FACE_EDGE_NEIGHBORS` | Active |
| `getGalleryEdgeNeighborTimes/Distortion` | Active — fed to shader during gallery RT pass |
| `u_galleryNeighborIntegratedTime` / `u_galleryNeighborDistortion` | Uniforms set in `useWebGL.js`; no in-shader blend branch today |
| `GALLERY_EDGE_BLEND` | Constant kept for future edge-band width |
| Color seam blit / `displayMap` | **Removed** |

**Net effect today:** walls behave as six independent textures. Neighbor uniform data is computed each frame but not consumed in `main.frag` until an edge-blend branch is reintroduced.

## Edge neighbor table

`GALLERY_FACE_EDGE_NEIGHBORS[face]` → `[uMin, uMax, vMin, vMax]` neighbor face indices.

BoxGeometry order: +x, -x, +y, -y, +z, -z.

Example: face 0 (+x) neighbors along uMin/uMax/vMin/vMax edges are faces `[4, 5, 3, 2]`.

## Edge blend width

```javascript
export const GALLERY_EDGE_BLEND = 0.1; // in face UV space (0–1)
```

Reserved for a future in-shader edge blend on integrated time / distortion.

## Enabling in-shader edge animation sync

1. In `main.frag`, add an edge-band blend using `GALLERY_EDGE_BLEND` (or a uniform) that mixes `u_integratedTime` and `u_globalDistortionScale` toward `u_galleryNeighborIntegratedTime` / `u_galleryNeighborDistortion` by edge weights from `vUv`.
2. In `useWebGL.js`, pass `GALLERY_EDGE_BLEND` (or equivalent) if needed.
3. Test corners (+x/+y/+z triple meeting) with displacement on.

## Displacement

Height maps are generated from each face’s `latestTexture` independently. If edge motion sync is enabled, verify rim height still looks acceptable at wall joints.

## Files

- `src/lib/galleryEdgeNeighbors.js` — neighbor graph + motion helpers
- `src/hooks/useWebGL.js` — sets neighbor uniforms during gallery RT pass
- `src/shaders/main.frag` — gallery face pass (neighbor uniforms declared; blend branch removed)

## Coordinate consistency

World ↔ face UV for hit testing lives in `galleryMapping.js` (`worldHitToGallerySurface`). Any future seam or edge logic must match that convention, not unused atlas helpers in `main.frag`.
