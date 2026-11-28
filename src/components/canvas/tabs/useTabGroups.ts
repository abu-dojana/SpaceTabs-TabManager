import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Tab, type TabGroup, UNSAVED_SPACE_ID } from '@/db/schema';
import { usePersistedSet } from '@/hooks/usePersistedSet';
import { useAutoFocusSelect } from '@/hooks/useAutoFocusSelect';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  TAB_GROUP_COLORS,
  createTabGroup,
  renameTabGroup,
  updateTabGroupColor,
  reorderTabGroups,
  assignTabsToGroup,
  ungroupTabGroup,
  deleteTabGroupAndTabs,
  ungroupAllTabsInSpace,
  groupTabsByDomain,
  sortGroupTabs,
} from '@/services/tabManager';

export const GROUP_DRAG_MIME = 'application/x-spacetabs-tab-group';

export function useTabGroups(activeSpaceId: string | null) {
  const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

  const tabGroups = useLiveQuery(
    () => db.tabGroups.where('spaceId').equals(targetSpaceId).sortBy('order'),
    [targetSpaceId]
  );

  const [collapsedGroups, setCollapsedGroups] = usePersistedSet(
    'spacetabs_collapsed_tab_groups'
  );

  // Inline "+ Group" creation bar state
  const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);
  const [newGroupTitle, setNewGroupTitle] = React.useState('');
  const [newGroupColor, setNewGroupColor] = React.useState<string>(TAB_GROUP_COLORS[0].hex);
  const newGroupInputRef = React.useRef<HTMLInputElement>(null!);
  useAutoFocusSelect(newGroupInputRef, isCreatingGroup);

  // Inline group rename state
  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = React.useState('');
  const editGroupInputRef = React.useRef<HTMLInputElement>(null!);
  useAutoFocusSelect(editGroupInputRef, Boolean(editingGroupId));

  // Group 3-dot & color swatch popovers
  const [activeGroupMenuId, setActiveGroupMenuId] = React.useState<string | null>(null);
  const [colorPickerGroupId, setColorPickerGroupId] = React.useState<string | null>(null);
  const groupMenuRef = React.useRef<HTMLDivElement>(null!);
  const colorPickerRef = React.useRef<HTMLDivElement>(null!);

  useClickOutside(
    [groupMenuRef],
    () => setActiveGroupMenuId(null),
    Boolean(activeGroupMenuId),
    true
  );
  useClickOutside(
    [colorPickerRef],
    () => setColorPickerGroupId(null),
    Boolean(colorPickerGroupId),
    true
  );

  // Group & bucket drag-and-drop state
  const [draggingGroupId, setDraggingGroupId] = React.useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = React.useState<string | null>(null);
  const [dragOverGroupPosition, setDragOverGroupPosition] = React.useState<
    'top' | 'bottom' | null
  >(null);
  const [dragOverBucketId, setDragOverBucketId] = React.useState<string | null>(null);

  const toggleGroupCollapse = React.useCallback(
    (groupId: string) => {
      setCollapsedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return next;
      });
    },
    [setCollapsedGroups]
  );

  const openCreateGroupBar = () => {
    const nextColorIdx = (tabGroups?.length || 0) % TAB_GROUP_COLORS.length;
    setNewGroupColor(TAB_GROUP_COLORS[nextColorIdx].hex);
    setNewGroupTitle('');
    setIsCreatingGroup(true);
  };

  const handleSubmitCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newGroupTitle.trim() || 'Untitled Group';
    await createTabGroup(activeSpaceId, title, newGroupColor);
    setNewGroupTitle('');
    setIsCreatingGroup(false);
  };

  const handleCreateGroupWithTabs = async (
    tabIds: string[],
    title: string,
    color?: string
  ) => {
    const grp = await createTabGroup(
      activeSpaceId,
      title.trim() || 'Untitled Group',
      color,
      tabIds
    );
    setCollapsedGroups((prev) => {
      if (!prev.has(grp.id)) return prev;
      const next = new Set(prev);
      next.delete(grp.id);
      return next;
    });
  };

  const handleStartRenameGroup = (group: TabGroup) => {
    setActiveGroupMenuId(null);
    setEditingGroupId(group.id);
    setEditingGroupTitle(group.title);
  };

  const handleSaveRenameGroup = async () => {
    if (editingGroupId && editingGroupTitle.trim()) {
      await renameTabGroup(editingGroupId, editingGroupTitle);
    }
    setEditingGroupId(null);
    setEditingGroupTitle('');
  };

  const handleCancelRenameGroup = () => {
    setEditingGroupId(null);
    setEditingGroupTitle('');
  };

  const handleChangeGroupColor = async (groupId: string, color: string) => {
    await updateTabGroupColor(groupId, color);
    setColorPickerGroupId(null);
  };

  const handleAssignTabs = async (
    tabIds: string[],
    groupId: string | undefined,
    anchor?: { tabId: string; position: 'top' | 'bottom' }
  ) => {
    await assignTabsToGroup(activeSpaceId, tabIds, groupId, anchor);
    if (groupId) {
      setCollapsedGroups((prev) => {
        if (!prev.has(groupId)) return prev;
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const handleUngroup = async (groupId: string) => {
    setActiveGroupMenuId(null);
    await ungroupTabGroup(groupId);
  };

  const handleDeleteGroupWithTabs = async (groupId: string) => {
    setActiveGroupMenuId(null);
    await deleteTabGroupAndTabs(groupId);
  };

  const handleGroupByDomain = async () => {
    await groupTabsByDomain(activeSpaceId, 2);
  };

  const handleUngroupAll = async () => {
    await ungroupAllTabsInSpace(activeSpaceId);
  };

  const handleSortGroup = async (groupId: string, mode: 'alpha' | 'domain') => {
    setActiveGroupMenuId(null);
    await sortGroupTabs(groupId, mode);
  };

  const handleDropGroupReorder = async (targetGroupId: string) => {
    if (!draggingGroupId || !tabGroups || draggingGroupId === targetGroupId) {
      setDraggingGroupId(null);
      setDragOverGroupId(null);
      setDragOverGroupPosition(null);
      return;
    }
    const ids = tabGroups.map((g) => g.id);
    const fromIdx = ids.indexOf(draggingGroupId);
    const toIdx = ids.indexOf(targetGroupId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...ids];
    const [moved] = reordered.splice(fromIdx, 1);
    const insertIdx =
      dragOverGroupPosition === 'bottom'
        ? fromIdx < toIdx
          ? toIdx
          : toIdx + 1
        : fromIdx < toIdx
        ? toIdx - 1
        : toIdx;
    reordered.splice(Math.max(0, insertIdx), 0, moved);
    setDraggingGroupId(null);
    setDragOverGroupId(null);
    setDragOverGroupPosition(null);
    await reorderTabGroups(activeSpaceId, reordered);
  };

  const extractDraggedTabIds = (
    e: React.DragEvent,
    fallbackDraggingTabId: string | null,
    selectedTabIds: Set<string>,
    allSpaceTabs: Tab[] | undefined
  ): string[] => {
    try {
      const jsonRaw = e.dataTransfer.getData('application/json');
      if (jsonRaw) {
        const parsed = JSON.parse(jsonRaw);
        if (Array.isArray(parsed?.tabIds) && parsed.tabIds.length > 0) {
          return parsed.tabIds;
        }
      }
    } catch {}
    const singleId = fallbackDraggingTabId || e.dataTransfer.getData('text/plain');
    if (!singleId) return [];
    if (selectedTabIds.has(singleId) && allSpaceTabs) {
      return allSpaceTabs.filter((t) => selectedTabIds.has(t.id)).map((t) => t.id);
    }
    return [singleId];
  };

  return {
    tabGroups: tabGroups || [],
    collapsedGroups,
    isCreatingGroup,
    setIsCreatingGroup,
    newGroupTitle,
    setNewGroupTitle,
    newGroupColor,
    setNewGroupColor,
    newGroupInputRef,
    editingGroupId,
    editingGroupTitle,
    setEditingGroupTitle,
    editGroupInputRef,
    activeGroupMenuId,
    setActiveGroupMenuId,
    colorPickerGroupId,
    setColorPickerGroupId,
    groupMenuRef,
    colorPickerRef,
    draggingGroupId,
    setDraggingGroupId,
    dragOverGroupId,
    setDragOverGroupId,
    dragOverGroupPosition,
    setDragOverGroupPosition,
    dragOverBucketId,
    setDragOverBucketId,
    toggleGroupCollapse,
    openCreateGroupBar,
    handleSubmitCreateGroup,
    handleCreateGroupWithTabs,
    handleStartRenameGroup,
    handleSaveRenameGroup,
    handleCancelRenameGroup,
    handleChangeGroupColor,
    handleAssignTabs,
    handleUngroup,
    handleDeleteGroupWithTabs,
    handleGroupByDomain,
    handleUngroupAll,
    handleSortGroup,
    handleDropGroupReorder,
    extractDraggedTabIds,
  };
}
