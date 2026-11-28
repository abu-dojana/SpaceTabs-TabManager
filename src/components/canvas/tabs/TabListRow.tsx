import React from 'react';
import { type Tab, type Space } from '@/db/schema';
import {
  locateOrOpenTab,
  openTabInNewWindow,
  closeTabsFromStripKeepInSpace,
  closeTabs,
  moveTabsToSpace,
  reorderTabsAndSyncBrowser,
} from '@/services/tabManager';
import { TabItem } from '../TabItem';
import { GROUP_DRAG_MIME, type useTabGroups } from './useTabGroups';

interface TabListRowProps {
  tab: Tab;
  index: number;
  bucketLength: number;
  bucketGroupId: string | undefined;
  grp: ReturnType<typeof useTabGroups>;
  allSpaceTabs: Tab[] | undefined;
  spaces: Space[] | undefined;
  activeSpaceId: string | null;
  selectedTabIds: Set<string>;
  copiedId: string | null;
  moveDropdownTabId: string | null;
  draggingTabId: string | null;
  dragOverTabId: string | null;
  dragOverTabPos: 'top' | 'bottom' | null;
  dropdownRef: React.RefObject<HTMLDivElement>;
  newSpaceInputRef: React.RefObject<HTMLInputElement>;
  isCreatingNewSpace: boolean;
  newSpaceName: string;
  resolvedChromeTabId?: number;
  isOpenInThisWindow: boolean;
  isOpenInOtherWindow: boolean;
  renderFavicon: (url: string, fav?: string) => React.ReactNode;
  onToggleSelect: () => void;
  onCopyUrl: () => void;
  onSetMoveDropdownTabId: (id: string | null) => void;
  onSetDraggingTabId: (id: string | null) => void;
  onSetDragOverTab: (id: string | null, pos: 'top' | 'bottom' | null) => void;
  onStartCreateNewSpace: () => void;
  onCancelCreateNewSpace: () => void;
  onSetNewSpaceName: (val: string) => void;
  onMoveToNewSpace: (name: string) => void;
}

export const TabListRow: React.FC<TabListRowProps> = ({
  tab,
  index,
  bucketLength,
  bucketGroupId,
  grp,
  allSpaceTabs,
  spaces,
  activeSpaceId,
  selectedTabIds,
  copiedId,
  moveDropdownTabId,
  draggingTabId,
  dragOverTabId,
  dragOverTabPos,
  dropdownRef,
  newSpaceInputRef,
  isCreatingNewSpace,
  newSpaceName,
  resolvedChromeTabId,
  isOpenInThisWindow,
  isOpenInOtherWindow,
  renderFavicon,
  onToggleSelect,
  onCopyUrl,
  onSetMoveDropdownTabId,
  onSetDraggingTabId,
  onSetDragOverTab,
  onStartCreateNewSpace,
  onCancelCreateNewSpace,
  onSetNewSpaceName,
  onMoveToNewSpace,
}) => {
  return (
    <TabItem
      tab={tab}
      isSelected={selectedTabIds.has(tab.id)}
      isDropdownOpen={moveDropdownTabId === tab.id}
      isNearBottom={index >= Math.max(bucketLength - 2, 1)}
      isDragging={draggingTabId === tab.id}
      isOpenInThisWindow={isOpenInThisWindow}
      isOpenInOtherWindow={isOpenInOtherWindow}
      copiedId={copiedId}
      spaces={spaces}
      tabGroups={grp.tabGroups}
      activeSpaceId={activeSpaceId}
      dropdownRef={dropdownRef}
      newSpaceInputRef={newSpaceInputRef}
      isCreatingNewSpace={isCreatingNewSpace}
      newSpaceName={newSpaceName}
      renderFavicon={renderFavicon}
      onToggleSelect={onToggleSelect}
      onLocateOrOpen={() => locateOrOpenTab({ ...tab, chromeTabId: resolvedChromeTabId })}
      onOpenInNewWindow={() => openTabInNewWindow({ ...tab, chromeTabId: resolvedChromeTabId })}
      onCopyUrl={onCopyUrl}
      onCloseFromStrip={() => closeTabsFromStripKeepInSpace([tab.id])}
      onCloseTab={() => closeTabs([tab.id])}
      onToggleDropdown={(e) => {
        e.stopPropagation();
        onSetMoveDropdownTabId(moveDropdownTabId === tab.id ? null : tab.id);
      }}
      onMoveToSpace={async (targetSpaceId) => {
        await moveTabsToSpace([tab.id], targetSpaceId);
        onSetMoveDropdownTabId(null);
      }}
      onAssignToGroup={async (targetGroupId) => {
        await grp.handleAssignTabs([tab.id], targetGroupId);
        onSetMoveDropdownTabId(null);
      }}
      onStartCreateNewSpace={onStartCreateNewSpace}
      onCancelCreateNewSpace={onCancelCreateNewSpace}
      onSetNewSpaceName={onSetNewSpaceName}
      onMoveToNewSpace={onMoveToNewSpace}
      onDragStart={(e) => {
        const tabIdsToMove = selectedTabIds.has(tab.id)
          ? Array.from(selectedTabIds)
          : [tab.id];
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({ tabIds: tabIdsToMove, sourceSpaceId: tab.spaceId })
        );
        e.dataTransfer.setData('text/plain', tab.id);
        e.dataTransfer.effectAllowed = 'move';
        onSetDraggingTabId(tab.id);
      }}
      onDragEnd={() => {
        onSetDraggingTabId(null);
        onSetDragOverTab(null, null);
        grp.setDragOverBucketId(null);
      }}
      dragOverPosition={
        dragOverTabId === tab.id && draggingTabId && draggingTabId !== tab.id
          ? dragOverTabPos
          : null
      }
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(GROUP_DRAG_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const pos: 'top' | 'bottom' =
          e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
        if (dragOverTabId !== tab.id || dragOverTabPos !== pos) {
          onSetDragOverTab(tab.id, pos);
        }
      }}
      onDragLeave={() => {
        if (dragOverTabId === tab.id) {
          onSetDragOverTab(null, null);
        }
      }}
      onDrop={async (e) => {
        if (e.dataTransfer.types.includes(GROUP_DRAG_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        const dropPos = dragOverTabPos || 'bottom';
        onSetDragOverTab(null, null);
        grp.setDragOverBucketId(null);

        const draggedIds = grp.extractDraggedTabIds(
          e,
          draggingTabId,
          selectedTabIds,
          allSpaceTabs
        );
        onSetDraggingTabId(null);
        if (draggedIds.length === 0 || (draggedIds.length === 1 && draggedIds[0] === tab.id)) {
          return;
        }

        if (grp.tabGroups.length === 0 && draggedIds.length === 1 && allSpaceTabs) {
          const fromIdx = allSpaceTabs.findIndex((t) => t.id === draggedIds[0]);
          const toIdx = allSpaceTabs.findIndex((t) => t.id === tab.id);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
            const reordered = [...allSpaceTabs];
            const [moved] = reordered.splice(fromIdx, 1);
            const insertIdx =
              dropPos === 'bottom'
                ? fromIdx < toIdx
                  ? toIdx
                  : toIdx + 1
                : fromIdx < toIdx
                ? toIdx - 1
                : toIdx;
            reordered.splice(Math.max(0, insertIdx), 0, moved);
            await reorderTabsAndSyncBrowser(reordered);
          }
          return;
        }

        await grp.handleAssignTabs(draggedIds, bucketGroupId, {
          tabId: tab.id,
          position: dropPos,
        });
      }}
    />
  );
};
