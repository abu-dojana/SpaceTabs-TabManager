import React from 'react';
import { type Space, type TabGroup } from '@/db/schema';
import { TAB_GROUP_COLORS } from '@/services/tabManager';
import { useFixedPopover } from '@/hooks/useFixedPopover';
import { useAutoFocusSelect } from '@/hooks/useAutoFocusSelect';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  FolderInput,
  Layers,
  Trash2,
  Plus,
  X,
  ExternalLink,
  PanelTopClose,
  Crosshair,
} from 'lucide-react';

interface TabBatchBarProps {
  selectedCount: number;
  isCompact?: boolean;
  hasSelectedInGroup: boolean;
  spaces?: Space[];
  tabGroups?: TabGroup[];
  activeSpaceId: string | null;
  isMoveDropdownOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement>;
  newSpaceInputRef: React.RefObject<HTMLInputElement>;
  isCreatingNewSpace: boolean;
  newSpaceName: string;
  onToggleMoveDropdown: (e: React.MouseEvent) => void;
  onMoveSelected: (targetSpaceId: string | null) => void;
  onAssignSelectedToGroup: (groupId: string | undefined) => void;
  onCreateGroupWithSelected: (title: string, color: string) => void;
  onOpenSelectedInCurrentWindow: () => void;
  onOpenSelectedInNewWindow: () => void;
  onCloseSelectedFromStrip: () => void;
  onDeleteSelected: () => void;
  onStartCreateNewSpace: () => void;
  onCancelCreateNewSpace: () => void;
  onSetNewSpaceName: (name: string) => void;
  onMoveToNewSpace: (name: string) => void;
}

export const TabBatchBar: React.FC<TabBatchBarProps> = ({
  selectedCount,
  isCompact = false,
  hasSelectedInGroup,
  spaces,
  tabGroups = [],
  activeSpaceId,
  isMoveDropdownOpen,
  dropdownRef,
  newSpaceInputRef,
  isCreatingNewSpace,
  newSpaceName,
  onToggleMoveDropdown,
  onMoveSelected,
  onAssignSelectedToGroup,
  onCreateGroupWithSelected,
  onOpenSelectedInCurrentWindow,
  onOpenSelectedInNewWindow,
  onCloseSelectedFromStrip,
  onDeleteSelected,
  onStartCreateNewSpace,
  onCancelCreateNewSpace,
  onSetNewSpaceName,
  onMoveToNewSpace,
}) => {
  const [isGroupOpen, setIsGroupOpen] = React.useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);
  const [groupTitle, setGroupTitle] = React.useState('');
  const [groupColor, setGroupColor] = React.useState<string>(TAB_GROUP_COLORS[0].hex);

  const groupWrapRef = React.useRef<HTMLDivElement>(null!);
  const groupInputRef = React.useRef<HTMLInputElement>(null!);

  useAutoFocusSelect(groupInputRef, isCreatingGroup);
  useClickOutside(
    [groupWrapRef],
    () => {
      setIsGroupOpen(false);
      setIsCreatingGroup(false);
      setGroupTitle('');
    },
    isGroupOpen,
    true
  );

  const movePopoverRef = useFixedPopover({
    isOpen: isMoveDropdownOpen,
    align: 'right',
    offset: 6,
  });
  const groupPopoverRef = useFixedPopover({
    isOpen: isGroupOpen,
    align: 'right',
    offset: 6,
  });

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end min-w-0">
      {/* Group Selected Tabs Dropdown */}
      <div className="relative" ref={groupWrapRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = !isGroupOpen;
            setIsGroupOpen(next);
            if (next) {
              const nextIdx = tabGroups.length % TAB_GROUP_COLORS.length;
              setGroupColor(TAB_GROUP_COLORS[nextIdx].hex);
              setIsCreatingGroup(tabGroups.length === 0);
            }
          }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-violet-500/20 text-[11px] font-medium text-slate-200 hover:text-violet-300 transition border border-slate-700/60 hover:border-violet-500/40 shadow-sm cursor-pointer whitespace-nowrap"
          title="Group selected tabs inside this space"
        >
          <Layers className="w-3 h-3 text-violet-400 flex-shrink-0" />
          <span>Group</span>
        </button>

        {isGroupOpen && (
          <div
            ref={groupPopoverRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden"
          >
            <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              Group {selectedCount} tab{selectedCount > 1 ? 's' : ''}
            </div>

            <div className="p-2 border-b border-slate-800 bg-slate-950/40">
              {isCreatingGroup ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onCreateGroupWithSelected(groupTitle, groupColor);
                    setIsGroupOpen(false);
                    setIsCreatingGroup(false);
                    setGroupTitle('');
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    {TAB_GROUP_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setGroupColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-3.5 h-3.5 rounded-full transition cursor-pointer ${
                          groupColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={groupInputRef}
                      type="text"
                      value={groupTitle}
                      onChange={(e) => setGroupTitle(e.target.value)}
                      placeholder="Group name..."
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-blue-500/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsCreatingGroup(false);
                          setGroupTitle('');
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingGroup(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-600/15 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Group</span>
                </button>
              )}
            </div>

            {(tabGroups.length > 0 || hasSelectedInGroup) && (
              <div className="max-h-44 overflow-y-auto py-1">
                {hasSelectedInGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      onAssignSelectedToGroup(undefined);
                      setIsGroupOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-amber-300 hover:bg-slate-800 flex items-center gap-2 border-b border-slate-800/60 pb-2 mb-1"
                  >
                    <X className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Remove from group</span>
                  </button>
                )}
                {tabGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      onAssignSelectedToGroup(g.id);
                      setIsGroupOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                  >
                    <span
                      style={{ backgroundColor: g.color }}
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    />
                    <span className="truncate">{g.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {spaces && (
        <div className="relative" ref={isMoveDropdownOpen ? dropdownRef : undefined}>
          <button
            onClick={onToggleMoveDropdown}
            className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-[11px] font-medium text-white transition shadow-sm whitespace-nowrap"
          >
            <FolderInput className="w-3 h-3 flex-shrink-0" />
            <span>Move to</span>
          </button>

          {isMoveDropdownOpen && (
            <div
              ref={movePopoverRef}
              className="fixed z-50 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden"
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                Move {selectedCount} tabs to
              </div>

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
                      title="Create and move tabs"
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
                    onClick={() => onMoveSelected(null)}
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
                      onClick={() => onMoveSelected(s.id)}
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
      )}

      <button
        onClick={onOpenSelectedInCurrentWindow}
        className={`flex items-center gap-1 ${
          isCompact ? 'p-1.5' : 'px-2 py-1'
        } rounded bg-slate-800 hover:bg-emerald-500/20 text-[11px] font-medium text-slate-200 hover:text-emerald-300 transition border border-slate-700/60 hover:border-emerald-500/40 shadow-sm cursor-pointer whitespace-nowrap`}
        title="Open selected tabs in this window's tab strip"
      >
        <Crosshair className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        {!isCompact && <span>Open Here</span>}
      </button>

      <button
        onClick={onOpenSelectedInNewWindow}
        className={`flex items-center gap-1 ${
          isCompact ? 'p-1.5' : 'px-2 py-1'
        } rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition border border-slate-700/60 shadow-sm cursor-pointer whitespace-nowrap`}
        title="Open selected tabs in a new window"
      >
        <ExternalLink className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        {!isCompact && <span>New Window</span>}
      </button>

      <button
        onClick={onCloseSelectedFromStrip}
        className={`flex items-center gap-1 ${
          isCompact ? 'p-1.5' : 'px-2 py-1'
        } rounded bg-slate-800 hover:bg-amber-500/20 text-[11px] font-medium text-slate-200 hover:text-amber-300 transition border border-slate-700/60 hover:border-amber-500/40 shadow-sm cursor-pointer whitespace-nowrap`}
        title="Close selected tabs from top tab strip (keep saved in space)"
      >
        <PanelTopClose className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        {!isCompact && <span>Close Strip</span>}
      </button>

      <button
        onClick={onDeleteSelected}
        className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition flex-shrink-0 cursor-pointer"
        title="Delete selected tabs from space"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
