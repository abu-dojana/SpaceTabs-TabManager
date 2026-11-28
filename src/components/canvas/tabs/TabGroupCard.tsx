import React from 'react';
import { type TabGroup, type Tab } from '@/db/schema';
import { TAB_GROUP_COLORS } from '@/services/tabManager';
import { useFixedPopover } from '@/hooks/useFixedPopover';
import { GROUP_DRAG_MIME } from './useTabGroups';
import {
  GripVertical, ChevronRight, ChevronDown, Crosshair, PanelTopClose,
  MoreVertical, ExternalLink, Pencil, ArrowDownAZ, Globe, Layers, Trash2,
} from 'lucide-react';

interface TabGroupCardProps {
  group: TabGroup;
  tabs: Tab[];
  selectedTabIds: Set<string>;
  openInWindowCount: number;
  hasAnyOpenTab: boolean;
  isCollapsed: boolean;
  isForceExpanded: boolean;
  isDraggingGroup: boolean;
  groupDropPosition: 'top' | 'bottom' | null;
  isDragOverBucket: boolean;
  editingGroupId: string | null;
  editingGroupTitle: string;
  editGroupInputRef: React.RefObject<HTMLInputElement>;
  isMenuOpen: boolean;
  groupMenuRef: React.RefObject<HTMLDivElement>;
  isColorPickerOpen: boolean;
  colorPickerRef: React.RefObject<HTMLDivElement>;
  onToggleCollapse: () => void;
  onToggleSelectGroup: (selectAll: boolean) => void;
  onStartRename: () => void;
  onEditingTitleChange: (val: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onToggleColorPicker: (e: React.MouseEvent) => void;
  onSelectColor: (hex: string) => void;
  onToggleMenu: (e: React.MouseEvent) => void;
  onOpenGroupHere: () => void;
  onOpenGroupInNewWindow: () => void;
  onCloseGroupFromStrip: () => void;
  onSortGroup: (mode: 'alpha' | 'domain') => void;
  onUngroup: () => void;
  onDeleteGroupAndTabs: () => void;
  onGroupDragStart: (e: React.DragEvent) => void;
  onGroupDragEnd: () => void;
  onCardDragOver: (e: React.DragEvent) => void;
  onCardDragLeave: (e: React.DragEvent) => void;
  onCardDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

export const TabGroupCard: React.FC<TabGroupCardProps> = ({
  group,
  tabs,
  selectedTabIds,
  openInWindowCount,
  hasAnyOpenTab,
  isCollapsed,
  isForceExpanded,
  isDraggingGroup,
  groupDropPosition,
  isDragOverBucket,
  editingGroupId,
  editingGroupTitle,
  editGroupInputRef,
  isMenuOpen,
  groupMenuRef,
  isColorPickerOpen,
  colorPickerRef,
  onToggleCollapse,
  onToggleSelectGroup,
  onStartRename,
  onEditingTitleChange,
  onSaveRename,
  onCancelRename,
  onToggleColorPicker,
  onSelectColor,
  onToggleMenu,
  onOpenGroupHere,
  onOpenGroupInNewWindow,
  onCloseGroupFromStrip,
  onSortGroup,
  onUngroup,
  onDeleteGroupAndTabs,
  onGroupDragStart,
  onGroupDragEnd,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  children,
}) => {
  const menuPopoverRef = useFixedPopover({ isOpen: isMenuOpen, align: 'right', offset: 6 });
  const colorPopoverRef = useFixedPopover({
    isOpen: isColorPickerOpen,
    align: 'left',
    offset: 6,
  });

  const selectedInGroup = tabs.filter((t) => selectedTabIds.has(t.id)).length;
  const allGroupSelected = tabs.length > 0 && selectedInGroup === tabs.length;
  const someGroupSelected = selectedInGroup > 0 && !allGroupSelected;
  const showBody = !isCollapsed || isForceExpanded;

  return (
    <div
      onDragOver={onCardDragOver}
      onDragLeave={onCardDragLeave}
      onDrop={onCardDrop}
      style={{ '--tab-group-color': group.color } as React.CSSProperties}
      className={`tab-group-card rounded-xl border bg-slate-950/35 transition relative ${
        isDraggingGroup
          ? 'opacity-40 scale-[0.99]'
          : isDragOverBucket
          ? 'border-blue-500 bg-blue-500/5 shadow-sm'
          : 'border-slate-800/90 hover:border-slate-700/80'
      } ${
        groupDropPosition === 'top'
          ? 'border-t-2 border-t-blue-500'
          : groupDropPosition === 'bottom'
          ? 'border-b-2 border-b-blue-500'
          : ''
      }`}
    >
      {/* Group Header */}
      <div
        onClick={() => {
          if (editingGroupId !== group.id) onToggleCollapse();
        }}
        className={`tab-group-header flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-800/60 cursor-pointer transition-colors group/grpheader ${
          showBody ? 'border-b border-slate-800/70 rounded-tr-xl' : 'rounded-r-xl'
        }`}
      >
        {/* Left: Grip + Checkbox + Collapse + Color Dot + Title + Counts */}
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <div
            draggable={editingGroupId !== group.id}
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.dataTransfer.setData(GROUP_DRAG_MIME, group.id);
              e.dataTransfer.effectAllowed = 'move';
              onGroupDragStart(e);
            }}
            onDragEnd={onGroupDragEnd}
            className="text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing transition flex-shrink-0 -ml-0.5"
            title="Drag to reorder group"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {tabs.length > 0 && (
            <input
              type="checkbox"
              checked={allGroupSelected}
              ref={(el) => {
                if (el) el.indeterminate = someGroupSelected;
              }}
              onChange={() => onToggleSelectGroup(!allGroupSelected)}
              onClick={(e) => e.stopPropagation()}
              className="cursor-pointer flex-shrink-0"
              title={allGroupSelected ? 'Deselect group tabs' : 'Select all tabs in group'}
            />
          )}

          <span
            className="p-0.5 rounded text-slate-400 group-hover/grpheader:text-slate-200 transition flex-shrink-0"
            title={isCollapsed ? 'Expand group' : 'Collapse group'}
          >
            {showBody ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>

          {/* Clickable Color Dot + Swatch Popover */}
          <div
            className="relative flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            ref={isColorPickerOpen ? colorPickerRef : undefined}
          >
            <button
              type="button"
              onClick={onToggleColorPicker}
              style={{ backgroundColor: group.color }}
              className="w-3 h-3 rounded-full ring-1 ring-white/15 hover:scale-110 transition cursor-pointer block"
              title="Change group color"
            />
            {isColorPickerOpen && (
              <div
                ref={colorPopoverRef}
                onClick={(e) => e.stopPropagation()}
                className="fixed z-50 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex items-center gap-1.5"
              >
                {TAB_GROUP_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => onSelectColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-4 h-4 rounded-full transition hover:scale-110 cursor-pointer ${
                      group.color.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {editingGroupId === group.id ? (
            <input
              ref={editGroupInputRef}
              type="text"
              value={editingGroupTitle}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onEditingTitleChange(e.target.value)}
              onBlur={onSaveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              className="bg-slate-950 border border-blue-500 rounded px-2 py-0.5 text-xs text-slate-100 font-semibold focus:outline-none min-w-0"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartRename();
              }}
              className="text-xs font-semibold text-slate-200 group-hover/grpheader:text-white truncate text-left"
              title="Click to collapse/expand • Double-click to rename"
            >
              {group.title}
            </span>
          )}

          <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
            ({tabs.length})
          </span>

          {openInWindowCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
              {openInWindowCount} open
            </span>
          )}
        </div>

        {/* Right: Quick Group Actions + 3-Dot Menu */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {tabs.length > 0 && (
            <button
              type="button"
              onClick={onOpenGroupHere}
              className={`p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/15 transition ${
                isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover/grpheader:opacity-100'
              }`}
              title="Open group tabs in this window"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}

          {hasAnyOpenTab && (
            <button
              type="button"
              onClick={onCloseGroupFromStrip}
              className={`p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/15 transition ${
                isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover/grpheader:opacity-100'
              }`}
              title="Close group tabs from tab strip (keep saved in group)"
            >
              <PanelTopClose className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="relative" ref={isMenuOpen ? groupMenuRef : undefined}>
            <button
              type="button"
              onClick={onToggleMenu}
              className={`p-1 rounded transition ${
                isMenuOpen
                  ? 'bg-slate-800 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Group options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuPopoverRef}
                onClick={(e) => e.stopPropagation()}
                className="fixed z-50 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs select-none"
              >
                {/* Inline Color Row */}
                <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-1">
                  {TAB_GROUP_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => onSelectColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-3.5 h-3.5 rounded-full transition hover:scale-110 cursor-pointer ${
                        group.color.toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onStartRename}
                  className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename group</span>
                </button>

                {tabs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMenu({ stopPropagation: () => {} } as React.MouseEvent);
                      onOpenGroupInNewWindow();
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Open group in new window</span>
                  </button>
                )}

                {tabs.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSortGroup('alpha')}
                      className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <ArrowDownAZ className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sort group A–Z</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSortGroup('domain')}
                      className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sort group by domain</span>
                    </button>
                  </>
                )}

                <div className="border-t border-slate-800 my-1" />

                <button
                  type="button"
                  onClick={onUngroup}
                  className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ungroup (keep tabs)</span>
                </button>

                <button
                  type="button"
                  onClick={onDeleteGroupAndTabs}
                  className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Delete group & tabs</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Body */}
      {showBody && (
        <div className="divide-y divide-slate-800/50 px-1 py-0.5">
          {tabs.length > 0 ? (
            children
          ) : (
            <div className="py-3 px-3 text-center text-xs text-slate-500 italic">
              Empty group — drag tabs here or use the Group menu on selected tabs.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
