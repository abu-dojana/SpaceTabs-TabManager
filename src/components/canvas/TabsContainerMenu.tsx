import React from 'react';
import { type Space } from '@/db/schema';
import {
  MoreVertical,
  Link2,
  Check,
  ArrowDownAZ,
  Globe,
  Download,
  CheckSquare,
  FolderInput,
  PauseCircle,
  RotateCw,
  Copy,
  Trash2,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface TabsContainerMenuProps {
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  isCopiedAll: boolean;
  allSelected: boolean;
  spaces?: Space[];
  activeSpaceId: string | null;
  showMoveAllSubmenu: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onToggleMoveAllSubmenu: (e: React.MouseEvent) => void;
  onCopyAllLinks: () => void;
  onSortAlphabetically: () => void;
  onSortByDomain: () => void;
  onExportSpace: () => void;
  onSelectAllToggle: () => void;
  onMoveAllTabs: (targetSpaceId: string | null) => void;
  onSuspendAllTabs: () => void;
  onReloadAllTabs: () => void;
  onCloseDuplicates: () => void;
  onCloseAllTabs: () => void;
}

export const TabsContainerMenu: React.FC<TabsContainerMenuProps> = ({
  isOpen,
  menuRef,
  isCopiedAll,
  allSelected,
  spaces,
  activeSpaceId,
  showMoveAllSubmenu,
  onToggleMenu,
  onToggleMoveAllSubmenu,
  onCopyAllLinks,
  onSortAlphabetically,
  onSortByDomain,
  onExportSpace,
  onSelectAllToggle,
  onMoveAllTabs,
  onSuspendAllTabs,
  onReloadAllTabs,
  onCloseDuplicates,
  onCloseAllTabs,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggleMenu}
        className={`p-1 rounded transition cursor-pointer ${
          isOpen
            ? 'bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
            : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title="Tab options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Tabs Container Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Copy all links */}
          <button
            onClick={onCopyAllLinks}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5">
              <Link2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy all links</span>
            </div>
            {isCopiedAll && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Copied
              </span>
            )}
          </button>

          {/* 2. Sort alphabetically */}
          <button
            onClick={onSortAlphabetically}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition"
          >
            <ArrowDownAZ className="w-3.5 h-3.5 text-slate-400" />
            <span>Sort alphabetically</span>
          </button>

          {/* 3. Sort by domain */}
          <button
            onClick={onSortByDomain}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Sort by domain</span>
          </button>

          {/* 4. Export this space */}
          <button
            onClick={onExportSpace}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export this space</span>
          </button>

          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

          {/* 5. Select all tabs */}
          <button
            onClick={onSelectAllToggle}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition"
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>{allSelected ? 'Deselect all' : 'Select all tabs'}</span>
          </button>

          {/* 6. Move all tabs */}
          {spaces && (
            <div className="relative">
              <button
                onClick={onToggleMoveAllSubmenu}
                className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5">
                  <FolderInput className="w-3.5 h-3.5 text-slate-400" />
                  <span>Move all tabs</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Flyout Submenu for target spaces */}
              {showMoveAllSubmenu && (
                <div className="absolute right-full top-0 mr-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 z-50 max-h-60 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Move all to
                  </div>
                  {activeSpaceId !== null && (
                    <button
                      onClick={() => onMoveAllTabs(null)}
                      className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">Unsaved Session</span>
                    </button>
                  )}
                  {spaces
                    .filter((s) => s.id !== activeSpaceId)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onMoveAllTabs(s.id)}
                        className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition"
                      >
                        <span>{s.icon || '📁'}</span>
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

          {/* 7. Suspend all tabs */}
          <button
            onClick={onSuspendAllTabs}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Suspend all tabs</span>
          </button>

          {/* 8. Reload all tabs */}
          <button
            onClick={onReloadAllTabs}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-500" />
            <span>Reload all tabs</span>
          </button>

          {/* 9. Close duplicate tabs */}
          <button
            onClick={onCloseDuplicates}
            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Close duplicate tabs</span>
          </button>

          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

          {/* 10. Close all tabs in this space */}
          <button
            onClick={onCloseAllTabs}
            className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-2.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>Close all tabs</span>
          </button>
        </div>
      )}
    </div>
  );
};
