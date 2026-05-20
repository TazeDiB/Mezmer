# Displacement System

## Purpose

When **Pattern Heightmap** is enabled, pattern luminance drives **vertex displacement** along surface normals (with shape-specific exceptions). Bright areas push outward; dark areas pull inward. Strength is controlled by the displacement slider plus optional audio pulse.

## Pipeline summary

```
pattern RT (RGB)  →  HEIGHT_BLIT (luminance)  →  heightMap RT
                                                      ↓
display RT  ─────────────────────────────────→  u_display (color)
                                                      ↓
                                            displaced vertex shader
                                            pos += dispDir * strength * (h - 0.5) * 2
```

Flat mode skips height map and uses display texture only.

## Material types

| Surface | Flat | Displaced |
|---------|------|-----------|
| Walls | `MeshBasicMaterial.map` | Wall `ShaderMaterial` (plane UV) |
| Box float | `MeshBasicMaterial.map` | Floating shader + mesh UV |
| Sphere float | Floating flat shader | Floating displaced shader |
| Cone float | Floating flat shader | Floating displaced shader |

Entry point: `createDisplaceableMesh()` returns `{ mesh, geometry, flatMaterial, displacedMaterial }`.

Toggle: `bindDisplaceableMeshTextures(..., { useHeightmap })` swaps active material.

## Shape presets

```javascript
DISPLACEMENT_SHAPE_PRESETS = {
  box:   { edgeFade: 0.22, strengthScale: 0.55 },
  cone:  { edgeFade: 0.0,  strengthScale: 0.85 },
  sphere:{ edgeFade: 0.0,  strengthScale: 1.0 },
  wall:  { edgeFade: 0.18, strengthScale: 1.0 },
};
```

- `edgeFade` — UV edge attenuation (box/walls only in practice)
- `strengthScale` — multiplier on `u_displacementStrength` via `userData.displacementStrengthScale`

## Shape kind uniform

```javascript
FLOATING_SHAPE_KIND = { sphere: 0, cone: 1, box: 2 };
```

Set in `resolveFloatingShapeUniforms()` from geometry parameters:

| Preset | `u_shapeHeight` | `u_shapeHalfExtent` |
|--------|-----------------|---------------------|
| Cone | `geometry.parameters.height` (1.45) | `geometry.parameters.radius` (0.72) |
| Box | — | half of width (0.575) |
| Sphere | — | radius (0.82) |

## Floating shape GLSL (`FLOATING_SHAPE_GLSL`)

Shared chunk embedded in flat + displaced floating shaders. Key functions:

### Sphere (`u_shapeKind < 0.5`)

**Triplanar sampling** — projects texture from XY, XZ, YZ planes weighted by normal:

```glsl
floatingTriplanarSample(tex, position, normal)
```

Avoids equirectangular pole seams. **Status: working well.**

### Cone (`0.5 <= u_shapeKind < 1.5`)

**Unified UV from object-space position** — not mesh UV:

```glsl
floatingConeUnifiedUv(p):
  angle = atan(z, x) / TAU + 0.5     // u, seamless wrap via sampleTexSeamlessU
  vHeight = (p.y + h/2) / h          // 0 at base, 1 at apex
  vSide = baseBand + vHeight * (1 - baseBand)
  vBase = radial * baseBand          // base cap maps disk into bottom 20% of v
  v = mix(vBase, vSide, smoothstep(0, 0.05, vHeight))
```

**Seamless U:** `sampleTexSeamlessU` blends samples at u≈0 and u≈1 for the single vertical seam.

**Custom displacement direction:**

```glsl
floatingConeDispDir(p, n):
  if vHeight > 0.06: return n          // side wall — mesh normal
  // base cap: blend toward side-like normal so rim grows with wall
  sideN = normalize(outward.xz, slope=r/h)
  target = mix(up-bias, sideN, rimBlend(radial))
  return mix(n, target, onBase * 0.95)
```

**Status: still problematic** — base may look disconnected; apex behavior has been iterated (see known issues).

### Box (`u_shapeKind > 1.5`)

Uses **mesh UV** (`texture2D(tex, meshUv)`). Displacement masked at UV edges:

```glsl
floatingDisplacementMask → smoothstep on distance to UV border
```

Flat box uses `MeshBasicMaterial` (Three.js box UV unwrap). Displaced box uses shader with same UV + edge fade — slight flat/displaced visual mismatch possible.

## Wall displacement

Separate inline shaders in `createDisplacedPatternMaterial()`:

- Sample height from `u_heightMap` at plane `uv`
- Displace along `normal`
- Edge fade on UV borders (`u_displacementEdgeFade = 0.18`)

Walls do not use `FLOATING_SHAPE_GLSL`.

## Displaced vertex shader (floating)

```glsl
float h = floatingSampleHeight(u_heightMap, position, normal, uv);
float disp = (h - 0.5) * 2.0 * u_displacementStrength;
disp *= floatingDisplacementMask(position, normal, uv);
vec3 dispDir = normal;
if (cone) dispDir = floatingConeDispDir(position, normal);
pos += dispDir * disp;
```

Height is sampled with the **same** color sampling path as the fragment shader so displacement matches visible pattern.

## Audio reactivity

In `useThreeDMode.update()`:

```javascript
const avg = averageFrequency(audioData.frequencyData);
const strength = baseDisplacement + avg * AUDIO_DISPLACEMENT_PULSE; // 0.04
updateDisplacementStrength(allDisplacementMaterials, strength);
```

## Geometry subdivision

Displacement needs dense vertices:

- Walls: `PlaneGeometry(fw, fh, wSeg, hSeg)` ~64 segments
- Box: 48³ segments
- Cone: 32 radial × 48 height segments
- Sphere: 48 × 36 segments

Low subdivision = chunky displacement.

## Cone — history of attempts

Documented for handoff so future work does not repeat dead ends:

| Approach | Result |
|----------|--------|
| Equirect + cylindrical UV | Seams on side |
| Full triplanar (like sphere) | Base offset, apex hole |
| Side + planar base (normal blend) | Tip fixed, base disconnected |
| Unified position UV + apex mask (top 3%) | **Flat cap** at tip — mask removed |
| Unified UV + `floatingConeDispDir` | Current — base continuity improved, may still fail on high displacement |

### Root causes (cone)

1. **Three.js `ConeGeometry`** — side and base cap are separate triangle groups; rim vertices share position but sampling/displacement heuristics may not match perceptually.

2. **Normal vs direction** — same height sample with different displacement directions at base rim creates visible gap under strong luminance.

3. **UV singularity at apex** — `atan(z,x)` undefined at x=z=0; all apex triangles share one vertex — usually OK if no apex mask.

4. **`baseBand = 0.2`** — base disk uses only bottom 20% of texture v; rim matches side at v=0.2 but radial pattern scale differs from side wrap.

### Suggested next approaches

1. **Custom `BufferGeometry`** — single UV chart for side + base with shared rim coordinates
2. **Mesh UV path** — use ConeGeometry UV + fix only the one vertical seam (like box)
3. **Radial displacement on base** — project displacement onto XZ at base instead of -Y
4. **Higher `baseBand`** or circumference-matched radial mapping

## Shader edit checklist

After changing `galleryDisplacement.js` GLSL:

1. Toggle 3D off/on (rebuilds materials in `useThreeDMode` effect)
2. Enable Pattern Heightmap to test displaced path
3. Test all three floats + one wall
4. Watch browser console for shader compile errors and ANGLE warnings

## Related files

- `src/lib/galleryDisplacement.js` — all material + GLSL source
- `src/hooks/useThreeDMode.js` — geometry defs, `setDisplacementEnabled`
- `src/hooks/useWebGL.js` — height blit call, bind, strength sync
