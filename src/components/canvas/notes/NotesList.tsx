import React from 'react';
import { type Note } from '@/db/schema';
import { formatRelativeTime } from '@/utils/time';
import { FileText, Plus, Trash2, Clock } from 'lucide-react';

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNewNote: () => void;
  onRequestDeleteNote: (noteId: string) => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNewNote,
  onRequestDeleteNote,
}) => {
  return (
    <aside className="w-72 bg-slate-950/70 border-r border-slate-800 flex flex-col flex-shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Notes
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            ({notes.length})
          </span>
        </div>

        <button
          onClick={onCreateNewNote}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
          title="Create a new note in this space"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Notes Cards List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
        {notes.length > 0 ? (
          notes.map((note) => {
            const isSelected = selectedNoteId === note.id;
            const preview =
              note.content.replace(/[#*`_~-]/g, '').trim().slice(0, 75) ||
              'Empty note...';

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`group p-3 rounded-lg cursor-pointer transition relative border ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/40 text-white'
                    : 'border-transparent hover:bg-slate-900/60 text-slate-300 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3
                    className={`text-xs font-semibold truncate ${
                      isSelected ? 'text-blue-300' : 'text-slate-200'
                    }`}
                  >
                    {note.title || 'Untitled Note'}
                  </h3>

                  {/* Delete hover button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDeleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed font-normal">
                  {preview}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(note.updatedAt)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 px-4 text-center">
            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No notes in this space yet.</p>
            <button
              onClick={onCreateNewNote}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create first note</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
