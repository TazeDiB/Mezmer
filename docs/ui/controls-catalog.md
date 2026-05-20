# Controls Catalog

Complete inventory of UI controls for redesign/regression testing. IDs are stable anchors for tests and Joyride.

## ID conventions

| Element | Pattern | Example |
|---------|---------|---------|
| Slider wrapper | `slider-{paramKey}` | `#slider-symmetry` |
| Range input | `{paramKey}` (id + name) | `#symmetry` |
| Fieldset | `fieldset-{section}` | `#fieldset-layer` |
| Button | `button-{action}` | `#button-randomizeAll` |
| Layer tab | `layer-button-{1-4}` | `#layer-button-2` |

Sliders built by helper `he(paramKey, value)` in `Controls.jsx`:
- Label from `SLIDER_CONFIG[paramKey].label`
- Tooltip from `TOOLTIP_COPY[paramKey]` (`joyrideSteps.js`)

---

## Section: Audio (`#fieldset-audio`)

| id | Type | Label | Handler / binding |
|----|------|-------|-------------------|
| `audioFileInput` | file | Load File | `onFileChange` |
| `button-toggleAudioPlay` | button | Play/Pause File | `onTogglePlay` |
| `button-getDesktopSources` | button | Get Sources | `onGetSources` (Electron only) |
| `desktopSourceSelect` | select | Select Source | `setSelectedSourceId` |
| `button-toggleDesktopCapture` | button | Start/Stop Capture | start/stop capture |

---

## Section: Randomization (`#fieldset-randomization`)

| id | Type | Label | Binding |
|----|------|-------|---------|
| `randomizerTheme` | select | Theme | `activeTheme`: chaotic, geometric, organic |
| `button-randomizeAll` | button | Randomize All | `onRandomize` |
| `randomizeGlobalsCheckbox` | checkbox | Globals | `randomizeGlobals` |
| `randomizeColorModes` | checkbox | Colors | `randomizeColorModes` |
| `randomizeVisualMode` | checkbox | Visual Mode | `randomizeVisualMode` |
| `autoRandomizeEnabledCheckbox` | checkbox | Enable | `autoRandomizeEnabled` |
| `autoRandomizeMode` | radio group | BPM Sync / Time Interval | `bpm` \| `time` |
| `slider-autoRandomizeInterval` | slider | Measures (bpm mode) | `autoRandomizeInterval` prop (= beat count) |
| `slider-autoRandomizeTimeInterval` | slider | Seconds (time mode) | `autoRandomizeTimeInterval` |
| `presetCodeInput` | text | Seed | `presetCode` |
| `button-copyPreset` | button | Copy | `onCopyPreset` |
| `button-loadPreset` | button | Load | `onLoadPreset` |
| `button-loadFromUrl` | button | Load from URL | `onLoadFromUrl` |

---

## Section: Layer (`#fieldset-layer`)

| id | Type | Label | Binding |
|----|------|-------|---------|
| `layer-button-1` … `4` | button | L1–L4 | `onLayerSelect('layerN')` |
| `patternType` | select | Pattern | `onParamChange` → active layer |
| `layerColorMode` | select | Color | `colorMode` on active layer |
| Dynamic sliders | range | Per pattern | See pattern table below |
| `slider-blendAmount` | range | Blend Amount | Hidden when pattern = `invisible` |

### Pattern → visible sliders (`PARAM_CONFIG`)

| Pattern | Param keys shown |
|---------|------------------|
| invisible | none |
| wovenGrid | symmetry, distortion, layer2Freq†, weaveThickness + audio |
| hyperTuring | symmetry, distortion, turing* (6) + audio |
| hyperVoronoi | symmetry, distortion, voronoiScale, voronoiEdgeWidth + audio |
| spiralArms | symmetry, distortion, spiral* (4) + audio |
| reactionDiff | symmetry, distortion, rdComplexity‡, rdSpotSize‡ + audio |
| hyperFlow | flow* + layerSymmetryOffsetSpeed + audio |
| cubeGrid | cube* + layerSymmetryOffsetSpeed + audio |
| kaleidoWave | freq, flowSpeed, flowCurl + audio |
| crystal / stainedGlass | voronoi pair + audio |
| plasma / aurora / morph | freq, flow* + audio |
| inkDrop | flowSpeed, rd*‡ + audio |
| prism | freq, flowSpeed, turingScale + audio |
| fractal / lissajous | respective keys + audio |

† **Bug:** `layer2Freq` in config but layers store `freq` → Grid Freq slider may not appear for wovenGrid.  
‡ **Gap:** `rdComplexity` / `rdSpotSize` not in `SLIDER_CONFIG` → no UI.

**Audio sliders** (all non-invisible patterns): `audioSensitivity`, `bassSensitivity`, `midSensitivity`, `highSensitivity`.

---

## Section: Global (`#fieldset-global`)

| id | Type | Label | Binding |
|----|------|-------|---------|
| `visualModeSelect` | select | Visual Mode | `visualMode` |
| `threeDEnabledCheckbox` | checkbox | 3D Gallery Room | `setThreeDEnabled` |
| `stressTestModeSelect` | select | Stress Test | `off` \| `plane2d` \| `cubes3d` |
| `slider-stressTestCount` | range | Stress Test Count | `stressTestCount` (when stress ≠ off) |
| `patternDisplacementEnabledCheckbox` | checkbox | Pattern Heightmap | `patternDisplacementEnabled` |
| `slider-patternDisplacement` | range | Pattern Displacement | when 3D + heightmap |
| `showFpsCounterCheckbox` | checkbox | Show FPS Counter | `setShowFpsCounter` |
| `vsyncEnabledCheckbox` | checkbox | VSync | `setVsyncEnabled` |
| `globalColorMode` | select | Global Color | `globalColorMode` |
| `forceGlobalColorCheckbox` | checkbox | Force All | `forceGlobalColor` |

### Always-visible global sliders

| Param key | Label | Range |
|-----------|-------|-------|
| `feedbackMix` | Feedback Mix | 0.8–0.99 |
| `globalTimeScale` | Global Time Scale | 0.4–3 |
| `globalDistortionScale` | Global Distortion | 0–1 |
| `uvScale` | Global Zoom | 0.5–1.7 |
| `globalAudioSensitivity` | Global Audio Sensitivity | 0–5 |
| `blendSpeedFactor` | Blend Speed Factor | 0.1–4 (App state, not `params`) |

### Conditional global sliders

| Param key | When shown |
|-----------|------------|
| `pixelationFactor` | visual mode = `pixelate` |
| `asciiCharSize` | visual mode = `ascii` |

### Mouse Influence block

| Param key | Label |
|-----------|-------|
| `mouseRadius` | Mouse Radius |
| `mouseDistortion` | Mouse Distortion |
| `mouseSymmetry` | Mouse Symmetry |
| `mouseAttract` | Mouse Attract |
| `mouseTwist` | Mouse Twist |

---

## Global sliders without UI (gaps)

| Param key | In defaults/presets | Notes |
|-----------|---------------------|-------|
| `rainbowAnimationSpeed` | yes | Randomized; no slider |
| `globalSymmetryOffsetSpeed` | yes | Shader only |
| `isVisible`, `blendTargetType` | layer fields | Runtime/blend only |

---

## Enum options (selects)

### Pattern types (`PATTERN_TYPES`)

wovenGrid, hyperTuring, hyperVoronoi, spiralArms, reactionDiff, hyperFlow, cubeGrid, kaleidoWave, crystal, stainedGlass, plasma, aurora, inkDrop, morph, prism, fractal, lissajous, invisible

### Visual modes (`VISUAL_MODES`)

normal, pixelate, ascii, glow, moire, crt, hologram, thermal, hashGrid, glitch, vhs, cartoon, …

### Color modes (`COLOR_MODES`)

rainbow, fire, ice, matrix, cyberpunk, vaporwave, monochrome, audioRGB, spectrum, reactivePulse, velocity, …

Audio-reactive modes disabled in UI when not playing/capturing.

### Randomizer themes (`RANDOMIZER_THEMES`)

| Theme | Character |
|-------|-----------|
| chaotic | Broad patterns, vivid colors, glitchy visual modes |
| geometric | Grids, crystals, monochrome/ice, pixelate/hash |
| organic | Flow, reaction-diff, fire/ice, glow/thermal |

---

## Disabled states

| Control | Disabled when |
|---------|---------------|
| All sliders | `isRandomizing` |
| `blendAmount` | Manual pattern transition active on that layer |
| Layer `colorMode` | `forceGlobalColor` |
| Audio-reactive colors | `!(isPlaying \|\| isCapturing)` |

---

## Footer help text (Controls)

Documents shortcuts (approximate):

- 1–4 = Layer, H = Panel, F = Fullscreen, M = 3D
- LMB paint, RMB randomize FX, scroll = brush radius
- 3D: WASD, Space/E up, click lock look, Esc unlock

---

## Legacy `SLIDER_CONFIG` entries

Many keys exist in `sliderConfig.js` but are **not** referenced by current `PARAM_CONFIG` (dots, lines, kaleido, phylo, etc.). Safe to hide in rework unless patterns are re-added.
