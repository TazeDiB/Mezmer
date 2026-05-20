# Gallery Room and Navigation

## Room dimensions

From `src/lib/galleryMapping.js`:

```javascript
export const GALLERY_ROOM = {
  width: 18,
  height: 10,
  depth: 18,
};
```

Half-extents used for wall placement: ±9 on X/Z, ±5 on Y. Camera spawn: `(0, 1.6, 0)` — eye height inside the room.

## Wall mesh construction

`createGalleryRoomMeshes()` in `galleryRoomMeshes.js` builds **six separate `PlaneGeometry` meshes**, not a `BoxGeometry` room.

### Why planes instead of a box?

Earlier box-based rooms had **black opposite walls** because face normals pointed outward. Each wall is a plane positioned on a room face and rotated with `mesh.lookAt(ROOM_CENTER)` so the visible side faces **inward**.

### Wall placement

```javascript
const WALL_POSITIONS = [
  [ HW, 0, 0],   // +X
  [-HW, 0, 0],   // -X
  [0,  HH, 0],   // +Y ceiling
  [0, -HH, 0],   // -Y floor
  [0, 0,  HD],   // +Z
  [0, 0, -HD],   // -Z
];
```

Each mesh gets `userData.faceIndex = face` matching BoxGeometry material order.

### Subdivision for displacement

`planeSegments(w, h, baseSegments)` scales grid density by aspect ratio. Default `displacementSegments = 64` from `DEFAULT_DISPLACEMENT_SEGMENTS`.

Face dimensions (`GALLERY_FACE_DIMENSIONS`):

| Face | Size (w × h) |
|------|----------------|
| ±X | 18 × 10 |
| ±Y | 18 × 18 |
| ±Z | 18 × 10 |

## Wall materials

Two material arrays, one per face:

1. **Flat:** `createGalleryWallFlatMaterials()` → six `MeshBasicMaterial` instances
   - `map` = pattern texture
   - `toneMapped: false`

2. **Displaced:** `createGalleryWallDisplacedMaterials()` → six `ShaderMaterial` instances
   - Standard plane UV sampling
   - Vertex displacement from `u_heightMap`
   - Edge fade on UV borders (`u_displacementEdgeFade = 0.18`)

Toggle via `setWallMeshDisplacement(wallMeshes, flat, displaced, useHeightmap)`.

## Texture binding for walls

Each frame in `useWebGL.js`:

```javascript
bindDisplaceableMeshTextures(
  { mesh: wallMeshes[gf], flatMaterial, displacedMaterial },
  { displayTexture: face.latestTexture, heightMapTexture, useHeightmap }
);
```

For walls, the entry shape is adapted — flat materials use `.map`, displaced use `u_display` / `u_heightMap` uniforms.

Wall display textures use:

- `minFilter/magFilter: LinearFilter`
- `generateMipmaps: false`
- `flipY: false` (via `bindFacePatternTextures`)

## Hit testing and UV mapping

`worldHitToGallerySurface(point, normal)` in `galleryMapping.js` maps a world hit + outward normal to `{ face, faceUV }` using the same face index convention as walls.

The live brush path in `useWebGL` uses Three.js raycast → mesh UV + `userData.faceIndex` instead of this helper, but the helper is available for tools or future features.

## Camera

- `PerspectiveCamera(70, aspect, 0.05, 80)`
- Rotation order `YXZ` (FPS style)
- Pitch clamped to ±~47% of π
- Position clamped with margin 0.6 inside room bounds

## Floating object placement

Defined in `useThreeDMode.js` `floatingDefs` — see [floating-objects.md](./floating-objects.md).

## Scene graph

```
scene
└── roomGroup (Group)
    ├── wall mesh 0 (+X)
    ├── wall mesh 1 (-X)
    ├── ...
    └── wall mesh 5 (-Z)
├── floating box mesh
├── floating cone mesh
└── floating sphere mesh
```

All meshes use `frustumCulled: false` so patterns stay visible when partially inside the frustum.

## Common wall bugs (historical)

| Symptom | Cause | Fix applied |
|---------|-------|-------------|
| Opposite wall black | Outward-facing box normals | Inward planes + `lookAt` |
| Wall texture not updating | Wrong face not in round-robin | Brush prioritization + warmup |
| Displacement seams at corners | Independent per-face textures | Seam system exists but not wired — see [gallery-seams.md](./gallery-seams.md) |
