const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// electron-updater is optional – gracefully degrade if not installed
let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  autoUpdater = null;
}

let win;

function sendUpdateStatus(status, data = {}) {
  if (win && win.webContents) {
    win.webContents.send('update-status', { status, ...data });
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: true,
    backgroundColor: '#0f172a',
    show: false
  });

  const isDev = process.env.ELECTRON_IS_DEV === 'true';

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  } else {
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, `../dist/cmmi5-analyzer/browser/index.html`),
        protocol: 'file:',
        slashes: true,
      })
    );
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    win = null;
  });
}

ipcMain.handle('update:check', async (_event, repo) => {
  if (!autoUpdater) return { error: 'electron-updater no está disponible.' };
  if (!app.isPackaged) return { error: 'La actualización solo funciona en la app instalada.' };
  if (!repo || !repo.includes('/')) return { error: 'Repo inválido. Usa formato owner/repo.' };

  const [owner, repository] = repo.split('/');
  autoUpdater.setFeedURL({ provider: 'github', owner, repo: repository, private: false });
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checking', result };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('update:download', async () => {
  if (!autoUpdater) return { error: 'electron-updater no está disponible.' };
  if (!app.isPackaged) return { error: 'La actualización solo funciona en la app instalada.' };
  try {
    autoUpdater.downloadUpdate();
    return { status: 'downloading' };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('update:install', async () => {
  if (!autoUpdater) return { error: 'electron-updater no está disponible.' };
  if (!app.isPackaged) return { error: 'La actualización solo funciona en la app instalada.' };
  try {
    autoUpdater.quitAndInstall();
    return { status: 'installing' };
  } catch (err) {
    return { error: String(err) };
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking-for-update'));
  autoUpdater.on('update-available', info => sendUpdateStatus('update-available', { info }));
  autoUpdater.on('update-not-available', info => sendUpdateStatus('update-not-available', { info }));
  autoUpdater.on('download-progress', progress => sendUpdateStatus('download-progress', { progress }));
  autoUpdater.on('update-downloaded', info => sendUpdateStatus('update-downloaded', { info }));
  autoUpdater.on('error', err => sendUpdateStatus('error', { error: String(err) }));
}

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});
