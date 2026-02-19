# Mezmer – Development Project

This folder is a **development-ready** copy of Mezmer, recreated from the release build so you can run and edit the app again.

## File structure (matches original layout)

```
mezmer-dev/
├── index.html          # Root HTML (Vite entry)
├── package.json
├── vite.config.js      # Vite config, dev server on port 5180
├── public/
│   ├── electron.cjs    # Electron main process
│   ├── preload.js      # Preload script (IPC bridge)
│   ├── recovered-app.js # Recovered app bundle (readable; edit this for UI logic)
│   └── vite.svg        # Favicon
├── src/
│   ├── main.jsx        # Vite entry (loads CSS)
│   └── index.css       # Global styles (from original build)
└── dist/               # Build output (after npm run build)
```

## Commands

| Command   | Description |
|----------|-------------|
| `npm install` | Install dependencies (run once) |
| `npm run dev`  | Start Vite dev server + Electron (hot reload) |
| `npm run build`| Build for production into `dist/` |
| `npm start`    | Run Electron only (loads `dist/` if built, or dev server if you run Vite separately) |

## Development workflow

1. **Run the app**
   ```bash
   npm install
   npm run dev
   ```
   This starts the Vite dev server on port 5180 and launches Electron. The window loads from the dev server so you can edit and see changes after refresh (or use DevTools).

2. **Edit the UI / React app**
   - Main app source: **`public/recovered-app.js`** (beautified bundle from the release).
   - Edit this file for UI and logic; reload the Electron window (or refresh) to see changes.

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

## Where this came from

This structure was recreated from the contents of **`extracted-app`** (the unpacked `app.asar` from your Mezmer installer). The original Vite + React source was not available; the UI is a single recovered bundle in `public/recovered-app.js`. You can gradually split it into smaller modules or components as you work.
