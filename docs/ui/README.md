# Mezmer UI — Documentation for Rework

This folder documents the **React UI layer**, how it connects to rendering/audio/presets, and what a UI refactor must preserve. Written from a read-only codebase investigation — no behavior was changed.

## Scope

Covers everything the user sees and interacts with outside the shader internals:

- Layout and component structure
- Controls panel sections and param catalog
- State ownership and data flow
- Keyboard, pointer, and canvas interactions
- Styling, strings, tutorial
- Rework pain points and preservation checklist

**3D gallery rendering** is documented separately in [../README.md](../README.md) (parent `docs/` folder).

## Document index

| Doc | Contents |
|-----|----------|
| [architecture-and-layout.md](./architecture-and-layout.md) | Component tree, z-order, layout regions |
| [state-and-data-flow.md](./state-and-data-flow.md) | Hooks, params schema, App → canvas wiring |
| [controls-catalog.md](./controls-catalog.md) | Every control, id, param key, section |
| [user-actions-wiring.md](./user-actions-wiring.md) | User action → code path map |
| [styling-and-strings.md](./styling-and-strings.md) | CSS modules, tooltips, Joyride, i18n |
| [rework-brief.md](./rework-brief.md) | Pain points, must-preserve contracts, suggested approach |

## Quick facts

| Fact | Detail |
|------|--------|
| React components | **3** in `src/components/` (`Controls`, `WebGLCanvas`, `FpsOverlay`) + inline welcome modal in `App.jsx` |
| State management | No Context/Redux — lifted state in `App` + custom hooks |
| Controls props | ~55 props drilled into `Controls` |
| Panel width | 320px, top-right, collapsible fieldsets |
| Entry | `main.jsx` → `App.jsx` → canvas + optional panel |

## Key files

```
src/App.jsx                    — composition root
src/components/Controls.jsx    — side panel (~790 lines)
src/components/WebGLCanvas.jsx   — canvas mount + input
src/components/FpsOverlay.jsx    — FPS label
src/hooks/useAppParams.js        — params, transitions, pointer FX
src/hooks/useRandomization.js    — randomize + auto-randomize
src/hooks/usePresetShare.js      — seed copy/load/URL
src/hooks/useKeyboardShortcuts.js
src/hooks/useDesktopCapture.js   — Electron desktop audio
src/constants/sliderConfig.js    — SLIDER_CONFIG, themes, enums
src/constants/index.js           — DEFAULT_LAYERS, PARAM_CONFIG
src/constants/controlStyles.js   — hashed CSS class map
src/constants/joyrideSteps.js    — tour + TOOLTIP_COPY
src/index.css                    — bundled control/app styles
```

## Suggested reading order for a UI rework

1. [rework-brief.md](./rework-brief.md) — constraints and pain points first
2. [architecture-and-layout.md](./architecture-and-layout.md) — what exists today
3. [controls-catalog.md](./controls-catalog.md) — inventory to redesign against
4. [state-and-data-flow.md](./state-and-data-flow.md) — what not to break
5. [user-actions-wiring.md](./user-actions-wiring.md) — regression test checklist
