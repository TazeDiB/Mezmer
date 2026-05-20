# Mezmer 3D Gallery — Documentation

This folder documents how **3D Gallery mode** works in Mezmer: architecture, data flow, shaders, and how to extend or debug it. It is written for developers and AI agents continuing work on the project.

## What 3D mode is

3D Gallery mode is a **walkable room** (six patterned walls + three floating objects) rendered with the **same WebGL renderer and pattern engine** as the main 2D canvas. Patterns are generated offline each frame into **render targets (RTs)**, then bound as textures onto Three.js meshes. Optional **heightmap displacement** pushes vertices based on pattern luminance.

2D mode, **3D Gallery**, and **Stress Test** are mutually exclusive render paths inside `useWebGL.js`:

- **Gallery 3D** — incremental RT updates (2 walls + 1 float per frame)
- **Stress test** — full N× pattern pipelines every frame for benchmarking
- **Default 2D** — single fullscreen feedback + blend quad

See [stress-test-system.md](./stress-test-system.md) for all stress modes including particles and castle presets.

## Document index

### UI rework

| Doc | Contents |
|-----|----------|
| [ui/README.md](./ui/README.md) | UI layer index — components, controls, wiring for redesign |

### 3D gallery

| Doc | Contents |
|-----|----------|
| [architecture-overview.md](./architecture-overview.md) | High-level system diagram, file map, dual-layer design |
| [3d-mode-lifecycle.md](./3d-mode-lifecycle.md) | Toggle, hooks, `threeDStateRef`, rebuild rules |
| [gallery-room-and-navigation.md](./gallery-room-and-navigation.md) | Walls, planes, camera, controls, brush |
| [floating-objects.md](./floating-objects.md) | Box/cone/sphere, stacks, animation |
| [texture-pipeline.md](./texture-pipeline.md) | RT layout, per-frame render order, binding |
| [displacement-system.md](./displacement-system.md) | Shape shaders, cone/sphere/box, height blit |
| [pattern-stacks-and-randomization.md](./pattern-stacks-and-randomization.md) | Wall/float stacks, transitions, randomize |
| [gallery-seams.md](./gallery-seams.md) | Edge blending (partially implemented) |
| [uniforms-reference.md](./uniforms-reference.md) | Shader uniform catalog |
| [extending-and-known-issues.md](./extending-and-known-issues.md) | How to add shapes, open bugs, handoff checklist |
| [stress-test-system.md](./stress-test-system.md) | Stress modes (2D/3D/castle/particles), RT cost, benchmarks |

### Stress test & performance

| Doc / script | Contents |
|--------------|----------|
| [stress-test-system.md](./stress-test-system.md) | Full stress-mode architecture |
| [benchmarks/README.md](../benchmarks/README.md) | Saving benchmark JSON snapshots |
| `npm run benchmark:stress` | Vitest + GPU estimates + CPU layout timings |

## Quick start for a new contributor

1. Read [architecture-overview.md](./architecture-overview.md) for the big picture.
2. Toggle 3D in the app (**M** key or Controls → "3D Gallery Room").
3. Trace one frame: `useWebGL.js` → gallery RT render → `bindDisplaceableMeshTextures` → `renderer.render(scene, camera)`.
4. For displacement bugs, start in [displacement-system.md](./displacement-system.md).
5. For stress-test / particle / castle modes, read [stress-test-system.md](./stress-test-system.md) and run `npm run benchmark:stress`.
6. After editing embedded GLSL in `galleryDisplacement.js`, **toggle 3D off and on** (or hard refresh) to rebuild materials.

## Key source files (short list)

```
src/App.jsx                          — threeDEnabled state, params
src/components/WebGLCanvas.jsx         — mounts useThreeDMode + useWebGL
src/hooks/useThreeDMode.js            — scene, camera, meshes, navigation
src/hooks/useWebGL.js                 — render loop, gallery RT pipeline
src/lib/galleryRoomMeshes.js          — six inward-facing wall planes
src/lib/galleryStack.js               — six wall pattern stacks + RT factory
src/lib/galleryFloatingObjects.js     — three object stacks + render helper
src/lib/galleryDisplacement.js        — flat/displaced materials + shape GLSL
src/lib/galleryEdgeNeighbors.js        — edge neighbor motion sync helpers
src/lib/galleryMapping.js             — room size, hit → face UV
src/shaders/main.frag                 — pattern generation (shared 2D/3D)
src/shaders/blend.frag                — layer blend into RT output
src/lib/stressTest.js                 — stress modes, RT pool, per-object modes
src/lib/stressTestParticles.js        — particle sprites + motion
src/lib/stressBenchmark.js            — offline benchmark estimates
scripts/benchmark-stress.js           — CLI benchmark runner
```

## Constants worth memorizing

| Constant | Value | File |
|----------|-------|------|
| Room size | 18 × 10 × 18 | `galleryMapping.js` |
| Wall faces | 6 | `galleryStack.js` |
| Faces updated per frame | 2 (unless warmup) | `galleryStack.js` |
| Floating objects | 3 | `galleryFloatingObjects.js` |
| Floats updated per frame | 1 (unless warmup) | `galleryFloatingObjects.js` |
| Gallery RT scale | 0.5 of canvas | `galleryStack.js` |
| Float RT scale | 0.32 of canvas min dim | `galleryFloatingObjects.js` |
| Default displacement | 0.12 | `galleryDisplacement.js` |
| Stress object budget (interactive) | ~1000 patterned surfaces | [stress-test-system.md](./stress-test-system.md) |
| Stress max particles | 256 | `stressTest.js` |
| Castle stress presets | 100 / 1k / 10k | `stressTest.js` |
