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
      className={`group flex items-center justify-between py-2.5 px-3 rounded-lg transition-all relative ${
        isDragging
          ? 'opacity-40 border border-dashed border-blue-500/60 bg-blue-500/5'
          : isSelected || isDropdownOpen
          ? 'bg-blue-600/10'
          : 'hover:bg-slate-800/50'
      }`}
    >
      {/* Left: Grip + Checkbox + Favicon + Title + Window Status */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
        <div
          className="text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1"
          title="Drag tab to a Space in sidebar"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="cursor-pointer flex-shrink-0"
        />

        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          {renderFavicon(tab.url, tab.favIconUrl)}
        </div>

        <button
          onClick={onLocateOrOpen}
          className="text-xs text-slate-200 hover:text-blue-400 font-medium truncate text-left transition"
          title={tab.title}
        >
          {tab.title || tab.url}
        </button>

        {/* Window Status Badges */}
        {isOpenInThisWindow && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0"
            title="Tab is currently open in this browser window"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            This Window
          </span>
        )}

        {isOpenInOtherWindow && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 flex-shrink-0"
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
              ? 'hover:bg-purple-500/20 text-purple-400 hover:text-purple-200'
              : isOpenInThisWindow
              ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-200'
              : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
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
          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          title="Copy URL"
        >
          {copiedId === tab.id ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
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
                ? 'bg-slate-700 text-blue-400'
                : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Move to space"
          >
            <FolderInput className="w-3.5 h-3.5" />
          </button>

          {isDropdownOpen && (
            <div
              className={`absolute right-0 z-50 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden ${
                isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
              }`}
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                Move tab to
              </div>

              {/* Move to a New Space (on the fly) */}
              <div className="p-1.5 border-b border-slate-800 bg-slate-950/40">
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
                      placeholder="Untitled Space"
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-blue-500/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') onCancelCreateNewSpace();
                      }}
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
                      title="Create and move tab"
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={onCancelCreateNewSpace}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-600/15 transition cursor-pointer"
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
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition border-b border-slate-800/60 pb-2 mb-1"
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
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
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
          className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition"
          title="Close Tab"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
