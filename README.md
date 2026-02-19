# Mezmer – Development Project

This folder is a **development-ready** copy of Mezmer, recreated from the release build so you can run and edit the app again. The codebase is **fully modularized**: the app runs from clear `src/` modules (App, Controls, WebGLCanvas, hooks, constants); the legacy bundle has been removed and replaced with the `three` package and extracted code.

## File structure

```
mezmer-dev/
├── index.html              # Root HTML (Vite entry); loads only main.jsx
├── package.json
├── vite.config.js          # Vite config, dev server on port 5180
├── scripts/                 # One-time extraction / modularization helpers
│   ├── modularize-bundle.cjs
│   ├── extract-app.cjs
│   ├── extract-controls.cjs
│   ├── extract-slider-config.cjs
│   ├── extract-useWebGL.cjs
│   └── remove-*.cjs
├── public/
│   ├── electron.cjs        # Electron main process
│   ├── preload.js          # Preload script (IPC bridge)
│   └── vite.svg            # Favicon
├── src/
│   ├── main.jsx            # Vite entry: loads CSS and mounts App
│   ├── App.jsx             # App root (layout, WebGL canvas, controls, welcome/tour modal)
│   ├── index.css           # Global styles
│   ├── components/
│   │   ├── index.js        # Re-exports Controls, WebGLCanvas
│   │   ├── Controls.jsx    # Layers, audio, randomization, Joyride tour
│   │   └── WebGLCanvas.jsx # WebGL container (uses useWebGL)
│   ├── constants/
│   │   ├── index.js        # Pattern types, defaults, joyride, slider, styles
│   │   ├── joyrideSteps.js # JOYRIDE_STEPS, TOOLTIP_COPY, AUDIO_REACTIVE_COLOR_MODES
│   │   ├── sliderConfig.js # SLIDER_CONFIG, VISUAL_MODES, COLOR_MODES, etc.
│   │   └── controlStyles.js# CONTROL_STYLES, CANVAS_STYLES, APP_STYLES
│   ├── hooks/
│   │   ├── index.js
│   │   ├── useAudio.js     # Audio analysis, BPM, bass/drum presence
│   │   └── useWebGL.js     # Three.js scene, renderer, shaders, feedback
│   └── lib/
│       ├── index.js
│       └── utils.js        # lerp, randomInRange, isElectron
└── dist/                   # Build output (after npm run build)
```

## Commands

| Command        | Description |
|----------------|-------------|
| `npm install`  | Install dependencies (run once) |
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
   - **App root:** **`src/App.jsx`** – full app (state, layout, welcome modal, WebGL + Controls).
   - **Components:** **`src/components/Controls.jsx`** (panel), **`src/components/WebGLCanvas.jsx`** (canvas wrapper).
   - **Hooks:** **`src/hooks/useAudio.js`** (audio/BPM), **`src/hooks/useWebGL.js`** (Three.js, shaders).
   - **Constants:** **`src/constants/`** – pattern types, defaults, Joyride, slider config, styles.

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

## Tech stack

- **React 18** + **Vite** for the UI.
- **Three.js** (npm `three`) for WebGL visualization (moiré / hyperbolic patterns).
- **react-joyride** for the optional tour.
- **Meyda** (optional) for audio analysis.
- **Electron** for the desktop app.

## Where this came from

This structure was recreated from the contents of the unpacked Mezmer installer. The original Vite + React source was not available; the UI was a single recovered bundle. It has been fully modularized: the legacy bundle was removed and replaced with **`src/App.jsx`**, **`src/components/`**, **`src/hooks/useWebGL.js`** and **`useAudio.js`**, **`src/constants/`**, and **`src/lib/`**, with Three.js provided by the **`three`** package.
