const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const https = require('https');

// electron-updater is optional – gracefully degrade if not installed
let autoUpdater;
let autoUpdaterError = null;
let lastUpdateRepo = null;
let manualInstallerPath = null;

try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  autoUpdater = null;
  autoUpdaterError = e && e.message ? e.message : String(e);
}

let win;

function normalizeVersion(version) {
  return version ? version.toString().trim().replace(/^v/i, '') : '';
}

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

function downloadManualUpdate(manualUrl, destPath) {
  sendUpdateStatus('downloading');
  
  let redirectCount = 0;
  const maxRedirects = 10;

  function startDownload(currentUrl) {
    if (redirectCount > maxRedirects) {
      sendUpdateStatus('error', { error: 'Demasiadas redirecciones al descargar.' });
      return;
    }

    const protocol = currentUrl.startsWith('https') ? https : require('http');
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron-Updater-Fallback'
      }
    };

    const req = protocol.get(currentUrl, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        redirectCount++;
        startDownload(res.headers.location);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        sendUpdateStatus('error', { error: `Servidor retornó código: ${res.statusCode}` });
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      // Asegurar que el directorio de destino exista
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
      }

      const fileStream = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = (downloadedBytes / totalBytes) * 100;
          sendUpdateStatus('download-progress', { progress: { percent } });
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close((err) => {
          if (err) {
            sendUpdateStatus('error', { error: `Error al guardar instalador: ${err.message || err}` });
          } else {
            sendUpdateStatus('update-downloaded', { info: { manual: true, filePath: destPath } });
          }
        });
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        sendUpdateStatus('error', { error: `Error de escritura: ${err.message || err}` });
      });

      res.on('error', (err) => {
        fs.unlink(destPath, () => {});
        sendUpdateStatus('error', { error: `Error de red: ${err.message || err}` });
      });
    });

    req.on('error', (err) => {
      fs.unlink(destPath, () => {});
      sendUpdateStatus('error', { error: `Error de petición: ${err.message || err}` });
    });
  }

  startDownload(manualUrl);
}

ipcMain.handle('update:check', async (_event, repo) => {
  if (!repo || !repo.includes('/')) return { error: 'Repo inválido. Usa formato owner/repo.' };
  lastUpdateRepo = repo;

  if (!autoUpdater || !app.isPackaged) {
    return { status: 'manual-only', message: 'Soporte manual activado (no empaquetado o sin updater).' };
  }

  const [owner, repository] = repo.split('/');
  autoUpdater.setFeedURL({ provider: 'github', owner, repo: repository, private: false });
  try {
    const result = await autoUpdater.checkForUpdates();
    const currentVersion = normalizeVersion(app.getVersion());
    const remoteVersion = normalizeVersion(result?.updateInfo?.version || result?.updateInfo?.tag_name || '');
    if (currentVersion && remoteVersion && currentVersion === remoteVersion) {
      return { status: 'update-not-available', result, message: 'Versión actual igual a la versión disponible.' };
    }
    return { status: 'checking', result };
  } catch (err) {
    return { status: 'manual-only', error: String(err) };
  }
});

ipcMain.handle('update:download', async (_event, manualUrl) => {
  if (manualUrl) {
    try {
      const tempDir = app.getPath('temp');
      const fileName = manualUrl.split('/').pop() || 'CMMI5-Analyzer-Setup.exe';
      const destPath = path.join(tempDir, fileName);
      manualInstallerPath = destPath;

      downloadManualUpdate(manualUrl, destPath);
      return { status: 'downloading', manual: true };
    } catch (err) {
      return { error: `Error al iniciar descarga manual: ${err.message || err}` };
    }
  }

  if (!autoUpdater || !app.isPackaged) {
    return { error: 'Actualización automática no disponible. Proporciona una URL directa de descarga.' };
  }
  if (!lastUpdateRepo) return { error: 'Primero busca la actualización con el repo correcto.' };

  const [owner, repository] = lastUpdateRepo.split('/');
  autoUpdater.setFeedURL({ provider: 'github', owner, repo: repository, private: false });
  try {
    autoUpdater.downloadUpdate();
    return { status: 'downloading' };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('update:install', async () => {
  if (manualInstallerPath) {
    try {
      if (fs.existsSync(manualInstallerPath)) {
        const { spawn } = require('child_process');
        const child = spawn(manualInstallerPath, [], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();

        setTimeout(() => {
          app.quit();
        }, 1000);
        return { status: 'installing', manual: true };
      } else {
        return { error: 'El instalador descargado no existe. Intenta descargarlo de nuevo.' };
      }
    } catch (err) {
      return { error: `Error al ejecutar instalador manual: ${err.message || err}` };
    }
  }

  if (!autoUpdater || !app.isPackaged) {
    return { error: 'Instalación automática no disponible.' };
  }
  try {
    autoUpdater.quitAndInstall();
    return { status: 'installing' };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle('update:support', async () => {
  return {
    supported: !!autoUpdater,
    isPackaged: app.isPackaged,
    error: autoUpdaterError,
    version: app.getVersion()
  };
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking-for-update'));
  autoUpdater.on('update-available', info => {
    const currentVersion = normalizeVersion(app.getVersion());
    const remoteVersion = normalizeVersion(info?.version || info?.tag_name || '');
    if (currentVersion && remoteVersion && currentVersion === remoteVersion) {
      sendUpdateStatus('update-not-available', { info, message: 'Versión actual igual a la versión disponible.' });
    } else {
      sendUpdateStatus('update-available', { info });
    }
  });
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
