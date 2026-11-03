import React from 'react';
import { db } from '@/db';
import { type Note } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { recordTombstone } from '@/services/driveSync';
import { downloadFile } from '@/utils/download';

export type NoteViewMode = 'edit' | 'preview' | 'split';

interface UseNoteEditorParams {
  targetSpaceId: string;
  notes: Note[] | undefined;
  filteredNotes: Note[];
}

export function useNoteEditor({
  targetSpaceId,
  notes,
  filteredNotes,
}: UseNoteEditorParams) {
  const { pendingNoteId, setPendingNoteId } = useUIStore();
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [titleBuffer, setTitleBuffer] = React.useState('');
  const [contentBuffer, setContentBuffer] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving'>('saved');
  const [viewMode, setViewMode] = React.useState<NoteViewMode>('edit');
  const [isCopied, setIsCopied] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const saveDebounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedNoteIdRef = React.useRef<string | null>(null);

  // Track latest buffers in refs so unmount / flush always has latest values
  const titleRef = React.useRef(titleBuffer);
  const contentRef = React.useRef(contentBuffer);
  const selectedNoteIdRef = React.useRef(selectedNoteId);
  const editRevRef = React.useRef(0);
  const savedRevRef = React.useRef(0);
  const loadedUpdatedAtRef = React.useRef(0);
  const isDirty = () => editRevRef.current !== savedRevRef.current;

  React.useEffect(() => {
    titleRef.current = titleBuffer;
  }, [titleBuffer]);

  React.useEffect(() => {
    contentRef.current = contentBuffer;
  }, [contentBuffer]);

  React.useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId;
  }, [selectedNoteId]);

  // Immediate flush of pending changes (e.g. on blur, note switch, or Ctrl+S)
  const flushSave = async (id?: string) => {
    const targetId = id || selectedNoteIdRef.current;
    if (!targetId || !isDirty()) return;

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
      saveDebounceTimer.current = null;
    }

    const revToSave = editRevRef.current;
    const now = Date.now();
    try {
      await db.notes.update(targetId, {
        title: titleRef.current.trim() || 'Untitled Note',
        content: contentRef.current,
        updatedAt: now,
      });
      savedRevRef.current = Math.max(savedRevRef.current, revToSave);
      loadedUpdatedAtRef.current = Math.max(loadedUpdatedAtRef.current, now);
      if (!isDirty()) {
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to flush note save:', err);
    }
  };

  // Debounced auto-save to Dexie (500ms)
  const triggerAutoSave = (newTitle: string, newContent: string) => {
    const targetId = selectedNoteIdRef.current;
    if (!targetId) return;
    editRevRef.current += 1;
    const scheduledRev = editRevRef.current;
    setSaveStatus('saving');

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }

    saveDebounceTimer.current = setTimeout(async () => {
      if (!targetId || savedRevRef.current >= scheduledRev) return;

      const now = Date.now();
      try {
        await db.notes.update(targetId, {
          title: newTitle.trim() || 'Untitled Note',
          content: newContent,
          updatedAt: now,
        });
        savedRevRef.current = Math.max(savedRevRef.current, scheduledRev);
        loadedUpdatedAtRef.current = Math.max(loadedUpdatedAtRef.current, now);
        if (!isDirty()) {
          setSaveStatus('saved');
        }
      } catch (err) {
        console.error('Failed to auto-save note:', err);
      }
    }, 500);
  };

  // Check if a note should be deep-selected from global search
  React.useEffect(() => {
    if (pendingNoteId && notes) {
      const match = notes.find((n) => n.id === pendingNoteId);
      if (match) {
        setSelectedNoteId(match.id);
        setTitleBuffer(match.title || '');
        setContentBuffer(match.content || '');
        loadedNoteIdRef.current = match.id;
        loadedUpdatedAtRef.current = match.updatedAt || 0;
        editRevRef.current = 0;
        savedRevRef.current = 0;
        setSaveStatus('saved');
        setPendingNoteId(null);
      }
    }
  }, [pendingNoteId, notes, setPendingNoteId]);

  // Reset selected note when switching spaces (flushing current note first)
  React.useEffect(() => {
    if (isDirty() && selectedNoteIdRef.current) {
      flushSave(selectedNoteIdRef.current);
    }
    setSelectedNoteId(null);
    loadedNoteIdRef.current = null;
    loadedUpdatedAtRef.current = 0;
    editRevRef.current = 0;
    savedRevRef.current = 0;
    setTitleBuffer('');
    setContentBuffer('');
    setSaveStatus('saved');
  }, [targetSpaceId]);

  // Sync selected note into editor buffer when note selection changes or remote sync updates a clean note
  React.useEffect(() => {
    if (!notes) return;

    // Case 1: A note is currently selected
    if (selectedNoteId) {
      const current = notes.find((n) => n.id === selectedNoteId);
      if (current) {
        if (loadedNoteIdRef.current !== selectedNoteId) {
          setTitleBuffer(current.title || '');
          setContentBuffer(current.content || '');
          loadedNoteIdRef.current = selectedNoteId;
          loadedUpdatedAtRef.current = current.updatedAt || 0;
          editRevRef.current = 0;
          savedRevRef.current = 0;
          setSaveStatus('saved');
        } else if (!isDirty() && (current.updatedAt || 0) > loadedUpdatedAtRef.current) {
          // Refresh clean buffer when background sync delivers newer remote content
          setTitleBuffer(current.title || '');
          setContentBuffer(current.content || '');
          loadedUpdatedAtRef.current = current.updatedAt || 0;
          setSaveStatus('saved');
        }
      } else {
        // Note was deleted
        setSelectedNoteId(null);
        loadedNoteIdRef.current = null;
        loadedUpdatedAtRef.current = 0;
      }
      return;
    }

    // Case 2: No note currently selected -> auto-select first note if available
    if (filteredNotes.length > 0) {
      const first = filteredNotes[0];
      setSelectedNoteId(first.id);
      setTitleBuffer(first.title || '');
      setContentBuffer(first.content || '');
      loadedNoteIdRef.current = first.id;
      loadedUpdatedAtRef.current = first.updatedAt || 0;
      editRevRef.current = 0;
      savedRevRef.current = 0;
      setSaveStatus('saved');
    } else {
      setTitleBuffer('');
      setContentBuffer('');
      loadedNoteIdRef.current = null;
      loadedUpdatedAtRef.current = 0;
    }
  }, [selectedNoteId, notes, filteredNotes]);

  // Clean up timer and flush unsaved work on unmount
  React.useEffect(() => {
    return () => {
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
      }
      if (isDirty() && selectedNoteIdRef.current) {
        db.notes
          .update(selectedNoteIdRef.current, {
            title: titleRef.current.trim() || 'Untitled Note',
            content: contentRef.current,
            updatedAt: Date.now(),
          })
          .catch(() => {});
      }
    };
  }, []);

  // Handle switching to a different note (flushes pending changes first)
  const handleSelectNote = async (newNoteId: string) => {
    if (newNoteId === selectedNoteId) return;
    if (selectedNoteId && isDirty()) {
      await flushSave(selectedNoteId);
    }
    setSelectedNoteId(newNoteId);
  };

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitleBuffer(val);
    triggerAutoSave(val, contentBuffer);
  };

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContentBuffer(val);
    triggerAutoSave(titleBuffer, val);
  };

  // Create new note
  const handleCreateNewNote = async () => {
    if (selectedNoteId && isDirty()) {
      await flushSave(selectedNoteId);
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const newNote: Note = {
      id,
      spaceId: targetSpaceId,
      title: 'Untitled Note',
      content: '',
      createdAt: now,
      updatedAt: now,
    };

    await db.notes.add(newNote);
    loadedNoteIdRef.current = id;
    loadedUpdatedAtRef.current = now;
    editRevRef.current = 0;
    savedRevRef.current = 0;
    setSelectedNoteId(id);
    setTitleBuffer(newNote.title);
    setContentBuffer(newNote.content);
    setSaveStatus('saved');
    setViewMode('edit');

    // Focus editor after creation
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    recordTombstone(id, 'notes').catch(() => {});
    await db.notes.delete(id);
    setConfirmDeleteId(null);
    if (selectedNoteId === id) {
      const remaining = filteredNotes.filter((n) => n.id !== id);
      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
      } else {
        setSelectedNoteId(null);
      }
    }
  };

  // Copy note content
  const handleCopyNote = async () => {
    const fullText = `${titleBuffer}\n\n${contentBuffer}`.trim();
    await navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  // Export / Download note as .md
  const handleDownloadNote = () => {
    const fullText = `# ${titleBuffer}\n\n${contentBuffer}`.trim();
    const safeTitle = (titleBuffer || 'untitled').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    downloadFile(fullText, `${safeTitle}.md`, 'text/markdown;charset=utf-8');
  };

  // Interactive todo checkbox toggle in Markdown preview
  const handleToggleTodo = (lineIndex: number) => {
    const lines = contentBuffer.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    if (line.startsWith('- [ ] ')) {
      lines[lineIndex] = `- [x] ${line.slice(6)}`;
    } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      lines[lineIndex] = `- [ ] ${line.slice(6)}`;
    }

    const updatedContent = lines.join('\n');
    setContentBuffer(updatedContent);
    triggerAutoSave(titleBuffer, updatedContent);
  };

  // Formatting toolbar helper
  const insertFormatting = (
    prefix: string,
    suffix: string = '',
    defaultPlaceholder: string = ''
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = contentBuffer.substring(start, end) || defaultPlaceholder;

    const before = contentBuffer.substring(0, start);
    const after = contentBuffer.substring(end);

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = `${before}${replacement}${after}`;

    setContentBuffer(newContent);
    triggerAutoSave(titleBuffer, newContent);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  // Support Tab key (2 spaces) and Ctrl shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertFormatting('  ', '', '');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('**', '**', 'bold text');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('*', '*', 'italic text');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      flushSave();
    }
  };

  return {
    selectedNoteId,
    titleBuffer,
    contentBuffer,
    saveStatus,
    viewMode,
    setViewMode,
    isCopied,
    confirmDeleteId,
    setConfirmDeleteId,
    textareaRef,
    flushSave,
    handleSelectNote,
    handleTitleChange,
    handleContentChange,
    handleCreateNewNote,
    handleDeleteNote,
    handleCopyNote,
    handleDownloadNote,
    handleToggleTodo,
    insertFormatting,
    handleKeyDown,
  };
}
