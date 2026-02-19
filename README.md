# Mezmer – Development Project

This folder is a **development-ready** copy of Mezmer, recreated from the release build so you can run and edit the app again. The codebase has been **modularized**: the app is loaded from a single entry and the legacy bundle lives under `src/` so you can gradually extract components and hooks into separate modules.

## File structure (modular layout)

```
mezmer-dev/
├── index.html              # Root HTML (Vite entry); loads only main.jsx
├── package.json
├── vite.config.js          # Vite config, dev server on port 5180
├── scripts/
│   └── modularize-bundle.cjs  # One-time script used to convert bundle to ES module
├── public/
│   ├── electron.cjs        # Electron main process
│   ├── preload.js          # Preload script (IPC bridge)
│   └── vite.svg            # Favicon
├── src/
│   ├── main.jsx            # Vite entry: loads CSS and mounts App
│   ├── App.jsx             # App root (re-exports legacy App; can be replaced with full impl)
│   ├── index.css           # Global styles
│   ├── legacy/
│   │   └── recovered-app.js  # App, WebGLCanvas, Controls, useWebGL (imports from constants/hooks)
│   ├── constants/
│   │   ├── index.js        # Re-exports pattern types, defaults, joyride, slider, styles
│   │   ├── joyrideSteps.js # JOYRIDE_STEPS, TOOLTIP_COPY
│   │   ├── sliderConfig.js # SLIDER_CONFIG, VISUAL_MODES, COLOR_MODES, etc.
│   │   └── controlStyles.js# CONTROL_STYLES, CANVAS_STYLES (CSS class names)
│   ├── components/
│   │   └── index.js        # Placeholder (Controls/WebGLCanvas still in legacy)
│   ├── hooks/
│   │   ├── index.js
│   │   └── useAudio.js     # Audio analysis, BPM, bass/drum
│   └── lib/
│       ├── index.js
│       └── utils.js        # lerp, randomInRange, isElectron
└── dist/                   # Build output (after npm run build)
```

## Commands

| Command   | Description |
|----------|-------------|
| `npm install` | Install dependencies (run once) |
| `npm run dev`  | Start Vite dev server + Electron (hot reload) |
| `npm run build`| Build for production into `dist/` |
| `npm start`    | Run Electron only (loads `dist/` if built) |

## Development workflow

1. **Run the app**
   ```bash
   npm install
   npm run dev
   ```
   This starts the Vite dev server on port 5180 and launches Electron. The window loads from the dev server so you can edit and see changes after refresh (or use DevTools).

2. **Edit the UI / React app**
   - **Entry:** **`src/main.jsx`** – mounts the app and loads global CSS.
   - **App root:** **`src/App.jsx`** – re-exports the legacy App (swap for a full implementation when ready).
   - **Legacy bundle:** **`src/legacy/recovered-app.js`** – App, WebGLCanvas, Controls, useWebGL; imports React, Three.js, constants, hooks, control styles.
   - **Constants:** **`src/constants/`** – pattern types, defaults, Joyride/tooltips, slider config, control/canvas class names.

3. **Edit Electron / preload**
   - Main process: **`public/electron.cjs`**
   - Preload: **`public/preload.js`**
   - Restart the app after changes.

4. **Edit styles**
   - **`src/index.css`** – global styles.

5. **Production build**
   ```bash
   npm run build
   ```
   Then run with `npm start` to load from `dist/`, or package with electron-builder from this folder.

## Modularization

- **`src/legacy/recovered-app.js`** is the recovered bundle as an ES module. It **imports** React, `react-dom/client`, **constants** (joyrideSteps, sliderConfig, controlStyles), and **`../hooks/useAudio.js`**. It **exports** `App`, `WebGLCanvas`, and `Controls`. It no longer inlines React, ReactDOM, Joyride steps, tooltips, useAudio, slider config (St), or control/canvas styles (Qe, AL).
- **Extracted:** **`src/constants/joyrideSteps.js`** (tour + tooltips), **`src/constants/sliderConfig.js`** (SLIDER_CONFIG, VISUAL_MODES, COLOR_MODES, etc.), **`src/constants/controlStyles.js`** (CONTROL_STYLES, CANVAS_STYLES), **`src/hooks/useAudio.js`** (audio/BPM/bass/drum), **`src/lib/utils.js`** (lerp, randomInRange, isElectron). **`src/App.jsx`** is the app root (currently re-exports legacy App).
- **Still in legacy:** WebGL/Three.js + useWebGL, Controls (QL), WebGLCanvas (CL), and the root App (d3). These can be moved into **`src/components/`** and **`src/App.jsx`** later.

## Where this came from

This structure was recreated from the contents of **`extracted-app`** (the unpacked `app.asar` from your Mezmer installer). The original Vite + React source was not available; the UI was a single recovered bundle. It has been modularized so the app runs from **`src/main.jsx`** and uses the bundle under **`src/legacy/`** as the main app module, with room to split it further.
