import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { getAppVersion } from '@/utils/appVersion';
import { downloadFile } from '@/utils/download';

export interface SpaceExportPayload {
  app: string;
  version: string;
  exportedAt: string;
  space: {
    name: string;
    icon?: string;
    description?: string;
    section?: string;
  };
  tabs: {
    title: string;
    url: string;
    favIconUrl?: string;
    order: number;
  }[];
  notes: {
    title: string;
    content: string;
  }[];
  tasks: {
    text: string;
    completed: boolean;
    order: number;
    dueDate?: number;
  }[];
  resources: {
    title: string;
    order: number;
    items: {
      title: string;
      url: string;
      type: string;
    }[];
  }[];
}

/**
 * Builds a single-space JSON export payload.
 */
export async function buildSpaceExport(
  spaceId: string | null,
  fallbackName = 'Unsaved Session'
): Promise<SpaceExportPayload> {
  const targetId = spaceId || UNSAVED_SPACE_ID;
  const space = spaceId ? await db.spaces.get(spaceId) : undefined;
  const spaceName = space?.name || fallbackName;

  const [spaceTabs, notes, tasks, sections] = await Promise.all([
    db.tabs.where('spaceId').equals(targetId).sortBy('order'),
    db.notes.where('spaceId').equals(targetId).toArray(),
    db.tasks.where('spaceId').equals(targetId).sortBy('order'),
    db.resourceSections.where('spaceId').equals(targetId).sortBy('order'),
  ]);

  const resourcesData = [];
  for (const sec of sections) {
    const items = await db.resourceItems.where('sectionId').equals(sec.id).toArray();
    resourcesData.push({
      title: sec.title,
      order: sec.order,
      items: items.map((it) => ({
        title: it.title,
        url: it.url,
        type: it.type,
      })),
    });
  }

  return {
    app: 'SpaceTabs',
    version: getAppVersion(),
    exportedAt: new Date().toISOString(),
    space: {
      name: spaceName,
      icon: space?.icon,
      description: space?.description,
      section: space?.section,
    },
    tabs: spaceTabs.map((t) => ({
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl,
      order: t.order,
    })),
    notes: notes.map((n) => ({
      title: n.title,
      content: n.content,
    })),
    tasks: tasks.map((tk) => ({
      text: tk.text,
      completed: tk.completed,
      order: tk.order,
      dueDate: tk.dueDate,
    })),
    resources: resourcesData,
  };
}

/**
 * Exports a single space to a downloadable JSON file.
 */
export async function exportSpaceToFile(
  spaceId: string | null,
  fallbackName = 'Unsaved Session'
): Promise<void> {
  const payload = await buildSpaceExport(spaceId, fallbackName);
  const safeName = payload.space.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  downloadFile(JSON.stringify(payload, null, 2), `${safeName}-space.json`);
}
