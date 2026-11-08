import { db } from '@/db';
import { type DriveDataExport, UNSAVED_SPACE_ID } from '@/db/schema';
import { discardAllInactiveTabsInWindow } from './suspension';
import { decodeRealUrl } from '@/utils/urlFilter';
import { downloadFile } from '@/utils/download';
import { stripRuntimeTabFields } from './driveSync';
import { buildWorkspaceHtml, type ExportFormat } from './spaces/spaceExport';
import { importSpacesFromFile, type ImportResult } from './spaces/spaceImport';

export type DarkPalette = 'slate' | 'midnight' | 'obsidian' | 'indigo' | 'forest' | 'espresso' | 'purplespace';
export type LightPalette = 'snow' | 'paper' | 'zinc' | 'sky' | 'mint' | 'sakura' | 'serenity';

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
      const raw = { ...data[SETTINGS_STORAGE_KEY] };
      if ('nativeCleanUrlSuspension' in raw) {
        if (raw.nativeCleanUrlSuspension) {
          raw.discardOnSpaceSwitch = true;
        }
        delete raw.nativeCleanUrlSuspension;
        await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, ...raw } });
      }
      return { ...DEFAULT_SETTINGS, ...raw };
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
 * Exports all saved spaces, tabs, resources, notes, and tasks to a JSON or HTML file
 */
export async function exportAllSpacesBackup(
  format: ExportFormat = 'json'
): Promise<DriveDataExport> {
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

  const dateStr = new Date().toISOString().split('T')[0];
  if (format === 'html') {
    const htmlStr = buildWorkspaceHtml(payload);
    downloadFile(htmlStr, `spacetabs-backup-${dateStr}.html`, 'text/html;charset=utf-8');
  } else {
    const jsonStr = JSON.stringify(payload, null, 2);
    downloadFile(jsonStr, `spacetabs-backup-${dateStr}.json`, 'application/json;charset=utf-8');
  }

  return payload;
}

/**
 * Imports and restores spaces and workspace data from a JSON or HTML backup file
 */
export async function importSpacesBackup(
  fileText: string,
  fileName?: string
): Promise<ImportResult> {
  return importSpacesFromFile(fileText, fileName);
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

/**
 * Restores all currently open /suspended.html placeholder tabs across all windows
 * back to their original clean URLs (e.g., before disabling or removing the extension).
 */
export async function restoreAllSuspendedTabsToCleanUrls(): Promise<number> {
  try {
    const allTabs = await chrome.tabs.query({});
    let restoredCount = 0;

    for (const tab of allTabs) {
      if (!tab.id) continue;
      const rawUrl = tab.url || tab.pendingUrl || '';
      if (!rawUrl.includes('/suspended.html')) continue;

      const cleanUrl = decodeRealUrl(rawUrl);
      if (!cleanUrl || cleanUrl === rawUrl) continue;

      try {
        await chrome.tabs.update(tab.id, { url: cleanUrl });
        restoredCount++;
      } catch {
        // Tab may have been closed
      }
    }

    return restoredCount;
  } catch (err) {
    console.error('Failed to restore suspended tabs to clean URLs:', err);
    return 0;
  }
}
