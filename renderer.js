class NotesApp {
  constructor() {
    this.notes = [];
    this.folders = [];
    this.currentNoteId = null;
    this.currentFolderId = null;
    this.isSaving = false;
    this.editMode = false;
    this.isDark = false;
    this.contextMenuFolderId = null;
    this.renamingFolderId = null;

    this.initializeElements();
    this.loadTheme();
    this.loadData();
    this.setupEventListeners();
    this.setupContextMenu();
  }

  initializeElements() {
    this.notesList = document.getElementById('notesList');
    this.contentArea = document.getElementById('contentArea');
    this.emptyState = document.getElementById('emptyState');
    this.contentEditor = document.getElementById('contentEditor');
    this.noteTitleInput = document.getElementById('noteTitleInput');
    this.noteContentInput = document.getElementById('noteContentInput');
    this.newNoteBtn = document.getElementById('newNoteBtn');
    this.newFolderBtn = document.getElementById('newFolderBtn');
    this.saveIndicator = document.getElementById('saveIndicator');
    this.editBtn = document.getElementById('editBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.deleteNoteBtn = document.getElementById('deleteNoteBtn');
    this.themeToggle = document.getElementById('themeToggle');
    this.foldersTabs = document.getElementById('foldersTabs');
    this.folderContextMenu = document.getElementById('folderContextMenu');
  }

  setupEventListeners() {
    this.newNoteBtn.addEventListener('click', () => this.createNewNote());
    this.newFolderBtn.addEventListener('click', () => this.createNewFolder());
    this.editBtn.addEventListener('click', () => this.enableEditMode());
    this.saveBtn.addEventListener('click', () => this.saveNote());
    this.deleteNoteBtn.addEventListener('click', () =>
      this.deleteCurrentNote()
    );
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    this.noteTitleInput.addEventListener('input', () => this.onContentChange());
    this.noteContentInput.addEventListener('input', () =>
      this.onContentChange()
    );

    document.addEventListener('click', () => {
      this.hideContextMenu();
    });
  }

  setupContextMenu() {
    document.getElementById('renameFolder').addEventListener('click', () => {
      if (this.contextMenuFolderId) {
        this.startRenamingFolder(this.contextMenuFolderId);
      }
      this.hideContextMenu();
    });

    document.getElementById('deleteFolder').addEventListener('click', () => {
      if (this.contextMenuFolderId) {
        this.deleteFolder(this.contextMenuFolderId);
      }
      this.hideContextMenu();
    });
  }

  showContextMenu(x, y, folderId) {
    this.contextMenuFolderId = folderId;
    this.folderContextMenu.style.display = 'block';
    this.folderContextMenu.style.left = x + 'px';
    this.folderContextMenu.style.top = y + 'px';
  }

  hideContextMenu() {
    this.folderContextMenu.style.display = 'none';
    this.contextMenuFolderId = null;
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    this.isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    this.applyTheme(this.isDark);
  }

  applyTheme(isDark) {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.isDark = isDark;
  }

  toggleTheme() {
    this.applyTheme(!this.isDark);
  }

  onContentChange() {
    if (this.editMode) {
      this.saveBtn.disabled = false;
    }
  }

  enableEditMode() {
    this.editMode = true;
    this.noteTitleInput.readOnly = false;
    this.noteContentInput.readOnly = false;
    this.editBtn.style.display = 'none';
    this.saveBtn.style.display = 'block';
    this.noteTitleInput.focus();
  }

  disableEditMode() {
    this.editMode = false;
    this.noteTitleInput.readOnly = true;
    this.noteContentInput.readOnly = true;
    this.editBtn.style.display = 'block';
    this.saveBtn.style.display = 'none';
    this.saveBtn.disabled = true;
  }

  async loadData() {
    try {
      const data = await window.electronAPI.loadNotes();
      this.notes = data.notes || [];
      this.folders = data.folders || [];

      if (this.folders.length > 0) {
        this.currentFolderId = this.folders[0].id;
      }

      this.renderFoldersTabs();
      this.renderNotesList();

      if (this.notes.length > 0 && this.currentFolderId) {
        const folderNotes = this.notes.filter(
          (note) => note.folderId === this.currentFolderId
        );
        if (folderNotes.length > 0) {
          this.selectNote(folderNotes[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  renderFoldersTabs() {
    this.foldersTabs.innerHTML = '';

    this.folders.forEach((folder) => {
      const tabElement = document.createElement('div');
      tabElement.className = `folder-tab ${folder.id === this.currentFolderId ? 'active' : ''} ${this.renamingFolderId === folder.id ? 'editing' : ''}`;

      if (this.renamingFolderId === folder.id) {
        tabElement.innerHTML = `
          <input 
            type="text" 
            class="folder-rename-input" 
            value="${this.escapeHtml(folder.name)}"
            maxlength="20"
          >
        `;

        const input = tabElement.querySelector('.folder-rename-input');
        input.focus();
        input.select();

        const saveRename = () => {
          const newName = input.value.trim();
          if (newName) {
            folder.name = newName;
            this.saveData();
          }
          this.renamingFolderId = null;
          this.renderFoldersTabs();
        };

        input.addEventListener('blur', saveRename);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            saveRename();
          } else if (e.key === 'Escape') {
            this.renamingFolderId = null;
            this.renderFoldersTabs();
          }
        });
      } else {
        tabElement.innerHTML = `
          <span class="folder-name">${this.escapeHtml(folder.name)}</span>
        `;

        tabElement.addEventListener('click', (e) => {
          if (!e.target.classList.contains('folder-rename-input')) {
            this.selectFolder(folder.id);
          }
        });

        tabElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.showContextMenu(e.clientX, e.clientY, folder.id);
        });
      }

      this.foldersTabs.appendChild(tabElement);
    });
  }

  startRenamingFolder(folderId) {
    this.renamingFolderId = folderId;
    this.renderFoldersTabs();
  }

  selectFolder(folderId) {
    this.currentFolderId = folderId;
    this.renderFoldersTabs();
    this.renderNotesList();
    this.currentNoteId = null;
    this.emptyState.style.display = 'flex';
    this.contentEditor.style.display = 'none';
  }

  renderNotesList() {
    this.notesList.innerHTML = '';

    if (!this.currentFolderId) {
      this.emptyState.style.display = 'flex';
      this.contentEditor.style.display = 'none';
      return;
    }

    const folderNotes = this.notes.filter(
      (note) => note.folderId === this.currentFolderId
    );

    folderNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (folderNotes.length === 0) {
      this.emptyState.style.display = 'flex';
      this.contentEditor.style.display = 'none';
    }

    folderNotes.forEach((note) => {
      const noteElement = document.createElement('div');
      noteElement.className = `note-item ${note.id === this.currentNoteId ? 'active' : ''}`;
      noteElement.innerHTML = `
        <div class="note-title">${this.escapeHtml(note.title || 'Без названия')}</div>
        <div class="note-date">${this.formatDate(note.updatedAt)}</div>
      `;

      noteElement.addEventListener('click', () => {
        this.selectNote(note.id);
      });

      this.notesList.appendChild(noteElement);
    });
  }

  selectNote(noteId) {
    this.currentNoteId = noteId;
    const note = this.notes.find((n) => n.id === noteId);

    if (note) {
      this.emptyState.style.display = 'none';
      this.contentEditor.style.display = 'flex';
      this.contentEditor.style.flexDirection = 'column';
      this.contentEditor.style.height = '100%';

      this.noteTitleInput.value = note.title || '';
      this.noteContentInput.value = note.content || '';

      this.disableEditMode();
      this.renderNotesList();
    }
  }

  createNewNote() {
    if (!this.currentFolderId) {
      alert('Сначала создайте папку для заметок');
      return;
    }

    const newNote = {
      id: this.generateId(),
      title: '',
      content: '',
      folderId: this.currentFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.notes.unshift(newNote);
    this.selectNote(newNote.id);
    this.enableEditMode();
    this.noteTitleInput.focus();
    this.saveData();
  }

  createNewFolder() {
    const newFolder = {
      id: this.generateId(),
      name: 'Новая папка',
    };

    this.folders.push(newFolder);
    this.selectFolder(newFolder.id);
    this.saveData();
  }

  async saveNote() {
    if (!this.currentNoteId || this.isSaving) return;

    const note = this.notes.find((n) => n.id === this.currentNoteId);
    if (!note) return;

    note.title = this.noteTitleInput.value;
    note.content = this.noteContentInput.value;
    note.updatedAt = new Date().toISOString();

    this.isSaving = true;
    this.saveBtn.disabled = true;

    try {
      await this.saveData();
      this.renderNotesList();
      this.showSaveIndicator();
      this.disableEditMode();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      this.isSaving = false;
    }
  }

  async deleteCurrentNote() {
    if (this.currentNoteId) {
      await this.deleteNote(this.currentNoteId);
    }
  }

  async deleteNote(noteId) {
    if (confirm('Удалить заметку?')) {
      try {
        this.notes = this.notes.filter((note) => note.id !== noteId);

        if (this.currentNoteId === noteId) {
          this.currentNoteId = null;
          this.emptyState.style.display = 'flex';
          this.contentEditor.style.display = 'none';
        }

        await this.saveData();
        this.renderNotesList();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  }

  async deleteFolder(folderId) {
    if (confirm('Удалить папку и все заметки в ней?')) {
      try {
        this.notes = this.notes.filter((note) => note.folderId !== folderId);
        this.folders = this.folders.filter((folder) => folder.id !== folderId);

        if (this.currentFolderId === folderId) {
          this.currentFolderId = this.folders[0]?.id || null;
        }

        await this.saveData();
        this.renderFoldersTabs();
        this.renderNotesList();
      } catch (error) {
        console.error('Error deleting folder:', error);
      }
    }
  }

  async saveData() {
    const data = {
      notes: this.notes,
      folders: this.folders,
    };
    await window.electronAPI.saveNotes(data);
  }

  showSaveIndicator() {
    this.saveIndicator.classList.add('show');
    setTimeout(() => {
      this.saveIndicator.classList.remove('show');
    }, 5000);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Сегодня';
    if (diffDays === 2) return 'Вчера';
    return `${diffDays - 1} дней назад`;
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new NotesApp();
});
