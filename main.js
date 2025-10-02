const { app, BrowserWindow, ipcMain } = require('electron/main');
const path = require('node:path');
const fs = require('fs');

const NOTES_FILE = 'notes.json';

function loadData() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      const data = fs.readFileSync(NOTES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return {
    notes: [],
    folders: [],
  };
}

function saveData(data) {
  try {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
    show: false,
  });

  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
  });

  ipcMain.handle('notes:load', () => {
    return loadData();
  });

  ipcMain.handle('notes:save', (event, data) => {
    return saveData(data);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
