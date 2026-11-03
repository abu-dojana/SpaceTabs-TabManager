import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Space, type Tab, UNSAVED_SPACE_ID } from '@/db/schema';
import { extractDomain } from '@/utils/urlFilter';

export function useSidebarSpaces() {
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

  return {
    spaces,
    unsavedSpaces,
    unsavedTabsMap,
    totalUnsavedTabsCount,
    getUnsavedTitle,
    archivedSpaces,
    unsectionedSpaces,
    sectionsMap,
  };
}
