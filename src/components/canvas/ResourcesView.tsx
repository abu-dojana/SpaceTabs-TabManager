import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type ResourceItem, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Bookmark, Plus, Folder, FolderPlus } from 'lucide-react';
import { useResourceActions } from './resources/useResourceActions';
import { ResourceSectionCard } from './resources/ResourceSectionCard';
import { ResourceModal } from './resources/ResourceModal';

export const ResourcesView: React.FC = () => {
  const { activeSpaceId, searchQuery } = useUIStore();
  const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

  // Active space metadata
  const activeSpace = useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId]
  );

  // Sections for this space
  const sections = useLiveQuery(
    () => db.resourceSections.where('spaceId').equals(targetSpaceId).sortBy('order'),
    [targetSpaceId]
  );

  // All resource items
  const allItems = useLiveQuery(() => db.resourceItems.toArray());

  // Currently open tabs in this space/window (for "Add from Open Tabs" feature)
  const openTabs = useLiveQuery(
    () => db.tabs.where('spaceId').equals(targetSpaceId).sortBy('order'),
    [targetSpaceId]
  );

  // Web Favicons Visibility Preference
  const settings = useUserSettings();
  const showTabFavicons = settings?.showTabFavicons ?? true;

  // Map items to sections and apply search filtering
  const itemsBySection = React.useMemo(() => {
    const map = new Map<string, ResourceItem[]>();
    if (!allItems) return map;

    const query = searchQuery.trim().toLowerCase();

    for (const item of allItems) {
      if (query) {
        const matches =
          item.title.toLowerCase().includes(query) ||
          item.url.toLowerCase().includes(query);
        if (!matches) continue;
      }

      const list = map.get(item.sectionId) || [];
      list.push(item);
      map.set(item.sectionId, list);
    }

    // Sort items within each section by order or createdAt
    for (const [, list] of map.entries()) {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    return map;
  }, [allItems, searchQuery]);

  const {
    collapsedSections,
    isAddingSection,
    setIsAddingSection,
    newSectionTitle,
    setNewSectionTitle,
    editingSectionId,
    setEditingSectionId,
    editingSectionTitle,
    setEditingSectionTitle,
    activeSectionMenuId,
    setActiveSectionMenuId,
    activeItemMenuId,
    setActiveItemMenuId,
    addOpenTabSectionId,
    setAddOpenTabSectionId,
    copiedId,
    resourceModal,
    setResourceModal,
    dragOverSectionId,
    setDragOverSectionId,
    sectionMenuRef,
    itemMenuRef,
    openTabsDropdownRef,
    editSectionInputRef,
    toggleSectionCollapse,
    handleCreateSection,
    handleStartRenameSection,
    handleSaveRenameSection,
    handleDeleteSection,
    handleOpenAllInSection,
    handleOpenResource,
    handleCopyLink,
    handleDeleteItem,
    handleMoveItemToSection,
    handleOpenAddResource,
    handleOpenEditResource,
    handleSaveResource,
    handleAddOpenTabAsResource,
    handleItemDragStart,
    handleSectionDrop,
  } = useResourceActions({
    targetSpaceId,
    sections,
    itemsBySection,
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full select-none pb-32 relative">
      {/* Top Banner / Header Info */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">Resources</h2>
              <span className="text-xs text-slate-400 font-medium">
                (
                {allItems?.filter((it) => sections?.some((s) => s.id === it.sectionId))
                  .length || 0}
                )
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pin permanent documents, spreadsheets, and reference links to this space.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddingSection(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Add Section</span>
        </button>
      </div>

      {/* Add New Section Inline Form */}
      {isAddingSection && (
        <form
          onSubmit={handleCreateSection}
          className="bg-slate-900/80 border border-blue-500/40 rounded-xl p-4 shadow-xl mb-6 flex items-center gap-3"
        >
          <Folder className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <input
            type="text"
            required
            autoFocus
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Section Name (e.g. Project Docs, Key Spreadsheets, Tools)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newSectionTitle.trim()}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition"
          >
            Create Section
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingSection(false);
              setNewSectionTitle('');
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Resource Sections List */}
      <div className="space-y-6">
        {sections && sections.length > 0 ? (
          sections.map((section) => (
            <ResourceSectionCard
              key={section.id}
              section={section}
              sections={sections}
              items={itemsBySection.get(section.id) || []}
              openTabs={openTabs}
              showTabFavicons={showTabFavicons}
              isCollapsed={collapsedSections.has(section.id)}
              isDragOver={dragOverSectionId === section.id}
              editingSectionId={editingSectionId}
              editingSectionTitle={editingSectionTitle}
              editSectionInputRef={editSectionInputRef}
              activeSectionMenuId={activeSectionMenuId}
              sectionMenuRef={sectionMenuRef}
              activeItemMenuId={activeItemMenuId}
              itemMenuRef={itemMenuRef}
              addOpenTabSectionId={addOpenTabSectionId}
              openTabsDropdownRef={openTabsDropdownRef}
              copiedId={copiedId}
              onDragOverSection={setDragOverSectionId}
              onSectionDrop={handleSectionDrop}
              onToggleCollapse={toggleSectionCollapse}
              onStartRenameSection={handleStartRenameSection}
              onEditingSectionTitleChange={setEditingSectionTitle}
              onSaveRenameSection={handleSaveRenameSection}
              onCancelRenameSection={() => setEditingSectionId(null)}
              onToggleAddOpenTabDropdown={(secId) =>
                setAddOpenTabSectionId(addOpenTabSectionId === secId ? null : secId)
              }
              onAddOpenTabAsResource={handleAddOpenTabAsResource}
              onOpenAddResource={handleOpenAddResource}
              onToggleSectionMenu={(secId) =>
                setActiveSectionMenuId(activeSectionMenuId === secId ? null : secId)
              }
              onOpenAllInSection={handleOpenAllInSection}
              onDeleteSection={handleDeleteSection}
              onItemDragStart={handleItemDragStart}
              onOpenResource={handleOpenResource}
              onCopyLink={handleCopyLink}
              onToggleItemMenu={(itemId) =>
                setActiveItemMenuId(activeItemMenuId === itemId ? null : itemId)
              }
              onEditResource={handleOpenEditResource}
              onMoveItemToSection={handleMoveItemToSection}
              onDeleteItem={handleDeleteItem}
            />
          ))
        ) : (
          /* Empty State when no sections exist */
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
            <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">
              No Resource Sections Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Resources help you pin permanent Google Docs, spreadsheets, tools, and project
              links directly to &quot;{activeSpace?.name || 'this space'}&quot;.
            </p>
            <button
              onClick={() => setIsAddingSection(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Section</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Resource Modal */}
      <ResourceModal
        modalState={resourceModal}
        onChangeModalState={setResourceModal}
        onClose={() =>
          setResourceModal({
            isOpen: false,
            mode: 'add',
            sectionId: '',
            title: '',
            url: '',
          })
        }
        onSubmit={handleSaveResource}
      />
    </div>
  );
};
