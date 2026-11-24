import React from 'react';
import { type Note } from '@/db/schema';
import { formatRelativeTime } from '@/utils/time';
import { useFixedPopover } from '@/hooks/useFixedPopover';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  FileText,
  Plus,
  Trash2,
  Clock,
  GripVertical,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
} from 'lucide-react';

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNewNote: () => void;
  onRequestDeleteNote: (noteId: string) => void;
  onReorderNotes: (fromId: string, toId: string, position: 'top' | 'bottom') => void;
  onSortNotes: (mode: 'az' | 'za' | 'updated' | 'created') => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNewNote,
  onRequestDeleteNote,
  onReorderNotes,
  onSortNotes,
}) => {
  const [draggingNoteId, setDraggingNoteId] = React.useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = React.useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = React.useState<'top' | 'bottom' | null>(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = React.useState(false);

  const sortWrapperRef = React.useRef<HTMLDivElement>(null);
  const sortPopoverRef = useFixedPopover({
    isOpen: isSortMenuOpen,
    align: 'right',
    offset: 6,
  });

  useClickOutside([sortWrapperRef], () => setIsSortMenuOpen(false), isSortMenuOpen, true);

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

        <div className="flex items-center gap-1.5">
          {notes.length > 1 && (
            <div className="relative" ref={sortWrapperRef}>
              <button
                onClick={() => setIsSortMenuOpen((prev) => !prev)}
                className={`p-1.5 rounded border text-xs transition ${
                  isSortMenuOpen
                    ? 'bg-slate-800 border-blue-500/40 text-blue-400'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Sort notes"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>

              {isSortMenuOpen && (
                <div
                  ref={sortPopoverRef}
                  className="fixed z-50 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs"
                >
                  <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                    Sort notes by
                  </div>
                  <button
                    onClick={() => {
                      setIsSortMenuOpen(false);
                      onSortNotes('az');
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                  >
                    <ArrowDownAZ className="w-3.5 h-3.5 text-slate-400" />
                    <span>Title (A–Z)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsSortMenuOpen(false);
                      onSortNotes('za');
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                  >
                    <ArrowUpAZ className="w-3.5 h-3.5 text-slate-400" />
                    <span>Title (Z–A)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsSortMenuOpen(false);
                      onSortNotes('updated');
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recently updated</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsSortMenuOpen(false);
                      onSortNotes('created');
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date created</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onCreateNewNote}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
            title="Create a new note in this space"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Notes Cards List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
        {notes.length > 0 ? (
          notes.map((note) => {
            const isSelected = selectedNoteId === note.id;
            const isDragging = draggingNoteId === note.id;
            const dropIndicator = dragOverNoteId === note.id ? dragOverPosition : null;
            const preview =
              note.content.replace(/[#*`_~-]/g, '').trim().slice(0, 75) ||
              'Empty note...';

            return (
              <div
                key={note.id}
                draggable={true}
                onDragStart={(e) => {
                  setDraggingNoteId(note.id);
                  e.dataTransfer.setData('text/plain', note.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggingNoteId(null);
                  setDragOverNoteId(null);
                  setDragOverPosition(null);
                }}
                onDragOver={(e) => {
                  if (!draggingNoteId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (draggingNoteId === note.id) {
                    if (dragOverNoteId !== null) {
                      setDragOverNoteId(null);
                      setDragOverPosition(null);
                    }
                    return;
                  }
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const pos: 'top' | 'bottom' =
                    e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
                  if (dragOverNoteId !== note.id || dragOverPosition !== pos) {
                    setDragOverNoteId(note.id);
                    setDragOverPosition(pos);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverNoteId === note.id) {
                    setDragOverNoteId(null);
                    setDragOverPosition(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId = draggingNoteId || e.dataTransfer.getData('text/plain');
                  const pos = dragOverPosition || 'bottom';
                  setDraggingNoteId(null);
                  setDragOverNoteId(null);
                  setDragOverPosition(null);
                  if (fromId && fromId !== note.id) {
                    onReorderNotes(fromId, note.id, pos);
                  }
                }}
                onClick={() => onSelectNote(note.id)}
                className={`group p-3 rounded-lg cursor-pointer transition relative border ${
                  isDragging
                    ? 'opacity-40 border-dashed border-blue-500/50'
                    : isSelected
                    ? 'bg-blue-600/10 border-blue-500/40 text-white'
                    : 'border-transparent hover:bg-slate-900/60 text-slate-300 hover:border-slate-800'
                } ${
                  dropIndicator === 'top'
                    ? 'border-t-2 border-t-blue-500'
                    : dropIndicator === 'bottom'
                    ? 'border-b-2 border-b-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className="text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition flex-shrink-0 -ml-1"
                      onClick={(e) => e.stopPropagation()}
                      title="Drag to reorder note"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-blue-300' : 'text-slate-200'
                      }`}
                    >
                      {note.title || 'Untitled Note'}
                    </h3>
                  </div>

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
