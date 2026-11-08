import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import {
  type Space,
  type Tab,
  type Note,
  type Task,
  type ResourceItem,
  type ResourceSection,
  UNSAVED_SPACE_ID,
} from '@/db/schema';
import { decodeRealUrl, extractDomain } from '@/utils/urlFilter';

export type SearchCategory = 'all' | 'tabs' | 'notes' | 'tasks' | 'resources';

export interface BaseSearchResultItem {
  id: string;
  type: 'tab' | 'note' | 'task' | 'resource';
  spaceId: string | null;
  spaceName: string;
  spaceIcon: string;
  sectionName?: string;
  isUnsaved: boolean;
  isCurrentSpace: boolean;
  matchedWords: string[];
}

export interface TabSearchResultItem extends BaseSearchResultItem {
  type: 'tab';
  tab: Tab;
  realUrl: string;
  domain: string;
}

export interface NoteSearchResultItem extends BaseSearchResultItem {
  type: 'note';
  note: Note;
  snippet: string;
}

export interface TaskSearchResultItem extends BaseSearchResultItem {
  type: 'task';
  task: Task;
  completed: boolean;
  dueDate?: number;
}

export interface ResourceSearchResultItem extends BaseSearchResultItem {
  type: 'resource';
  item: ResourceItem;
  realUrl: string;
  domain: string;
  resourceSectionTitle?: string;
}

export type SearchResultItem =
  | TabSearchResultItem
  | NoteSearchResultItem
  | TaskSearchResultItem
  | ResourceSearchResultItem;

export interface SpaceGroupResult {
  groupKey: string;
  spaceId: string | null;
  spaceName: string;
  spaceIcon: string;
  sectionName?: string;
  isUnsaved: boolean;
  isCurrentSpace: boolean;
  items: SearchResultItem[];
}

export interface CategoryCounts {
  all: number;
  tabs: number;
  notes: number;
  tasks: number;
  resources: number;
}

function extractSnippet(text: string, words: string[], maxLength = 90): string {
  if (!text) return '';
  const clean = text.replace(/[\r\n#*`_-]+/g, ' ').trim();
  if (words.length === 0) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  let bestIdx = -1;
  const lower = clean.toLowerCase();
  for (const w of words) {
    const idx = lower.indexOf(w);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx === -1 || bestIdx <= 30) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, bestIdx - 25);
  const end = Math.min(clean.length, bestIdx + (maxLength - 25));
  return (start > 0 ? '...' : '') + clean.slice(start, end).trim() + (end < clean.length ? '...' : '');
}

export function useGlobalSearch(searchQuery: string, activeSpaceId: string | null) {
  const [activeCategory, setActiveCategory] = React.useState<SearchCategory>('all');
  const hasQuery = searchQuery.trim().length > 0;

  const allSpaces = useLiveQuery(async () => {
    if (!hasQuery) return [] as Space[];
    const spaces = await db.spaces.orderBy('order').toArray();
    return spaces.filter((s) => !s.isArchived);
  }, [hasQuery]);

  const allTabs = useLiveQuery(
    async () => (hasQuery ? db.tabs.orderBy('order').toArray() : []),
    [hasQuery]
  );
  const allNotes = useLiveQuery(
    async () => (hasQuery ? db.notes.toArray() : []),
    [hasQuery]
  );
  const allTasks = useLiveQuery(
    async () => (hasQuery ? db.tasks.orderBy('order').toArray() : []),
    [hasQuery]
  );
  const allResourceSections = useLiveQuery(
    async () => (hasQuery ? db.resourceSections.toArray() : []),
    [hasQuery]
  );
  const allResourceItems = useLiveQuery(
    async () => (hasQuery ? db.resourceItems.orderBy('order').toArray() : []),
    [hasQuery]
  );

  const searchWords = React.useMemo(() => {
    return searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }, [searchQuery]);

  const { groups, flatItems, counts } = React.useMemo(() => {
    const emptyCounts: CategoryCounts = { all: 0, tabs: 0, notes: 0, tasks: 0, resources: 0 };
    if (searchWords.length === 0 || !allSpaces) {
      return { groups: [] as SpaceGroupResult[], flatItems: [] as SearchResultItem[], counts: emptyCounts };
    }

    const spaceMap = new Map<string, Space>();
    for (const s of allSpaces) {
      spaceMap.set(s.id, s);
    }

    const currentTargetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

    // Helper to resolve space meta
    const getSpaceMeta = (rawSpaceId: string) => {
      const space = spaceMap.get(rawSpaceId);
      const isUnsaved = rawSpaceId === UNSAVED_SPACE_ID || Boolean(space?.isUnsaved);
      const spaceName =
        !isUnsaved && space?.name
          ? space.name
          : space?.name?.trim()
          ? `Unsaved (${space.name})`
          : 'Unsaved';
      const spaceIcon = !isUnsaved ? space?.icon || '📁' : '⚡';
      const sectionName = !isUnsaved ? space?.section : undefined;
      const isCurrentSpace = rawSpaceId === currentTargetSpaceId;
      const spaceId = rawSpaceId === UNSAVED_SPACE_ID ? null : rawSpaceId;
      return { space, isUnsaved, spaceName, spaceIcon, sectionName, isCurrentSpace, spaceId };
    };

    const matchedAllItems: SearchResultItem[] = [];

    // 1. MATCH TABS
    if (allTabs) {
      for (const tab of allTabs) {
        if (tab.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(tab.spaceId)) continue;
        const meta = getSpaceMeta(tab.spaceId);
        const realUrl = decodeRealUrl(tab.url);
        const domain = extractDomain(realUrl);
        const blob = `${tab.title} ${realUrl} ${domain} ${meta.spaceName} ${meta.sectionName || ''}`.toLowerCase();

        if (searchWords.every((w) => blob.includes(w))) {
          matchedAllItems.push({
            id: tab.id,
            type: 'tab',
            tab,
            realUrl,
            domain,
            spaceId: meta.spaceId,
            spaceName: meta.spaceName,
            spaceIcon: meta.spaceIcon,
            sectionName: meta.sectionName,
            isUnsaved: meta.isUnsaved,
            isCurrentSpace: meta.isCurrentSpace,
            matchedWords: searchWords.filter((w) => blob.includes(w)),
          });
        }
      }
    }

    // 2. MATCH NOTES
    if (allNotes) {
      for (const note of allNotes) {
        if (note.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(note.spaceId)) continue;
        const meta = getSpaceMeta(note.spaceId);
        const blob = `${note.title} ${note.content || ''} ${meta.spaceName} ${meta.sectionName || ''}`.toLowerCase();

        if (searchWords.every((w) => blob.includes(w))) {
          matchedAllItems.push({
            id: note.id,
            type: 'note',
            note,
            snippet: extractSnippet(note.content, searchWords),
            spaceId: meta.spaceId,
            spaceName: meta.spaceName,
            spaceIcon: meta.spaceIcon,
            sectionName: meta.sectionName,
            isUnsaved: meta.isUnsaved,
            isCurrentSpace: meta.isCurrentSpace,
            matchedWords: searchWords.filter((w) => blob.includes(w)),
          });
        }
      }
    }

    // 3. MATCH TASKS
    if (allTasks) {
      for (const task of allTasks) {
        if (task.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(task.spaceId)) continue;
        const meta = getSpaceMeta(task.spaceId);
        const blob = `${task.text} ${meta.spaceName} ${meta.sectionName || ''}`.toLowerCase();

        if (searchWords.every((w) => blob.includes(w))) {
          matchedAllItems.push({
            id: task.id,
            type: 'task',
            task,
            completed: Boolean(task.completed),
            dueDate: task.dueDate,
            spaceId: meta.spaceId,
            spaceName: meta.spaceName,
            spaceIcon: meta.spaceIcon,
            sectionName: meta.sectionName,
            isUnsaved: meta.isUnsaved,
            isCurrentSpace: meta.isCurrentSpace,
            matchedWords: searchWords.filter((w) => blob.includes(w)),
          });
        }
      }
    }

    // 4. MATCH RESOURCES
    if (allResourceItems && allResourceSections) {
      const sectionMap = new Map<string, ResourceSection>();
      for (const sec of allResourceSections) {
        sectionMap.set(sec.id, sec);
      }

      for (const item of allResourceItems) {
        const sec = sectionMap.get(item.sectionId);
        const spaceId = sec?.spaceId || UNSAVED_SPACE_ID;
        if (spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(spaceId)) continue;

        const meta = getSpaceMeta(spaceId);
        const realUrl = decodeRealUrl(item.url);
        const domain = extractDomain(realUrl);
        const secTitle = sec?.title || '';
        const blob = `${item.title} ${realUrl} ${domain} ${secTitle} ${meta.spaceName} ${meta.sectionName || ''}`.toLowerCase();

        if (searchWords.every((w) => blob.includes(w))) {
          matchedAllItems.push({
            id: item.id,
            type: 'resource',
            item,
            realUrl,
            domain,
            resourceSectionTitle: secTitle,
            spaceId: meta.spaceId,
            spaceName: meta.spaceName,
            spaceIcon: meta.spaceIcon,
            sectionName: meta.sectionName,
            isUnsaved: meta.isUnsaved,
            isCurrentSpace: meta.isCurrentSpace,
            matchedWords: searchWords.filter((w) => blob.includes(w)),
          });
        }
      }
    }

    // Calculate category counts
    const computedCounts: CategoryCounts = {
      all: matchedAllItems.length,
      tabs: matchedAllItems.filter((i) => i.type === 'tab').length,
      notes: matchedAllItems.filter((i) => i.type === 'note').length,
      tasks: matchedAllItems.filter((i) => i.type === 'task').length,
      resources: matchedAllItems.filter((i) => i.type === 'resource').length,
    };

    // Filter by activeCategory
    const filteredItems =
      activeCategory === 'all'
        ? matchedAllItems
        : matchedAllItems.filter((i) => {
            if (activeCategory === 'tabs') return i.type === 'tab';
            if (activeCategory === 'notes') return i.type === 'note';
            if (activeCategory === 'tasks') return i.type === 'task';
            if (activeCategory === 'resources') return i.type === 'resource';
            return true;
          });

    // Group filtered items by Space
    const groupedMap = new Map<string, SpaceGroupResult>();
    for (const item of filteredItems) {
      const groupKey = item.spaceId || UNSAVED_SPACE_ID;
      const existing = groupedMap.get(groupKey);
      if (existing) {
        existing.items.push(item);
      } else {
        groupedMap.set(groupKey, {
          groupKey,
          spaceId: item.spaceId,
          spaceName: item.spaceName,
          spaceIcon: item.spaceIcon,
          sectionName: item.sectionName,
          isUnsaved: item.isUnsaved,
          isCurrentSpace: item.isCurrentSpace,
          items: [item],
        });
      }
    }

    const sortedGroups = Array.from(groupedMap.values()).sort((a, b) => {
      if (a.isCurrentSpace && !b.isCurrentSpace) return -1;
      if (!a.isCurrentSpace && b.isCurrentSpace) return 1;
      if (!a.isUnsaved && b.isUnsaved) return -1;
      if (a.isUnsaved && !b.isUnsaved) return 1;
      return a.spaceName.localeCompare(b.spaceName);
    });

    const flat: SearchResultItem[] = [];
    for (const g of sortedGroups) {
      for (const item of g.items) {
        flat.push(item);
      }
    }

    return { groups: sortedGroups, flatItems: flat, counts: computedCounts };
  }, [
    searchWords,
    allSpaces,
    allTabs,
    allNotes,
    allTasks,
    allResourceSections,
    allResourceItems,
    activeSpaceId,
    activeCategory,
  ]);

  return {
    searchWords,
    groups,
    flatItems,
    counts,
    activeCategory,
    setActiveCategory,
  };
}
