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

export type DarkPalette = 'slate' | 'midnight' | 'indigo' | 'forest' | 'espresso';
export type LightPalette = 'snow' | 'paper' | 'zinc' | 'sky' | 'mint';

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
  patreonUrl: 'https://www.patreon.com',
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
 * Exports all spaces, saved tabs, resources, notes, and tasks to a JSON file
 */
export async function exportAllSpacesBackup(): Promise<DriveDataExport> {
  const [spaces, tabs, resourceSections, resourceItems, notes, tasks] = await Promise.all([
    db.spaces.toArray(),
    db.tabs.where('spaceId').notEqual(UNSAVED_SPACE_ID).toArray(),
    db.resourceSections.toArray(),
    db.resourceItems.toArray(),
    db.notes.toArray(),
    db.tasks.toArray(),
  ]);

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
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `spacetabs-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return payload;
}

/**
 * Imports and restores all spaces and workspace data from a JSON backup file
 */
export async function importSpacesBackup(
  jsonText: string
): Promise<{ success: boolean; spacesCount: number; message: string }> {
  try {
    const data: Partial<DriveDataExport> = JSON.parse(jsonText);

    if (!data.spaces || !Array.isArray(data.spaces)) {
      throw new Error('Invalid backup file: missing spaces data array.');
    }

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
        if (data.spaces?.length) {
          await db.spaces.bulkPut(data.spaces);
        }
        if (data.tabs?.length) {
          // Never overwrite unsaved tabs during import
          const savedTabs = data.tabs.filter((t) => t.spaceId !== UNSAVED_SPACE_ID);
          if (savedTabs.length > 0) {
            await db.tabs.bulkPut(savedTabs);
          }
        }
        if (data.resourceSections?.length) {
          await db.resourceSections.bulkPut(data.resourceSections);
        }
        if (data.resourceItems?.length) {
          await db.resourceItems.bulkPut(data.resourceItems);
        }
        if (data.notes?.length) {
          await db.notes.bulkPut(data.notes);
        }
        if (data.tasks?.length) {
          await db.tasks.bulkPut(data.tasks);
        }
      }
    );

    return {
      success: true,
      spacesCount: data.spaces.length,
      message: `Successfully imported ${data.spaces.length} spaces!`,
    };
  } catch (err: any) {
    return {
      success: false,
      spacesCount: 0,
      message: err?.message || 'Failed to import backup.',
    };
  }
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

    const unsavedTabs = await db.tabs
      .where('spaceId')
      .equals(UNSAVED_SPACE_ID)
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
