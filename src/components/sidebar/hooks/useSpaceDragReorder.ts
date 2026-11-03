import React from 'react';
import { type Space } from '@/db/schema';
import {
  moveTabsToSpace,
  reorderSpacesInList,
  persistSectionOrder as persistSectionOrderInDb,
  moveSectionByOffset,
} from '@/services/tabManager';

interface UseSpaceDragReorderParams {
  spaces: Space[] | undefined;
  unsectionedSpaces: Space[];
  sectionsMap: Map<string, Space[]>;
  clearSelectedTabs: () => void;
  setActiveSectionMenu: (sec: string | null) => void;
}

export function useSpaceDragReorder({
  spaces,
  unsectionedSpaces,
  sectionsMap,
  clearSelectedTabs,
  setActiveSectionMenu,
}: UseSpaceDragReorderParams) {
  const [dragOverSpaceId, setDragOverSpaceId] = React.useState<string | null>(null);

  const [isSpacesLocked, setIsSpacesLocked] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('spacetabs_spaces_locked') !== 'false';
    } catch {
      return true;
    }
  });
  const [draggedSpaceId, setDraggedSpaceId] = React.useState<string | null>(null);
  const [dragOverTargetSpaceId, setDragOverTargetSpaceId] = React.useState<string | null>(null);
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null);

  const [draggedSectionName, setDraggedSectionName] = React.useState<string | null>(null);
  const [dragOverTargetSection, setDragOverTargetSection] = React.useState<string | null>(null);
  const [sectionDropPosition, setSectionDropPosition] = React.useState<'before' | 'after' | null>(
    null
  );

  const toggleSpacesLock = () => {
    const next = !isSpacesLocked;
    setIsSpacesLocked(next);
    try {
      localStorage.setItem('spacetabs_spaces_locked', String(next));
    } catch {}
  };

  const handleDropOnSpace = async (e: React.DragEvent, targetSpaceId: string | null) => {
    e.preventDefault();
    setDragOverSpaceId(null);

    let tabIds: string[] = [];
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.tabIds)) {
          tabIds = data.tabIds;
        } else if (data.tabId) {
          tabIds = [data.tabId];
        }
      }
    } catch {}

    if (tabIds.length === 0) {
      const plainId = e.dataTransfer.getData('text/plain');
      if (plainId) tabIds = [plainId];
    }

    if (tabIds.length > 0) {
      await moveTabsToSpace(tabIds, targetSpaceId);
      clearSelectedTabs();
    }
  };

  const handleReorderSpaces = async (
    sourceId: string,
    targetId: string,
    position: 'before' | 'after',
    sectionName?: string
  ) => {
    if (sourceId === targetId || !spaces) return;

    const currentList = sectionName
      ? [...(sectionsMap.get(sectionName) || [])]
      : [...unsectionedSpaces];

    await reorderSpacesInList(currentList, sourceId, targetId, position);
    setDraggedSpaceId(null);
    setDragOverTargetSpaceId(null);
    setDropPosition(null);
  };

  const handleReorderSections = async (
    sourceSection: string,
    targetSection: string,
    position: 'before' | 'after'
  ) => {
    if (sourceSection === targetSection) return;
    const sectionNames = Array.from(sectionsMap.keys());
    const sourceIdx = sectionNames.indexOf(sourceSection);
    const targetIdx = sectionNames.indexOf(targetSection);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = sectionNames.splice(sourceIdx, 1);
    let insertIdx = sectionNames.indexOf(targetSection);
    if (position === 'after') {
      insertIdx += 1;
    }
    sectionNames.splice(insertIdx, 0, moved);

    await persistSectionOrderInDb(sectionNames, sectionsMap);
    setDraggedSectionName(null);
    setDragOverTargetSection(null);
    setSectionDropPosition(null);
  };

  const handleMoveSectionByOffset = async (sectionName: string, offset: -1 | 1) => {
    setActiveSectionMenu(null);
    await moveSectionByOffset(sectionsMap, sectionName, offset);
  };

  const handleSectionDragStart = (e: React.DragEvent, sectionName: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/x-spacetabs-section-name', sectionName);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSectionName(sectionName);
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionName(null);
    setDragOverTargetSection(null);
    setSectionDropPosition(null);
  };

  const handleSectionDragOver = (e: React.DragEvent, sectionName: string) => {
    if (!draggedSectionName) return;
    e.preventDefault();
    e.stopPropagation();
    if (draggedSectionName !== sectionName) {
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      const pos: 'before' | 'after' = offset < rect.height / 2 ? 'before' : 'after';
      if (dragOverTargetSection !== sectionName || sectionDropPosition !== pos) {
        setDragOverTargetSection(sectionName);
        setSectionDropPosition(pos);
      }
    }
  };

  const handleSectionDragLeave = (e: React.DragEvent, sectionName: string) => {
    if (!draggedSectionName) return;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverTargetSection === sectionName) {
        setDragOverTargetSection(null);
        setSectionDropPosition(null);
      }
    }
  };

  const handleSectionDrop = async (e: React.DragEvent, targetSectionName: string) => {
    if (!draggedSectionName) return;
    e.preventDefault();
    e.stopPropagation();
    if (draggedSectionName !== targetSectionName) {
      const pos = sectionDropPosition || 'after';
      await handleReorderSections(draggedSectionName, targetSectionName, pos);
    } else {
      setDraggedSectionName(null);
      setDragOverTargetSection(null);
      setSectionDropPosition(null);
    }
  };

  const handleSpaceDragStart = (e: React.DragEvent, spaceId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/x-spacetabs-space-id', spaceId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSpaceId(spaceId);
  };

  const handleSpaceDragEnd = () => {
    setDraggedSpaceId(null);
    setDragOverTargetSpaceId(null);
    setDropPosition(null);
  };

  const handleItemDragOver = (e: React.DragEvent, spaceId: string) => {
    if (draggedSectionName) return;
    e.preventDefault();
    if (draggedSpaceId && draggedSpaceId !== spaceId) {
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      const pos: 'before' | 'after' = offset < rect.height / 2 ? 'before' : 'after';
      if (dragOverTargetSpaceId !== spaceId || dropPosition !== pos) {
        setDragOverTargetSpaceId(spaceId);
        setDropPosition(pos);
      }
      return;
    }
    if (!draggedSpaceId) {
      e.dataTransfer.dropEffect = 'move';
      if (dragOverSpaceId !== spaceId) {
        setDragOverSpaceId(spaceId);
      }
    }
  };

  const handleItemDragLeave = (e: React.DragEvent, spaceId: string) => {
    if (draggedSectionName) return;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverTargetSpaceId === spaceId) {
        setDragOverTargetSpaceId(null);
        setDropPosition(null);
      }
      if (dragOverSpaceId === spaceId) {
        setDragOverSpaceId(null);
      }
    }
  };

  const handleItemDrop = async (
    e: React.DragEvent,
    targetSpaceId: string,
    sectionName?: string
  ) => {
    if (draggedSectionName) return;
    e.preventDefault();
    e.stopPropagation();
    if (draggedSpaceId && draggedSpaceId !== targetSpaceId) {
      const pos = dropPosition || 'after';
      await handleReorderSpaces(draggedSpaceId, targetSpaceId, pos, sectionName);
      return;
    }
    if (!draggedSpaceId) {
      await handleDropOnSpace(e, targetSpaceId);
    }
  };

  return {
    dragOverSpaceId,
    setDragOverSpaceId,
    isSpacesLocked,
    toggleSpacesLock,
    draggedSpaceId,
    dragOverTargetSpaceId,
    dropPosition,
    draggedSectionName,
    dragOverTargetSection,
    sectionDropPosition,
    handleDropOnSpace,
    handleMoveSectionByOffset,
    handleSectionDragStart,
    handleSectionDragEnd,
    handleSectionDragOver,
    handleSectionDragLeave,
    handleSectionDrop,
    handleSpaceDragStart,
    handleSpaceDragEnd,
    handleItemDragOver,
    handleItemDragLeave,
    handleItemDrop,
  };
}
