# Extending and Known Issues

## Handoff checklist for a new agent

1. Read [README.md](./README.md) and [architecture-overview.md](./architecture-overview.md)
2. Run `npm run dev`, toggle 3D (**M**), enable Pattern Heightmap
3. Reproduce open issues below before changing code
4. After shader edits in `galleryDisplacement.js`: toggle 3D off/on
5. Run `npm run build` before finishing
6. Do **not** commit unless the user asks

---

## How to add a new floating shape

Example: cylinder

### 1. GLSL (`galleryDisplacement.js`)

```javascript
FLOATING_SHAPE_KIND.cylinder = 3;
```

Add branches in:

- `floatingSampleColor()` / `floatingSampleHeight()`
- `FLOATING_DISPLACED_VERT` if custom displacement direction needed
- `floatingDisplacementMask()` if UV edge fade needed

### 2. Presets

```javascript
DISPLACEMENT_SHAPE_PRESETS.cylinder = { edgeFade: 0, strengthScale: 1.0 };
```

### 3. Uniform resolution

Extend `resolveFloatingShapeUniforms()` with cylinder geometry params.

### 4. Scene

Add to `floatingDefs` in `useThreeDMode.js` with subdivided `CylinderGeometry`.

### 5. Stack + RT plumbing

- Increment `FLOATING_OBJECT_COUNT`
- Add `DEFAULT_FLOATING_OBJECT_STACKS` entry
- Add `FLOATING_OBJECT_SEEDS` entry
- Verify loops in `useWebGL.js` (render, bind, state integration)

### 6. Test matrix

- Flat mode (displacement off)
- Displaced mode
- Pattern randomize + transition
- Audio pulse on displacement

---

## How to add a seventh wall

**High effort** — `6` is baked into:

- `GALLERY_FACE_COUNT` loops everywhere
- `GALLERY_FACE_EDGE_NEIGHBORS` (seam graph)
- Seam shader samplers (`u_galleryFaceTex0`–`5`)
- `main.frag` gallery neighbor logic
- Room mesh factory (non-box room geometry)

Requires coordinated refactor, not a single-file change.

---

## How to wire gallery seams

See [gallery-seams.md](./gallery-seams.md). Minimum viable:

1. Call `blitGalleryFaceSeam` after face RT batch
2. Bind `displayMap` instead of `latestTexture`
3. Test corners with displacement on

---

## How to increase pattern refresh rate

In `galleryStack.js` / `galleryFloatingObjects.js`:

```javascript
GALLERY_FACES_PER_FRAME = 3;      // default 2
FLOATING_OBJECTS_PER_FRAME = 2;   // default 1
```

Trade GPU time for less stale surfaces.

---

## Known issues (open)

### 1. Cone displacement (primary)

**Symptoms:**

- Base cap appears disconnected or smaller than side wall under strong displacement
- Rim on base does not grow with side on high luminance
- Historical: flat apex (from apex mask — mask removed, may still pinch)

**Current implementation:**

- `floatingConeUnifiedUv` — position-based UV, `baseBand = 0.2`
- `floatingConeDispDir` — base cap displacement blended toward side normal
- `sampleTexSeamlessU` — only U wrap

**Likely root cause:** same height sample, different geometric response — base cap vs side normals; Three.js cone cap/side topology.

**Suggested fixes:** custom geometry + unified UV chart; or radial base displacement; see [displacement-system.md](./displacement-system.md).

### 2. Gallery seams not wired

Visible edge discontinuities between walls. Infrastructure exists, not connected. See [gallery-seams.md](./gallery-seams.md).

### 3. Incremental rendering staleness

Only 2 walls + 1 float update per frame. Non-updated surfaces lag ~1–3 frames. Warmup/transition renders all.

### 4. Box flat vs displaced UV mismatch

Flat uses `MeshBasicMaterial` box UV; displaced uses shader + edge fade. Pattern can look slightly different between modes.

### 5. Brush paints at screen center only

Pointer-lock gallery brush raycasts from `(0,0)` NDC — always view center.

### 6. Legacy / dead code

| Item | Location |
|------|----------|
| `Scene3DOverlay.jsx` | Unused, wrong ref naming |
| Sphere mouse 3D path | `useWebGL.js` — inactive with gallery-only mode |
| `galleryAtlasToFace` in main.frag | Unused atlas path, wrong convention |
| `displayMap` / seam blit | Allocated but unused |

### 7. Randomize while 3D off

Space randomize updates gallery stacks in memory; user may not see changes until entering 3D or warmup.

---

## Resolved issues (for context)

| Issue | Fix |
|-------|-----|
| Black opposite walls | Inward-facing planes + `lookAt(ROOM_CENTER)` |
| Floating object flicker | `latestTexture` fallback, no null `u_display` bind |
| `u_displacementEdgeFade` redefinition | Removed duplicate in displaced vert |
| `u_layers uniform not found` spam | Fixed gallery-only else branch in useWebGL |
| Sphere seams | Triplanar sampling |
| Cube seams | Mesh UV + edge fade on displacement |

---

## Debugging playbook

| Symptom | Where to look |
|---------|---------------|
| Entire gallery black | `galleryReady` false? RTs cleared never filled? |
| One wall black | That face not in round-robin — wait or warmup |
| Float flickers black | `bindDisplaceableMeshTextures` null texture |
| Displacement no effect | `patternDisplacementEnabled`, height blit, material swap |
| Shader compile error | Browser console; search duplicated uniform names |
| Cone only broken | `galleryDisplacement.js` cone GLSL |
| Wall corner mismatch | Seam system — expected until wired |

---

## Build and test

```bash
npm run dev      # development
npm run build    # production build (vite)
```

No automated tests for 3D gallery — manual visual verification required.

---

## File ownership map (who to edit for what)

| Task | Primary files |
|------|---------------|
| Toggle / UI / params | `App.jsx`, `Controls.jsx`, `constants/` |
| Scene / camera / objects | `useThreeDMode.js`, `galleryRoomMeshes.js` |
| Render loop / RT bind | `useWebGL.js` |
| Pattern generation | `shaders/main.frag`, `shaders/blend.frag` |
| Displacement / shape UV | `galleryDisplacement.js` |
| Wall/float themes | `galleryStack.js`, `galleryFloatingObjects.js` |
| Randomize | `randomizer.js`, `textureRandomize.js` |
| Seams | `gallerySeams.js`, then wire in `useWebGL.js` |
| Room size / hit test | `galleryMapping.js` |

---

## Conversation context

Cone displacement was the active workstream at handoff. Sphere and box are considered acceptable. Wall seams and cone base/apex continuity remain the highest-value follow-ups.

Prior agent transcript (if available in Cursor): search agent transcripts for `galleryDisplacement`, `cone`, `floatingConeUnifiedUv`.
