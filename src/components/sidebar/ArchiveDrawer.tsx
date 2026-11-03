import React from 'react';
import { Archive, ChevronDown, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { type Space } from '@/db/schema';

interface ArchiveDrawerProps {
  archivedSpaces: Space[] | undefined;
  isOpen: boolean;
  onToggleOpen: () => void;
  onRestoreSpace: (spaceId: string) => void;
  onRequestDeleteSpace: (space: Space) => void;
}

export const ArchiveDrawer: React.FC<ArchiveDrawerProps> = ({
  archivedSpaces,
  isOpen,
  onToggleOpen,
  onRestoreSpace,
  onRequestDeleteSpace,
}) => {
  return (
    <div>
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-300 transition"
      >
        <div className="flex items-center gap-2">
          <Archive className="w-3.5 h-3.5" />
          <span>Archive</span>
        </div>
        <div className="flex items-center gap-1.5">
          {archivedSpaces && archivedSpaces.length > 0 && (
            <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
              {archivedSpaces.length}
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1 pl-2 border-l border-slate-800/80 ml-2">
          {archivedSpaces && archivedSpaces.length > 0 ? (
            archivedSpaces.map((space) => (
              <div
                key={space.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-900 group"
              >
                <span className="truncate flex items-center gap-2 flex-1 mr-2">
                  <span>{space.icon || '📁'}</span>
                  <span className="truncate line-through opacity-70">{space.name}</span>
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onRestoreSpace(space.id)}
                    className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition"
                    title="Restore Space"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRequestDeleteSpace(space)}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded transition"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-2 py-1.5 text-[11px] text-slate-500 italic">No archived spaces</div>
          )}
        </div>
      )}
    </div>
  );
};
