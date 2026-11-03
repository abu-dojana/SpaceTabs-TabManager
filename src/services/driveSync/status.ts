import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { type DriveSyncInfo, type SyncStatus } from './types';
import { getGoogleProfile, getCloudSyncSettings, getSyncMeta } from './storage';

type StatusCallback = (info: DriveSyncInfo) => void;
const statusListeners = new Set<StatusCallback>();

let currentStatus: SyncStatus = 'idle';
let currentError: string | null = null;

/**
 * Returns complete live status info for UI rendering
 */
export async function getDriveSyncInfo(): Promise<DriveSyncInfo> {
  const profile = await getGoogleProfile();
  const settings = await getCloudSyncSettings();
  const meta = await getSyncMeta();

  let itemStats: DriveSyncInfo['itemStats'] = undefined;
  try {
    const allSpaces = await db.spaces.toArray();
    const localOnlyIds = new Set<string>([
      UNSAVED_SPACE_ID,
      ...allSpaces.filter((s) => !!s.isUnsaved).map((s) => s.id),
    ]);
    const savedSpacesCount = allSpaces.filter((s) => !s.isUnsaved).length;
    const [allTabs, allNotes, allTasks, allSections, allResources] = await Promise.all([
      db.tabs.toArray(),
      db.notes.toArray(),
      db.tasks.toArray(),
      db.resourceSections.toArray(),
      db.resourceItems.toArray(),
    ]);
    const syncableSectionIds = new Set(
      allSections.filter((s) => !localOnlyIds.has(s.spaceId)).map((s) => s.id)
    );
    itemStats = {
      spaces: savedSpacesCount,
      tabs: allTabs.filter((t) => !localOnlyIds.has(t.spaceId)).length,
      notes: allNotes.filter((n) => !localOnlyIds.has(n.spaceId)).length,
      tasks: allTasks.filter((t) => !localOnlyIds.has(t.spaceId)).length,
      resources: allResources.filter((r) => syncableSectionIds.has(r.sectionId)).length,
    };
  } catch {
    // DB might be temporarily closed
  }

  return {
    status: profile ? currentStatus : 'idle',
    lastSyncTime: meta.lastSyncTime,
    lastSyncError: currentError || meta.lastError || null,
    folderId: meta.folderId,
    fileId: meta.fileId,
    folderUrl:
      meta.folderUrl ||
      (meta.folderId ? `https://drive.google.com/drive/folders/${meta.folderId}` : undefined),
    profile,
    settings,
    itemStats,
  };
}

export function subscribeSyncStatus(cb: StatusCallback): () => void {
  statusListeners.add(cb);
  getDriveSyncInfo().then(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

export function setSyncStatus(status: SyncStatus, error: string | null = null): void {
  currentStatus = status;
  currentError = error;
  notifyStatusChange();
}

export function resetSyncStatus(): void {
  currentStatus = 'idle';
  currentError = null;
  notifyStatusChange();
}

export async function notifyStatusChange(): Promise<void> {
  const info = await getDriveSyncInfo();
  for (const listener of statusListeners) {
    try {
      listener(info);
    } catch (e) {
      console.warn('Sync status listener error:', e);
    }
  }
}
