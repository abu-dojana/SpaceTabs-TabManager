import { db } from '@/db';
import { type Tab, type TabGroup, UNSAVED_SPACE_ID } from '@/db/schema';
import { decodeRealUrl, extractDomain, isBlankOrNewTabUrl } from '@/utils/urlFilter';
import { recordTombstone, recordTombstones } from '@/services/driveSync';
import { getUserSettings } from '@/services/settings';
import { closeTabs } from './tabOperations';
import { reorderTabsAndSyncBrowser } from './tabBulkActions';

export const TAB_GROUP_COLORS = [
  { name: 'Ocean Blue', hex: '#2563eb' },
  { name: 'Royal Indigo', hex: '#6366f1' },
  { name: 'Violet Purple', hex: '#8b5cf6' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Sakura Blossom', hex: '#ec4899' },
  { name: 'Crimson Rose', hex: '#f43f5e' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Ocean Cyan', hex: '#06b6d4' },
  { name: 'Sunset Orange', hex: '#f97316' },
] as const;

async function isSavedSpaceId(spaceId: string): Promise<boolean> {
  if (!spaceId || spaceId === UNSAVED_SPACE_ID) return false;
  const sp = await db.spaces.get(spaceId);
  return Boolean(sp && !sp.isUnsaved);
}

function combineVisualOrder(grouped: Tab[], ungrouped: Tab[], groupedOnTop: boolean): Tab[] {
  return groupedOnTop ? [...grouped, ...ungrouped] : [...ungrouped, ...grouped];
}

/**
 * Computes the canonical top-to-bottom visual tab order (respecting `groupedTabsOnTop`)
 * and synchronizes both `Tab.order` in Dexie and open tabs in Chrome's tab strip.
 */
export async function syncSpaceVisualTabOrder(spaceId: string): Promise<void> {
  const [groups, tabs, settings] = await Promise.all([
    db.tabGroups.where('spaceId').equals(spaceId).sortBy('order'),
    db.tabs.where('spaceId').equals(spaceId).sortBy('order'),
    getUserSettings(),
  ]);
  if (tabs.length === 0) return;

  const validGroupIds = new Set(groups.map((g) => g.id));
  const grouped: Tab[] = [];
  for (const g of groups) {
    for (const t of tabs) if (t.groupId === g.id) grouped.push(t);
  }
  const ungrouped = tabs.filter((t) => !t.groupId || !validGroupIds.has(t.groupId));
  await reorderTabsAndSyncBrowser(
    combineVisualOrder(grouped, ungrouped, settings.groupedTabsOnTop !== false)
  );
}

export async function createTabGroup(
  spaceId: string | null,
  title: string,
  color?: string,
  initialTabIds?: string[]
): Promise<TabGroup> {
  const targetSpaceId = spaceId || UNSAVED_SPACE_ID;
  const existing = await db.tabGroups.where('spaceId').equals(targetSpaceId).sortBy('order');
  const nextOrder = existing.length > 0 ? existing[existing.length - 1].order + 1 : 0;
  const chosenColor =
    color || TAB_GROUP_COLORS[existing.length % TAB_GROUP_COLORS.length].hex;
  const now = Date.now();

  const newGroup: TabGroup = {
    id: crypto.randomUUID(),
    spaceId: targetSpaceId,
    title: title.trim() || 'Untitled Group',
    color: chosenColor,
    order: nextOrder,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', [db.tabGroups, db.tabs], async () => {
    await db.tabGroups.add(newGroup);
    if (initialTabIds && initialTabIds.length > 0) {
      await db.tabs
        .where('id')
        .anyOf(initialTabIds)
        .modify((t) => {
          if (t.spaceId === targetSpaceId) {
            t.groupId = newGroup.id;
            t.updatedAt = now;
          }
        });
    }
  });

  if (initialTabIds && initialTabIds.length > 0) {
    await syncSpaceVisualTabOrder(targetSpaceId);
  }

  return newGroup;
}

export async function renameTabGroup(groupId: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  await db.tabGroups.update(groupId, { title: trimmed, updatedAt: Date.now() });
}

export async function updateTabGroupColor(groupId: string, color: string): Promise<void> {
  if (!color) return;
  await db.tabGroups.update(groupId, { color, updatedAt: Date.now() });
}

export async function reorderTabGroups(
  spaceId: string | null,
  orderedGroupIds: string[]
): Promise<void> {
  const targetSpaceId = spaceId || UNSAVED_SPACE_ID;
  const now = Date.now();
  await db.transaction('rw', db.tabGroups, async () => {
    for (let i = 0; i < orderedGroupIds.length; i++) {
      await db.tabGroups.update(orderedGroupIds[i], { order: i, updatedAt: now });
    }
  });
  await syncSpaceVisualTabOrder(targetSpaceId);
}

/**
 * Moves one or more tabs into `targetGroupId` (or `undefined` for Ungrouped),
 * optionally positioning them relative to `anchorTabId` inside that bucket.
 */
export async function assignTabsToGroup(
  spaceId: string | null,
  tabIds: string[],
  targetGroupId: string | undefined,
  anchor?: { tabId: string; position: 'top' | 'bottom' }
): Promise<void> {
  if (!tabIds || tabIds.length === 0) return;
  const targetSpaceId = spaceId || UNSAVED_SPACE_ID;
  const movingSet = new Set(tabIds);
  const now = Date.now();

  const [groups, allTabs, settings] = await Promise.all([
    db.tabGroups.where('spaceId').equals(targetSpaceId).sortBy('order'),
    db.tabs.where('spaceId').equals(targetSpaceId).sortBy('order'),
    getUserSettings(),
  ]);
  const validGroupIds = new Set(groups.map((g) => g.id));
  const normalizedGroupId =
    targetGroupId && validGroupIds.has(targetGroupId) ? targetGroupId : undefined;

  await db.tabs
    .where('id')
    .anyOf(tabIds)
    .modify((t) => {
      if (t.spaceId !== targetSpaceId) return;
      if (normalizedGroupId) {
        t.groupId = normalizedGroupId;
      } else {
        delete t.groupId;
      }
      t.updatedAt = now;
    });

  // Reconstruct bucketed order with optional anchor insertion
  const updatedTabs = allTabs.map((t) =>
    movingSet.has(t.id) ? { ...t, groupId: normalizedGroupId, updatedAt: now } : t
  );
  const movingTabs = updatedTabs.filter((t) => movingSet.has(t.id));
  const stationaryTabs = updatedTabs.filter((t) => !movingSet.has(t.id));

  const buildBucket = (bucketGroupId: string | undefined): Tab[] => {
    const base = stationaryTabs.filter((t) => {
      const gId = t.groupId && validGroupIds.has(t.groupId) ? t.groupId : undefined;
      return gId === bucketGroupId;
    });
    if (bucketGroupId !== normalizedGroupId) return base;

    if (anchor) {
      const anchorIdx = base.findIndex((t) => t.id === anchor.tabId);
      if (anchorIdx !== -1) {
        const insertIdx = anchor.position === 'bottom' ? anchorIdx + 1 : anchorIdx;
        const copy = [...base];
        copy.splice(insertIdx, 0, ...movingTabs);
        return copy;
      }
    }
    return [...base, ...movingTabs];
  };

  const grouped: Tab[] = [];
  for (const g of groups) grouped.push(...buildBucket(g.id));
  const finalVisualOrder = combineVisualOrder(
    grouped,
    buildBucket(undefined),
    settings.groupedTabsOnTop !== false
  );
  await reorderTabsAndSyncBrowser(finalVisualOrder);
}

export async function ungroupTabGroup(groupId: string): Promise<void> {
  const group = await db.tabGroups.get(groupId);
  if (!group) return;
  const now = Date.now();

  await db.transaction('rw', [db.tabGroups, db.tabs], async () => {
    await db.tabs
      .where('groupId')
      .equals(groupId)
      .modify((t) => {
        delete t.groupId;
        t.updatedAt = now;
      });
    await db.tabGroups.delete(groupId);
  });

  if (await isSavedSpaceId(group.spaceId)) {
    await recordTombstone(groupId, 'tab_groups');
  }
  await syncSpaceVisualTabOrder(group.spaceId);
}

export async function deleteTabGroupAndTabs(groupId: string): Promise<void> {
  const group = await db.tabGroups.get(groupId);
  if (!group) return;

  const memberTabs = await db.tabs
    .where('spaceId')
    .equals(group.spaceId)
    .filter((t) => t.groupId === groupId)
    .toArray();

  await db.tabGroups.delete(groupId);
  if (await isSavedSpaceId(group.spaceId)) {
    await recordTombstone(groupId, 'tab_groups');
  }
  if (memberTabs.length > 0) {
    await closeTabs(memberTabs.map((t) => t.id));
  }
}

export async function ungroupAllTabsInSpace(spaceId: string | null): Promise<void> {
  const targetSpaceId = spaceId || UNSAVED_SPACE_ID;
  const groups = await db.tabGroups.where('spaceId').equals(targetSpaceId).toArray();
  if (groups.length === 0) return;
  const now = Date.now();

  await db.transaction('rw', [db.tabGroups, db.tabs], async () => {
    await db.tabs
      .where('spaceId')
      .equals(targetSpaceId)
      .modify((t) => {
        if (t.groupId) {
          delete t.groupId;
          t.updatedAt = now;
        }
      });
    await db.tabGroups.where('spaceId').equals(targetSpaceId).delete();
  });

  if (await isSavedSpaceId(targetSpaceId)) {
    await recordTombstones(groups.map((g) => ({ id: g.id, table: 'tab_groups' as const })));
  }
}

function sortTabSlice(list: Tab[], mode: 'alpha' | 'domain'): Tab[] {
  if (list.length <= 1) return list;
  const sorted = [...list].sort((a, b) => {
    if (mode === 'domain') {
      const dA = extractDomain(decodeRealUrl(a.url)).toLowerCase();
      const dB = extractDomain(decodeRealUrl(b.url)).toLowerCase();
      if (dA !== dB) return dA.localeCompare(dB);
    }
    return (a.title || a.url).localeCompare(b.title || b.url, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
  if (sorted.every((t, i) => t.id === list[i].id)) {
    sorted.reverse();
  }
  return sorted;
}

export async function sortGroupTabs(groupId: string, mode: 'alpha' | 'domain'): Promise<void> {
  const group = await db.tabGroups.get(groupId);
  if (!group) return;
  const [groups, allTabs, settings] = await Promise.all([
    db.tabGroups.where('spaceId').equals(group.spaceId).sortBy('order'),
    db.tabs.where('spaceId').equals(group.spaceId).sortBy('order'),
    getUserSettings(),
  ]);
  const validGroupIds = new Set(groups.map((g) => g.id));
  const grouped: Tab[] = [];
  for (const g of groups) {
    const slice = allTabs.filter((t) => t.groupId === g.id);
    grouped.push(...(g.id === groupId ? sortTabSlice(slice, mode) : slice));
  }
  const ungrouped = allTabs.filter((t) => !t.groupId || !validGroupIds.has(t.groupId));
  await reorderTabsAndSyncBrowser(
    combineVisualOrder(grouped, ungrouped, settings.groupedTabsOnTop !== false)
  );
}

export async function sortSpaceTabsPreservingGroups(
  spaceId: string | null,
  mode: 'alpha' | 'domain'
): Promise<void> {
  const targetSpaceId = spaceId || UNSAVED_SPACE_ID;
  const [groups, allTabs, settings] = await Promise.all([
    db.tabGroups.where('spaceId').equals(targetSpaceId).sortBy('order'),
    db.tabs.where('spaceId').equals(targetSpaceId).sortBy('order'),
    getUserSettings(),
  ]);
  if (allTabs.length <= 1) return;
  if (groups.length === 0) {
    await reorderTabsAndSyncBrowser(sortTabSlice(allTabs, mode));
    return;
  }
  const validGroupIds = new Set(groups.map((g) => g.id));
  const grouped: Tab[] = [];
  for (const g of groups) {
    grouped.push(...sortTabSlice(allTabs.filter((t) => t.groupId === g.id), mode));
  }
  const ungrouped = sortTabSlice(
    allTabs.filter((t) => !t.groupId || !validGroupIds.has(t.groupId)),
    mode
  );
  await reorderTabsAndSyncBrowser(
    combineVisualOrder(grouped, ungrouped, settings.groupedTabsOnTop !== false)
  );
}

/**
 * Clusters ungrouped tabs in a space by normalized hostname (`github.com`, `figma.com`, etc.).
 * Domains with >= `minTabsPerGroup` (default 2) become colored TabGroups; singletons stay Ungrouped.
 */
export async function groupTabsByDomain(
  spaceId: string | null,
  minTabsPerGroup = 2
): Promise<{ groupsCreated: number; tabsGrouped: number }> {
  const targetSpaceId = spaceId || UNSAVED_SPACE_ID;
  const [existingGroups, allTabs] = await Promise.all([
    db.tabGroups.where('spaceId').equals(targetSpaceId).sortBy('order'),
    db.tabs.where('spaceId').equals(targetSpaceId).sortBy('order'),
  ]);

  const validGroupIds = new Set(existingGroups.map((g) => g.id));
  const existingByDomain = new Map<string, TabGroup>();
  for (const g of existingGroups) {
    existingByDomain.set(g.title.trim().toLowerCase().replace(/^www\./, ''), g);
  }

  const domainClusters = new Map<string, Tab[]>();
  for (const tab of allTabs) {
    if (tab.groupId && validGroupIds.has(tab.groupId)) continue;
    const realUrl = decodeRealUrl(tab.url);
    if (isBlankOrNewTabUrl(realUrl)) continue;
    const domain = extractDomain(realUrl).toLowerCase().replace(/^www\./, '').trim();
    if (!domain) continue;
    const list = domainClusters.get(domain) || [];
    list.push(tab);
    domainClusters.set(domain, list);
  }

  const now = Date.now();
  let nextOrder =
    existingGroups.length > 0 ? existingGroups[existingGroups.length - 1].order + 1 : 0;
  let colorIndex = existingGroups.length;
  const newGroups: TabGroup[] = [];
  const assignments = new Map<string, string>();

  const sortedDomains = Array.from(domainClusters.entries()).sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
  );

  for (const [domain, clusterTabs] of sortedDomains) {
    const existingMatch = existingByDomain.get(domain);
    if (existingMatch) {
      for (const t of clusterTabs) assignments.set(t.id, existingMatch.id);
      continue;
    }
    if (clusterTabs.length < minTabsPerGroup) continue;

    const grp: TabGroup = {
      id: crypto.randomUUID(),
      spaceId: targetSpaceId,
      title: domain,
      color: TAB_GROUP_COLORS[colorIndex++ % TAB_GROUP_COLORS.length].hex,
      order: nextOrder++,
      createdAt: now,
      updatedAt: now,
    };
    newGroups.push(grp);
    for (const t of clusterTabs) assignments.set(t.id, grp.id);
  }

  if (newGroups.length === 0 && assignments.size === 0) {
    return { groupsCreated: 0, tabsGrouped: 0 };
  }

  await db.transaction('rw', [db.tabGroups, db.tabs], async () => {
    if (newGroups.length > 0) {
      await db.tabGroups.bulkAdd(newGroups);
    }
    for (const [tabId, grpId] of assignments.entries()) {
      await db.tabs.update(tabId, { groupId: grpId, updatedAt: now });
    }
  });

  await syncSpaceVisualTabOrder(targetSpaceId);
  return { groupsCreated: newGroups.length, tabsGrouped: assignments.size };
}
