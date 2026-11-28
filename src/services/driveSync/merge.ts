import { db } from '@/db';
import {
  type Space,
  type Tab,
  type TabGroup,
  type ResourceSection,
  type ResourceItem,
  type Note,
  type Task,
  type Tombstone,
  type DriveDataExport,
  UNSAVED_SPACE_ID,
} from '@/db/schema';
import { stripRuntimeTabFields } from './lock';
import { getTombstones, setTombstones } from './storage';

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generic updatedAt-winner merge helper for entity collections, respecting tombstones,
 * optional parent/validity predicate, and optional item transform.
 */
export function mergeCollection<T extends { id: string; updatedAt: number }>(
  localItems: T[] | undefined,
  remoteItems: T[] | undefined,
  deletedSet: Set<string>,
  isValid: (item: T) => boolean = () => true,
  transform: (item: T) => T = (item) => item
): T[] {
  const map = new Map<string, T>();
  for (const raw of localItems || []) {
    if (!deletedSet.has(raw.id) && isValid(raw)) {
      const item = transform(raw);
      map.set(item.id, item);
    }
  }
  for (const raw of remoteItems || []) {
    if (!deletedSet.has(raw.id) && isValid(raw)) {
      const item = transform(raw);
      const existing = map.get(item.id);
      if (!existing || item.updatedAt > existing.updatedAt) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

export async function buildLocalExport(): Promise<DriveDataExport> {
  const [spaces, tabs, tabGroups, resourceSections, resourceItems, notes, tasks, deletedIds] =
    await Promise.all([
      db.spaces.toArray(),
      db.tabs.where('spaceId').notEqual(UNSAVED_SPACE_ID).toArray(),
      db.tabGroups.toArray(),
      db.resourceSections.toArray(),
      db.resourceItems.toArray(),
      db.notes.toArray(),
      db.tasks.toArray(),
      getTombstones(),
    ]);

  const localOnlySpaceIds = new Set<string>([
    UNSAVED_SPACE_ID,
    ...spaces.filter((s) => !!s.isUnsaved).map((s) => s.id),
  ]);
  const isSyncableSpace = (spaceId: string) => !localOnlySpaceIds.has(spaceId);

  const syncableSpaces = spaces.filter((s) => !s.isUnsaved);
  const syncableTabGroups = tabGroups.filter((g) => isSyncableSpace(g.spaceId));
  const validGroupIds = new Set(syncableTabGroups.map((g) => g.id));
  const syncableTabs = tabs
    .filter((t) => isSyncableSpace(t.spaceId))
    .map((t) => {
      const clean = stripRuntimeTabFields(t);
      if (clean.groupId && !validGroupIds.has(clean.groupId)) {
        const { groupId: _, ...rest } = clean;
        return rest;
      }
      return clean;
    });
  const syncableSections = resourceSections.filter((s) => isSyncableSpace(s.spaceId));
  const syncableSectionIds = new Set(syncableSections.map((s) => s.id));
  const syncableItems = resourceItems.filter((i) => syncableSectionIds.has(i.sectionId));
  const syncableNotes = notes.filter((n) => isSyncableSpace(n.spaceId));
  const syncableTasks = tasks.filter((t) => isSyncableSpace(t.spaceId));

  return {
    exportedAt: Date.now(),
    spaces: syncableSpaces,
    tabs: syncableTabs,
    tabGroups: syncableTabGroups,
    resourceSections: syncableSections,
    resourceItems: syncableItems,
    notes: syncableNotes,
    tasks: syncableTasks,
    deletedIds,
  };
}

/**
 * Bi-directional conflict resolution and multi-device merge engine.
 * Respects tombstones (soft-deletes), updatedAt timestamps, and strictly preserves
 * all local-only Unsaved session spaces, tabs, notes, tasks, and resources.
 */
export async function mergeRemoteAndLocal(
  remote: DriveDataExport,
  local: DriveDataExport
): Promise<DriveDataExport> {
  const now = Date.now();

  // 1. Merge & Deduplicate Tombstones
  const tombstoneMap = new Map<string, Tombstone>();
  for (const t of local.deletedIds || []) {
    tombstoneMap.set(t.id, t);
  }
  for (const t of remote.deletedIds || []) {
    const existing = tombstoneMap.get(t.id);
    if (!existing || t.deletedAt > existing.deletedAt) {
      tombstoneMap.set(t.id, t);
    }
  }

  // 1b. Self-heal & protect any local-only Unsaved items whose IDs still exist in remote Saved Spaces
  // (e.g. tabs moved from a Saved Space into an Unsaved session before re-keying):
  const remoteTabIds = new Set((remote.tabs || []).map((t) => t.id));
  const remoteGroupIds = new Set((remote.tabGroups || []).map((g) => g.id));
  const remoteSectionIds = new Set((remote.resourceSections || []).map((s) => s.id));
  const remoteItemIds = new Set((remote.resourceItems || []).map((i) => i.id));
  const remoteNoteIds = new Set((remote.notes || []).map((n) => n.id));
  const remoteTaskIds = new Set((remote.tasks || []).map((t) => t.id));

  await db.transaction(
    'rw',
    [db.spaces, db.tabs, db.tabGroups, db.resourceSections, db.resourceItems, db.notes, db.tasks],
    async () => {
      const allLocalSpaces = await db.spaces.toArray();
      const localOnlySpaceIds = new Set<string>([
        UNSAVED_SPACE_ID,
        ...allLocalSpaces.filter((s) => !!s.isUnsaved).map((s) => s.id),
      ]);
      const isLocalOnly = (spaceId: string) => localOnlySpaceIds.has(spaceId);

      const allLocalGroups = await db.tabGroups.toArray();
      for (const ug of allLocalGroups) {
        if (isLocalOnly(ug.spaceId) && remoteGroupIds.has(ug.id)) {
          const newGroupId = crypto.randomUUID();
          tombstoneMap.set(ug.id, { id: ug.id, table: 'tab_groups', deletedAt: now });
          await db.tabGroups.delete(ug.id);
          await db.tabGroups.add({ ...ug, id: newGroupId, updatedAt: now });
          await db.tabs.where('groupId').equals(ug.id).modify({ groupId: newGroupId, updatedAt: now });
        }
      }

      const allLocalTabs = await db.tabs.toArray();
      for (const ut of allLocalTabs) {
        if (isLocalOnly(ut.spaceId) && remoteTabIds.has(ut.id)) {
          tombstoneMap.set(ut.id, { id: ut.id, table: 'tabs', deletedAt: now });
          await db.tabs.delete(ut.id);
          await db.tabs.add({ ...ut, id: crypto.randomUUID(), updatedAt: now });
        }
      }

      const allLocalSections = await db.resourceSections.toArray();
      const localOnlySecIds = new Set<string>();
      for (const us of allLocalSections) {
        if (isLocalOnly(us.spaceId)) {
          if (remoteSectionIds.has(us.id)) {
            const newSecId = crypto.randomUUID();
            tombstoneMap.set(us.id, { id: us.id, table: 'resource_sections', deletedAt: now });
            await db.resourceSections.delete(us.id);
            await db.resourceSections.add({ ...us, id: newSecId, updatedAt: now });
            await db.resourceItems
              .where('sectionId')
              .equals(us.id)
              .modify({ sectionId: newSecId, updatedAt: now });
            localOnlySecIds.add(newSecId);
          } else {
            localOnlySecIds.add(us.id);
          }
        }
      }

      const allLocalItems = await db.resourceItems.toArray();
      for (const ui of allLocalItems) {
        if (localOnlySecIds.has(ui.sectionId) && remoteItemIds.has(ui.id)) {
          tombstoneMap.set(ui.id, { id: ui.id, table: 'resource_items', deletedAt: now });
          await db.resourceItems.delete(ui.id);
          await db.resourceItems.add({ ...ui, id: crypto.randomUUID(), updatedAt: now });
        }
      }

      const allLocalNotes = await db.notes.toArray();
      for (const un of allLocalNotes) {
        if (isLocalOnly(un.spaceId) && remoteNoteIds.has(un.id)) {
          tombstoneMap.set(un.id, { id: un.id, table: 'notes', deletedAt: now });
          await db.notes.delete(un.id);
          await db.notes.add({ ...un, id: crypto.randomUUID(), updatedAt: now });
        }
      }

      const allLocalTasks = await db.tasks.toArray();
      for (const utk of allLocalTasks) {
        if (isLocalOnly(utk.spaceId) && remoteTaskIds.has(utk.id)) {
          tombstoneMap.set(utk.id, { id: utk.id, table: 'tasks', deletedAt: now });
          await db.tasks.delete(utk.id);
          await db.tasks.add({ ...utk, id: crypto.randomUUID(), updatedAt: now });
        }
      }
    }
  );

  const thirtyDaysAgo = now - TOMBSTONE_RETENTION_MS;
  const mergedTombstones = Array.from(tombstoneMap.values()).filter(
    (t) => t.deletedAt > thirtyDaysAgo
  );
  const deletedSet = new Set(mergedTombstones.map((t) => t.id));

  // 2. Merge Saved Spaces (exclude any isUnsaved spaces)
  const mergedSpaces = mergeCollection<Space>(
    local.spaces,
    remote.spaces,
    deletedSet,
    (s) => !s.isUnsaved
  );
  const validSpaceIds = new Set(mergedSpaces.map((s) => s.id));

  // 2b. Merge Tab Groups
  const mergedTabGroups = mergeCollection<TabGroup>(
    local.tabGroups,
    remote.tabGroups,
    deletedSet,
    (g) => validSpaceIds.has(g.spaceId)
  );
  const validGroupIds = new Set(mergedTabGroups.map((g) => g.id));

  // 3. Merge Saved Tabs (strip runtime fields & self-heal any dangling groupId)
  const mergedTabs = mergeCollection<Tab>(
    local.tabs,
    remote.tabs,
    deletedSet,
    (t) => t.spaceId !== UNSAVED_SPACE_ID && validSpaceIds.has(t.spaceId),
    (rawTab) => {
      const clean = stripRuntimeTabFields(rawTab);
      if (clean.groupId && !validGroupIds.has(clean.groupId)) {
        const { groupId: _, ...rest } = clean;
        return rest;
      }
      return clean;
    }
  );

  // 4. Merge Resource Sections
  const mergedSections = mergeCollection<ResourceSection>(
    local.resourceSections,
    remote.resourceSections,
    deletedSet,
    (sec) => validSpaceIds.has(sec.spaceId)
  );
  const validSectionIds = new Set(mergedSections.map((s) => s.id));

  // 5. Merge Resource Items
  const mergedItems = mergeCollection<ResourceItem>(
    local.resourceItems,
    remote.resourceItems,
    deletedSet,
    (item) => validSectionIds.has(item.sectionId)
  );

  // 6. Merge Notes
  const mergedNotes = mergeCollection<Note>(
    local.notes,
    remote.notes,
    deletedSet,
    (n) => validSpaceIds.has(n.spaceId)
  );

  // 7. Merge Tasks
  const mergedTasks = mergeCollection<Task>(
    local.tasks,
    remote.tasks,
    deletedSet,
    (t) => validSpaceIds.has(t.spaceId)
  );

  // 8. Commit Merged Data to Local Dexie (preserving local-only Unsaved content & live tab bindings)
  await db.transaction(
    'rw',
    [
      db.spaces,
      db.tabs,
      db.tabGroups,
      db.resourceSections,
      db.resourceItems,
      db.notes,
      db.tasks,
    ],
    async () => {
      const existingLocalSpaces = await db.spaces.toArray();
      const localOnlySpaceIds = new Set<string>([
        UNSAVED_SPACE_ID,
        ...existingLocalSpaces.filter((s) => !!s.isUnsaved).map((s) => s.id),
      ]);
      const isLocalOnlySpace = (spaceId: string) => localOnlySpaceIds.has(spaceId);

      if (mergedSpaces.length > 0) await db.spaces.bulkPut(mergedSpaces);
      const currentSpaces = await db.spaces.toArray();
      const spacesToDelete = currentSpaces
        .filter((s) => !s.isUnsaved && deletedSet.has(s.id))
        .map((s) => s.id);
      if (spacesToDelete.length > 0) await db.spaces.bulkDelete(spacesToDelete);

      const liveSpaceIds = new Set(
        (await db.spaces.toCollection().primaryKeys()).map(String)
      );

      // Tab Groups: preserve local-only Unsaved groups and prune deleted/orphaned saved groups
      if (mergedTabGroups.length > 0) await db.tabGroups.bulkPut(mergedTabGroups);
      const currentGroups = await db.tabGroups.toArray();
      const groupsToDelete = currentGroups
        .filter(
          (g) =>
            !isLocalOnlySpace(g.spaceId) &&
            (deletedSet.has(g.id) || !liveSpaceIds.has(g.spaceId))
        )
        .map((g) => g.id);
      if (groupsToDelete.length > 0) await db.tabGroups.bulkDelete(groupsToDelete);

      // Saved Tabs: re-attach local live chromeTabId/windowId bindings before bulkPut
      const currentTabs = await db.tabs.toArray();
      const unsavedTabIds = new Set(
        currentTabs.filter((ct) => isLocalOnlySpace(ct.spaceId)).map((ct) => ct.id)
      );
      const localTabBindings = new Map<string, { chromeTabId?: number; windowId?: number }>();
      for (const ct of currentTabs) {
        if (ct.chromeTabId !== undefined || ct.windowId !== undefined) {
          localTabBindings.set(ct.id, {
            chromeTabId: ct.chromeTabId,
            windowId: ct.windowId,
          });
        }
      }
      const tabsToWrite = mergedTabs
        .filter((mt) => !unsavedTabIds.has(mt.id))
        .map((mt) => {
          const binding = localTabBindings.get(mt.id);
          return binding ? { ...mt, ...binding } : stripRuntimeTabFields(mt);
        });
      if (tabsToWrite.length > 0) await db.tabs.bulkPut(tabsToWrite);

      const afterTabs = await db.tabs.toArray();
      const tabsToDelete = afterTabs
        .filter(
          (t) =>
            !isLocalOnlySpace(t.spaceId) &&
            (deletedSet.has(t.id) || !liveSpaceIds.has(t.spaceId))
        )
        .map((t) => t.id);
      if (tabsToDelete.length > 0) await db.tabs.bulkDelete(tabsToDelete);

      // Resources: never delete local-only Unsaved resource sections or items
      if (mergedSections.length > 0) await db.resourceSections.bulkPut(mergedSections);
      const currentSections = await db.resourceSections.toArray();
      const sectionsToDelete = currentSections
        .filter(
          (s) =>
            !isLocalOnlySpace(s.spaceId) &&
            (deletedSet.has(s.id) || !liveSpaceIds.has(s.spaceId))
        )
        .map((s) => s.id);
      if (sectionsToDelete.length > 0) await db.resourceSections.bulkDelete(sectionsToDelete);

      const remainingSections = await db.resourceSections.toArray();
      const liveSectionIds = new Set(remainingSections.map((s) => s.id));
      const localOnlySectionIds = new Set(
        remainingSections.filter((s) => isLocalOnlySpace(s.spaceId)).map((s) => s.id)
      );

      if (mergedItems.length > 0) await db.resourceItems.bulkPut(mergedItems);
      const currentItems = await db.resourceItems.toArray();
      const itemsToDelete = currentItems
        .filter(
          (i) =>
            !localOnlySectionIds.has(i.sectionId) &&
            (deletedSet.has(i.id) || !liveSectionIds.has(i.sectionId))
        )
        .map((i) => i.id);
      if (itemsToDelete.length > 0) await db.resourceItems.bulkDelete(itemsToDelete);

      // Notes: never delete local-only Unsaved notes
      if (mergedNotes.length > 0) await db.notes.bulkPut(mergedNotes);
      const currentNotes = await db.notes.toArray();
      const notesToDelete = currentNotes
        .filter(
          (n) =>
            !isLocalOnlySpace(n.spaceId) &&
            (deletedSet.has(n.id) || !liveSpaceIds.has(n.spaceId))
        )
        .map((n) => n.id);
      if (notesToDelete.length > 0) await db.notes.bulkDelete(notesToDelete);

      // Tasks: never delete local-only Unsaved tasks
      if (mergedTasks.length > 0) await db.tasks.bulkPut(mergedTasks);
      const currentTasks = await db.tasks.toArray();
      const tasksToDelete = currentTasks
        .filter(
          (t) =>
            !isLocalOnlySpace(t.spaceId) &&
            (deletedSet.has(t.id) || !liveSpaceIds.has(t.spaceId))
        )
        .map((t) => t.id);
      if (tasksToDelete.length > 0) await db.tasks.bulkDelete(tasksToDelete);
    }
  );

  await setTombstones(mergedTombstones);

  return {
    exportedAt: Date.now(),
    spaces: mergedSpaces,
    tabs: mergedTabs,
    tabGroups: mergedTabGroups,
    resourceSections: mergedSections,
    resourceItems: mergedItems,
    notes: mergedNotes,
    tasks: mergedTasks,
    deletedIds: mergedTombstones,
  };
}
