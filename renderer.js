class NotesApp {
    constructor() {
        this.notes = [];
        this.currentNoteId = null;
        this.isSaving = false;
        this.editMode = false;
        
        this.initializeElements();
        this.loadNotes();
        this.setupEventListeners();
    }

    initializeElements() {
        this.notesList = document.getElementById('notesList');
        this.contentArea = document.getElementById('contentArea');
        this.emptyState = document.getElementById('emptyState');
        this.contentEditor = document.getElementById('contentEditor');
        this.noteTitleInput = document.getElementById('noteTitleInput');
        this.noteContentInput = document.getElementById('noteContentInput');
        this.newNoteBtn = document.getElementById('newNoteBtn');
        this.saveIndicator = document.getElementById('saveIndicator');
        this.editBtn = document.getElementById('editBtn');
        this.saveBtn = document.getElementById('saveBtn');
    }

    setupEventListeners() {
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.editBtn.addEventListener('click', () => this.enableEditMode());
        this.saveBtn.addEventListener('click', () => this.saveNote());
        
        this.noteTitleInput.addEventListener('input', () => this.onContentChange());
        this.noteContentInput.addEventListener('input', () => this.onContentChange());
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

    async loadNotes() {
        try {
            this.notes = await window.electronAPI.loadNotes();
            this.renderNotesList();
            
            if (this.notes.length > 0) {
                this.selectNote(this.notes[0].id);
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    renderNotesList() {
        this.notesList.innerHTML = '';
        
        this.notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        this.notes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = `note-item ${note.id === this.currentNoteId ? 'active' : ''}`;
            noteElement.innerHTML = `
                <button class="delete-btn" onclick="app.deleteNote('${note.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 1024 1024"><path fill="currentColor" d="M360 184h-8c4.4 0 8-3.6 8-8zh304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32M731.3 840H292.7l-24.2-512h487z"/></svg>
                </button>
                <div class="note-title">${this.escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-date">${this.formatDate(note.updatedAt)}</div>
            `;
            
            noteElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    this.selectNote(note.id);
                }
            });
            
            this.notesList.appendChild(noteElement);
        });
    }

    selectNote(noteId) {
        this.currentNoteId = noteId;
        const note = this.notes.find(n => n.id === noteId);
        
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
        const newNote = {
            id: this.generateId(),
            title: '',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.notes.unshift(newNote);
        this.selectNote(newNote.id);
        this.enableEditMode();
        this.noteTitleInput.focus();
    }

    async saveNote() {
        if (!this.currentNoteId || this.isSaving) return;
        
        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (!note) return;
        
        note.title = this.noteTitleInput.value;
        note.content = this.noteContentInput.value;
        note.updatedAt = new Date().toISOString();
        
        this.isSaving = true;
        this.saveBtn.disabled = true;
        
        try {
            await window.electronAPI.saveNotes(this.notes);
            this.renderNotesList();
            this.showSaveIndicator();
            this.disableEditMode();
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            this.isSaving = false;
        }
    }

    async deleteNote(noteId) {
        if (confirm('Удалить заметку?')) {
            try {
                await window.electronAPI.deleteNote(noteId);
                this.notes = this.notes.filter(note => note.id !== noteId);
                
                if (this.currentNoteId === noteId) {
                    this.currentNoteId = null;
                    this.emptyState.style.display = 'flex';
                    this.contentEditor.style.display = 'none';
                }
                
                this.renderNotesList();
            } catch (error) {
                console.error('Error deleting note:', error);
            }
        }
    }

    showSaveIndicator() {
        this.saveIndicator.classList.add('show');
        setTimeout(() => {
            this.saveIndicator.classList.remove('show');
        }, 2000);
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
        if (diffDays < 7) return `${diffDays - 1} дней назад`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NotesApp();
});