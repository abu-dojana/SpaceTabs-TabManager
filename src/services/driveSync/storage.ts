import { type Tombstone } from '@/db/schema';
import {
  type GoogleUserProfile,
  type CloudSyncSettings,
  DEFAULT_SYNC_SETTINGS,
  STORAGE_KEY_PROFILE,
  STORAGE_KEY_TOKEN,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_META,
  STORAGE_KEY_TOMBSTONES,
} from './types';
import { notifyStatusChange } from './status';

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let tombstoneWriteQueue: Promise<void> = Promise.resolve();

/**
 * Records a tombstone when a space, tab, note, task, or resource is deleted.
 * Prevents resurrected records when merging with multi-device cloud backups.
 */
export async function recordTombstone(
  id: string,
  table: Tombstone['table']
): Promise<void> {
  return recordTombstones([{ id, table }]);
}

/**
 * Records multiple tombstones in a single batch (e.g. deleting a space and all its child tabs)
 * Serialized through an in-memory queue to prevent read-modify-write races on rapid deletions.
 */
export async function recordTombstones(
  tombstones: { id: string; table: Tombstone['table'] }[]
): Promise<void> {
  if (!tombstones.length) return;
  const nextTask = tombstoneWriteQueue.then(async () => {
    try {
      const list = await getTombstones();
      const now = Date.now();
      const map = new Map<string, Tombstone>();
      for (const t of list) map.set(t.id, t);
      for (const t of tombstones) {
        map.set(t.id, { id: t.id, table: t.table, deletedAt: now });
      }

      const thirtyDaysAgo = now - TOMBSTONE_RETENTION_MS;
      const pruned = Array.from(map.values()).filter((t) => t.deletedAt > thirtyDaysAgo);

      await chrome.storage.local.set({ [STORAGE_KEY_TOMBSTONES]: pruned });
    } catch (err) {
      console.warn('Failed to record bulk tombstones:', err);
    }
  });
  tombstoneWriteQueue = nextTask.catch(() => {});
  return nextTask;
}

export async function getTombstones(): Promise<Tombstone[]> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY_TOMBSTONES);
    return Array.isArray(res[STORAGE_KEY_TOMBSTONES]) ? res[STORAGE_KEY_TOMBSTONES] : [];
  } catch {
    return [];
  }
}

export async function setTombstones(tombstones: Tombstone[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_TOMBSTONES]: tombstones });
}

export async function getGoogleProfile(): Promise<GoogleUserProfile | null> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY_PROFILE);
    return res[STORAGE_KEY_PROFILE] || null;
  } catch {
    return null;
  }
}

export async function setGoogleProfile(profile: GoogleUserProfile | null): Promise<void> {
  try {
    if (profile) {
      await chrome.storage.local.set({ [STORAGE_KEY_PROFILE]: profile });
    } else {
      await chrome.storage.local.remove([STORAGE_KEY_PROFILE, STORAGE_KEY_TOKEN]);
    }
    notifyStatusChange();
  } catch (err) {
    console.error('Failed to set Google profile:', err);
  }
}

export async function getCloudSyncSettings(): Promise<CloudSyncSettings> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
    return { ...DEFAULT_SYNC_SETTINGS, ...(res[STORAGE_KEY_SETTINGS] || {}) };
  } catch {
    return DEFAULT_SYNC_SETTINGS;
  }
}

export async function updateCloudSyncSettings(
  partial: Partial<CloudSyncSettings>
): Promise<CloudSyncSettings> {
  const current = await getCloudSyncSettings();
  const updated: CloudSyncSettings = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: updated });
  notifyStatusChange();
  return updated;
}

export async function getSyncMeta(): Promise<{
  lastSyncTime: number | null;
  folderId?: string;
  fileId?: string;
  folderUrl?: string;
  lastError?: string | null;
}> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY_META);
    return res[STORAGE_KEY_META] || { lastSyncTime: null, lastError: null };
  } catch {
    return { lastSyncTime: null, lastError: null };
  }
}

export async function updateSyncMeta(meta: {
  lastSyncTime?: number | null;
  folderId?: string;
  fileId?: string;
  folderUrl?: string;
  lastError?: string | null;
}): Promise<void> {
  const current = await getSyncMeta();
  const updated = { ...current, ...meta };
  await chrome.storage.local.set({ [STORAGE_KEY_META]: updated });
  notifyStatusChange();
}
