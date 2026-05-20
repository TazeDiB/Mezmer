# 3D Mode Lifecycle

## Enabling and disabling

### User-facing controls

- **Keyboard:** `M` toggles 3D gallery (`App.jsx`)
- **UI:** Controls panel → "3D Gallery Room" checkbox
- **Displacement:** "Pattern Heightmap" checkbox + strength slider (works at runtime, no scene rebuild)

### State wiring

```javascript
// App.jsx
const [threeDEnabled, setThreeDEnabled] = useState(false);
const threeDEnabledRef = useRef(threeDEnabled);

// WebGLCanvas.jsx
const threeDStateRef = useRef({ enabled: false });
useThreeDMode(containerRef, threeDEnabled, threeDStateRef, audioData);
useWebGL(..., threeDStateRef, threeDEnabledRef);
```

`threeDEnabledRef` is read every animation frame inside `useWebGL` (avoids stale closure). `threeDStateRef` is the mutable gallery API populated by `useThreeDMode`.

## useThreeDMode effect lifecycle

The hook runs a `useEffect` keyed on **`[enabled]` only**.

### When `enabled === false`

- Exits pointer lock
- Sets `threeDStateRef.current.enabled = false`
- Clears `brushActive`
- Does **not** dispose the previous scene immediately on every off-toggle in all code paths — check current effect cleanup

### When `enabled === true`

1. Creates `THREE.Scene`, `PerspectiveCamera` (FOV 70, spawn at `(0, 1.6, 0)`)
2. Builds six wall meshes via `createGalleryRoomMeshes()`
3. Creates three floating meshes from `floatingDefs`
4. Registers keyboard/mouse/pointer-lock listeners
5. Assigns `threeDStateRef.current` (see contract below)

Camera pose is restored from `sessionPersistRef` when re-entering 3D in the same session.

## threeDStateRef contract

When gallery is active, `threeDStateRef.current` exposes:

```javascript
{
  enabled: true,
  isGallery: true,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  mesh: THREE.Group,              // roomGroup (legacy alias)
  wallMeshes: THREE.Mesh[6],
  faceMaterials: THREE.Material[6],           // flat MeshBasicMaterial
  faceDisplacedMaterials: THREE.Material[6],  // wall ShaderMaterial
  floatingObjects: Array<{
    mesh: THREE.Mesh,
    geometry: THREE.BufferGeometry,
    flatMaterial: THREE.Material,
    displacedMaterial: THREE.ShaderMaterial,
  }>,
  galleryFace: number,            // last raycast wall index (-1 if none)
  brushActive: boolean,
  brushStartTime: number,
  mouseOnSphere: false,           // legacy

  updateSize(): void,
  update(delta): void,            // movement, float animation, audio displacement
  setDisplacementEnabled(bool): void,
  setBaseDisplacement(number): void,

  // internal mirrors used by update()
  _displacementEnabled?: boolean,
  _baseDisplacement?: number,
}
```

`useWebGL` reads this ref every frame for gallery render, brush raycast, displacement sync, and final `renderer.render(td.scene, td.camera)`.

## Navigation and input

Defined in `useThreeDMode.js`:

| Input | Action |
|-------|--------|
| WASD / arrows | Move horizontally |
| E / Space | Move up |
| Q / Ctrl | Move down |
| Shift | 2× move speed |
| Mouse (pointer locked) | Look (yaw/pitch, YXZ order) |
| Escape | Exit pointer lock, stop brush |

Constants: `MOVE_SPEED = 5.5`, `VERT_SPEED = 3.5`, `MOUSE_SENSITIVITY = 0.0022`, `POINTER_LOCK_SETTLE_MS = 120`.

Camera position is clamped inside the room with margins (`clampCameraInRoom`).

## Brush painting

In `WebGLCanvas.jsx`, **left mouse button** while in 3D:

1. Requests pointer lock on the canvas
2. Sets `threeDStateRef.brushActive = true`, `brushStartTime = performance.now()`

In `useWebGL.js` when `galleryReady`:

- Raycasts from **screen center** `(0, 0)` through `tdGallery.camera` into `wallMeshes`
- Sets `u_mouseGalleryFace`, brush uniforms on the pattern shader
- Prioritizes updating the brushed face in the per-frame face batch

**Gotcha:** painting is always at view center while pointer-locked, not at a visible reticle offset.

## Displacement runtime API

`useThreeDMode` exposes:

```javascript
setDisplacementEnabled(enabled)  // swaps flat vs displaced materials on walls + floats
setBaseDisplacement(strength)    // updates u_displacementStrength on all displacement materials
```

Called from `useWebGL` each gallery frame based on App params:

- `patternDisplacementEnabled`
- `patternDisplacement` (base strength, slider 0–0.5)

Audio reactivity in `update(delta)`:

```javascript
strength = baseDisplacement + avgFrequency * AUDIO_DISPLACEMENT_PULSE; // 0.04
```

Per-material scaling via `userData.displacementStrengthScale` (cone 0.85, box 0.55, etc.).

## Rebuild and refresh requirements

| Change type | Required action |
|-------------|-----------------|
| Edit `main.frag` / `blend.frag` | Dev server restart or hard refresh; shader material created at `useWebGL` init |
| Edit GLSL in `galleryDisplacement.js` | **Toggle 3D off/on** or full page reload (materials created in `useThreeDMode` effect) |
| Toggle `threeDEnabled` | Full scene rebuild via `useThreeDMode` effect |
| Toggle `patternDisplacementEnabled` | Runtime only — no rebuild |
| Window resize | `resizeGalleryFaceTargets`, `resizeFloatingObjectTargets`, `td.updateSize()` |
| Randomize gallery stacks | `markGalleryWarmup()` forces full surface refresh |

## Warmup flag

`markGalleryWarmup()` / `consumeGalleryWarmupRequest()` in the gallery stack module force **all** walls and floats to render on the next gallery frame. Triggered by:

- First gallery init
- Wall or float stack transitions
- Randomize with gallery profile

## Session persistence

`sessionPersistRef` stores camera `{ x, y, z, yaw, pitch }` when leaving 3D so re-entry restores pose. Cleared when a new scene is built from a saved state read.
