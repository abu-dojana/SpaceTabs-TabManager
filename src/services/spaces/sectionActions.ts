import { db } from '@/db';
import { type Space } from '@/db/schema';

export async function renameSection(oldName: string, newName: string): Promise<string | null> {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return null;
  const matching = await db.spaces.filter((s) => s.section === oldName).toArray();
  const now = Date.now();
  await db.transaction('rw', db.spaces, async () => {
    for (const s of matching) {
      await db.spaces.update(s.id, { section: trimmed, updatedAt: now });
    }
  });
  return trimmed;
}

export async function archiveSectionSpaces(sectionName: string): Promise<string[]> {
  const matching = await db.spaces.filter((s) => s.section === sectionName).toArray();
  const now = Date.now();
  await db.transaction('rw', db.spaces, async () => {
    for (const s of matching) {
      await db.spaces.update(s.id, { isArchived: true, updatedAt: now });
    }
  });
  return matching.map((s) => s.id);
}

export async function keepSectionSpacesUnsectioned(sectionName: string): Promise<void> {
  const matching = await db.spaces.filter((s) => s.section === sectionName).toArray();
  const now = Date.now();
  await db.transaction('rw', db.spaces, async () => {
    for (const s of matching) {
      await db.spaces.update(s.id, { section: undefined, updatedAt: now });
    }
  });
}

export async function reorderSpacesInList(
  currentList: Space[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after'
): Promise<void> {
  if (sourceId === targetId) return;
  const list = [...currentList];
  const sourceIdx = list.findIndex((s) => s.id === sourceId);
  const targetIdx = list.findIndex((s) => s.id === targetId);
  if (sourceIdx === -1 || targetIdx === -1) return;

  const [moved] = list.splice(sourceIdx, 1);
  let insertIdx = list.findIndex((s) => s.id === targetId);
  if (position === 'after') {
    insertIdx += 1;
  }
  list.splice(insertIdx, 0, moved);

  const now = Date.now();
  const updates = list.map((space, idx) => ({
    ...space,
    order: idx,
    updatedAt: now,
  }));

  await db.spaces.bulkPut(updates);
}

export async function persistSectionOrder(
  orderedSectionNames: string[],
  sectionsMap: Map<string, Space[]>
): Promise<void> {
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
}

export async function moveSectionByOffset(
  sectionsMap: Map<string, Space[]>,
  sectionName: string,
  offset: -1 | 1
): Promise<void> {
  const sectionNames = Array.from(sectionsMap.keys());
  const idx = sectionNames.indexOf(sectionName);
  const newIdx = idx + offset;
  if (idx === -1 || newIdx < 0 || newIdx >= sectionNames.length) return;

  const [moved] = sectionNames.splice(idx, 1);
  sectionNames.splice(newIdx, 0, moved);
  await persistSectionOrder(sectionNames, sectionsMap);
}
