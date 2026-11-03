import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';

/**
 * Checks whether an Unsaved session is completely empty across ALL entity tables
 * (tabs, notes, tasks, and resource sections).
 * An Unsaved session with notes, tasks, or resources must NEVER be auto-deleted
 * even when its open browser tabs count reaches 0.
 */
export async function isSessionEmpty(spaceId: string): Promise<boolean> {
  if (!spaceId) return true;
  try {
    const [tabCount, noteCount, taskCount, sectionCount] = await Promise.all([
      db.tabs.where('spaceId').equals(spaceId).count(),
      db.notes.where('spaceId').equals(spaceId).count(),
      db.tasks.where('spaceId').equals(spaceId).count(),
      db.resourceSections.where('spaceId').equals(spaceId).count(),
    ]);
    return tabCount === 0 && noteCount === 0 && taskCount === 0 && sectionCount === 0;
  } catch (err) {
    console.warn('Error checking if unsaved session is empty:', err);
    return false;
  }
}

/**
 * Returns the count of non-tab workspace items (notes + tasks + resource sections)
 * inside a space. Used when matching windows to Unsaved sessions on startup so
 * sessions holding user notes, tasks, or resources are prioritized.
 */
export async function getUnsavedContentCount(spaceId: string): Promise<number> {
  if (!spaceId) return 0;
  try {
    const [noteCount, taskCount, sectionCount] = await Promise.all([
      db.notes.where('spaceId').equals(spaceId).count(),
      db.tasks.where('spaceId').equals(spaceId).count(),
      db.resourceSections.where('spaceId').equals(spaceId).count(),
    ]);
    return noteCount + taskCount + sectionCount;
  } catch {
    return 0;
  }
}

/**
 * Deletes an Unsaved session and cascades deletion to all its child tabs,
 * notes, tasks, resource sections, and resource items in a single transaction.
 */
export async function deleteUnsavedSession(spaceId: string): Promise<void> {
  if (!spaceId || spaceId === UNSAVED_SPACE_ID) return;
  await db.transaction(
    'rw',
    [db.spaces, db.tabs, db.notes, db.tasks, db.resourceSections, db.resourceItems],
    async () => {
      const sections = await db.resourceSections.where('spaceId').equals(spaceId).toArray();
      if (sections.length > 0) {
        const sectionIds = sections.map((s) => s.id);
        await db.resourceItems.where('sectionId').anyOf(sectionIds).delete();
      }
      await db.resourceSections.where('spaceId').equals(spaceId).delete();
      await db.notes.where('spaceId').equals(spaceId).delete();
      await db.tasks.where('spaceId').equals(spaceId).delete();
      await db.tabs.where('spaceId').equals(spaceId).delete();
      await db.spaces.delete(spaceId);
    }
  );
}

/**
 * Recovers any notes, tasks, or resource sections that were either:
 * 1. Saved under the legacy '__unsaved__' (UNSAVED_SPACE_ID) fallback ID, or
 * 2. Orphaned in IndexedDB when their parent Unsaved space was deleted in prior versions.
 *
 * Re-parents them into the active Unsaved session (or creates one if none exists)
 * so the user's notes, tasks, and resources remain accessible alongside their Unsaved tabs.
 */
export async function recoverOrphanedContent(): Promise<void> {
  try {
    await db.transaction(
      'rw',
      [db.spaces, db.tabs, db.notes, db.tasks, db.resourceSections],
      async () => {
        const allSpaces = await db.spaces.toArray();
        const validSpaceIds = new Set(allSpaces.map((s) => s.id));

        const [allNotes, allTasks, allSections, legacyTabs] = await Promise.all([
          db.notes.toArray(),
          db.tasks.toArray(),
          db.resourceSections.toArray(),
          db.tabs.where('spaceId').equals(UNSAVED_SPACE_ID).toArray(),
        ]);

        const orphanedNotes = allNotes.filter(
          (n) => n.spaceId === UNSAVED_SPACE_ID || !validSpaceIds.has(n.spaceId)
        );
        const orphanedTasks = allTasks.filter(
          (t) => t.spaceId === UNSAVED_SPACE_ID || !validSpaceIds.has(t.spaceId)
        );
        const orphanedSections = allSections.filter(
          (s) => s.spaceId === UNSAVED_SPACE_ID || !validSpaceIds.has(s.spaceId)
        );

        if (
          orphanedNotes.length === 0 &&
          orphanedTasks.length === 0 &&
          orphanedSections.length === 0 &&
          legacyTabs.length === 0
        ) {
          return;
        }

        // Find the primary active Unsaved space (preferring one that already has tabs or content)
        const unsavedSpaces = allSpaces
          .filter((s) => !!s.isUnsaved && !s.isArchived)
          .sort((a, b) => b.updatedAt - a.updatedAt);

        let targetSpace = unsavedSpaces[0];
        const now = Date.now();

        if (!targetSpace) {
          const newId = crypto.randomUUID();
          targetSpace = {
            id: newId,
            name: '',
            isUnsaved: true,
            order: now,
            createdAt: now,
            updatedAt: now,
            isArchived: false,
          };
          await db.spaces.add(targetSpace);
        }

        if (orphanedNotes.length > 0) {
          await Promise.all(
            orphanedNotes.map((n) =>
              db.notes.update(n.id, { spaceId: targetSpace.id, updatedAt: now })
            )
          );
        }

        if (orphanedTasks.length > 0) {
          await Promise.all(
            orphanedTasks.map((t) =>
              db.tasks.update(t.id, { spaceId: targetSpace.id, updatedAt: now })
            )
          );
        }

        if (orphanedSections.length > 0) {
          await Promise.all(
            orphanedSections.map((s) =>
              db.resourceSections.update(s.id, { spaceId: targetSpace.id, updatedAt: now })
            )
          );
        }
      }
    );
  } catch (err) {
    console.warn('Failed to recover orphaned content:', err);
  }
}
