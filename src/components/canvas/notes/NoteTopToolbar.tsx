import React from 'react';
import { type NoteViewMode } from './useNoteEditor';
import { Edit3, Columns2, Eye, Check, Copy, Download, Trash2 } from 'lucide-react';

interface NoteTopToolbarProps {
  viewMode: NoteViewMode;
  onChangeViewMode: (mode: NoteViewMode) => void;
  saveStatus: 'saved' | 'saving';
  isCopied: boolean;
  onCopyNote: () => void;
  onDownloadNote: () => void;
  onRequestDeleteNote: () => void;
}

export const NoteTopToolbar: React.FC<NoteTopToolbarProps> = ({
  viewMode,
  onChangeViewMode,
  saveStatus,
  isCopied,
  onCopyNote,
  onDownloadNote,
  onRequestDeleteNote,
}) => {
  return (
    <header className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
      {/* Left: View Mode Switcher (Edit, Preview, Split) */}
      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
        <button
          onClick={() => onChangeViewMode('edit')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
            viewMode === 'edit'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Editor only"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onChangeViewMode('split')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
            viewMode === 'split'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Side-by-side split view"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>Split</span>
        </button>

        <button
          onClick={() => onChangeViewMode('preview')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
            viewMode === 'preview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Rendered preview"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
      </div>

      {/* Center: Save status */}
      <div className="flex items-center gap-1.5 text-xs">
        {saveStatus === 'saving' ? (
          <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Saving...
          </span>
        ) : (
          <span className="text-emerald-400/80 flex items-center gap-1 font-mono text-[11px]">
            <Check className="w-3 h-3 text-emerald-400" />
            Saved
          </span>
        )}
      </div>

      {/* Right: Actions (Copy, Download, Delete) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCopyNote}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition"
          title="Copy note to clipboard"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{isCopied ? 'Copied' : 'Copy'}</span>
        </button>

        <button
          onClick={onDownloadNote}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
          title="Download note as Markdown (.md)"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRequestDeleteNote}
          className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
          title="Delete this note"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
