const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const fs = require('fs')

const NOTES_FILE = 'notes.json'

// Функция для загрузки заметок из файла
function loadNotes() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      const data = fs.readFileSync(NOTES_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading notes:', error)
  }
  return []
}

// Функция для сохранения заметок в файл
function saveNotes(notes) {
  try {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2))
    return true
  } catch (error) {
    console.error('Error saving notes:', error)
    return false
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    show: false
  })

  win.loadFile('index.html')

  win.once('ready-to-show', () => {
    win.show()
  })

  // Обработчики IPC для работы с заметками
  ipcMain.handle('notes:load', () => {
    return loadNotes()
  })

  ipcMain.handle('notes:save', (event, notes) => {
    return saveNotes(notes)
  })

  ipcMain.handle('notes:delete', (event, id) => {
    const notes = loadNotes()
    const filteredNotes = notes.filter(note => note.id !== id)
    return saveNotes(filteredNotes)
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})