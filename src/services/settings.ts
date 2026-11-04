import { db } from '@/db';
import {
  type Space,
  type Tab,
  type ResourceSection,
  type ResourceItem,
  type Note,
  type Task,
  type DriveDataExport,
  UNSAVED_SPACE_ID,
} from '@/db/schema';
import { discardInactiveTabs, discardAllInactiveTabsInWindow } from './suspension';
import { downloadFile } from '@/utils/download';
import {
  stripRuntimeTabFields,
  withSyncLock,
  getTombstones,
  getGoogleProfile,
  getCloudSyncSettings,
  syncNow,
} from './driveSync';

export type DarkPalette = 'slate' | 'midnight' | 'obsidian' | 'indigo' | 'forest' | 'espresso';
export type LightPalette = 'snow' | 'paper' | 'zinc' | 'sky' | 'mint' | 'sakura';

export interface UserSettings {
  autoSuspendEnabled: boolean;
  idleThresholdMinutes: number;
  defaultOpenInNewWindow: boolean;
  discardOnSpaceSwitch: boolean;
  showTabFavicons: boolean;
  sidebarTheme: 'dark' | 'light';
  dashboardTheme: 'dark' | 'light';
  accentColor: string;
  darkPalette: DarkPalette;
  lightPalette: LightPalette;
  sidebarWidth: number;
  patreonUrl: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  autoSuspendEnabled: true,
  idleThresholdMinutes: 15,
  defaultOpenInNewWindow: false,
  discardOnSpaceSwitch: true,
  showTabFavicons: true,
  sidebarTheme: 'dark',
  dashboardTheme: 'dark',
  accentColor: '#2563eb',
  darkPalette: 'slate',
  lightPalette: 'snow',
  sidebarWidth: 260,
  patreonUrl: 'https://www.patreon.com/abudojana',
};

const SETTINGS_STORAGE_KEY = 'spacetabs_user_settings';

/**
 * Retrieves persisted user settings from chrome.storage.local
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const data = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    if (data && data[SETTINGS_STORAGE_KEY]) {
      return { ...DEFAULT_SETTINGS, ...data[SETTINGS_STORAGE_KEY] };
    }
  } catch (err) {
    console.warn('Failed to load user settings from storage:', err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Saves partial user settings to chrome.storage.local
 */
export async function updateUserSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getUserSettings();
  const updated: UserSettings = { ...current, ...partial };
  try {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: updated });
  } catch (err) {
    console.error('Failed to save user settings:', err);
  }
  return updated;
}

/**
 * Exports all saved spaces, tabs, resources, notes, and tasks to a JSON file
 */
export async function exportAllSpacesBackup(): Promise<DriveDataExport> {
  const [allSpaces, allTabs, allSections, allItems, allNotes, allTasks] = await Promise.all([
    db.spaces.toArray(),
    db.tabs.toArray(),
    db.resourceSections.toArray(),
    db.resourceItems.toArray(),
    db.notes.toArray(),
    db.tasks.toArray(),
  ]);

  const spaces = allSpaces.filter((s) => !s.isUnsaved && s.id !== UNSAVED_SPACE_ID);
  const localOnlySpaceIds = new Set<string>([
    UNSAVED_SPACE_ID,
    ...allSpaces.filter((s) => s.isUnsaved).map((s) => s.id),
  ]);

  const tabs = allTabs
    .filter((t) => !localOnlySpaceIds.has(t.spaceId))
    .map(stripRuntimeTabFields);
  const resourceSections = allSections.filter((rs) => !localOnlySpaceIds.has(rs.spaceId));
  const exportedSectionIds = new Set(resourceSections.map((rs) => rs.id));
  const resourceItems = allItems.filter((ri) => exportedSectionIds.has(ri.sectionId));
  const notes = allNotes.filter((n) => !localOnlySpaceIds.has(n.spaceId));
  const tasks = allTasks.filter((t) => !localOnlySpaceIds.has(t.spaceId));

  const payload: DriveDataExport = {
    exportedAt: Date.now(),
    spaces,
    tabs,
    resourceSections,
    resourceItems,
    notes,
    tasks,
    deletedIds: [],
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(jsonStr, `spacetabs-backup-${dateStr}.json`);

  return payload;
}

function validateEntityArray<T extends { id: string }>(arr: unknown, label: string): T[] {
  if (arr === undefined || arr === null) return [];
  if (!Array.isArray(arr)) {
    throw new Error(`Invalid backup file: "${label}" must be an array.`);
  }
  for (const item of arr) {
    if (!item || typeof item !== 'object' || typeof (item as any).id !== 'string' || !(item as any).id.trim()) {
      throw new Error(`Invalid backup file: every entry in "${label}" must have a valid string "id".`);
    }
  }
  return arr as T[];
}

/**
 * Imports and restores all spaces and workspace data from a JSON backup file
 */
export async function importSpacesBackup(
  jsonText: string
): Promise<{ success: boolean; spacesCount: number; message: string }> {
  return withSyncLock(async () => {
    try {
      const data: Partial<DriveDataExport> = JSON.parse(jsonText);

      if (!data || typeof data !== 'object' || !Array.isArray(data.spaces)) {
        throw new Error('Invalid backup file: missing spaces data array.');
      }

      const rawSpaces = validateEntityArray<Space>(data.spaces, 'spaces');
      const rawTabs = validateEntityArray<Tab>(data.tabs, 'tabs');
      const rawSections = validateEntityArray<ResourceSection>(data.resourceSections, 'resourceSections');
      const rawItems = validateEntityArray<ResourceItem>(data.resourceItems, 'resourceItems');
      const rawNotes = validateEntityArray<Note>(data.notes, 'notes');
      const rawTasks = validateEntityArray<Task>(data.tasks, 'tasks');

      // Exclude unsaved spaces and their children from import
      const ignoredSpaceIds = new Set<string>([
        UNSAVED_SPACE_ID,
        ...rawSpaces.filter((s) => s.isUnsaved).map((s) => s.id),
      ]);
      const validSpaces = rawSpaces.filter((s) => !s.isUnsaved && s.id !== UNSAVED_SPACE_ID);

      // If Google Drive sync is connected and enabled, pull remote tombstones first
      try {
        const [profile, syncSettings] = await Promise.all([
          getGoogleProfile(),
          getCloudSyncSettings(),
        ]);
        if (profile && syncSettings.enabled) {
          await syncNow().catch(() => {});
        }
      } catch {
        // Ignore pre-import sync errors and proceed with local import
      }

      const tombstones = await getTombstones();
      const tombstoneIds = new Set(tombstones.map((t) => t.id));
      const now = Date.now();

      // Remap any entity IDs that collide with local/remote deletion tombstones
      const spaceIdMap = new Map<string, string>();
      const spacesToImport: Space[] = validSpaces.map((sp) => {
        if (tombstoneIds.has(sp.id)) {
          const newId = crypto.randomUUID();
          spaceIdMap.set(sp.id, newId);
          return { ...sp, id: newId, updatedAt: Math.max(sp.updatedAt || 0, now) };
        }
        return sp;
      });

      const sectionIdMap = new Map<string, string>();
      const sectionsToImport: ResourceSection[] = rawSections
        .filter((rs) => !ignoredSpaceIds.has(rs.spaceId))
        .map((rs) => {
          const mappedSpaceId = spaceIdMap.get(rs.spaceId) ?? rs.spaceId;
          const needsNewId = tombstoneIds.has(rs.id) || spaceIdMap.has(rs.spaceId);
          const newId = needsNewId ? crypto.randomUUID() : rs.id;
          if (newId !== rs.id) {
            sectionIdMap.set(rs.id, newId);
          }
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
          return stripRuntimeTabFields({
            ...t,
            id: needsNewId ? crypto.randomUUID() : t.id,
            spaceId: mappedSpaceId,
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
        [
          db.spaces,
          db.tabs,
          db.resourceSections,
          db.resourceItems,
          db.notes,
          db.tasks,
        ],
        async () => {
          if (spacesToImport.length) {
            await db.spaces.bulkPut(spacesToImport);
          }
          if (tabsToImport.length) {
            await db.tabs.bulkPut(tabsToImport);
          }
          if (sectionsToImport.length) {
            await db.resourceSections.bulkPut(sectionsToImport);
          }
          if (itemsToImport.length) {
            await db.resourceItems.bulkPut(itemsToImport);
          }
          if (notesToImport.length) {
            await db.notes.bulkPut(notesToImport);
          }
          if (tasksToImport.length) {
            await db.tasks.bulkPut(tasksToImport);
          }
        }
      );

      return {
        success: true,
        spacesCount: spacesToImport.length,
        message: `Successfully imported ${spacesToImport.length} spaces!`,
      };
    } catch (err: any) {
      return {
        success: false,
        spacesCount: 0,
        message: err?.message || 'Failed to import backup.',
      };
    }
  });
}

/**
 * Purges stale unsaved tabs from Dexie that are no longer open in any Chrome window
 */
export async function purgeStaleUnsavedTabs(): Promise<number> {
  try {
    const openTabs = await chrome.tabs.query({});
    const openChromeTabIds = new Set(
      openTabs.map((t) => t.id).filter((id): id is number => typeof id === 'number')
    );

    const unsavedSpaces = await db.spaces
      .filter((s) => !!s.isUnsaved)
      .toArray();
    const unsavedSpaceIds = [UNSAVED_SPACE_ID, ...unsavedSpaces.map((s) => s.id)];

    const unsavedTabs = await db.tabs
      .where('spaceId')
      .anyOf(unsavedSpaceIds)
      .toArray();

    const staleIds = unsavedTabs
      .filter((t) => !t.chromeTabId || !openChromeTabIds.has(t.chromeTabId))
      .map((t) => t.id);

    if (staleIds.length > 0) {
      await db.tabs.bulkDelete(staleIds);
    }

    return staleIds.length;
  } catch (err) {
    console.error('Failed to purge stale unsaved tabs:', err);
    return 0;
  }
}

/**
 * Immediately triggers memory saver tab suspension across all browser windows
 */
export async function suspendAllInactiveNow(): Promise<number> {
  try {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    let totalPurged = 0;
    for (const win of windows) {
      if (win.id) {
        await discardAllInactiveTabsInWindow(win.id);
        totalPurged++;
      }
    }
    return totalPurged;
  } catch (err) {
    console.error('Failed to suspend inactive tabs now:', err);
    return 0;
  }
}
