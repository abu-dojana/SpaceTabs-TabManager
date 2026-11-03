import { db } from '@/db';
import {
  type Space,
  type Tab,
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
  const [spaces, tabs, resourceSections, resourceItems, notes, tasks, deletedIds] =
    await Promise.all([
      db.spaces.toArray(),
      db.tabs.where('spaceId').notEqual(UNSAVED_SPACE_ID).toArray(),
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
  const syncableTabs = tabs
    .filter((t) => isSyncableSpace(t.spaceId))
    .map(stripRuntimeTabFields);
  const syncableSections = resourceSections.filter((s) => isSyncableSpace(s.spaceId));
  const syncableSectionIds = new Set(syncableSections.map((s) => s.id));
  const syncableItems = resourceItems.filter((i) => syncableSectionIds.has(i.sectionId));
  const syncableNotes = notes.filter((n) => isSyncableSpace(n.spaceId));
  const syncableTasks = tasks.filter((t) => isSyncableSpace(t.spaceId));

  return {
    exportedAt: Date.now(),
    spaces: syncableSpaces,
    tabs: syncableTabs,
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

  const thirtyDaysAgo = Date.now() - TOMBSTONE_RETENTION_MS;
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

  // 3. Merge Saved Tabs (strip runtime chromeTabId/windowId so cloud payload stays portable)
  const mergedTabs = mergeCollection<Tab>(
    local.tabs,
    remote.tabs,
    deletedSet,
    (t) => t.spaceId !== UNSAVED_SPACE_ID && validSpaceIds.has(t.spaceId),
    stripRuntimeTabFields
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

      // Saved Tabs: re-attach local live chromeTabId/windowId bindings before bulkPut
      const currentTabs = await db.tabs.toArray();
      const localTabBindings = new Map<string, { chromeTabId?: number; windowId?: number }>();
      for (const ct of currentTabs) {
        if (ct.chromeTabId !== undefined || ct.windowId !== undefined) {
          localTabBindings.set(ct.id, {
            chromeTabId: ct.chromeTabId,
            windowId: ct.windowId,
          });
        }
      }
      const tabsToWrite = mergedTabs.map((mt) => {
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
    resourceSections: mergedSections,
    resourceItems: mergedItems,
    notes: mergedNotes,
    tasks: mergedTasks,
    deletedIds: mergedTombstones,
  };
}
