import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { FileText, Plus } from 'lucide-react';
import { MarkdownRenderer } from './notes/markdown/MarkdownRenderer';
import { useNoteEditor } from './notes/useNoteEditor';
import { NotesList } from './notes/NotesList';
import { NoteTopToolbar } from './notes/NoteTopToolbar';
import { FormattingToolbar } from './notes/FormattingToolbar';
import { DeleteNoteModal } from './notes/DeleteNoteModal';

export const NotesView: React.FC = () => {
  const { activeSpaceId, searchQuery } = useUIStore();
  const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

  // Active space metadata
  const activeSpace = useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId]
  );

  // Notes for this space
  const notes = useLiveQuery(
    () => db.notes.where('spaceId').equals(targetSpaceId).toArray(),
    [targetSpaceId]
  );

  // Filter notes based on global search query
  const filteredNotes = React.useMemo(() => {
    if (!notes) return [];
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!query) return sorted;
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  const {
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
  } = useNoteEditor({
    targetSpaceId,
    notes,
    filteredNotes,
  });

  return (
    <div className="flex-1 flex h-[calc(100vh-68px)] overflow-hidden select-none">
      {/* Left Sidebar: Notes List */}
      <NotesList
        notes={filteredNotes}
        selectedNoteId={selectedNoteId}
        onSelectNote={handleSelectNote}
        onCreateNewNote={handleCreateNewNote}
        onRequestDeleteNote={(id) => setConfirmDeleteId(id)}
      />

      {/* Main Workspace Area: Active Note Editor & Preview */}
      <main className="flex-1 flex flex-col bg-slate-900/30 overflow-hidden">
        {selectedNoteId ? (
          <>
            {/* Note Top Toolbar */}
            <NoteTopToolbar
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              saveStatus={saveStatus}
              isCopied={isCopied}
              onCopyNote={handleCopyNote}
              onDownloadNote={handleDownloadNote}
              onRequestDeleteNote={() => setConfirmDeleteId(selectedNoteId)}
            />

            {/* Note Title Input Bar */}
            <div className="px-8 pt-6 pb-2">
              <input
                type="text"
                value={titleBuffer}
                onChange={handleTitleChange}
                onBlur={() => flushSave()}
                placeholder="Note Title..."
                className="w-full bg-transparent text-xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none tracking-tight"
              />
            </div>

            {/* Markdown Quick Formatting Toolbar (Visible in Edit and Split mode) */}
            {viewMode !== 'preview' && (
              <FormattingToolbar onInsertFormatting={insertFormatting} />
            )}

            {/* Note Body Area (Edit / Preview / Split) */}
            <div className="flex-1 overflow-hidden flex">
              {/* Textarea Editor Pane */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div
                  className={`flex-1 h-full overflow-y-auto p-8 ${
                    viewMode === 'split' ? 'border-r border-slate-800' : ''
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    value={contentBuffer}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    onBlur={() => flushSave()}
                    placeholder="Write markdown notes, brainstorm ideas, paste snippets, or track checklist items..."
                    className="w-full h-full bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-mono leading-relaxed selection:bg-blue-600/30"
                  />
                </div>
              )}

              {/* Rendered Markdown Preview Pane */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="flex-1 h-full overflow-y-auto p-8 bg-slate-950/30">
                  <MarkdownRenderer
                    content={contentBuffer}
                    onToggleTodo={handleToggleTodo}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State when no note is selected */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <FileText className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Note Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Select a note from the left sidebar or create a new scratchpad for &quot;
              {activeSpace?.name || 'this space'}&quot;.
            </p>
            <button
              onClick={handleCreateNewNote}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteNoteModal
        confirmDeleteId={confirmDeleteId}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirmDelete={handleDeleteNote}
      />
    </div>
  );
};
