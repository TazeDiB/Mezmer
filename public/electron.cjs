const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

const importIsDev = async () => {
  const { default: isDev } = await import('electron-is-dev');
  return isDev;
};

async function createWindow() {
  const isDev = await importIsDev();

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Mezmer",
    webPreferences: {
      preload: path.join(app.getAppPath(), isDev ? 'public/preload.js' : 'dist/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webgl: true,
    },
  });

  const loadURL = isDev
    ? 'http://localhost:5180'
    : `file://${path.join(app.getAppPath(), 'dist/index.html')}`;

  mainWindow.loadURL(loadURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.setMenu(null);
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
      return sources;
    } catch (error) {
      console.error('Main Process: Error getting desktop sources:', error);
      return [];
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-webgl2-compute-context');
