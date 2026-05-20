# Styling and Strings

## CSS architecture

### No Tailwind / no live CSS modules source

Styles live in a **bundled minified CSS file** with hashed class names:

| File | Role |
|------|------|
| `src/index.css` | All rules (controls + app + welcome) |
| `src/constants/controlStyles.js` | JS map: logical name → hash class |
| `dist/assets/index-*.css` | Vite build output |

Original styles were extracted from a legacy bundle (`scripts/extract-controls.cjs`, `extract-app.cjs`).

### Class naming pattern

```
_<camelCase>_<moduleHash>_<lineNumber>
```

Examples:
- `_controlsWrapper_1145o_1`
- `_controlFieldset_1145o_42`
- `_welcomeModalOverlay_d2902_12` (app/welcome use different hash `d2902`)

### Style maps (`controlStyles.js`)

| Export | Used by |
|--------|---------|
| `CONTROL_STYLES` | `Controls.jsx` |
| `CANVAS_STYLES` | `WebGLCanvas.jsx` |
| `APP_STYLES` | `App.jsx` (container, toggle, welcome modal) |

**Duplicate mapping:** `checkboxLabel` and `checkboxLabelInline` both point to `_checkboxLabelInline_1145o_242`.

### Inline styles (outside CSS module)

| Location | What |
|----------|------|
| `FpsOverlay.jsx` | Position, font, background |
| `Controls.jsx` Joyride `styles` prop | Tour overlay colors |
| `Controls.jsx` | Occasional hint `style={{...}}` |
| `App.jsx` | `audio { display: none }` |
| `WebGLCanvas.jsx` | Container cursor, position |

### Layout constants

| Element | Size/position |
|---------|---------------|
| Controls panel | 320px wide, top-right, max-height scroll |
| Canvas | 100% fill app container |
| Toggle button | top-left 10px |

---

## Strings and copy

**No i18n** — English only, no locale files.

### String sources

| Source | File | Used for |
|--------|------|----------|
| `TOOLTIP_COPY` (imported as `cn`) | `joyrideSteps.js` | Slider/control `title` tooltips |
| `SLIDER_CONFIG.*.label` | `sliderConfig.js` | Slider labels |
| `JOYRIDE_STEPS` | `joyrideSteps.js` | react-joyride step content |
| Inline strings | `Controls.jsx` | Section legends, buttons, footer help |
| Inline strings | `App.jsx` | Welcome modal |
| Enum display | Controls | Capitalize first letter of pattern/color/mode/theme values |

### Tooltip / Joyride gaps

| Issue | Detail |
|-------|--------|
| Stale Joyride target | Step references `#slider-n` but param is `symmetry` → `#slider-symmetry` |
| Stale TOOLTIP keys | `n`, `radius`, `thickness`, `timeScale` in copy — not current param names |
| Missing tooltips | Many `SLIDER_CONFIG` keys fall back to `TOOLTIP_COPY.default` |
| 3D/stress/FPS controls | Inline English `title`, not in `TOOLTIP_COPY` |

---

## Joyride tutorial

| Piece | Location |
|-------|----------|
| Welcome modal | `App.jsx` inline |
| `<Joyride>` | `Controls.jsx` when `runTutorial` |
| Steps | `JOYRIDE_STEPS` — 13 steps |
| Callback | `handleJoyrideCallback` in App |
| Theme object | Inline `Be` in Controls (colors, buttons) |

**localStorage keys:**
- `tutorialSkipped`
- `tutorialCompleted`

**Tour targets:** fieldsets, layer buttons, pattern/color selects, globals, randomize button, `#controls-container`.

Collapsed fieldsets are not auto-expanded for tour steps.

---

## Controls.jsx code style note

The file uses **minified internal names** from extraction (`t`, `e`, `ne`, `Qe`, `he`, `Z` for props and helpers). A rework should rename for maintainability without changing behavior.

---

## Rework styling recommendations (documentation only)

1. **Replace hash CSS** with maintainable source (CSS modules, Tailwind, or design tokens) — map old class names during migration.
2. **Centralize copy** — single `strings.js` or i18n-ready structure for labels, tooltips, footer, welcome.
3. **Fix Joyride selectors** to match actual element ids.
4. **Unify checkbox label classes** — duplicate hash mapping.
5. **Design tokens** for panel width, z-index stack, spacing — currently magic numbers scattered.
6. **FpsOverlay** — move inline styles into shared stylesheet.

---

## Related files

```
src/index.css
src/constants/controlStyles.js
src/constants/joyrideSteps.js
src/constants/sliderConfig.js  (labels)
index.html                     (viewport)
public/preload.js              (no UI styling)
```
