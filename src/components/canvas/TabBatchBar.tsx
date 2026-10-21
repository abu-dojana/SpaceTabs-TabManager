import React from 'react';
import { type Space } from '@/db/schema';
import { FolderInput, Trash2, Plus, X } from 'lucide-react';

interface TabBatchBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  spaces?: Space[];
  activeSpaceId: string | null;
  isMoveDropdownOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement>;
  newSpaceInputRef: React.RefObject<HTMLInputElement>;
  isCreatingNewSpace: boolean;
  newSpaceName: string;
  onSelectAllToggle: () => void;
  onToggleMoveDropdown: (e: React.MouseEvent) => void;
  onMoveSelected: (targetSpaceId: string | null) => void;
  onDeleteSelected: () => void;
  onStartCreateNewSpace: () => void;
  onCancelCreateNewSpace: () => void;
  onSetNewSpaceName: (name: string) => void;
  onMoveToNewSpace: (name: string) => void;
}

export const TabBatchBar: React.FC<TabBatchBarProps> = ({
  selectedCount,
  totalCount,
  allSelected,
  spaces,
  activeSpaceId,
  isMoveDropdownOpen,
  dropdownRef,
  newSpaceInputRef,
  isCreatingNewSpace,
  newSpaceName,
  onSelectAllToggle,
  onToggleMoveDropdown,
  onMoveSelected,
  onDeleteSelected,
  onStartCreateNewSpace,
  onCancelCreateNewSpace,
  onSetNewSpaceName,
  onMoveToNewSpace,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 mr-2">
      <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
        {selectedCount} selected
      </span>

      <button
        onClick={onSelectAllToggle}
        className="px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
      >
        {allSelected ? 'Deselect all' : `Select all (${totalCount})`}
      </button>

      {spaces && (
        <div className="relative" ref={isMoveDropdownOpen ? dropdownRef : undefined}>
          <button
            onClick={onToggleMoveDropdown}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition shadow-sm cursor-pointer"
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span>Move to Space</span>
          </button>

          {isMoveDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Move {selectedCount} tabs to
              </div>

              {/* Move to a New Space (on the fly) */}
              <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                {isCreatingNewSpace ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onMoveToNewSpace(newSpaceName);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      ref={newSpaceInputRef}
                      type="text"
                      value={newSpaceName}
                      onChange={(e) => onSetNewSpaceName(e.target.value)}
                      placeholder="Space name"
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-blue-500 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') onCancelCreateNewSpace();
                      }}
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
                      title="Create and move tabs"
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={onCancelCreateNewSpace}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartCreateNewSpace();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-600/15 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Move to a New Space</span>
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto py-1">
                {activeSpaceId !== null && (
                  <button
                    onClick={() => onMoveSelected(null)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-1"
                  >
                    <span>📄</span>
                    <span className="truncate">Unsaved Session</span>
                  </button>
                )}
                {spaces
                  ?.filter((s) => s.id !== activeSpaceId)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onMoveSelected(s.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition"
                    >
                      <span>{s.icon || '📁'}</span>
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onDeleteSelected}
        className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
        title="Delete selected tabs"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
