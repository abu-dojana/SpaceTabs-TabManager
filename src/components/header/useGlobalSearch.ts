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
import {
  scoreSearchCandidate,
  getSemanticAliases,
  extractSnippet,
} from './search/searchScoring';

export type SearchCategory = 'all' | 'spaces' | 'tabs' | 'notes' | 'tasks' | 'resources';

export interface BaseSearchResultItem {
  id: string;
  type: 'tab' | 'note' | 'task' | 'resource';
  spaceId: string | null;
  spaceName: string;
  spaceIcon: string;
  sectionName?: string;
  isUnsaved: boolean;
  isArchived: boolean;
  isCurrentSpace: boolean;
  score: number;
  updatedAt: number;
  matchedWords: string[];
}

export interface SpaceSearchResultItem {
  id: string;
  type: 'space';
  space: Space;
  spaceId: string;
  spaceName: string;
  spaceIcon: string;
  sectionName?: string;
  description?: string;
  isArchived: boolean;
  isCurrentSpace: boolean;
  tabCount: number;
  score: number;
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

export type NavigableSearchResult = SpaceSearchResultItem | SearchResultItem;

export interface SpaceGroupResult {
  groupKey: string;
  spaceId: string | null;
  spaceName: string;
  spaceIcon: string;
  sectionName?: string;
  isUnsaved: boolean;
  isArchived: boolean;
  isCurrentSpace: boolean;
  maxScore: number;
  items: SearchResultItem[];
}

export interface CategoryCounts {
  all: number;
  spaces: number;
  tabs: number;
  notes: number;
  tasks: number;
  resources: number;
}

export function useGlobalSearch(
  searchQuery: string,
  activeSpaceId: string | null,
  includeArchived = false,
  isSearchOpen = false,
  quickRecallClearedAt = 0,
  dismissedRecallIds?: Set<string>
) {
  const [activeCategory, setActiveCategory] = React.useState<SearchCategory>('all');
  const hasQuery = searchQuery.trim().length > 0;
  const shouldLoadData = hasQuery || isSearchOpen;

  const allSpaces = useLiveQuery(async () => {
    if (!shouldLoadData) return [] as Space[];
    const spaces = await db.spaces.orderBy('order').toArray();
    return includeArchived ? spaces : spaces.filter((s) => !s.isArchived);
  }, [shouldLoadData, includeArchived]);

  const allTabs = useLiveQuery(
    async () => (shouldLoadData ? db.tabs.orderBy('order').toArray() : []),
    [shouldLoadData]
  );
  const allNotes = useLiveQuery(
    async () => (shouldLoadData ? db.notes.toArray() : []),
    [shouldLoadData]
  );
  const allTasks = useLiveQuery(
    async () => (shouldLoadData ? db.tasks.orderBy('order').toArray() : []),
    [shouldLoadData]
  );
  const allResourceSections = useLiveQuery(
    async () => (shouldLoadData ? db.resourceSections.toArray() : []),
    [shouldLoadData]
  );
  const allResourceItems = useLiveQuery(
    async () => (shouldLoadData ? db.resourceItems.orderBy('order').toArray() : []),
    [shouldLoadData]
  );

  const searchWords = React.useMemo(
    () => searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [searchQuery]
  );

  const { spaceResults, groups, counts, recentItems } = React.useMemo(() => {
    const emptyCounts: CategoryCounts = {
      all: 0,
      spaces: 0,
      tabs: 0,
      notes: 0,
      tasks: 0,
      resources: 0,
    };
    if (!allSpaces) {
      return {
        spaceResults: [] as SpaceSearchResultItem[],
        groups: [] as SpaceGroupResult[],
        counts: emptyCounts,
        recentItems: [] as SearchResultItem[],
      };
    }

    const spaceMap = new Map<string, Space>();
    for (const s of allSpaces) spaceMap.set(s.id, s);
    const currentTargetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

    const getSpaceMeta = (rawSpaceId: string) => {
      const space = spaceMap.get(rawSpaceId);
      const isUnsaved = rawSpaceId === UNSAVED_SPACE_ID || Boolean(space?.isUnsaved);
      const isArchived = Boolean(space?.isArchived);
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
      return { space, isUnsaved, isArchived, spaceName, spaceIcon, sectionName, isCurrentSpace, spaceId };
    };

    // Quick Recall when search box is empty: 6 most recently updated items across active spaces
    if (searchWords.length === 0) {
      const candidates: SearchResultItem[] = [];
      const isDismissedOrCleared = (id: string, ts: number) =>
        ts <= quickRecallClearedAt || Boolean(dismissedRecallIds?.has(id));

      for (const tab of allTabs || []) {
        if (tab.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(tab.spaceId)) continue;
        const ts = tab.updatedAt || tab.createdAt || 0;
        if (isDismissedOrCleared(tab.id, ts)) continue;
        const meta = getSpaceMeta(tab.spaceId);
        if (meta.isArchived) continue;
        const realUrl = decodeRealUrl(tab.url);
        candidates.push({
          id: tab.id,
          type: 'tab',
          tab,
          realUrl,
          domain: extractDomain(realUrl),
          ...meta,
          score: 0,
          updatedAt: ts,
          matchedWords: [],
        });
      }
      for (const note of allNotes || []) {
        if (note.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(note.spaceId)) continue;
        const ts = note.updatedAt || note.createdAt || 0;
        if (isDismissedOrCleared(note.id, ts)) continue;
        const meta = getSpaceMeta(note.spaceId);
        if (meta.isArchived) continue;
        candidates.push({
          id: note.id,
          type: 'note',
          note,
          snippet: extractSnippet(note.content, []),
          ...meta,
          score: 0,
          updatedAt: ts,
          matchedWords: [],
        });
      }
      for (const task of allTasks || []) {
        if (task.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(task.spaceId)) continue;
        if (task.completed) continue;
        const ts = task.updatedAt || task.createdAt || 0;
        if (isDismissedOrCleared(task.id, ts)) continue;
        const meta = getSpaceMeta(task.spaceId);
        if (meta.isArchived) continue;
        candidates.push({
          id: task.id,
          type: 'task',
          task,
          completed: false,
          dueDate: task.dueDate,
          ...meta,
          score: 0,
          updatedAt: ts,
          matchedWords: [],
        });
      }
      candidates.sort((a, b) => b.updatedAt - a.updatedAt);
      return {
        spaceResults: [] as SpaceSearchResultItem[],
        groups: [] as SpaceGroupResult[],
        counts: emptyCounts,
        recentItems: candidates.slice(0, 6),
      };
    }

    const tabCountBySpace = new Map<string, number>();
    for (const t of allTabs || []) {
      tabCountBySpace.set(t.spaceId, (tabCountBySpace.get(t.spaceId) || 0) + 1);
    }

    // 0. MATCH SPACES
    const matchedSpaces: SpaceSearchResultItem[] = [];
    for (const sp of allSpaces) {
      if (sp.isUnsaved || (sp.isArchived && !includeArchived)) continue;
      const res = scoreSearchCandidate(
        searchWords,
        [
          { text: sp.name, weight: 1.2 },
          { text: sp.section || '', weight: 0.7 },
          { text: sp.description || '', weight: 0.45 },
        ],
        []
      );
      if (res) {
        const isCurrent = sp.id === currentTargetSpaceId;
        matchedSpaces.push({
          id: `space_${sp.id}`,
          type: 'space',
          space: sp,
          spaceId: sp.id,
          spaceName: sp.name,
          spaceIcon: sp.icon || '📁',
          sectionName: sp.section,
          description: sp.description,
          isArchived: Boolean(sp.isArchived),
          isCurrentSpace: isCurrent,
          tabCount: tabCountBySpace.get(sp.id) || 0,
          score: res.score + (isCurrent ? 12 : 0) - (sp.isArchived ? 15 : 0),
          matchedWords: Array.from(new Set([...searchWords, ...res.matchedWords])),
        });
      }
    }
    matchedSpaces.sort((a, b) => b.score - a.score || a.spaceName.localeCompare(b.spaceName));

    const matchedAllItems: SearchResultItem[] = [];

    // 1. MATCH TABS
    for (const tab of allTabs || []) {
      if (tab.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(tab.spaceId)) continue;
      const meta = getSpaceMeta(tab.spaceId);
      const realUrl = decodeRealUrl(tab.url);
      const domain = extractDomain(realUrl);
      const res = scoreSearchCandidate(
        searchWords,
        [
          { text: tab.title, weight: 1.0 },
          { text: domain, weight: 0.75 },
          { text: getSemanticAliases(realUrl, tab.title), weight: 0.55 },
          { text: realUrl, weight: 0.35 },
        ],
        [
          { text: meta.spaceName, weight: 0.2 },
          { text: meta.sectionName || '', weight: 0.15 },
        ]
      );
      if (res) {
        matchedAllItems.push({
          id: tab.id,
          type: 'tab',
          tab,
          realUrl,
          domain,
          ...meta,
          score: res.score,
          updatedAt: tab.updatedAt || tab.createdAt || 0,
          matchedWords: Array.from(new Set([...searchWords, ...res.matchedWords])),
        });
      }
    }

    // 2. MATCH NOTES
    for (const note of allNotes || []) {
      if (note.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(note.spaceId)) continue;
      const meta = getSpaceMeta(note.spaceId);
      const res = scoreSearchCandidate(
        searchWords,
        [
          { text: note.title, weight: 1.0 },
          { text: note.content || '', weight: 0.5 },
        ],
        [
          { text: meta.spaceName, weight: 0.2 },
          { text: meta.sectionName || '', weight: 0.15 },
        ]
      );
      if (res) {
        const highlightTokens = Array.from(new Set([...searchWords, ...res.matchedWords]));
        matchedAllItems.push({
          id: note.id,
          type: 'note',
          note,
          snippet: extractSnippet(note.content, highlightTokens),
          ...meta,
          score: res.score,
          updatedAt: note.updatedAt || note.createdAt || 0,
          matchedWords: highlightTokens,
        });
      }
    }

    // 3. MATCH TASKS
    for (const task of allTasks || []) {
      if (task.spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(task.spaceId)) continue;
      const meta = getSpaceMeta(task.spaceId);
      const res = scoreSearchCandidate(
        searchWords,
        [{ text: task.text, weight: 1.0 }],
        [
          { text: meta.spaceName, weight: 0.2 },
          { text: meta.sectionName || '', weight: 0.15 },
        ]
      );
      if (res) {
        matchedAllItems.push({
          id: task.id,
          type: 'task',
          task,
          completed: Boolean(task.completed),
          dueDate: task.dueDate,
          ...meta,
          score: res.score,
          updatedAt: task.updatedAt || task.createdAt || 0,
          matchedWords: Array.from(new Set([...searchWords, ...res.matchedWords])),
        });
      }
    }

    // 4. MATCH RESOURCES
    if (allResourceItems && allResourceSections) {
      const sectionMap = new Map<string, ResourceSection>();
      for (const sec of allResourceSections) sectionMap.set(sec.id, sec);

      for (const item of allResourceItems) {
        const sec = sectionMap.get(item.sectionId);
        const spaceId = sec?.spaceId || UNSAVED_SPACE_ID;
        if (spaceId !== UNSAVED_SPACE_ID && !spaceMap.has(spaceId)) continue;
        const meta = getSpaceMeta(spaceId);
        const realUrl = decodeRealUrl(item.url);
        const domain = extractDomain(realUrl);
        const secTitle = sec?.title || '';
        const res = scoreSearchCandidate(
          searchWords,
          [
            { text: item.title, weight: 1.0 },
            { text: secTitle, weight: 0.75 },
            { text: domain, weight: 0.7 },
            { text: getSemanticAliases(realUrl, item.title), weight: 0.55 },
            { text: realUrl, weight: 0.35 },
          ],
          [
            { text: meta.spaceName, weight: 0.2 },
            { text: meta.sectionName || '', weight: 0.15 },
          ]
        );
        if (res) {
          matchedAllItems.push({
            id: item.id,
            type: 'resource',
            item,
            realUrl,
            domain,
            resourceSectionTitle: secTitle,
            ...meta,
            score: res.score,
            updatedAt: item.updatedAt || item.createdAt || 0,
            matchedWords: Array.from(new Set([...searchWords, ...res.matchedWords])),
          });
        }
      }
    }

    const computedCounts: CategoryCounts = {
      all: matchedSpaces.length + matchedAllItems.length,
      spaces: matchedSpaces.length,
      tabs: matchedAllItems.filter((i) => i.type === 'tab').length,
      notes: matchedAllItems.filter((i) => i.type === 'note').length,
      tasks: matchedAllItems.filter((i) => i.type === 'task').length,
      resources: matchedAllItems.filter((i) => i.type === 'resource').length,
    };

    const filteredItems =
      activeCategory === 'spaces'
        ? []
        : activeCategory === 'all'
        ? matchedAllItems
        : matchedAllItems.filter((i) => {
            if (activeCategory === 'tabs') return i.type === 'tab';
            if (activeCategory === 'notes') return i.type === 'note';
            if (activeCategory === 'tasks') return i.type === 'task';
            if (activeCategory === 'resources') return i.type === 'resource';
            return true;
          });

    const groupedMap = new Map<string, SpaceGroupResult>();
    for (const item of filteredItems) {
      const groupKey = item.spaceId || UNSAVED_SPACE_ID;
      const existing = groupedMap.get(groupKey);
      if (existing) {
        existing.items.push(item);
        if (item.score > existing.maxScore) existing.maxScore = item.score;
      } else {
        groupedMap.set(groupKey, {
          groupKey,
          spaceId: item.spaceId,
          spaceName: item.spaceName,
          spaceIcon: item.spaceIcon,
          sectionName: item.sectionName,
          isUnsaved: item.isUnsaved,
          isArchived: item.isArchived,
          isCurrentSpace: item.isCurrentSpace,
          maxScore: item.score,
          items: [item],
        });
      }
    }

    for (const group of groupedMap.values()) {
      group.items.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt);
    }

    const sortedGroups = Array.from(groupedMap.values()).sort((a, b) => {
      const effA =
        a.maxScore + (a.isCurrentSpace ? 12 : 0) - (a.isUnsaved ? 6 : 0) - (a.isArchived ? 15 : 0);
      const effB =
        b.maxScore + (b.isCurrentSpace ? 12 : 0) - (b.isUnsaved ? 6 : 0) - (b.isArchived ? 15 : 0);
      return effB !== effA ? effB - effA : a.spaceName.localeCompare(b.spaceName);
    });

    const visibleSpaces =
      activeCategory === 'all' || activeCategory === 'spaces' ? matchedSpaces : [];

    return {
      spaceResults: visibleSpaces,
      groups: sortedGroups,
      counts: computedCounts,
      recentItems: [] as SearchResultItem[],
    };
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
    includeArchived,
    quickRecallClearedAt,
    dismissedRecallIds,
  ]);

  return {
    searchWords,
    spaceResults,
    groups,
    counts,
    recentItems,
    activeCategory,
    setActiveCategory,
  };
}
