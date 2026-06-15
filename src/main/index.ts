import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initDatabase } from './database';
import { registerIpcHandlers } from './ipc';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    title: 'Guías de Flete Chile',
    backgroundColor: '#f8fafc',
    show: false,
  });

  // Content Security Policy — prevents XSS from escalating to IPC/RCE
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 ws://localhost:5173; img-src 'self' data: blob:; font-src 'self' data:"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'",
        ],
      },
    });
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // app.getAppPath() returns the asar root — reliable in all contexts
    const htmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(htmlPath).catch(err => {
      console.error('loadFile failed:', htmlPath, err);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Log renderer errors so we can see them in production
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Renderer failed to load:', code, desc);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  // Create window immediately so user sees loading state, not blank
  createWindow();
  registerIpcHandlers();

  try {
    await initDatabase();
  } catch (err) {
    console.error('Database init failed:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
