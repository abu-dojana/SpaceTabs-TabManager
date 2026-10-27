import React from 'react';
import { type Space } from '@/db/schema';
import {
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface SectionGroupProps {
  sectionName: string;
  spaces: Space[];
  isCollapsed: boolean;
  isEditing: boolean;
  renamingValue: string;
  isMenuOpen: boolean;
  isSpacesLocked?: boolean;
  isDraggingThisSection?: boolean;
  dropIndicator?: 'before' | 'after' | null;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  sectionMenuRef: React.RefObject<HTMLDivElement>;
  renameInputRef: React.RefObject<HTMLInputElement>;
  onToggleCollapse: () => void;
  onStartRename: () => void;
  onSetRenamingValue: (val: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onToggleMenu: () => void;
  onDeleteSection: () => void;
  onSectionDragStart?: (e: React.DragEvent) => void;
  onSectionDragEnd?: () => void;
  onSectionDragOver?: (e: React.DragEvent) => void;
  onSectionDragLeave?: (e: React.DragEvent) => void;
  onSectionDrop?: (e: React.DragEvent) => void;
  onMoveSectionUp?: () => void;
  onMoveSectionDown?: () => void;
  renderSpaceItem: (space: Space, sectionName?: string) => React.ReactNode;
}

export const SectionGroup: React.FC<SectionGroupProps> = ({
  sectionName,
  spaces,
  isCollapsed,
  isEditing,
  renamingValue,
  isMenuOpen,
  isSpacesLocked = true,
  isDraggingThisSection = false,
  dropIndicator = null,
  canMoveUp = false,
  canMoveDown = false,
  sectionMenuRef,
  renameInputRef,
  onToggleCollapse,
  onStartRename,
  onSetRenamingValue,
  onCommitRename,
  onCancelRename,
  onToggleMenu,
  onDeleteSection,
  onSectionDragStart,
  onSectionDragEnd,
  onSectionDragOver,
  onSectionDragLeave,
  onSectionDrop,
  onMoveSectionUp,
  onMoveSectionDown,
  renderSpaceItem,
}) => {
  return (
    <div
      key={sectionName}
      onDragOver={onSectionDragOver}
      onDragLeave={onSectionDragLeave}
      onDrop={onSectionDrop}
      className={`mt-3 relative transition-all ${
        isDraggingThisSection ? 'opacity-40 scale-[0.98]' : ''
      } ${
        dropIndicator === 'before'
          ? 'before:absolute before:-top-1 before:left-1 before:right-1 before:h-0.5 before:bg-blue-500 before:rounded-full before:z-20 before:shadow-[0_0_8px_rgba(59,130,246,0.8)]'
          : dropIndicator === 'after'
          ? 'after:absolute after:-bottom-1 after:left-1 after:right-1 after:h-0.5 after:bg-blue-500 after:rounded-full after:z-20 after:shadow-[0_0_8px_rgba(59,130,246,0.8)]'
          : ''
      }`}
    >
      {/* Section Header or Inline Rename Input */}
      {isEditing ? (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 border border-blue-500 rounded-lg">
          <input
            ref={renameInputRef}
            type="text"
            value={renamingValue}
            onChange={(e) => onSetRenamingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={onCommitRename}
            className="flex-1 bg-transparent text-xs text-slate-100 font-semibold uppercase tracking-wider focus:outline-none min-w-0"
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onCommitRename();
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
        <div className="relative">
          <div
            onClick={onToggleCollapse}
            draggable={!isSpacesLocked && !isEditing}
            onDragStart={onSectionDragStart}
            onDragEnd={onSectionDragEnd}
            className={`flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 rounded transition group ${
              !isSpacesLocked ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
              {!isSpacesLocked && (
                <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 flex-shrink-0 -ml-1 cursor-grab active:cursor-grabbing" />
              )}
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
              )}
              <span className="truncate">{sectionName}</span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400">
                {spaces.length}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu();
                }}
                className={`p-0.5 rounded transition ${
                  isMenuOpen
                    ? 'bg-slate-800 text-blue-400 opacity-100'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-slate-800 text-slate-500 hover:text-slate-200'
                }`}
                title="Section options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section 3-Dot Dropdown Menu */}
          {isMenuOpen && (
            <div
              ref={sectionMenuRef}
              className="absolute right-1 top-full mt-1 z-50 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {canMoveUp && onMoveSectionUp && (
                <button
                  onClick={onMoveSectionUp}
                  className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-slate-400" />
                  <span>Move section up</span>
                </button>
              )}

              {canMoveDown && onMoveSectionDown && (
                <button
                  onClick={onMoveSectionDown}
                  className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Move section down</span>
                </button>
              )}

              {(canMoveUp || canMoveDown) && (
                <div className="my-1 border-t border-slate-800" />
              )}

              <button
                onClick={onStartRename}
                className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename section</span>
              </button>

              <button
                onClick={onDeleteSection}
                className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete section</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section Spaces */}
      {!isCollapsed && (
        <div className="space-y-0.5 mt-1 pl-2 border-l border-slate-800/80 ml-2">
          {spaces.map((space) => renderSpaceItem(space, sectionName))}
        </div>
      )}
    </div>
  );
};
