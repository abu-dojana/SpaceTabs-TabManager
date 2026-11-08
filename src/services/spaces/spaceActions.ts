import { db } from '@/db';
import { type Space } from '@/db/schema';
import { recordTombstones } from '@/services/driveSync';

/**
 * Computes the next sequential order index for a newly created or saved space.
 */
export async function getNextSpaceOrder(): Promise<number> {
  const allSpaces = await db.spaces.toArray();
  const savedOrders = allSpaces
    .filter((s) => !s.isUnsaved && typeof s.order === 'number')
    .map((s) => s.order);
  return savedOrders.length > 0 ? Math.max(...savedOrders) + 1 : 0;
}

/**
 * Atomically duplicates a space and all of its tabs, notes, tasks, and resource sections/items.
 */
export async function duplicateSpace(space: Space): Promise<string> {
  const newSpaceId = crypto.randomUUID();
  const now = Date.now();

  await db.transaction(
    'rw',
    [db.spaces, db.tabs, db.notes, db.tasks, db.resourceSections, db.resourceItems],
    async () => {
      const nextOrder = await getNextSpaceOrder();
      await db.spaces.add({
        id: newSpaceId,
        name: `${space.name} (Copy)`,
        icon: space.icon,
        color: space.color,
        description: space.description,
        section: space.section,
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
        isArchived: false,
      });

      const spaceTabs = await db.tabs.where('spaceId').equals(space.id).toArray();
      if (spaceTabs.length > 0) {
        await db.tabs.bulkAdd(
          spaceTabs.map((t) => ({
            id: crypto.randomUUID(),
            spaceId: newSpaceId,
            url: t.url,
            title: t.title,
            favIconUrl: t.favIconUrl,
            order: t.order,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      const spaceNotes = await db.notes.where('spaceId').equals(space.id).toArray();
      if (spaceNotes.length > 0) {
        await db.notes.bulkAdd(
          spaceNotes.map((n) => ({
            id: crypto.randomUUID(),
            spaceId: newSpaceId,
            title: n.title,
            content: n.content,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      const spaceTasks = await db.tasks.where('spaceId').equals(space.id).toArray();
      if (spaceTasks.length > 0) {
        await db.tasks.bulkAdd(
          spaceTasks.map((task) => ({
            id: crypto.randomUUID(),
            spaceId: newSpaceId,
            text: task.text,
            completed: task.completed,
            order: task.order,
            dueDate: task.dueDate,
            createdAt: now,
            updatedAt: now,
          }))
        );
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
        if (items.length > 0) {
          await db.resourceItems.bulkAdd(
            items.map((item) => ({
              id: crypto.randomUUID(),
              sectionId: newSecId,
              title: item.title,
              url: item.url,
              favIconUrl: item.favIconUrl,
              type: item.type,
              order: item.order ?? 0,
              createdAt: now,
              updatedAt: now,
            }))
          );
        }
      }
    }
  );

  return newSpaceId;
}

/**
 * Records cloud sync tombstones and permanently deletes a space and all of its children in one transaction.
 */
export async function deleteSpacePermanently(spaceId: string): Promise<void> {
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

  await db.transaction(
    'rw',
    [db.spaces, db.tabs, db.notes, db.tasks, db.resourceSections, db.resourceItems],
    async () => {
      await db.tabs.where('spaceId').equals(spaceId).delete();
      await db.notes.where('spaceId').equals(spaceId).delete();
      await db.tasks.where('spaceId').equals(spaceId).delete();
      const secs = await db.resourceSections.where('spaceId').equals(spaceId).toArray();
      for (const s of secs) {
        await db.resourceItems.where('sectionId').equals(s.id).delete();
      }
      await db.resourceSections.where('spaceId').equals(spaceId).delete();
      await db.spaces.delete(spaceId);
    }
  );
}

export async function archiveSpace(spaceId: string): Promise<void> {
  await db.spaces.update(spaceId, { isArchived: true, updatedAt: Date.now() });
}

export async function restoreSpace(spaceId: string): Promise<void> {
  await db.spaces.update(spaceId, { isArchived: false, updatedAt: Date.now() });
}

export async function renameSpace(
  spaceId: string,
  name: string,
  icon?: string
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const updateData: { name: string; updatedAt: number; icon?: string } = {
    name: trimmed,
    updatedAt: Date.now(),
  };
  if (icon) {
    updateData.icon = icon;
  }
  await db.spaces.update(spaceId, updateData);
}

export async function updateSpaceDescription(
  spaceId: string,
  description: string
): Promise<void> {
  await db.spaces.update(spaceId, {
    description: description.trim(),
    updatedAt: Date.now(),
  });
}
