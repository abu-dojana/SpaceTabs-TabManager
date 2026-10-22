import React from 'react';
import { type Space } from '@/db/schema';
import { Check, X, ExternalLink, MoreVertical, Crosshair, GripVertical, ChevronDown } from 'lucide-react';
import { SpaceContextMenu } from './SpaceContextMenu';
import { EMOJI_OPTIONS } from '@/components/modals/CreateSpaceModal';

interface SpaceItemProps {
  space: Space;
  isActive: boolean;
  isOver: boolean;
  isMenuOpen: boolean;
  isRenaming: boolean;
  inlineEditingName: string;
  renameInputRef: React.RefObject<HTMLInputElement>;
  menuRef: React.RefObject<HTMLDivElement>;
  isOpenInThisWindow: boolean;
  isOpenInOtherWindow: boolean;
  otherWindowId: number | null;
  isSpacesLocked?: boolean;
  isDraggingThisSpace?: boolean;
  dropIndicator?: 'before' | 'after' | null;
  onSelectSpace: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onSpaceDragStart?: (e: React.DragEvent) => void;
  onSpaceDragEnd?: (e: React.DragEvent) => void;
  onSetRenamingName: (val: string) => void;
  onCommitRename: (newIcon?: string) => void;
  onCancelRename: () => void;
  onOpenNewWindow: () => void;
  onToggleMenu: () => void;
  onStartRename: () => void;
  onDuplicate: () => void;
  onMoveToSection: () => void;
  onEditDescription: () => void;
  onExport: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const SpaceItem: React.FC<SpaceItemProps> = ({
  space,
  isActive,
  isOver,
  isMenuOpen,
  isRenaming,
  inlineEditingName,
  renameInputRef,
  menuRef,
  isOpenInThisWindow,
  isOpenInOtherWindow,
  otherWindowId,
  isSpacesLocked = true,
  isDraggingThisSpace = false,
  dropIndicator = null,
  onSelectSpace,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onSpaceDragStart,
  onSpaceDragEnd,
  onSetRenamingName,
  onCommitRename,
  onCancelRename,
  onOpenNewWindow,
  onToggleMenu,
  onStartRename,
  onDuplicate,
  onMoveToSection,
  onEditDescription,
  onExport,
  onArchive,
  onDelete,
}) => {
  const [selectedEmoji, setSelectedEmoji] = React.useState(space.icon || '📁');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isRenaming) {
      setSelectedEmoji(space.icon || '📁');
      setIsEmojiPickerOpen(false);
    }
  }, [isRenaming, space.icon]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  return (
    <div key={space.id} className="relative group">
      {isRenaming ? (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border border-blue-500 rounded-lg relative">
          <div className="relative flex-shrink-0" ref={emojiPickerRef}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
              className="p-1 rounded hover:bg-slate-800 text-base leading-none transition flex items-center gap-0.5 border border-slate-700/60 hover:border-slate-600"
              title="Change space emoji"
            >
              <span>{selectedEmoji}</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>
            {isEmojiPickerOpen && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute left-0 top-full mt-1.5 p-2 rounded-xl shadow-2xl bg-slate-900 border border-slate-700 z-50 grid grid-cols-5 gap-1.5 w-48"
              >
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      setIsEmojiPickerOpen(false);
                    }}
                    className={`text-xl p-1.5 rounded-lg hover:scale-110 active:scale-95 transition-all text-center flex items-center justify-center ${
                      selectedEmoji === emoji
                        ? 'bg-blue-900/60 border border-blue-500/50 ring-1 ring-blue-400'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            ref={renameInputRef}
            type="text"
            value={inlineEditingName}
            onChange={(e) => onSetRenamingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename(selectedEmoji);
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={(e) => {
              if (emojiPickerRef.current && emojiPickerRef.current.contains(e.relatedTarget as Node)) {
                return;
              }
              onCommitRename(selectedEmoji);
            }}
            className="flex-1 bg-transparent text-xs text-slate-100 font-medium focus:outline-none min-w-0"
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onCommitRename(selectedEmoji);
            }}
            className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
            title="Save Name"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onCancelRename();
            }}
            className="p-1 text-slate-400 hover:bg-slate-800 rounded"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={onSelectSpace}
          draggable={!isSpacesLocked && !isRenaming}
          onDragStart={onSpaceDragStart}
          onDragEnd={onSpaceDragEnd}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative ${
            isDraggingThisSpace
              ? 'opacity-40 scale-[0.98]'
              : isOver
              ? 'bg-blue-600/30 border-2 border-blue-400 text-blue-200 scale-[1.02] shadow-lg shadow-blue-500/20'
              : isActive || isMenuOpen
              ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
              : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
          } ${
            dropIndicator === 'before'
              ? 'before:absolute before:top-0 before:left-1 before:right-1 before:h-0.5 before:bg-blue-500 before:rounded-full before:z-20 before:shadow-[0_0_8px_rgba(59,130,246,0.8)]'
              : dropIndicator === 'after'
              ? 'after:absolute after:bottom-0 after:left-1 after:right-1 after:h-0.5 after:bg-blue-500 after:rounded-full after:z-20 after:shadow-[0_0_8px_rgba(59,130,246,0.8)]'
              : ''
          } ${!isSpacesLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-2">
            {!isSpacesLocked && (
              <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 flex-shrink-0 -ml-1 cursor-grab active:cursor-grabbing" />
            )}
            <span className="text-base flex-shrink-0">{space.icon || '📁'}</span>
            <span className="truncate" title={space.description || space.name}>
              {space.name}
            </span>
            {isOpenInThisWindow && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"
                title="This Space is active in this window"
              />
            )}
            {isOpenInOtherWindow && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"
                title="This Space is active in another window"
              />
            )}
          </div>

          {isOver ? (
            <span className="text-[10px] font-bold text-blue-300 bg-blue-500/30 px-1.5 py-0.5 rounded animate-pulse">
              Drop
            </span>
          ) : (
            <div
              className={`flex items-center gap-0.5 transition-opacity ${
                isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Locate / Switch to Window Button */}
              {isOpenInOtherWindow && otherWindowId && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await chrome.windows.update(otherWindowId, { focused: true });
                  }}
                  className="p-1 hover:bg-purple-500/20 text-purple-400 hover:text-purple-200 rounded transition"
                  title="Switch to window with this space"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Quick Action: Open in New Window */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNewWindow();
                }}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                title="Open in new window (Ctrl+Click)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* 3-Dot Menu Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu();
                }}
                className={`p-1 rounded transition ${
                  isMenuOpen
                    ? 'bg-slate-800 text-blue-400'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Space options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </button>
      )}

      {/* Workona-Style Three-Dot Popup Menu */}
      <SpaceContextMenu
        isOpen={isMenuOpen}
        menuRef={menuRef}
        space={space}
        onRename={onStartRename}
        onOpenNewWindow={onOpenNewWindow}
        onDuplicate={onDuplicate}
        onMoveToSection={onMoveToSection}
        onEditDescription={onEditDescription}
        onExport={onExport}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    </div>
  );
};
