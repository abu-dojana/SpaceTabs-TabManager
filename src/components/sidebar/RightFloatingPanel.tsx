import React from 'react';
import { type Space } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  switchWindowToSpace,
  openSpaceInNewWindow,
  getAllWindowSpaces,
  ensureWindowUnsavedSpace,
  duplicateSpace,
  deleteSpacePermanently,
  archiveSpace,
  renameSpace,
  updateSpaceDescription,
  exportSpaceToFile,
  type ExportFormat,
} from '@/services/tabManager';
import { FolderOpen, Plus, Lock, Unlock, X } from 'lucide-react';
import { getUserSettings } from '@/services/settings';
import { getHostWindowId } from '@/utils/chromeWindow';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAutoFocusSelect } from '@/hooks/useAutoFocusSelect';
import { useWindowSpaces } from './hooks/useWindowSpaces';
import { useSidebarSpaces } from './hooks/useSidebarSpaces';
import { useSpaceDragReorder } from './hooks/useSpaceDragReorder';
import { SpaceItem } from './SpaceItem';
import { SidebarModals } from './SidebarModals';

export const RightFloatingPanel: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    setCreateSpaceOpen,
    clearSelectedTabs,
    setMoveSectionSpaceId,
    rightFloatingPanel,
    rightPanelWidth,
    selectedSection,
    setSelectedSection,
  } = useUIStore();

  const { windowSpaces, currentWindowId } = useWindowSpaces();
  const { spaces, unsavedSpaces, unsectionedSpaces, sectionsMap } = useSidebarSpaces();

  const [activeMenuSpaceId, setActiveMenuSpaceId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null!);

  const [inlineEditingSpaceId, setInlineEditingSpaceId] = React.useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = React.useState<string>('');
  const renameInputRef = React.useRef<HTMLInputElement>(null!);

  const [descriptionModalSpace, setDescriptionModalSpace] = React.useState<Space | null>(null);
  const [deleteConfirmSpace, setDeleteConfirmSpace] = React.useState<Space | null>(null);

  const drag = useSpaceDragReorder({
    spaces,
    unsectionedSpaces,
    sectionsMap,
    clearSelectedTabs,
    setActiveSectionMenu: () => {},
  });

  useClickOutside([menuRef], () => setActiveMenuSpaceId(null), Boolean(activeMenuSpaceId));
  useAutoFocusSelect(renameInputRef, Boolean(inlineEditingSpaceId));

  if (!rightFloatingPanel || !selectedSection) {
    return null;
  }

  const sectionSpaces = sectionsMap.get(selectedSection) || [];
  if (!sectionsMap.has(selectedSection)) {
    return null;
  }

  const handleFallbackToUnsaved = async () => {
    try {
      const targetWinId = currentWindowId || (await getHostWindowId());
      if (targetWinId) {
        const nextSpaceId = await ensureWindowUnsavedSpace(targetWinId);
        setActiveSpaceId(nextSpaceId);
      } else if (unsavedSpaces && unsavedSpaces.length > 0) {
        setActiveSpaceId(unsavedSpaces[0].id);
      } else {
        setActiveSpaceId(null);
      }
    } catch (err) {
      console.error('Failed to fallback to unsaved space:', err);
    }
  };

  const handleSelectSpace = async (spaceId: string) => {
    try {
      const settings = await getUserSettings();
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

      if (settings.defaultOpenInNewWindow) {
        await openSpaceInNewWindow(spaceId);
        return;
      }

      setActiveSpaceId(spaceId);
      const targetWinId = currentWindowId || (await getHostWindowId());
      if (targetWinId) {
        await switchWindowToSpace(targetWinId, spaceId);
      }
    } catch (e) {
      console.error('Failed to switch space from right floating panel:', e);
    }
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

  const handleExportSpace = async (space: Space, format: ExportFormat) => {
    setActiveMenuSpaceId(null);
    await exportSpaceToFile(space.id, space.name, format);
  };

  const handleArchiveSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    await archiveSpace(space.id);
    if (activeSpaceId === space.id) {
      await handleFallbackToUnsaved();
    }
  };

  const handleDeleteSpacePermanently = async (spaceId: string) => {
    if (activeSpaceId === spaceId) {
      await handleFallbackToUnsaved();
    }
    await deleteSpacePermanently(spaceId);
    setDeleteConfirmSpace(null);
    setActiveMenuSpaceId(null);
  };

  const renderSpaceItem = (space: Space) => {
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
        onDrop={(e) => drag.handleItemDrop(e, space.id, selectedSection)}
        onSpaceDragStart={(e) => drag.handleSpaceDragStart(e, space.id)}
        onSpaceDragEnd={drag.handleSpaceDragEnd}
        onSetRenamingName={setInlineEditingName}
        onCommitRename={(newIcon) => handleCommitRename(space.id, newIcon)}
        onCancelRename={() => setInlineEditingSpaceId(null)}
        onOpenNewWindow={() => handleOpenNewWindow(space.id)}
        onToggleMenu={() =>
          setActiveMenuSpaceId(activeMenuSpaceId === space.id ? null : space.id)
        }
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
        onExport={(format) => handleExportSpace(space, format)}
        onArchive={() => handleArchiveSpace(space)}
        onDelete={() => {
          setActiveMenuSpaceId(null);
          setDeleteConfirmSpace(space);
        }}
      />
    );
  };

  return (
    <div
      style={{ width: `${rightPanelWidth || 240}px` }}
      className="h-full py-6 pr-0 pl-0 flex flex-col flex-shrink-0 select-none transition-[width] duration-150 ease-out animate-in slide-in-from-right-4 duration-150"
    >
      <aside className="tab-manager-card w-full h-full bg-slate-900 border border-r-0 border-slate-800 rounded-l-xl rounded-r-none shadow-lg flex flex-col relative overflow-hidden">
        {/* Compact Floating Panel Header */}
        <div className="px-3 py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FolderOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <h3
              className="text-[11px] font-bold uppercase tracking-wider text-slate-100 truncate"
              title={selectedSection}
            >
              {selectedSection}
            </h3>
            <span className="min-w-[16px] h-4 px-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 flex-shrink-0">
              {sectionSpaces.length}
            </span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={drag.toggleSpacesLock}
              className={`p-1 rounded-md transition ${
                !drag.isSpacesLocked
                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={
                drag.isSpacesLocked
                  ? 'Order locked. Click to reorder spaces in this section.'
                  : 'Order unlocked. Drag spaces to reorder, click to lock.'
              }
            >
              {drag.isSpacesLocked ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Unlock className="w-3 h-3 text-amber-400" />
              )}
            </button>

            <button
              onClick={() => setCreateSpaceOpen(true, selectedSection)}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
              title={`Create new Space in ${selectedSection}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setSelectedSection(null)}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
              title="Close floating panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section Spaces List */}
        <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-0.5">
          {sectionSpaces.map((space) => renderSpaceItem(space))}
        </div>

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
          deleteSectionModal={null}
          onCloseDeleteSection={() => {}}
          onArchiveSectionSpaces={async () => {}}
          onKeepSectionSpaces={async () => {}}
        />
      </aside>
    </div>
  );
};
