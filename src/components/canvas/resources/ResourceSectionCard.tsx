import React from 'react';
import { type ResourceSection, type ResourceItem, type Tab } from '@/db/schema';
import { useFixedPopover } from '@/hooks/useFixedPopover';
import { AddFromOpenTabsDropdown } from './AddFromOpenTabsDropdown';
import { ResourceItemRow } from './ResourceItemRow';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  MoreVertical,
  ExternalLink,
  Pencil,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowDownAZ,
  Globe,
} from 'lucide-react';

interface ResourceSectionCardProps {
  section: ResourceSection;
  sections: ResourceSection[];
  items: ResourceItem[];
  openTabs: Tab[] | undefined;
  showTabFavicons: boolean;
  isCollapsed: boolean;
  isDragOver: boolean;
  isDraggingSection?: boolean;
  sectionDropPosition?: 'top' | 'bottom' | null;
  draggingItemId?: string | null;
  dragOverItemId?: string | null;
  dragOverItemPosition?: 'top' | 'bottom' | null;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  editingSectionId: string | null;
  editingSectionTitle: string;
  editSectionInputRef: React.RefObject<HTMLInputElement>;
  activeSectionMenuId: string | null;
  sectionMenuRef: React.RefObject<HTMLDivElement>;
  activeItemMenuId: string | null;
  itemMenuRef: React.RefObject<HTMLDivElement>;
  addOpenTabSectionId: string | null;
  openTabsDropdownRef: React.RefObject<HTMLDivElement>;
  copiedId: string | null;
  onSectionDragStart: (e: React.DragEvent, sectionId: string) => void;
  onSectionDragEnd: () => void;
  onSectionCardDragOver: (e: React.DragEvent, sectionId: string) => void;
  onSectionCardDragLeave: (e: React.DragEvent, sectionId: string) => void;
  onSectionDrop: (e: React.DragEvent, sectionId: string) => void;
  onMoveSectionUp: () => void;
  onMoveSectionDown: () => void;
  onSortItemsAlphabetically: (sectionId: string) => void;
  onSortItemsByDomain: (sectionId: string) => void;
  onToggleCollapse: (sectionId: string) => void;
  onStartRenameSection: (section: ResourceSection) => void;
  onEditingSectionTitleChange: (title: string) => void;
  onSaveRenameSection: () => void;
  onCancelRenameSection: () => void;
  onToggleAddOpenTabDropdown: (sectionId: string) => void;
  onAddOpenTabAsResource: (
    sectionId: string,
    tab: { title: string; url: string; favIconUrl?: string }
  ) => void;
  onOpenAddResource: (sectionId: string) => void;
  onToggleSectionMenu: (sectionId: string) => void;
  onOpenAllInSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onItemDragStart: (e: React.DragEvent, itemId: string) => void;
  onItemDragEnd: () => void;
  onItemDragOver: (e: React.DragEvent, itemId: string) => void;
  onItemDragLeave: (itemId: string) => void;
  onItemDrop: (e: React.DragEvent, sectionId: string, itemId: string) => void;
  onOpenResource: (url: string) => void;
  onCopyLink: (id: string, url: string) => void;
  onToggleItemMenu: (itemId: string) => void;
  onEditResource: (item: ResourceItem) => void;
  onMoveItemToSection: (itemId: string, newSectionId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export const ResourceSectionCard: React.FC<ResourceSectionCardProps> = ({
  section,
  sections,
  items,
  openTabs,
  showTabFavicons,
  isCollapsed,
  isDragOver,
  isDraggingSection = false,
  sectionDropPosition = null,
  draggingItemId = null,
  dragOverItemId = null,
  dragOverItemPosition = null,
  canMoveUp = false,
  canMoveDown = false,
  editingSectionId,
  editingSectionTitle,
  editSectionInputRef,
  activeSectionMenuId,
  sectionMenuRef,
  activeItemMenuId,
  itemMenuRef,
  addOpenTabSectionId,
  openTabsDropdownRef,
  copiedId,
  onSectionDragStart,
  onSectionDragEnd,
  onSectionCardDragOver,
  onSectionCardDragLeave,
  onSectionDrop,
  onMoveSectionUp,
  onMoveSectionDown,
  onSortItemsAlphabetically,
  onSortItemsByDomain,
  onToggleCollapse,
  onStartRenameSection,
  onEditingSectionTitleChange,
  onSaveRenameSection,
  onCancelRenameSection,
  onToggleAddOpenTabDropdown,
  onAddOpenTabAsResource,
  onOpenAddResource,
  onToggleSectionMenu,
  onOpenAllInSection,
  onDeleteSection,
  onItemDragStart,
  onItemDragEnd,
  onItemDragOver,
  onItemDragLeave,
  onItemDrop,
  onOpenResource,
  onCopyLink,
  onToggleItemMenu,
  onEditResource,
  onMoveItemToSection,
  onDeleteItem,
}) => {
  const isSectionMenuOpen = activeSectionMenuId === section.id;
  const sectionPopoverRef = useFixedPopover({
    isOpen: isSectionMenuOpen,
    align: 'right',
    offset: 6,
  });

  return (
    <div
      draggable={editingSectionId !== section.id}
      onDragStart={(e) => onSectionDragStart(e, section.id)}
      onDragEnd={onSectionDragEnd}
      onDragOver={(e) => onSectionCardDragOver(e, section.id)}
      onDragLeave={(e) => onSectionCardDragLeave(e, section.id)}
      onDrop={(e) => onSectionDrop(e, section.id)}
      className={`bg-slate-900/60 border rounded-xl shadow-sm transition relative ${
        isDraggingSection
          ? 'opacity-40 scale-[0.99]'
          : isDragOver
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-slate-800 hover:border-slate-700/80'
      } ${
        sectionDropPosition === 'top'
          ? 'border-t-2 border-t-blue-500'
          : sectionDropPosition === 'bottom'
          ? 'border-b-2 border-b-blue-500'
          : ''
      }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800/80 bg-slate-900/40 rounded-t-xl group/header">
        {/* Left: Drag Handle + Collapse Button + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing transition flex-shrink-0"
            title="Drag to reorder section"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>

          <button
            onClick={() => onToggleCollapse(section.id)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />

          {editingSectionId === section.id ? (
            <input
              ref={editSectionInputRef}
              type="text"
              value={editingSectionTitle}
              onChange={(e) => onEditingSectionTitleChange(e.target.value)}
              onBlur={onSaveRenameSection}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveRenameSection();
                if (e.key === 'Escape') onCancelRenameSection();
              }}
              className="bg-slate-950 border border-blue-500 rounded px-2 py-0.5 text-xs text-slate-100 font-semibold focus:outline-none"
            />
          ) : (
            <h3
              onDoubleClick={() => onStartRenameSection(section)}
              className="text-xs font-semibold text-slate-200 truncate cursor-pointer hover:text-white"
              title="Double-click to rename"
            >
              {section.title}
            </h3>
          )}

          <span className="text-[11px] text-slate-500 font-mono">
            ({items.length})
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Add From Open Tabs Dropdown */}
          <AddFromOpenTabsDropdown
            sectionId={section.id}
            isOpen={addOpenTabSectionId === section.id}
            dropdownRef={openTabsDropdownRef}
            openTabs={openTabs}
            sectionItems={items}
            onToggle={() => onToggleAddOpenTabDropdown(section.id)}
            onAddTab={onAddOpenTabAsResource}
          />

          {/* "+ Add Resource" Button */}
          <button
            onClick={() => onOpenAddResource(section.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 text-xs font-medium border border-blue-500/30 transition"
            title="Add a link or doc to this section"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Resource</span>
          </button>

          {/* Section 3-Dot Menu */}
          <div
            className="relative"
            ref={activeSectionMenuId === section.id ? sectionMenuRef : undefined}
          >
            <button
              onClick={() => onToggleSectionMenu(section.id)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Section options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isSectionMenuOpen && (
              <div
                ref={sectionPopoverRef}
                className="fixed z-50 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs"
              >
                {items.length > 0 && (
                  <button
                    onClick={() => onOpenAllInSection(section.id)}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Open all in new tabs</span>
                  </button>
                )}

                {items.length > 1 && (
                  <>
                    <button
                      onClick={() => onSortItemsAlphabetically(section.id)}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <ArrowDownAZ className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sort items A–Z</span>
                    </button>
                    <button
                      onClick={() => onSortItemsByDomain(section.id)}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sort items by domain</span>
                    </button>
                  </>
                )}

                {(canMoveUp || canMoveDown) && (
                  <>
                    <div className="border-t border-slate-800 my-1" />
                    {canMoveUp && (
                      <button
                        onClick={onMoveSectionUp}
                        className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-slate-400" />
                        <span>Move section up</span>
                      </button>
                    )}
                    {canMoveDown && (
                      <button
                        onClick={onMoveSectionDown}
                        className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                        <span>Move section down</span>
                      </button>
                    )}
                  </>
                )}

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={() => onStartRenameSection(section)}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename section</span>
                </button>

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={() => onDeleteSection(section.id)}
                  className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Delete section</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Items List */}
      {!isCollapsed && (
        <div className="divide-y divide-slate-800/40">
          {items.length > 0 ? (
            items.map((item) => (
              <ResourceItemRow
                key={item.id}
                item={item}
                sections={sections}
                showTabFavicons={showTabFavicons}
                copiedId={copiedId}
                isMenuOpen={activeItemMenuId === item.id}
                isDragging={draggingItemId === item.id}
                dropIndicator={dragOverItemId === item.id ? dragOverItemPosition : null}
                itemMenuRef={itemMenuRef}
                onDragStart={onItemDragStart}
                onDragEnd={onItemDragEnd}
                onDragOver={onItemDragOver}
                onDragLeave={onItemDragLeave}
                onDrop={(e, targetItemId) => onItemDrop(e, section.id, targetItemId)}
                onOpenResource={onOpenResource}
                onCopyLink={onCopyLink}
                onToggleMenu={() => onToggleItemMenu(item.id)}
                onEditResource={onEditResource}
                onMoveToSection={onMoveItemToSection}
                onDeleteItem={onDeleteItem}
              />
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 italic">
              No resources in this section yet. Click &quot;Add Resource&quot; or &quot;Add Open Tab&quot; above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
