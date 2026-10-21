import React from 'react';
import { type Tab, type Space } from '@/db/schema';
import {
  GripVertical,
  Crosshair,
  Copy,
  Check,
  FolderInput,
  Trash2,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react';

interface TabItemProps {
  tab: Tab;
  isSelected: boolean;
  isDropdownOpen: boolean;
  isNearBottom: boolean;
  isDragging: boolean;
  isOpenInThisWindow: boolean;
  isOpenInOtherWindow: boolean;
  copiedId: string | null;
  spaces?: Space[];
  activeSpaceId: string | null;
  dropdownRef: React.RefObject<HTMLDivElement>;
  newSpaceInputRef: React.RefObject<HTMLInputElement>;
  isCreatingNewSpace: boolean;
  newSpaceName: string;
  renderFavicon: (url: string, favIconUrl?: string) => React.ReactNode;
  onToggleSelect: () => void;
  onLocateOrOpen: () => void;
  onCopyUrl: () => void;
  onCloseTab: () => void;
  onToggleDropdown: (e: React.MouseEvent) => void;
  onMoveToSpace: (targetSpaceId: string | null) => void;
  onStartCreateNewSpace: () => void;
  onCancelCreateNewSpace: () => void;
  onSetNewSpaceName: (name: string) => void;
  onMoveToNewSpace: (name: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export const TabItem: React.FC<TabItemProps> = ({
  tab,
  isSelected,
  isDropdownOpen,
  isNearBottom,
  isDragging,
  isOpenInThisWindow,
  isOpenInOtherWindow,
  copiedId,
  spaces,
  activeSpaceId,
  dropdownRef,
  newSpaceInputRef,
  isCreatingNewSpace,
  newSpaceName,
  renderFavicon,
  onToggleSelect,
  onLocateOrOpen,
  onCopyUrl,
  onCloseTab,
  onToggleDropdown,
  onMoveToSpace,
  onStartCreateNewSpace,
  onCancelCreateNewSpace,
  onSetNewSpaceName,
  onMoveToNewSpace,
  onDragStart,
  onDragEnd,
}) => {
  return (
    <div
      key={tab.id}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group flex items-center justify-between py-2 px-3 rounded-lg transition-colors duration-100 relative ${
        isDragging
          ? 'opacity-40 border border-dashed border-blue-500/60 bg-blue-500/5'
          : isSelected || isDropdownOpen
          ? 'bg-blue-50/80 border border-blue-200/80 text-blue-900 dark:bg-blue-600/10 dark:border-blue-500/30 dark:text-blue-200 shadow-sm'
          : 'hover:bg-slate-100/90 dark:hover:bg-slate-800/50 border border-transparent'
      }`}
    >
      {/* Left: Grip + Checkbox + Favicon + Title + Window Status */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
        <div
          className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1"
          title="Drag tab to a Space in sidebar"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="cursor-pointer flex-shrink-0 accent-blue-600"
        />

        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          {renderFavicon(tab.url, tab.favIconUrl)}
        </div>

        <button
          onClick={onLocateOrOpen}
          className="text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium truncate text-left transition"
          title={tab.title}
        >
          {tab.title || tab.url}
        </button>

        {/* Window Status Badges */}
        {isOpenInThisWindow && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            title="Tab is currently open in this browser window"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            This Window
          </span>
        )}

        {isOpenInOtherWindow && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/90 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            title="Tab is currently open in another browser window"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Another Window
          </span>
        )}
      </div>

      {/* Right Actions (shown on hover or active dropdown) */}
      <div
        className={`flex items-center gap-1 transition-opacity ${
          isDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {/* Locate Tab Button */}
        <button
          onClick={onLocateOrOpen}
          className={`p-1 rounded transition ${
            isOpenInOtherWindow
              ? 'hover:bg-purple-100 text-purple-600 dark:hover:bg-purple-500/20 dark:text-purple-400 dark:hover:text-purple-200'
              : isOpenInThisWindow
              ? 'hover:bg-emerald-100 text-emerald-600 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:hover:text-emerald-200'
              : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title={
            isOpenInOtherWindow
              ? 'Locate & switch to tab in another window'
              : isOpenInThisWindow
              ? 'Locate & switch to tab in this window'
              : 'Open and focus tab'
          }
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onCopyUrl}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          title="Copy URL"
        >
          {copiedId === tab.id ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Move to Space */}
        <div className="relative" ref={isDropdownOpen ? dropdownRef : undefined}>
          <button
            onClick={onToggleDropdown}
            className={`p-1 rounded transition ${
              isDropdownOpen
                ? 'bg-blue-100 text-blue-600 dark:bg-slate-700 dark:text-blue-400'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="Move to space"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>

          {isDropdownOpen && (
            <div
              className={`absolute right-0 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden ${
                isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
              }`}
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Move tab to
              </div>

              {/* On-the-fly "Move to a New Space" action */}
              <div className="p-1 border-b border-slate-100 dark:border-slate-800">
                {isCreatingNewSpace ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onMoveToNewSpace(newSpaceName);
                    }}
                    className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 border border-blue-500 rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={newSpaceInputRef}
                      type="text"
                      value={newSpaceName}
                      onChange={(e) => onSetNewSpaceName(e.target.value)}
                      placeholder="Space name"
                      className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          onCancelCreateNewSpace();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded"
                      title="Create & Move"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onCancelCreateNewSpace}
                      className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
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
                    onClick={() => onMoveToSpace(null)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-1 transition"
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
                      onClick={() => onMoveToSpace(s.id)}
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

        {/* Close Tab */}
        <button
          onClick={onCloseTab}
          className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
          title="Close Tab"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
