const { contextBridge, ipcRenderer } = require('electron')

// Предоставляем безопасные API для работы с заметками
contextBridge.exposeInMainWorld('electronAPI', {
  loadNotes: () => ipcRenderer.invoke('notes:load'),
  saveNotes: (notes) => ipcRenderer.invoke('notes:save', notes),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', id)
})