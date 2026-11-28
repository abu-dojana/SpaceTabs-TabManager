import { db } from '@/db';
import {
  type Space,
  type Tab,
  type TabGroup,
  type ResourceSection,
  type ResourceItem,
  type Note,
  type Task,
  UNSAVED_SPACE_ID,
} from '@/db/schema';
import { decodeRealUrl } from '@/utils/urlFilter';
import {
  stripRuntimeTabFields,
  withSyncLock,
  getTombstones,
  getGoogleProfile,
  getCloudSyncSettings,
  syncNow,
} from '@/services/driveSync';
import { getNextSpaceOrder } from './spaceActions';
import {
  parseImportFileContent,
  isSafeImportUrl,
  deriveSpaceNameFromFilename,
} from './spaceImportParser';

export { parseImportFileContent } from './spaceImportParser';

export interface ImportResult {
  success: boolean;
  spacesCount: number;
  tabsCount: number;
  createdSpaceId?: string;
  message: string;
}

/**
 * Merges tabs, tab groups, notes, tasks, and resources from a JSON or HTML file into an existing Space.
 */
export async function importIntoSpace(
  targetSpaceId: string | null,
  fileText: string,
  fileName?: string
): Promise<ImportResult> {
  try {
    const parsed = parseImportFileContent(fileText, fileName);
    const spaceId = targetSpaceId || UNSAVED_SPACE_ID;
    const now = Date.now();

    const [existingTabs, existingGroups, existingTasks, existingSections] = await Promise.all([
      db.tabs.where('spaceId').equals(spaceId).toArray(),
      db.tabGroups.where('spaceId').equals(spaceId).toArray(),
      db.tasks.where('spaceId').equals(spaceId).toArray(),
      db.resourceSections.where('spaceId').equals(spaceId).toArray(),
    ]);

    let nextTabOrder =
      existingTabs.length > 0 ? Math.max(...existingTabs.map((t) => t.order)) + 1 : 0;
    let nextGroupOrder =
      existingGroups.length > 0 ? Math.max(...existingGroups.map((g) => g.order)) + 1 : 0;
    let nextTaskOrder =
      existingTasks.length > 0 ? Math.max(...existingTasks.map((t) => t.order)) + 1 : 0;
    let nextSecOrder =
      existingSections.length > 0 ? Math.max(...existingSections.map((s) => s.order)) + 1 : 0;

    const groupsToAdd: TabGroup[] = [];
    const tabsToAdd: Tab[] = [];
    const notesToAdd: Note[] = [];
    const tasksToAdd: Task[] = [];
    const sectionsToAdd: ResourceSection[] = [];
    const itemsToAdd: ResourceItem[] = [];

    if (parsed.kind === 'single_space') {
      const p = parsed.data;
      const groupIdMap = new Map<string, string>();
      for (const g of p.tabGroups || []) {
        const newGrpId = crypto.randomUUID();
        if (g.id) groupIdMap.set(g.id, newGrpId);
        groupsToAdd.push({
          id: newGrpId,
          spaceId,
          title: g.title || 'Imported Group',
          color: g.color || '#2563eb',
          order: nextGroupOrder++,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const t of p.tabs || []) {
        if (!isSafeImportUrl(t.url)) continue;
        tabsToAdd.push({
          id: crypto.randomUUID(),
          spaceId,
          groupId: t.groupId ? groupIdMap.get(t.groupId) : undefined,
          title: t.title || t.url,
          url: decodeRealUrl(t.url),
          favIconUrl: t.favIconUrl,
          order: nextTabOrder++,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const n of p.notes || []) {
        notesToAdd.push({
          id: crypto.randomUUID(),
          spaceId,
          title: n.title || 'Imported Note',
          content: n.content || '',
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const tk of p.tasks || []) {
        tasksToAdd.push({
          id: crypto.randomUUID(),
          spaceId,
          text: tk.text,
          completed: Boolean(tk.completed),
          order: nextTaskOrder++,
          dueDate: tk.dueDate,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const sec of p.resources || []) {
        const secId = crypto.randomUUID();
        sectionsToAdd.push({
          id: secId,
          spaceId,
          title: sec.title || 'Imported Links',
          order: nextSecOrder++,
          updatedAt: now,
        });
        let itemOrder = 0;
        for (const it of sec.items || []) {
          if (!isSafeImportUrl(it.url)) continue;
          itemsToAdd.push({
            id: crypto.randomUUID(),
            sectionId: secId,
            title: it.title || it.url,
            url: decodeRealUrl(it.url),
            type: 'link',
            order: itemOrder++,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } else {
      const w = parsed.data;
      const groupIdMap = new Map<string, string>();
      for (const g of w.tabGroups || []) {
        const newGrpId = crypto.randomUUID();
        if (g.id) groupIdMap.set(g.id, newGrpId);
        groupsToAdd.push({
          id: newGrpId,
          spaceId,
          title: g.title || 'Imported Group',
          color: g.color || '#2563eb',
          order: nextGroupOrder++,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const t of w.tabs || []) {
        if (!isSafeImportUrl(t.url)) continue;
        tabsToAdd.push({
          id: crypto.randomUUID(),
          spaceId,
          groupId: t.groupId ? groupIdMap.get(t.groupId) : undefined,
          title: t.title || t.url,
          url: decodeRealUrl(t.url),
          favIconUrl: t.favIconUrl,
          order: nextTabOrder++,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await db.transaction(
      'rw',
      [db.tabs, db.tabGroups, db.notes, db.tasks, db.resourceSections, db.resourceItems],
      async () => {
        if (groupsToAdd.length > 0) await db.tabGroups.bulkAdd(groupsToAdd);
        if (tabsToAdd.length > 0) await db.tabs.bulkAdd(tabsToAdd);
        if (notesToAdd.length > 0) await db.notes.bulkAdd(notesToAdd);
        if (tasksToAdd.length > 0) await db.tasks.bulkAdd(tasksToAdd);
        if (sectionsToAdd.length > 0) await db.resourceSections.bulkAdd(sectionsToAdd);
        if (itemsToAdd.length > 0) await db.resourceItems.bulkAdd(itemsToAdd);
      }
    );

    return {
      success: true,
      spacesCount: 1,
      tabsCount: tabsToAdd.length,
      message: `Imported ${tabsToAdd.length} tab(s) into this space!`,
    };
  } catch (err: any) {
    return {
      success: false,
      spacesCount: 0,
      tabsCount: 0,
      message: err?.message || 'Failed to import file into space.',
    };
  }
}

function validateEntityArray<T extends { id: string }>(arr: unknown, label: string): T[] {
  if (arr === undefined || arr === null) return [];
  if (!Array.isArray(arr)) {
    throw new Error(`Invalid backup file: "${label}" must be an array.`);
  }
  for (const item of arr) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as any).id !== 'string' ||
      !(item as any).id.trim()
    ) {
      throw new Error(`Invalid backup file: every entry in "${label}" must have a valid string "id".`);
    }
  }
  return arr as T[];
}

/**
 * Imports one or more spaces from a JSON or HTML file (supports Full Backups, Single-Space Exports, and Browser Bookmarks).
 */
export async function importSpacesFromFile(
  fileText: string,
  fileName?: string
): Promise<ImportResult> {
  return withSyncLock(async () => {
    try {
      const parsed = parseImportFileContent(fileText, fileName);
      const now = Date.now();

      if (parsed.kind === 'single_space') {
        const p = parsed.data;
        const newSpaceId = crypto.randomUUID();
        const nextOrder = await getNextSpaceOrder();
        const spaceName =
          (p.space?.name || deriveSpaceNameFromFilename(fileName)).trim() || 'Imported Space';

        const groupIdMap = new Map<string, string>();
        const groupsToAdd: TabGroup[] = (p.tabGroups || []).map((g, idx) => {
          const newGrpId = crypto.randomUUID();
          if (g.id) groupIdMap.set(g.id, newGrpId);
          return {
            id: newGrpId,
            spaceId: newSpaceId,
            title: g.title || 'Imported Group',
            color: g.color || '#2563eb',
            order: typeof g.order === 'number' ? g.order : idx,
            createdAt: now,
            updatedAt: now,
          };
        });

        const tabsToAdd: Tab[] = (p.tabs || [])
          .filter((t) => isSafeImportUrl(t.url))
          .map((t, idx) => ({
            id: crypto.randomUUID(),
            spaceId: newSpaceId,
            groupId: t.groupId ? groupIdMap.get(t.groupId) : undefined,
            title: t.title || t.url,
            url: decodeRealUrl(t.url),
            favIconUrl: t.favIconUrl,
            order: typeof t.order === 'number' ? t.order : idx,
            createdAt: now,
            updatedAt: now,
          }));

        const notesToAdd: Note[] = (p.notes || []).map((n) => ({
          id: crypto.randomUUID(),
          spaceId: newSpaceId,
          title: n.title || 'Untitled Note',
          content: n.content || '',
          createdAt: now,
          updatedAt: now,
        }));

        const tasksToAdd: Task[] = (p.tasks || []).map((tk, idx) => ({
          id: crypto.randomUUID(),
          spaceId: newSpaceId,
          text: tk.text,
          completed: Boolean(tk.completed),
          order: typeof tk.order === 'number' ? tk.order : idx,
          dueDate: tk.dueDate,
          createdAt: now,
          updatedAt: now,
        }));

        const sectionsToAdd: ResourceSection[] = [];
        const itemsToAdd: ResourceItem[] = [];
        (p.resources || []).forEach((sec, secIdx) => {
          const secId = crypto.randomUUID();
          sectionsToAdd.push({
            id: secId,
            spaceId: newSpaceId,
            title: sec.title || 'Resources',
            order: typeof sec.order === 'number' ? sec.order : secIdx,
            updatedAt: now,
          });
          (sec.items || []).forEach((it, itIdx) => {
            if (!isSafeImportUrl(it.url)) return;
            itemsToAdd.push({
              id: crypto.randomUUID(),
              sectionId: secId,
              title: it.title || it.url,
              url: decodeRealUrl(it.url),
              type: 'link',
              order: itIdx,
              createdAt: now,
              updatedAt: now,
            });
          });
        });

        await db.transaction(
          'rw',
          [db.spaces, db.tabs, db.tabGroups, db.notes, db.tasks, db.resourceSections, db.resourceItems],
          async () => {
            await db.spaces.add({
              id: newSpaceId,
              name: spaceName,
              icon: p.space?.icon || '📁',
              description: p.space?.description,
              section: p.space?.section,
              order: nextOrder,
              createdAt: now,
              updatedAt: now,
              isArchived: false,
            });
            if (groupsToAdd.length) await db.tabGroups.bulkAdd(groupsToAdd);
            if (tabsToAdd.length) await db.tabs.bulkAdd(tabsToAdd);
            if (notesToAdd.length) await db.notes.bulkAdd(notesToAdd);
            if (tasksToAdd.length) await db.tasks.bulkAdd(tasksToAdd);
            if (sectionsToAdd.length) await db.resourceSections.bulkAdd(sectionsToAdd);
            if (itemsToAdd.length) await db.resourceItems.bulkAdd(itemsToAdd);
          }
        );

        return {
          success: true,
          spacesCount: 1,
          tabsCount: tabsToAdd.length,
          createdSpaceId: newSpaceId,
          message: `Imported space "${spaceName}" (${tabsToAdd.length} tabs)!`,
        };
      }

      // Full Workspace Backup import
      const data = parsed.data;
      const rawSpaces = validateEntityArray<Space>(data.spaces, 'spaces');
      const rawTabs = validateEntityArray<Tab>(data.tabs, 'tabs');
      const rawGroups = validateEntityArray<TabGroup>(data.tabGroups, 'tabGroups');
      const rawSections = validateEntityArray<ResourceSection>(data.resourceSections, 'resourceSections');
      const rawItems = validateEntityArray<ResourceItem>(data.resourceItems, 'resourceItems');
      const rawNotes = validateEntityArray<Note>(data.notes, 'notes');
      const rawTasks = validateEntityArray<Task>(data.tasks, 'tasks');

      const ignoredSpaceIds = new Set<string>([
        UNSAVED_SPACE_ID,
        ...rawSpaces.filter((s) => s.isUnsaved).map((s) => s.id),
      ]);
      const validSpaces = rawSpaces.filter((s) => !s.isUnsaved && s.id !== UNSAVED_SPACE_ID);

      try {
        const [profile, syncSettings] = await Promise.all([
          getGoogleProfile(),
          getCloudSyncSettings(),
        ]);
        if (profile && syncSettings.enabled) {
          await syncNow().catch(() => {});
        }
      } catch {}

      const tombstones = await getTombstones();
      const tombstoneIds = new Set(tombstones.map((t) => t.id));

      const spaceIdMap = new Map<string, string>();
      const spacesToImport: Space[] = validSpaces.map((sp) => {
        if (tombstoneIds.has(sp.id)) {
          const newId = crypto.randomUUID();
          spaceIdMap.set(sp.id, newId);
          return { ...sp, id: newId, updatedAt: Math.max(sp.updatedAt || 0, now) };
        }
        return sp;
      });

      const groupIdMap = new Map<string, string>();
      const validGroupOriginIds = new Set(
        rawGroups.filter((g) => !ignoredSpaceIds.has(g.spaceId)).map((g) => g.id)
      );
      const groupsToImport: TabGroup[] = rawGroups
        .filter((g) => !ignoredSpaceIds.has(g.spaceId))
        .map((g) => {
          const mappedSpaceId = spaceIdMap.get(g.spaceId) ?? g.spaceId;
          const needsNewId = tombstoneIds.has(g.id) || spaceIdMap.has(g.spaceId);
          const newId = needsNewId ? crypto.randomUUID() : g.id;
          if (newId !== g.id) groupIdMap.set(g.id, newId);
          return {
            ...g,
            id: newId,
            spaceId: mappedSpaceId,
            updatedAt: needsNewId ? Math.max(g.updatedAt || 0, now) : g.updatedAt,
          };
        });

      const sectionIdMap = new Map<string, string>();
      const sectionsToImport: ResourceSection[] = rawSections
        .filter((rs) => !ignoredSpaceIds.has(rs.spaceId))
        .map((rs) => {
          const mappedSpaceId = spaceIdMap.get(rs.spaceId) ?? rs.spaceId;
          const needsNewId = tombstoneIds.has(rs.id) || spaceIdMap.has(rs.spaceId);
          const newId = needsNewId ? crypto.randomUUID() : rs.id;
          if (newId !== rs.id) sectionIdMap.set(rs.id, newId);
          return {
            ...rs,
            id: newId,
            spaceId: mappedSpaceId,
            updatedAt: needsNewId ? Math.max(rs.updatedAt || 0, now) : rs.updatedAt,
          };
        });

      const validSectionOriginIds = new Set(
        rawSections.filter((rs) => !ignoredSpaceIds.has(rs.spaceId)).map((rs) => rs.id)
      );

      const itemsToImport: ResourceItem[] = rawItems
        .filter((ri) => validSectionOriginIds.has(ri.sectionId))
        .map((ri) => {
          const mappedSectionId = sectionIdMap.get(ri.sectionId) ?? ri.sectionId;
          const needsNewId = tombstoneIds.has(ri.id) || sectionIdMap.has(ri.sectionId);
          return {
            ...ri,
            id: needsNewId ? crypto.randomUUID() : ri.id,
            sectionId: mappedSectionId,
            updatedAt: needsNewId ? Math.max(ri.updatedAt || 0, now) : ri.updatedAt,
          };
        });

      const tabsToImport: Tab[] = rawTabs
        .filter((t) => !ignoredSpaceIds.has(t.spaceId))
        .map((t) => {
          const mappedSpaceId = spaceIdMap.get(t.spaceId) ?? t.spaceId;
          const needsNewId = tombstoneIds.has(t.id) || spaceIdMap.has(t.spaceId);
          const mappedGroupId =
            t.groupId && validGroupOriginIds.has(t.groupId)
              ? (groupIdMap.get(t.groupId) ?? t.groupId)
              : undefined;
          return stripRuntimeTabFields({
            ...t,
            id: needsNewId ? crypto.randomUUID() : t.id,
            spaceId: mappedSpaceId,
            groupId: mappedGroupId,
            updatedAt: needsNewId ? Math.max(t.updatedAt || 0, now) : t.updatedAt,
          });
        });

      const notesToImport: Note[] = rawNotes
        .filter((n) => !ignoredSpaceIds.has(n.spaceId))
        .map((n) => {
          const mappedSpaceId = spaceIdMap.get(n.spaceId) ?? n.spaceId;
          const needsNewId = tombstoneIds.has(n.id) || spaceIdMap.has(n.spaceId);
          return {
            ...n,
            id: needsNewId ? crypto.randomUUID() : n.id,
            spaceId: mappedSpaceId,
            updatedAt: needsNewId ? Math.max(n.updatedAt || 0, now) : n.updatedAt,
          };
        });

      const tasksToImport: Task[] = rawTasks
        .filter((t) => !ignoredSpaceIds.has(t.spaceId))
        .map((t) => {
          const mappedSpaceId = spaceIdMap.get(t.spaceId) ?? t.spaceId;
          const needsNewId = tombstoneIds.has(t.id) || spaceIdMap.has(t.spaceId);
          return {
            ...t,
            id: needsNewId ? crypto.randomUUID() : t.id,
            spaceId: mappedSpaceId,
            updatedAt: needsNewId ? Math.max(t.updatedAt || 0, now) : t.updatedAt,
          };
        });

      await db.transaction(
        'rw',
        [db.spaces, db.tabs, db.tabGroups, db.resourceSections, db.resourceItems, db.notes, db.tasks],
        async () => {
          if (spacesToImport.length) await db.spaces.bulkPut(spacesToImport);
          if (groupsToImport.length) await db.tabGroups.bulkPut(groupsToImport);
          if (tabsToImport.length) await db.tabs.bulkPut(tabsToImport);
          if (sectionsToImport.length) await db.resourceSections.bulkPut(sectionsToImport);
          if (itemsToImport.length) await db.resourceItems.bulkPut(itemsToImport);
          if (notesToImport.length) await db.notes.bulkPut(notesToImport);
          if (tasksToImport.length) await db.tasks.bulkPut(tasksToImport);
        }
      );

      return {
        success: true,
        spacesCount: spacesToImport.length,
        tabsCount: tabsToImport.length,
        createdSpaceId: spacesToImport[0]?.id,
        message: `Successfully imported ${spacesToImport.length} space(s) (${tabsToImport.length} tabs)!`,
      };
    } catch (err: any) {
      return {
        success: false,
        spacesCount: 0,
        tabsCount: 0,
        message: err?.message || 'Failed to import backup.',
      };
    }
  });
}
