import React from 'react';
import { db } from '@/db';
import { type Space } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  switchWindowToSpace,
  openSpaceInNewWindow,
  getAllWindowSpaces,
  deleteUnsavedSession,
  duplicateSpace,
  deleteSpacePermanently,
  archiveSpace,
  restoreSpace,
  renameSpace,
  updateSpaceDescription,
  exportSpaceToFile,
  renameSection,
  archiveSectionSpaces,
  keepSectionSpacesUnsectioned,
} from '@/services/tabManager';
import { Folder, Plus, Lock, Unlock } from 'lucide-react';
import { getUserSettings } from '@/services/settings';
import { getHostWindowId } from '@/utils/chromeWindow';
import { useDriveSyncInfo } from '@/hooks/useDriveSyncInfo';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAutoFocusSelect } from '@/hooks/useAutoFocusSelect';
import { useWindowSpaces } from './hooks/useWindowSpaces';
import { useSidebarSpaces } from './hooks/useSidebarSpaces';
import { useSpaceDragReorder } from './hooks/useSpaceDragReorder';
import { SidebarBrandHeader } from './SidebarBrandHeader';
import { UnsavedSessionsSection } from './UnsavedSessionsSection';
import { SpaceItem } from './SpaceItem';
import { SectionGroup } from './SectionGroup';
import { ArchiveDrawer } from './ArchiveDrawer';
import { SidebarFooter } from './SidebarFooter';
import { SidebarModals } from './SidebarModals';

export const Sidebar: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    setCreateSpaceOpen,
    clearSelectedTabs,
    setMoveSectionSpaceId,
    setSettingsOpen,
    sidebarWidth,
    accentColor,
  } = useUIStore();

  const syncInfo = useDriveSyncInfo();
  const { windowSpaces, currentWindowId } = useWindowSpaces();
  const {
    spaces,
    unsavedSpaces,
    unsavedTabsMap,
    totalUnsavedTabsCount,
    getUnsavedTitle,
    archivedSpaces,
    unsectionedSpaces,
    sectionsMap,
  } = useSidebarSpaces();

  // 3-Dot Dropdown & Modals State for Spaces
  const [activeMenuSpaceId, setActiveMenuSpaceId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null!);

  const [inlineEditingSpaceId, setInlineEditingSpaceId] = React.useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = React.useState<string>('');
  const renameInputRef = React.useRef<HTMLInputElement>(null!);

  // Section Management State
  const [activeSectionMenu, setActiveSectionMenu] = React.useState<string | null>(null);
  const sectionMenuRef = React.useRef<HTMLDivElement>(null!);

  const [editingSectionName, setEditingSectionName] = React.useState<string | null>(null);
  const [renamingSectionValue, setRenamingSectionValue] = React.useState<string>('');
  const renameSectionInputRef = React.useRef<HTMLInputElement>(null!);

  const [deleteSectionModal, setDeleteSectionModal] = React.useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [descriptionModalSpace, setDescriptionModalSpace] = React.useState<Space | null>(null);
  const [deleteConfirmSpace, setDeleteConfirmSpace] = React.useState<Space | null>(null);

  const drag = useSpaceDragReorder({
    spaces,
    unsectionedSpaces,
    sectionsMap,
    clearSelectedTabs,
    setActiveSectionMenu,
  });

  useClickOutside([menuRef], () => setActiveMenuSpaceId(null), Boolean(activeMenuSpaceId));
  useClickOutside([sectionMenuRef], () => setActiveSectionMenu(null), Boolean(activeSectionMenu));

  useAutoFocusSelect(renameInputRef, Boolean(inlineEditingSpaceId));
  useAutoFocusSelect(renameSectionInputRef, Boolean(editingSectionName));

  const handleSelectSpace = async (spaceId: string | null) => {
    try {
      if (!spaceId) {
        if (unsavedSpaces && unsavedSpaces.length > 0) {
          await handleSelectUnsavedSession(unsavedSpaces[0].id);
        } else {
          await handleCreateNewUnsavedSession();
        }
        return;
      }

      const settings = await getUserSettings();

      if (spaceId) {
        const winSpaces = await getAllWindowSpaces();
        if (currentWindowId !== null && winSpaces.get(currentWindowId) === spaceId) {
          setActiveSpaceId(spaceId);
          return;
        }
        for (const [wId, sId] of winSpaces.entries()) {
          if (sId === spaceId && wId !== currentWindowId) {
            try {
              await chrome.windows.update(wId, { focused: true });
              return;
            } catch {}
          }
        }
      }

      if (settings.defaultOpenInNewWindow && spaceId) {
        await openSpaceInNewWindow(spaceId);
        return;
      }

      setActiveSpaceId(spaceId);
      const targetWinId = currentWindowId || (await getHostWindowId());
      if (targetWinId) {
        await switchWindowToSpace(targetWinId, spaceId);
      }
    } catch (e) {
      console.error('Failed to switch space in window:', e);
    }
  };

  const handleCreateNewUnsavedSession = async () => {
    try {
      const newId = crypto.randomUUID();
      const now = Date.now();
      await db.spaces.add({
        id: newId,
        name: '',
        isUnsaved: true,
        order: now,
        createdAt: now,
        updatedAt: now,
        isArchived: false,
      });

      const targetWinId = currentWindowId || (await getHostWindowId());
      if (targetWinId) {
        await switchWindowToSpace(targetWinId, newId);
      }
      setActiveSpaceId(newId);
    } catch (err) {
      console.error('Failed to create new unsaved session:', err);
    }
  };

  const handleDeleteUnsavedSession = async (spaceId: string) => {
    try {
      await deleteUnsavedSession(spaceId);
      if (activeSpaceId === spaceId) {
        setActiveSpaceId(null);
      }
    } catch (err) {
      console.error('Failed to delete unsaved session:', err);
    }
  };

  const handleSelectUnsavedSession = async (spaceId: string) => {
    try {
      for (const [wId, sId] of windowSpaces.entries()) {
        if (sId === spaceId && wId !== currentWindowId) {
          try {
            await chrome.windows.update(wId, { focused: true });
            return;
          } catch {}
        }
      }

      setActiveSpaceId(spaceId);
      const targetWinId = currentWindowId || (await getHostWindowId());
      if (targetWinId) {
        await switchWindowToSpace(targetWinId, spaceId);
      }
    } catch (err) {
      console.error('Failed to switch to unsaved session:', err);
    }
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionName)) next.delete(sectionName);
      else next.add(sectionName);
      return next;
    });
  };

  const handleCommitRenameSection = async (oldName: string) => {
    const trimmed = await renameSection(oldName, renamingSectionValue);
    if (trimmed) {
      setCollapsedSections((prev) => {
        if (prev.has(oldName)) {
          const next = new Set(prev);
          next.delete(oldName);
          next.add(trimmed);
          return next;
        }
        return prev;
      });
    }
    setEditingSectionName(null);
  };

  const handleArchiveSectionSpaces = async (sectionName: string) => {
    const archivedIds = await archiveSectionSpaces(sectionName);
    if (activeSpaceId && archivedIds.includes(activeSpaceId)) {
      await handleSelectSpace(null);
    }
    setDeleteSectionModal(null);
  };

  const handleKeepSectionSpaces = async (sectionName: string) => {
    await keepSectionSpacesUnsectioned(sectionName);
    setDeleteSectionModal(null);
  };

  const handleCommitRename = async (spaceId: string, newIcon?: string) => {
    await renameSpace(spaceId, inlineEditingName, newIcon);
    setInlineEditingSpaceId(null);
  };

  const handleOpenNewWindow = async (spaceId: string) => {
    setActiveMenuSpaceId(null);
    await openSpaceInNewWindow(spaceId);
  };

  const handleDuplicateSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    await duplicateSpace(space);
  };

  const handleExportSidebarSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    await exportSpaceToFile(space.id, space.name);
  };

  const handleArchiveSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    await archiveSpace(space.id);
    if (activeSpaceId === space.id) {
      await handleSelectSpace(null);
    }
  };

  const handleRestoreSpace = async (spaceId: string) => {
    await restoreSpace(spaceId);
  };

  const handleDeleteSpacePermanently = async (spaceId: string) => {
    if (activeSpaceId === spaceId) {
      await handleSelectSpace(null);
    }
    await deleteSpacePermanently(spaceId);
    setDeleteConfirmSpace(null);
    setActiveMenuSpaceId(null);
  };

  const renderSpaceItem = (space: Space, sectionName?: string) => {
    let otherWindowId: number | null = null;
    for (const [wId, sId] of windowSpaces.entries()) {
      if (sId === space.id && wId !== currentWindowId) {
        otherWindowId = wId;
        break;
      }
    }
    const isOpenInThisWindow =
      windowSpaces.size > 1 &&
      currentWindowId !== null &&
      windowSpaces.get(currentWindowId) === space.id;
    const isOpenInOtherWindow = otherWindowId !== null;

    return (
      <SpaceItem
        key={space.id}
        space={space}
        isActive={activeSpaceId === space.id}
        isOver={drag.dragOverSpaceId === space.id}
        isMenuOpen={activeMenuSpaceId === space.id}
        isRenaming={inlineEditingSpaceId === space.id}
        inlineEditingName={inlineEditingName}
        renameInputRef={renameInputRef}
        menuRef={menuRef}
        isOpenInThisWindow={isOpenInThisWindow}
        isOpenInOtherWindow={isOpenInOtherWindow}
        otherWindowId={otherWindowId}
        isSpacesLocked={drag.isSpacesLocked}
        isDraggingThisSpace={drag.draggedSpaceId === space.id}
        dropIndicator={drag.dragOverTargetSpaceId === space.id ? drag.dropPosition : null}
        onSelectSpace={() => handleSelectSpace(space.id)}
        onDragOver={(e) => drag.handleItemDragOver(e, space.id)}
        onDragEnter={(e) => e.preventDefault()}
        onDragLeave={(e) => drag.handleItemDragLeave(e, space.id)}
        onDrop={(e) => drag.handleItemDrop(e, space.id, sectionName)}
        onSpaceDragStart={(e) => drag.handleSpaceDragStart(e, space.id)}
        onSpaceDragEnd={drag.handleSpaceDragEnd}
        onSetRenamingName={setInlineEditingName}
        onCommitRename={(newIcon) => handleCommitRename(space.id, newIcon)}
        onCancelRename={() => setInlineEditingSpaceId(null)}
        onOpenNewWindow={() => handleOpenNewWindow(space.id)}
        onToggleMenu={() => setActiveMenuSpaceId(activeMenuSpaceId === space.id ? null : space.id)}
        onStartRename={() => {
          setActiveMenuSpaceId(null);
          setInlineEditingSpaceId(space.id);
          setInlineEditingName(space.name);
        }}
        onDuplicate={() => handleDuplicateSpace(space)}
        onMoveToSection={() => {
          setActiveMenuSpaceId(null);
          setMoveSectionSpaceId(space.id);
        }}
        onEditDescription={() => {
          setActiveMenuSpaceId(null);
          setDescriptionModalSpace(space);
        }}
        onExport={() => handleExportSidebarSpace(space)}
        onArchive={() => handleArchiveSpace(space)}
        onDelete={() => {
          setActiveMenuSpaceId(null);
          setDeleteConfirmSpace(space);
        }}
      />
    );
  };

  return (
    <aside
      style={{ width: `${sidebarWidth || 260}px` }}
      className="bg-slate-950 border-r border-slate-800 flex flex-col h-screen select-none relative flex-shrink-0 transition-[width] duration-150 ease-out"
    >
      <SidebarBrandHeader
        accentColor={accentColor}
        syncInfo={syncInfo}
        onOpenCloudSettings={() => setSettingsOpen(true, 'cloud')}
      />

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
        <UnsavedSessionsSection
          unsavedSpaces={unsavedSpaces}
          unsavedTabsMap={unsavedTabsMap}
          totalUnsavedTabsCount={totalUnsavedTabsCount}
          activeSpaceId={activeSpaceId}
          currentWindowId={currentWindowId}
          windowSpaces={windowSpaces}
          dragOverSpaceId={drag.dragOverSpaceId}
          getUnsavedTitle={getUnsavedTitle}
          onSetDragOverSpaceId={drag.setDragOverSpaceId}
          onCreateNewUnsavedSession={handleCreateNewUnsavedSession}
          onSelectUnsavedSession={handleSelectUnsavedSession}
          onDeleteUnsavedSession={handleDeleteUnsavedSession}
          onDropOnSpace={drag.handleDropOnSpace}
        />

        {/* Spaces Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>Spaces</span>
            </div>
            <div className="flex items-center gap-1.5">
              {unsectionedSpaces.length > 0 && (
                <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                  {unsectionedSpaces.length}
                </span>
              )}
              <button
                onClick={drag.toggleSpacesLock}
                className={`p-1 rounded transition ${
                  !drag.isSpacesLocked
                    ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={
                  drag.isSpacesLocked
                    ? 'Order locked. Click to reorder spaces & sections.'
                    : 'Order unlocked. Drag spaces or sections to reorder, click to lock.'
                }
              >
                {drag.isSpacesLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>
              <button
                onClick={() => setCreateSpaceOpen(true)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                title="Create new Space"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-0.5">
            {unsectionedSpaces.length > 0 ? (
              unsectionedSpaces.map((space) => renderSpaceItem(space))
            ) : sectionsMap.size === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 italic">
                No spaces created yet. Click + to add your first space.
              </div>
            ) : null}
          </div>

          {Array.from(sectionsMap.entries()).map(
            ([sectionName, sectionSpaces], sectionIdx, entriesArr) => (
              <SectionGroup
                key={sectionName}
                sectionName={sectionName}
                spaces={sectionSpaces}
                isCollapsed={collapsedSections.has(sectionName)}
                isEditing={editingSectionName === sectionName}
                renamingValue={renamingSectionValue}
                isMenuOpen={activeSectionMenu === sectionName}
                isSpacesLocked={drag.isSpacesLocked}
                isDraggingThisSection={drag.draggedSectionName === sectionName}
                dropIndicator={
                  drag.dragOverTargetSection === sectionName ? drag.sectionDropPosition : null
                }
                canMoveUp={sectionIdx > 0}
                canMoveDown={sectionIdx < entriesArr.length - 1}
                sectionMenuRef={sectionMenuRef}
                renameInputRef={renameSectionInputRef}
                onToggleCollapse={() => toggleSection(sectionName)}
                onStartRename={() => {
                  setActiveSectionMenu(null);
                  setEditingSectionName(sectionName);
                  setRenamingSectionValue(sectionName);
                }}
                onSetRenamingValue={setRenamingSectionValue}
                onCommitRename={() => handleCommitRenameSection(sectionName)}
                onCancelRename={() => setEditingSectionName(null)}
                onToggleMenu={() =>
                  setActiveSectionMenu(activeSectionMenu === sectionName ? null : sectionName)
                }
                onDeleteSection={() => {
                  setActiveSectionMenu(null);
                  setDeleteSectionModal(sectionName);
                }}
                onSectionDragStart={(e) => drag.handleSectionDragStart(e, sectionName)}
                onSectionDragEnd={drag.handleSectionDragEnd}
                onSectionDragOver={(e) => drag.handleSectionDragOver(e, sectionName)}
                onSectionDragLeave={(e) => drag.handleSectionDragLeave(e, sectionName)}
                onSectionDrop={(e) => drag.handleSectionDrop(e, sectionName)}
                onMoveSectionUp={() => drag.handleMoveSectionByOffset(sectionName, -1)}
                onMoveSectionDown={() => drag.handleMoveSectionByOffset(sectionName, 1)}
                renderSpaceItem={renderSpaceItem}
              />
            )
          )}
        </div>

        <ArchiveDrawer
          archivedSpaces={archivedSpaces}
          isOpen={archiveOpen}
          onToggleOpen={() => setArchiveOpen(!archiveOpen)}
          onRestoreSpace={handleRestoreSpace}
          onRequestDeleteSpace={setDeleteConfirmSpace}
        />
      </div>

      <SidebarFooter
        onOpenSupport={() => setSettingsOpen(true, 'contact')}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SidebarModals
        descriptionModalSpace={descriptionModalSpace}
        onCloseDescription={() => setDescriptionModalSpace(null)}
        onSaveDescription={async (spaceId, desc) => {
          await updateSpaceDescription(spaceId, desc);
          setDescriptionModalSpace(null);
        }}
        deleteConfirmSpace={deleteConfirmSpace}
        onCloseDeleteConfirm={() => setDeleteConfirmSpace(null)}
        onConfirmDeleteSpace={handleDeleteSpacePermanently}
        deleteSectionModal={deleteSectionModal}
        onCloseDeleteSection={() => setDeleteSectionModal(null)}
        onArchiveSectionSpaces={handleArchiveSectionSpaces}
        onKeepSectionSpaces={handleKeepSectionSpaces}
      />
    </aside>
  );
};
