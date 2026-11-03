import React from 'react';
import { type ResourceSection, type ResourceItem, type Tab } from '@/db/schema';
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
} from 'lucide-react';

interface ResourceSectionCardProps {
  section: ResourceSection;
  sections: ResourceSection[];
  items: ResourceItem[];
  openTabs: Tab[] | undefined;
  showTabFavicons: boolean;
  isCollapsed: boolean;
  isDragOver: boolean;
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
  onDragOverSection: (sectionId: string | null) => void;
  onSectionDrop: (e: React.DragEvent, sectionId: string) => void;
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
  onDragOverSection,
  onSectionDrop,
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
  onOpenResource,
  onCopyLink,
  onToggleItemMenu,
  onEditResource,
  onMoveItemToSection,
  onDeleteItem,
}) => {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverSection(section.id);
      }}
      onDragLeave={() => onDragOverSection(null)}
      onDrop={(e) => onSectionDrop(e, section.id)}
      className={`bg-slate-900/60 border rounded-xl shadow-sm transition relative ${
        isDragOver
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-slate-800 hover:border-slate-700/80'
      }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800/80 bg-slate-900/40 rounded-t-xl">
        {/* Left: Collapse Button + Title */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
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

            {activeSectionMenuId === section.id && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs">
                {items.length > 0 && (
                  <button
                    onClick={() => onOpenAllInSection(section.id)}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Open all in new tabs</span>
                  </button>
                )}

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
                itemMenuRef={itemMenuRef}
                onDragStart={onItemDragStart}
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
