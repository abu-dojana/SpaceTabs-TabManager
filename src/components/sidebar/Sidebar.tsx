import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Space, type Tab, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { extractDomain } from '@/utils/urlFilter';
import {
  switchWindowToSpace,
  moveTabsToSpace,
  openSpaceInNewWindow,
  getAllWindowSpaces,
} from '@/services/tabManager';
import {
  Folder,
  Layers,
  Archive,
  Plus,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Settings,
  Heart,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { getUserSettings } from '@/services/settings';
import {
  recordTombstones,
  subscribeSyncStatus,
  type DriveSyncInfo,
} from '@/services/driveSync';
import { useWindowSpaces } from './hooks/useWindowSpaces';
import { SpaceItem } from './SpaceItem';
import { SectionGroup } from './SectionGroup';
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

  const [dragOverSpaceId, setDragOverSpaceId] = React.useState<string | null>(null);

  // Spaces lock / reorder mode state
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
  const [sectionDropPosition, setSectionDropPosition] = React.useState<'before' | 'after' | null>(null);

  const toggleSpacesLock = () => {
    const next = !isSpacesLocked;
    setIsSpacesLocked(next);
    try {
      localStorage.setItem('spacetabs_spaces_locked', String(next));
    } catch {}
  };

  // Cloud Drive Sync live info subscription
  const [syncInfo, setSyncInfo] = React.useState<DriveSyncInfo | null>(null);

  // Live multi-window active spaces mapping
  const { windowSpaces, currentWindowId } = useWindowSpaces();

  React.useEffect(() => {
    const unsub = subscribeSyncStatus((info) => {
      setSyncInfo(info);
    });
    return () => unsub();
  }, []);

  // 3-Dot Dropdown & Modals State for Spaces
  const [activeMenuSpaceId, setActiveMenuSpaceId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [inlineEditingSpaceId, setInlineEditingSpaceId] = React.useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = React.useState<string>('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  // Section Management State
  const [activeSectionMenu, setActiveSectionMenu] = React.useState<string | null>(null);
  const sectionMenuRef = React.useRef<HTMLDivElement>(null);

  const [editingSectionName, setEditingSectionName] = React.useState<string | null>(null);
  const [renamingSectionValue, setRenamingSectionValue] = React.useState<string>('');
  const renameSectionInputRef = React.useRef<HTMLInputElement>(null);

  const [deleteSectionModal, setDeleteSectionModal] = React.useState<string | null>(null);

  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  const [descriptionModalSpace, setDescriptionModalSpace] = React.useState<Space | null>(null);
  const [deleteConfirmSpace, setDeleteConfirmSpace] = React.useState<Space | null>(null);

  // Live Queries for Spaces & Tabs
  const spaces = useLiveQuery(async () => {
    const list = await db.spaces.orderBy('order').toArray();
    return list.filter((s) => !s.isArchived);
  });

  const unsavedSpaces = React.useMemo(() => {
    return (spaces || []).filter((s) => !!s.isUnsaved);
  }, [spaces]);

  const unsavedTabsMap = useLiveQuery(async () => {
    const list = await db.spaces.filter((s) => !!s.isUnsaved && !s.isArchived).toArray();
    const map = new Map<string, Tab[]>();
    for (const s of list) {
      const t = await db.tabs.where('spaceId').equals(s.id).sortBy('order');
      map.set(s.id, t);
    }
    const legacy = await db.tabs.where('spaceId').equals(UNSAVED_SPACE_ID).sortBy('order');
    if (legacy.length > 0) {
      map.set(UNSAVED_SPACE_ID, legacy);
    }
    return map;
  }, [spaces]);

  const totalUnsavedTabsCount = React.useMemo(() => {
    if (!unsavedTabsMap) return 0;
    let sum = 0;
    for (const tabs of unsavedTabsMap.values()) {
      sum += tabs.length;
    }
    return sum;
  }, [unsavedTabsMap]);

  const getUnsavedTitle = React.useCallback(
    (spaceId: string) => {
      const tabs = unsavedTabsMap?.get(spaceId) || [];
      if (tabs.length === 0) return 'Empty session';
      const firstDomain = extractDomain(tabs[0].url) || 'New Tab';
      if (tabs.length === 1) return firstDomain;
      return `${firstDomain} + ${tabs.length - 1}`;
    },
    [unsavedTabsMap]
  );

  const archivedSpaces = useLiveQuery(async () => {
    const list = await db.spaces.orderBy('order').toArray();
    return list.filter((s) => !!s.isArchived);
  });

  // Separate permanent active spaces into Sections Map vs Unsectioned list
  const { unsectionedSpaces, sectionsMap } = React.useMemo(() => {
    const active = (spaces || []).filter((s) => !s.isArchived && !s.isUnsaved);
    const unsectioned: Space[] = [];
    const rawSecMap = new Map<string, Space[]>();
    const discoveryOrder = new Map<string, number>();

    for (const space of active) {
      if (space.section && space.section.trim()) {
        const sec = space.section.trim();
        if (!rawSecMap.has(sec)) {
          rawSecMap.set(sec, []);
          discoveryOrder.set(sec, discoveryOrder.size);
        }
        rawSecMap.get(sec)!.push(space);
      } else {
        unsectioned.push(space);
      }
    }

    const sortedEntries = Array.from(rawSecMap.entries()).sort(([secA, listA], [secB, listB]) => {
      const minOrderA = listA.reduce<number | undefined>(
        (min, s) =>
          typeof s.sectionOrder === 'number'
            ? min === undefined
              ? s.sectionOrder
              : Math.min(min, s.sectionOrder)
            : min,
        undefined
      );
      const minOrderB = listB.reduce<number | undefined>(
        (min, s) =>
          typeof s.sectionOrder === 'number'
            ? min === undefined
              ? s.sectionOrder
              : Math.min(min, s.sectionOrder)
            : min,
        undefined
      );

      if (minOrderA !== undefined && minOrderB !== undefined && minOrderA !== minOrderB) {
        return minOrderA - minOrderB;
      }
      if (minOrderA !== undefined && minOrderB === undefined) return -1;
      if (minOrderA === undefined && minOrderB !== undefined) return 1;
      return (discoveryOrder.get(secA) ?? 0) - (discoveryOrder.get(secB) ?? 0);
    });

    return { unsectionedSpaces: unsectioned, sectionsMap: new Map(sortedEntries) };
  }, [spaces]);

  // Click outside listener to dismiss context menus
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSpaceId(null);
      }
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) {
        setActiveSectionMenu(null);
      }
    };
    if (activeMenuSpaceId || activeSectionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuSpaceId, activeSectionMenu]);

  // Focus rename inputs
  React.useEffect(() => {
    if (inlineEditingSpaceId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [inlineEditingSpaceId]);

  React.useEffect(() => {
    if (editingSectionName && renameSectionInputRef.current) {
      renameSectionInputRef.current.focus();
      renameSectionInputRef.current.select();
    }
  }, [editingSectionName]);

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

      // If space is already active in another window, focus that window
      if (spaceId) {
        const winSpaces = await getAllWindowSpaces();
        for (const [wId, sId] of winSpaces.entries()) {
          if (sId === spaceId && wId !== currentWindowId) {
            try {
              await chrome.windows.update(wId, { focused: true });
              return;
            } catch {
              // Stale window ID, proceed
            }
          }
        }
      }

      if (settings.defaultOpenInNewWindow && spaceId) {
        let curWinId = currentWindowId;
        if (!curWinId) {
          const curTab = await chrome.tabs.getCurrent().catch(() => null);
          curWinId = curTab?.windowId || (await chrome.windows.getCurrent().catch(() => null))?.id || null;
        }
        await openSpaceInNewWindow(spaceId);
        return;
      }

      setActiveSpaceId(spaceId);
      let targetWinId = currentWindowId;
      if (!targetWinId) {
        const curTab = await chrome.tabs.getCurrent().catch(() => null);
        targetWinId = curTab?.windowId || (await chrome.windows.getCurrent().catch(() => null))?.id || null;
      }
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

      let targetWinId = currentWindowId;
      if (!targetWinId) {
        const curTab = await chrome.tabs.getCurrent().catch(() => null);
        targetWinId = curTab?.windowId || (await chrome.windows.getCurrent().catch(() => null))?.id || null;
      }
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
      await db.tabs.where('spaceId').equals(spaceId).delete();
      await db.spaces.delete(spaceId);
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
      let targetWinId = currentWindowId;
      if (!targetWinId) {
        const curTab = await chrome.tabs.getCurrent().catch(() => null);
        targetWinId = curTab?.windowId || (await chrome.windows.getCurrent().catch(() => null))?.id || null;
      }
      if (targetWinId) {
        await switchWindowToSpace(targetWinId, spaceId);
      }
    } catch (err) {
      console.error('Failed to switch to unsaved session:', err);
    }
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
    } catch {
      // Fallback
    }

    if (tabIds.length === 0) {
      const plainId = e.dataTransfer.getData('text/plain');
      if (plainId) tabIds = [plainId];
    }

    if (tabIds.length > 0) {
      await moveTabsToSpace(tabIds, targetSpaceId);
      clearSelectedTabs();
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
    const trimmed = renamingSectionValue.trim();
    if (trimmed && trimmed !== oldName) {
      const matching = await db.spaces.filter((s) => s.section === oldName).toArray();
      const now = Date.now();
      for (const s of matching) {
        await db.spaces.update(s.id, { section: trimmed, updatedAt: now });
      }
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
    const matching = await db.spaces.filter((s) => s.section === sectionName).toArray();
    const now = Date.now();
    for (const s of matching) {
      await db.spaces.update(s.id, { isArchived: true, updatedAt: now });
    }
    if (activeSpaceId && matching.some((s) => s.id === activeSpaceId)) {
      await handleSelectSpace(null);
    }
    setDeleteSectionModal(null);
  };

  const handleKeepSectionSpaces = async (sectionName: string) => {
    const matching = await db.spaces.filter((s) => s.section === sectionName).toArray();
    const now = Date.now();
    for (const s of matching) {
      await db.spaces.update(s.id, { section: undefined, updatedAt: now });
    }
    setDeleteSectionModal(null);
  };

  const handleCommitRename = async (spaceId: string, newIcon?: string) => {
    const trimmed = inlineEditingName.trim();
    if (trimmed) {
      const updateData: { name: string; updatedAt: number; icon?: string } = {
        name: trimmed,
        updatedAt: Date.now(),
      };
      if (newIcon) {
        updateData.icon = newIcon;
      }
      await db.spaces.update(spaceId, updateData);
    }
    setInlineEditingSpaceId(null);
  };

  const handleOpenNewWindow = async (spaceId: string) => {
    setActiveMenuSpaceId(null);
    await openSpaceInNewWindow(spaceId);
  };

  const handleDuplicateSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    const newSpaceId = crypto.randomUUID();
    const now = Date.now();
    const count = await db.spaces.count();

    await db.spaces.add({
      id: newSpaceId,
      name: `${space.name} (Copy)`,
      icon: space.icon,
      color: space.color,
      description: space.description,
      section: space.section,
      order: count,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });

    const spaceTabs = await db.tabs.where('spaceId').equals(space.id).toArray();
    for (const t of spaceTabs) {
      await db.tabs.add({
        id: crypto.randomUUID(),
        spaceId: newSpaceId,
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl,
        order: t.order,
        createdAt: now,
        updatedAt: now,
      });
    }

    const spaceNotes = await db.notes.where('spaceId').equals(space.id).toArray();
    for (const n of spaceNotes) {
      await db.notes.add({
        id: crypto.randomUUID(),
        spaceId: newSpaceId,
        title: n.title,
        content: n.content,
        createdAt: now,
        updatedAt: now,
      });
    }

    const spaceTasks = await db.tasks.where('spaceId').equals(space.id).toArray();
    for (const task of spaceTasks) {
      await db.tasks.add({
        id: crypto.randomUUID(),
        spaceId: newSpaceId,
        text: task.text,
        completed: task.completed,
        order: task.order,
        dueDate: task.dueDate,
        createdAt: now,
        updatedAt: now,
      });
    }

    const resSections = await db.resourceSections.where('spaceId').equals(space.id).toArray();
    for (const sec of resSections) {
      const newSecId = crypto.randomUUID();
      await db.resourceSections.add({
        id: newSecId,
        spaceId: newSpaceId,
        title: sec.title,
        order: sec.order,
        updatedAt: now,
      });
      const items = await db.resourceItems.where('sectionId').equals(sec.id).toArray();
      for (const item of items) {
        await db.resourceItems.add({
          id: crypto.randomUUID(),
          sectionId: newSecId,
          title: item.title,
          url: item.url,
          favIconUrl: item.favIconUrl,
          type: item.type,
          order: item.order ?? 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  };

  const handleExportSidebarSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    const spaceTabs = await db.tabs.where('spaceId').equals(space.id).sortBy('order');
    const notes = await db.notes.where('spaceId').equals(space.id).toArray();
    const tasks = await db.tasks.where('spaceId').equals(space.id).sortBy('order');
    const sections = await db.resourceSections.where('spaceId').equals(space.id).sortBy('order');

    const resourcesData = [];
    for (const sec of sections) {
      const items = await db.resourceItems.where('sectionId').equals(sec.id).toArray();
      resourcesData.push({
        title: sec.title,
        order: sec.order,
        items: items.map((it) => ({
          title: it.title,
          url: it.url,
          type: it.type,
        })),
      });
    }

    const exportPayload = {
      app: 'SpaceTabs',
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      space: {
        name: space.name,
        icon: space.icon,
        description: space.description,
        section: space.section,
      },
      tabs: spaceTabs.map((t) => ({
        title: t.title,
        url: t.url,
        favIconUrl: t.favIconUrl,
        order: t.order,
      })),
      notes: notes.map((n) => ({
        title: n.title,
        content: n.content,
      })),
      tasks: tasks.map((tk) => ({
        text: tk.text,
        completed: tk.completed,
        order: tk.order,
        dueDate: tk.dueDate,
      })),
      resources: resourcesData,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${space.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-space.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleArchiveSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    await db.spaces.update(space.id, { isArchived: true, updatedAt: Date.now() });
    if (activeSpaceId === space.id) {
      await handleSelectSpace(null);
    }
  };

  const handleRestoreSpace = async (spaceId: string) => {
    await db.spaces.update(spaceId, { isArchived: false, updatedAt: Date.now() });
  };

  const handleDeleteSpacePermanently = async (spaceId: string) => {
    if (activeSpaceId === spaceId) {
      await handleSelectSpace(null);
    }

    try {
      const childTabs = await db.tabs.where('spaceId').equals(spaceId).toArray();
      const childNotes = await db.notes.where('spaceId').equals(spaceId).toArray();
      const childTasks = await db.tasks.where('spaceId').equals(spaceId).toArray();
      const childSections = await db.resourceSections.where('spaceId').equals(spaceId).toArray();
      const childItemIds: string[] = [];
      for (const s of childSections) {
        const items = await db.resourceItems.where('sectionId').equals(s.id).toArray();
        childItemIds.push(...items.map((it) => it.id));
      }

      await recordTombstones([
        { id: spaceId, table: 'spaces' },
        ...childTabs.map((t) => ({ id: t.id, table: 'tabs' as const })),
        ...childNotes.map((n) => ({ id: n.id, table: 'notes' as const })),
        ...childTasks.map((t) => ({ id: t.id, table: 'tasks' as const })),
        ...childSections.map((s) => ({ id: s.id, table: 'resource_sections' as const })),
        ...childItemIds.map((id) => ({ id, table: 'resource_items' as const })),
      ]);
    } catch (e) {
      console.warn('Failed to record space tombstones:', e);
    }

    await db.tabs.where('spaceId').equals(spaceId).delete();
    await db.notes.where('spaceId').equals(spaceId).delete();
    await db.tasks.where('spaceId').equals(spaceId).delete();
    const secs = await db.resourceSections.where('spaceId').equals(spaceId).toArray();
    for (const s of secs) {
      await db.resourceItems.where('sectionId').equals(s.id).delete();
    }
    await db.resourceSections.where('spaceId').equals(spaceId).delete();
    await db.spaces.delete(spaceId);

    setDeleteConfirmSpace(null);
    setActiveMenuSpaceId(null);
  };

  // Reorder spaces in Dexie
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

    const sourceIdx = currentList.findIndex((s) => s.id === sourceId);
    const targetIdx = currentList.findIndex((s) => s.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = currentList.splice(sourceIdx, 1);
    let insertIdx = currentList.findIndex((s) => s.id === targetId);
    if (position === 'after') {
      insertIdx += 1;
    }
    currentList.splice(insertIdx, 0, moved);

    const now = Date.now();
    const updates = currentList.map((space, idx) => ({
      ...space,
      order: idx,
      updatedAt: now,
    }));

    await db.spaces.bulkPut(updates);
    setDraggedSpaceId(null);
    setDragOverTargetSpaceId(null);
    setDropPosition(null);
  };

  const persistSectionOrder = async (orderedSectionNames: string[]) => {
    const now = Date.now();
    const updates: Space[] = [];
    orderedSectionNames.forEach((secName, secIdx) => {
      const secSpaces = sectionsMap.get(secName) || [];
      for (const sp of secSpaces) {
        updates.push({
          ...sp,
          sectionOrder: secIdx,
          updatedAt: now,
        });
      }
    });
    if (updates.length > 0) {
      await db.spaces.bulkPut(updates);
    }
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

    await persistSectionOrder(sectionNames);
    setDraggedSectionName(null);
    setDragOverTargetSection(null);
    setSectionDropPosition(null);
  };

  const handleMoveSectionByOffset = async (sectionName: string, offset: -1 | 1) => {
    setActiveSectionMenu(null);
    const sectionNames = Array.from(sectionsMap.keys());
    const idx = sectionNames.indexOf(sectionName);
    const newIdx = idx + offset;
    if (idx === -1 || newIdx < 0 || newIdx >= sectionNames.length) return;

    const [moved] = sectionNames.splice(idx, 1);
    sectionNames.splice(newIdx, 0, moved);
    await persistSectionOrder(sectionNames);
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

  const handleItemDrop = async (e: React.DragEvent, targetSpaceId: string, sectionName?: string) => {
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

  // Render a Single Space Item
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
        isOver={dragOverSpaceId === space.id}
        isMenuOpen={activeMenuSpaceId === space.id}
        isRenaming={inlineEditingSpaceId === space.id}
        inlineEditingName={inlineEditingName}
        renameInputRef={renameInputRef}
        menuRef={menuRef}
        isOpenInThisWindow={isOpenInThisWindow}
        isOpenInOtherWindow={isOpenInOtherWindow}
        otherWindowId={otherWindowId}
        isSpacesLocked={isSpacesLocked}
        isDraggingThisSpace={draggedSpaceId === space.id}
        dropIndicator={dragOverTargetSpaceId === space.id ? dropPosition : null}
        onSelectSpace={() => handleSelectSpace(space.id)}
        onDragOver={(e) => handleItemDragOver(e, space.id)}
        onDragEnter={(e) => e.preventDefault()}
        onDragLeave={(e) => handleItemDragLeave(e, space.id)}
        onDrop={(e) => handleItemDrop(e, space.id, sectionName)}
        onSpaceDragStart={(e) => handleSpaceDragStart(e, space.id)}
        onSpaceDragEnd={handleSpaceDragEnd}
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
      {/* Brand & User Profile */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-colors duration-150"
            style={{
              backgroundColor: accentColor || '#f43f5e',
              boxShadow: `0 4px 14px 0 ${accentColor || '#f43f5e'}40`,
            }}
          >
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight text-base">
              SpaceTabs
            </span>
            {syncInfo?.profile ? (
              syncInfo.status === 'syncing' ? (
                <button
                  onClick={() => setSettingsOpen(true, 'cloud')}
                  className="text-[11px] text-amber-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                  title="Syncing in progress — Click to open Cloud Sync settings"
                >
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Syncing...</span>
                </button>
              ) : syncInfo.status === 'error' ? (
                <button
                  onClick={() => setSettingsOpen(true, 'cloud')}
                  className="text-[11px] text-rose-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                  title={syncInfo.lastSyncError || 'Sync Error — Click to configure'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>Sync Error</span>
                </button>
              ) : (
                <button
                  onClick={() => setSettingsOpen(true, 'cloud')}
                  className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                  title="Google Drive connected & synced — Click to view"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Drive Synced</span>
                </button>
              )
            ) : (
              <button
                onClick={() => setSettingsOpen(true, 'cloud')}
                className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center gap-1 font-medium transition cursor-pointer"
                title="Cloud Sync inactive — Sign in with Google Drive"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Local-First</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Avatar & Sync Status */}
        <button
          onClick={() => setSettingsOpen(true, 'cloud')}
          className="relative group p-0.5 rounded-full hover:ring-2 hover:ring-blue-500/50 transition cursor-pointer"
          title={
            syncInfo?.profile
              ? `${syncInfo.profile.name} (${syncInfo.profile.email})\nClick to manage Google Drive sync`
              : 'Connect Google Account to enable Cloud Sync'
          }
        >
          {syncInfo?.profile?.picture ? (
            <img
              src={syncInfo.profile.picture}
              alt={syncInfo.profile.name}
              className="w-7 h-7 rounded-full object-cover border border-blue-400/40 group-hover:border-blue-400 transition shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 group-hover:border-blue-400/60 flex items-center justify-center text-xs font-bold text-blue-400 transition shadow-sm">
              {syncInfo?.profile?.name ? syncInfo.profile.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}

          {/* Sync indicator dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
              syncInfo?.profile
                ? syncInfo.status === 'syncing'
                  ? 'bg-amber-400 animate-spin'
                  : syncInfo.status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-400'
                : 'bg-slate-500'
            }`}
          />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
        {/* Unsaved Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Unsaved</span>
            </div>
            <div className="flex items-center gap-1.5">
              {totalUnsavedTabsCount > 0 && (
                <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                  {totalUnsavedTabsCount}
                </span>
              )}
              <button
                onClick={handleCreateNewUnsavedSession}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                title="New unsaved browsing session (+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {(!unsavedSpaces || unsavedSpaces.length === 0) ? (
              <button
                onClick={handleCreateNewUnsavedSession}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverSpaceId !== UNSAVED_SPACE_ID) {
                    setDragOverSpaceId(UNSAVED_SPACE_ID);
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverSpaceId(UNSAVED_SPACE_ID);
                }}
                onDragLeave={(e) => {
                  const currentTarget = e.currentTarget as HTMLElement;
                  if (!currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverSpaceId === UNSAVED_SPACE_ID) {
                      setDragOverSpaceId(null);
                    }
                  }
                }}
                onDrop={(e) => handleDropOnSpace(e, null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative ${
                  dragOverSpaceId === UNSAVED_SPACE_ID
                    ? 'bg-blue-600/30 border-2 border-blue-400 text-blue-200 scale-[1.02] shadow-lg shadow-blue-500/20'
                    : activeSpaceId === null
                    ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-2 h-2 rounded-full bg-slate-600" />
                  <span className="truncate italic">Empty session</span>
                </div>
              </button>
            ) : (
              unsavedSpaces.map((uSpace) => {
                const uTabs = unsavedTabsMap?.get(uSpace.id) || [];
                const uTitle = getUnsavedTitle(uSpace.id);
                const isOpenInThisWindow = currentWindowId !== null && windowSpaces.get(currentWindowId) === uSpace.id;
                let otherWindowId: number | null = null;
                for (const [wId, sId] of windowSpaces.entries()) {
                  if (sId === uSpace.id && wId !== currentWindowId) {
                    otherWindowId = wId;
                    break;
                  }
                }
                const isOpenInOtherWindow = otherWindowId !== null;
                const isSelected = activeSpaceId === uSpace.id || (activeSpaceId === null && isOpenInThisWindow);

                return (
                  <div key={uSpace.id} className="group relative">
                    <button
                      onClick={() => handleSelectUnsavedSession(uSpace.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverSpaceId !== uSpace.id) {
                          setDragOverSpaceId(uSpace.id);
                        }
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverSpaceId(uSpace.id);
                      }}
                      onDragLeave={(e) => {
                        const currentTarget = e.currentTarget as HTMLElement;
                        if (!currentTarget.contains(e.relatedTarget as Node)) {
                          if (dragOverSpaceId === uSpace.id) {
                            setDragOverSpaceId(null);
                          }
                        }
                      }}
                      onDrop={(e) => handleDropOnSpace(e, uSpace.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative ${
                        dragOverSpaceId === uSpace.id
                          ? 'bg-blue-600/30 border-2 border-blue-400 text-blue-200 scale-[1.02] shadow-lg shadow-blue-500/20'
                          : isSelected
                          ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0 flex-1 mr-1">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isOpenInThisWindow
                              ? 'bg-emerald-400'
                              : isOpenInOtherWindow
                              ? 'bg-amber-400'
                              : uTabs.length > 0
                              ? 'bg-slate-400'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span className="truncate italic font-medium">
                          {uTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {uTabs.length > 0 && (
                          <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 group-hover:hidden">
                            {uTabs.length}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUnsavedSession(uSpace.id);
                          }}
                          className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition opacity-0 group-hover:opacity-100"
                          title="Discard session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

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
              {/* Lock / Unlock Toggle Button */}
              <button
                onClick={toggleSpacesLock}
                className={`p-1 rounded transition ${
                  !isSpacesLocked
                    ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={
                  isSpacesLocked
                    ? 'Order locked. Click to reorder spaces & sections.'
                    : 'Order unlocked. Drag spaces or sections to reorder, click to lock.'
                }
              >
                {isSpacesLocked ? (
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

          {/* Top-Level Unsectioned Spaces */}
          <div className="space-y-0.5">
            {unsectionedSpaces.length > 0 ? (
              unsectionedSpaces.map((space) => renderSpaceItem(space))
            ) : sectionsMap.size === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 italic">
                No spaces created yet. Click + to add your first space.
              </div>
            ) : null}
          </div>

          {/* Custom Collapsible Sections */}
          {Array.from(sectionsMap.entries()).map(([sectionName, sectionSpaces], sectionIdx, entriesArr) => (
            <SectionGroup
              key={sectionName}
              sectionName={sectionName}
              spaces={sectionSpaces}
              isCollapsed={collapsedSections.has(sectionName)}
              isEditing={editingSectionName === sectionName}
              renamingValue={renamingSectionValue}
              isMenuOpen={activeSectionMenu === sectionName}
              isSpacesLocked={isSpacesLocked}
              isDraggingThisSection={draggedSectionName === sectionName}
              dropIndicator={dragOverTargetSection === sectionName ? sectionDropPosition : null}
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
              onSectionDragStart={(e) => handleSectionDragStart(e, sectionName)}
              onSectionDragEnd={handleSectionDragEnd}
              onSectionDragOver={(e) => handleSectionDragOver(e, sectionName)}
              onSectionDragLeave={(e) => handleSectionDragLeave(e, sectionName)}
              onSectionDrop={(e) => handleSectionDrop(e, sectionName)}
              onMoveSectionUp={() => handleMoveSectionByOffset(sectionName, -1)}
              onMoveSectionDown={() => handleMoveSectionByOffset(sectionName, 1)}
              renderSpaceItem={renderSpaceItem}
            />
          ))}
        </div>

        {/* Archive Drawer */}
        <div>
          <button
            onClick={() => setArchiveOpen(!archiveOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-300 transition"
          >
            <div className="flex items-center gap-2">
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </div>
            <div className="flex items-center gap-1.5">
              {archivedSpaces && archivedSpaces.length > 0 && (
                <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                  {archivedSpaces.length}
                </span>
              )}
              {archiveOpen ? (
                <ChevronDown className="w-3 h-3 text-slate-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500" />
              )}
            </div>
          </button>

          {archiveOpen && (
            <div className="mt-1 space-y-1 pl-2 border-l border-slate-800/80 ml-2">
              {archivedSpaces && archivedSpaces.length > 0 ? (
                archivedSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-900 group"
                  >
                    <span className="truncate flex items-center gap-2 flex-1 mr-2">
                      <span>{space.icon || '📁'}</span>
                      <span className="truncate line-through opacity-70">
                        {space.name}
                      </span>
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestoreSpace(space.id)}
                        className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition"
                        title="Restore Space"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSpace(space)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-2 py-1.5 text-[11px] text-slate-500 italic">
                  No archived spaces
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings & Support Footer Trigger */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 flex-shrink-0 space-y-1">
        {/* Support Creator Button */}
        <button
          onClick={() => setSettingsOpen(true, 'contact')}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition group border border-transparent text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 cursor-pointer"
          title="Support Abu Dojana (SupportKori, bKash, Patreon, SociaBuzz)"
        >
          <div className="flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform fill-rose-500/20 group-hover:fill-rose-500" />
            <span className="font-semibold text-slate-300 group-hover:text-rose-300">Support Creator</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Donate
          </span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition group border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 hover:border-slate-800/80 cursor-pointer"
          title="Open Settings & Preferences"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition" />
            <span className="font-semibold text-slate-300 group-hover:text-white">Settings</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Ready
            </span>
          </div>
        </button>
      </div>

      {/* Modals */}
      <SidebarModals
        descriptionModalSpace={descriptionModalSpace}
        onCloseDescription={() => setDescriptionModalSpace(null)}
        onSaveDescription={async (spaceId, desc) => {
          await db.spaces.update(spaceId, { description: desc, updatedAt: Date.now() });
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
