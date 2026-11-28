import React from 'react';
import { type Tab } from '@/db/schema';
import {
  openTabsInCurrentWindow,
  openSelectedTabsInNewWindow,
  closeTabsFromStripKeepInSpace,
} from '@/services/tabManager';
import { TabGroupCard } from './TabGroupCard';
import { GROUP_DRAG_MIME, type useTabGroups } from './useTabGroups';

interface TabsGroupedBodyProps {
  grp: ReturnType<typeof useTabGroups>;
  tabs: Tab[] | undefined;
  allSpaceTabs: Tab[] | undefined;
  ungroupedTabs: Tab[];
  groupedTabsOnTop: boolean;
  trimmedQuery: string;
  selectedTabIds: Set<string>;
  draggingTabId: string | null;
  onClearDraggingTab: () => void;
  onToggleSelectGroup: (groupTabs: Tab[], shouldSelect: boolean) => void;
  resolveTabLiveState: (tab: Tab) => {
    resolvedChromeTabId?: number;
    isOpenInThisWindow: boolean;
    isOpenInOtherWindow: boolean;
  };
  renderTabRow: (
    tab: Tab,
    index: number,
    bucketLength: number,
    bucketGroupId: string | undefined
  ) => React.ReactNode;
}

export const TabsGroupedBody: React.FC<TabsGroupedBodyProps> = ({
  grp,
  tabs,
  allSpaceTabs,
  ungroupedTabs,
  groupedTabsOnTop,
  trimmedQuery,
  selectedTabIds,
  draggingTabId,
  onClearDraggingTab,
  onToggleSelectGroup,
  resolveTabLiveState,
  renderTabRow,
}) => {
  const handleUngroupedDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(GROUP_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (grp.dragOverBucketId !== '__ungrouped__') {
      grp.setDragOverBucketId('__ungrouped__');
    }
  };

  const handleUngroupedDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      if (grp.dragOverBucketId === '__ungrouped__') {
        grp.setDragOverBucketId(null);
      }
    }
  };

  const handleUngroupedDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(GROUP_DRAG_MIME)) return;
    e.preventDefault();
    grp.setDragOverBucketId(null);
    const draggedIds = grp.extractDraggedTabIds(
      e,
      draggingTabId,
      selectedTabIds,
      allSpaceTabs
    );
    onClearDraggingTab();
    if (draggedIds.length > 0) {
      await grp.handleAssignTabs(draggedIds, undefined);
    }
  };

  const ungroupedSection =
    ungroupedTabs.length > 0 || Boolean(draggingTabId) ? (
      <div
        onDragOver={handleUngroupedDragOver}
        onDragLeave={handleUngroupedDragLeave}
        onDrop={handleUngroupedDrop}
        className="pt-1"
      >
        <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Ungrouped ({ungroupedTabs.length})</span>
          <span
            className={`font-normal normal-case tracking-normal transition ${
              grp.dragOverBucketId === '__ungrouped__'
                ? 'text-blue-400 font-medium'
                : 'text-slate-500'
            }`}
          >
            Drop here to ungroup
          </span>
        </div>

        <div
          className={`divide-y divide-slate-800/50 rounded-lg border border-dashed p-1 transition ${
            grp.dragOverBucketId === '__ungrouped__'
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-slate-800/90'
          }`}
        >
          {ungroupedTabs.length > 0 ? (
            ungroupedTabs.map((tab, idx) =>
              renderTabRow(tab, idx, ungroupedTabs.length, undefined)
            )
          ) : (
            <div className="py-2 px-3 text-center text-xs text-slate-500 italic">
              Release to move tab out of group
            </div>
          )}
        </div>
      </div>
    ) : null;

  const groupsList = grp.tabGroups.map((group) => {
    const groupTabs = (tabs || []).filter((t) => t.groupId === group.id);
    if (
      trimmedQuery &&
      groupTabs.length === 0 &&
      !group.title.toLowerCase().includes(trimmedQuery)
    ) {
      return null;
    }
    let openInWindowCount = 0;
    let hasAnyOpenTab = false;
    for (const gt of groupTabs) {
      const st = resolveTabLiveState(gt);
      if (st.isOpenInThisWindow) openInWindowCount++;
      if (st.isOpenInThisWindow || st.isOpenInOtherWindow) hasAnyOpenTab = true;
    }

    return (
      <TabGroupCard
        key={group.id}
        group={group}
        tabs={groupTabs}
        selectedTabIds={selectedTabIds}
        openInWindowCount={openInWindowCount}
        hasAnyOpenTab={hasAnyOpenTab}
        isCollapsed={grp.collapsedGroups.has(group.id)}
        isForceExpanded={Boolean(trimmedQuery)}
        isDraggingGroup={grp.draggingGroupId === group.id}
        groupDropPosition={
          grp.dragOverGroupId === group.id && grp.draggingGroupId !== group.id
            ? grp.dragOverGroupPosition
            : null
        }
        isDragOverBucket={grp.dragOverBucketId === group.id}
        editingGroupId={grp.editingGroupId}
        editingGroupTitle={grp.editingGroupTitle}
        editGroupInputRef={grp.editGroupInputRef}
        isMenuOpen={grp.activeGroupMenuId === group.id}
        groupMenuRef={grp.groupMenuRef}
        isColorPickerOpen={grp.colorPickerGroupId === group.id}
        colorPickerRef={grp.colorPickerRef}
        onToggleCollapse={() => grp.toggleGroupCollapse(group.id)}
        onToggleSelectGroup={(sel) => onToggleSelectGroup(groupTabs, sel)}
        onStartRename={() => grp.handleStartRenameGroup(group)}
        onEditingTitleChange={grp.setEditingGroupTitle}
        onSaveRename={grp.handleSaveRenameGroup}
        onCancelRename={grp.handleCancelRenameGroup}
        onToggleColorPicker={(e) => {
          e.stopPropagation();
          grp.setColorPickerGroupId(grp.colorPickerGroupId === group.id ? null : group.id);
        }}
        onSelectColor={(hex) => grp.handleChangeGroupColor(group.id, hex)}
        onToggleMenu={(e) => {
          e.stopPropagation();
          grp.setActiveGroupMenuId(grp.activeGroupMenuId === group.id ? null : group.id);
        }}
        onOpenGroupHere={() => openTabsInCurrentWindow(groupTabs.map((t) => t.id))}
        onOpenGroupInNewWindow={() =>
          openSelectedTabsInNewWindow(groupTabs.map((t) => t.id))
        }
        onCloseGroupFromStrip={() =>
          closeTabsFromStripKeepInSpace(groupTabs.map((t) => t.id))
        }
        onSortGroup={(mode) => grp.handleSortGroup(group.id, mode)}
        onUngroup={() => grp.handleUngroup(group.id)}
        onDeleteGroupAndTabs={() => grp.handleDeleteGroupWithTabs(group.id)}
        onGroupDragStart={() => grp.setDraggingGroupId(group.id)}
        onGroupDragEnd={() => {
          grp.setDraggingGroupId(null);
          grp.setDragOverGroupId(null);
          grp.setDragOverGroupPosition(null);
        }}
        onCardDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (e.dataTransfer.types.includes(GROUP_DRAG_MIME)) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pos: 'top' | 'bottom' =
              e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
            grp.setDragOverGroupId(group.id);
            grp.setDragOverGroupPosition(pos);
          } else if (grp.dragOverBucketId !== group.id) {
            grp.setDragOverBucketId(group.id);
          }
        }}
        onCardDragLeave={(e) => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            if (grp.dragOverGroupId === group.id) {
              grp.setDragOverGroupId(null);
              grp.setDragOverGroupPosition(null);
            }
            if (grp.dragOverBucketId === group.id) {
              grp.setDragOverBucketId(null);
            }
          }
        }}
        onCardDrop={async (e) => {
          e.preventDefault();
          grp.setDragOverBucketId(null);
          if (e.dataTransfer.types.includes(GROUP_DRAG_MIME)) {
            await grp.handleDropGroupReorder(group.id);
            return;
          }
          const draggedIds = grp.extractDraggedTabIds(
            e,
            draggingTabId,
            selectedTabIds,
            allSpaceTabs
          );
          onClearDraggingTab();
          if (draggedIds.length > 0) {
            await grp.handleAssignTabs(draggedIds, group.id);
          }
        }}
      >
        {groupTabs.map((tab, idx) => renderTabRow(tab, idx, groupTabs.length, group.id))}
      </TabGroupCard>
    );
  });

  return (
    <div className="space-y-2.5 pt-0.5">
      {!groupedTabsOnTop && ungroupedSection}
      {groupsList}
      {groupedTabsOnTop && ungroupedSection}
    </div>
  );
};
