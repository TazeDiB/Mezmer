# Uniforms Reference

## main.frag — gallery-related

Used during RT generation for walls and floats.

| Uniform | Type | Purpose |
|---------|------|---------|
| `u_galleryFaceIndex` | int | Wall face 0–5; **−1** for floating objects (flat 2D UV) |
| `u_galleryFaceSeed` | float | Per-face/object phase offset |
| `u_galleryEdgeBlend` | float | Edge band width for time/distortion blend; **forced to 0** in useWebGL today |
| `u_galleryNeighborIntegratedTime` | vec4 | Neighbor face integrated times (uMin, uMax, vMin, vMax edges) |
| `u_galleryNeighborDistortion` | vec4 | Neighbor distortion drivers for edge sync |
| `u_mouseGalleryFace` | int | Face index under brush raycast |
| `u_mouseBrushActive` | float | 1 while painting |
| `u_mouseBrushRadius` | float | Brush size |
| `u_mouseMapping3D` | float | Legacy 3D mouse mode flag |
| `u_mouseSphereActive` | float | Legacy sphere paint flag |

Shared with 2D mode (non-exhaustive): `u_layers`, `u_resolution`, `u_integratedTime`, `u_uvScale`, `u_globalColorMode`, `u_forceGlobalColor`, `u_visualModeFromIndex`, `u_visualModeToIndex`, `u_visualModeBlend`, audio uniforms, etc.

## blend.frag

Layer composite into `outA`/`outB`. Uses same layer uniform array as main shader.

## Floating shape shaders (`galleryDisplacement.js`)

Flat and displaced floating materials share fragment shader `FLOATING_SHAPE_FRAG`.

| Uniform | Type | Purpose |
|---------|------|---------|
| `u_display` | sampler2D | Pattern color texture from RT |
| `u_heightMap` | sampler2D | Luminance height (displaced only) |
| `u_displacementStrength` | float | Vertex offset scale |
| `u_displacementEdgeFade` | float | Box UV edge mask width |
| `u_shapeKind` | float | 0=sphere, 1=cone, 2=box |
| `u_shapeHeight` | float | Cone height (1.45) |
| `u_shapeHalfExtent` | float | Cone radius / sphere radius / box half-extent |

### Varyings (floating)

| Varying | Source |
|---------|--------|
| `vObjPos` | object-space `position` |
| `vObjNormal` | object-space `normal` |
| `vMeshUv` | geometry `uv` |

## Wall displaced shader

| Uniform | Type | Purpose |
|---------|------|---------|
| `u_display` | sampler2D | Pattern color |
| `u_heightMap` | sampler2D | Height map |
| `u_displacementStrength` | float | Displacement scale |
| `u_displacementEdgeFade` | float | 0.18 default — UV edge attenuation |

| Varying | Purpose |
|---------|---------|
| `vUv` | Plane UV |

## Height blit (`HEIGHT_BLIT_FRAG`)

| Uniform | Purpose |
|---------|---------|
| `u_src` | Source pattern texture |

Output: grayscale luminance in RGB.

## Seam blit (`gallerySeams.js` — unused on walls)

| Uniform | Purpose |
|---------|---------|
| `u_self` | Current face color |
| `u_galleryFaceTex0` … `u_galleryFaceTex5` | All six face textures |
| `u_faceIndex` | Face being composited |
| `u_galleryEdgeBlend` | Edge band width |

## App params (displacement)

From `constants/index.js` / Controls:

| Param | Default | UI |
|-------|---------|-----|
| `patternDisplacementEnabled` | false | Checkbox "Pattern Heightmap" |
| `patternDisplacement` | 0.12 | Slider 0–0.5 |

Routed via `THREE_D_PARAM_KEYS` for slider; checkbox handled separately in App/Controls.

## threeDStateRef fields (not GPU uniforms)

See [3d-mode-lifecycle.md](./3d-mode-lifecycle.md) for the runtime API object consumed by `useWebGL`.
