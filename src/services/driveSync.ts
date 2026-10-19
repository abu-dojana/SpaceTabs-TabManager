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

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  connectedAt: number;
}

export interface CloudSyncSettings {
  enabled: boolean;
  autoSync: boolean;
  syncIntervalMinutes: number; // e.g. 15, 30, 60
  syncOnStartup: boolean;
  customClientId?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface DriveSyncInfo {
  status: SyncStatus;
  lastSyncTime: number | null;
  lastSyncError: string | null;
  folderId?: string;
  fileId?: string;
  folderUrl?: string;
  profile: GoogleUserProfile | null;
  settings: CloudSyncSettings;
  itemStats?: {
    spaces: number;
    tabs: number;
    notes: number;
    tasks: number;
    resources: number;
  };
}

export const DEFAULT_SYNC_SETTINGS: CloudSyncSettings = {
  enabled: false,
  autoSync: true,
  syncIntervalMinutes: 15,
  syncOnStartup: true,
  customClientId: '',
};

const STORAGE_KEY_PROFILE = 'spacetabs_google_profile';
const STORAGE_KEY_TOKEN = 'spacetabs_google_token';
const STORAGE_KEY_SETTINGS = 'spacetabs_sync_settings';
const STORAGE_KEY_META = 'spacetabs_sync_meta';
const STORAGE_KEY_TOMBSTONES = 'spacetabs_tombstones';

// In-memory status listener callbacks
type StatusCallback = (info: DriveSyncInfo) => void;
const statusListeners = new Set<StatusCallback>();

let currentStatus: SyncStatus = 'idle';
let currentError: string | null = null;

// ==========================================
// TOMBSTONE SYSTEM (Soft-delete tracker)
// ==========================================

/**
 * Records a tombstone when a space, tab, note, task, or resource is deleted.
 * Prevents resurrected records when merging with multi-device cloud backups.
 */
export async function recordTombstone(
  id: string,
  table: Tombstone['table']
): Promise<void> {
  try {
    const list = await getTombstones();
    const existing = list.findIndex((t) => t.id === id);
    const item: Tombstone = { id, table, deletedAt: Date.now() };

    if (existing >= 0) {
      list[existing] = item;
    } else {
      list.push(item);
    }

    // Keep only tombstones from last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const pruned = list.filter((t) => t.deletedAt > thirtyDaysAgo);

    await chrome.storage.local.set({ [STORAGE_KEY_TOMBSTONES]: pruned });
  } catch (err) {
    console.warn('Failed to record tombstone:', err);
  }
}

/**
 * Records multiple tombstones in a single batch (e.g. deleting a space and all its child tabs)
 */
export async function recordTombstones(
  tombstones: { id: string; table: Tombstone['table'] }[]
): Promise<void> {
  if (!tombstones.length) return;
  try {
    const list = await getTombstones();
    const now = Date.now();
    const map = new Map<string, Tombstone>();
    for (const t of list) map.set(t.id, t);
    for (const t of tombstones) {
      map.set(t.id, { id: t.id, table: t.table, deletedAt: now });
    }

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const pruned = Array.from(map.values()).filter((t) => t.deletedAt > thirtyDaysAgo);

    await chrome.storage.local.set({ [STORAGE_KEY_TOMBSTONES]: pruned });
  } catch (err) {
    console.warn('Failed to record bulk tombstones:', err);
  }
}

export async function getTombstones(): Promise<Tombstone[]> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY_TOMBSTONES);
    return Array.isArray(res[STORAGE_KEY_TOMBSTONES]) ? res[STORAGE_KEY_TOMBSTONES] : [];
  } catch {
    return [];
  }
}

// ==========================================
// CONFIGURATION & PROFILE ACCESSORS
// ==========================================

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

/**
 * Returns complete live status info for UI rendering
 */
export async function getDriveSyncInfo(): Promise<DriveSyncInfo> {
  const profile = await getGoogleProfile();
  const settings = await getCloudSyncSettings();
  const meta = await getSyncMeta();

  let itemStats: DriveSyncInfo['itemStats'] = undefined;
  try {
    const [spaces, tabs, notes, tasks, resources] = await Promise.all([
      db.spaces.count(),
      db.tabs.where('spaceId').notEqual(UNSAVED_SPACE_ID).count(),
      db.notes.count(),
      db.tasks.count(),
      db.resourceItems.count(),
    ]);
    itemStats = { spaces, tabs, notes, tasks, resources };
  } catch {
    // DB might be temporarily closed
  }

  return {
    status: profile ? currentStatus : 'idle',
    lastSyncTime: meta.lastSyncTime,
    lastSyncError: currentError || meta.lastError || null,
    folderId: meta.folderId,
    fileId: meta.fileId,
    folderUrl: meta.folderUrl || (meta.folderId ? `https://drive.google.com/drive/folders/${meta.folderId}` : undefined),
    profile,
    settings,
    itemStats,
  };
}

// ==========================================
// STATUS SUBSCRIPTION
// ==========================================

export function subscribeSyncStatus(cb: StatusCallback): () => void {
  statusListeners.add(cb);
  getDriveSyncInfo().then(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

function setSyncStatus(status: SyncStatus, error: string | null = null) {
  currentStatus = status;
  currentError = error;
  notifyStatusChange();
}

async function notifyStatusChange() {
  const info = await getDriveSyncInfo();
  for (const listener of statusListeners) {
    try {
      listener(info);
    } catch (e) {
      console.warn('Sync status listener error:', e);
    }
  }
}

// ==========================================
// AUTHENTICATION & GOOGLE ACCOUNT
// ==========================================

/**
 * Requests an access token from Chrome Identity API.
 * Handles custom client ID fallback and token caching.
 */
async function getAuthToken(interactive = true): Promise<string> {
  const settings = await getCloudSyncSettings();

  // If user provided custom Google OAuth Client ID, initiate web auth flow
  if (settings.customClientId && settings.customClientId.trim().length > 0) {
    return launchCustomOAuthFlow(settings.customClientId.trim(), interactive);
  }

  // Standard Chrome MV3 getAuthToken
  return new Promise((resolve, reject) => {
    if (!chrome?.identity?.getAuthToken) {
      return reject(new Error('chrome.identity API is not available in this environment.'));
    }

    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message || 'Failed to authenticate with Google'));
      }
      if (!token) {
        return reject(new Error('No OAuth token returned from Google'));
      }
      resolve(token);
    });
  });
}

/**
 * WebAuthFlow for custom client IDs in unpacked extensions
 */
async function launchCustomOAuthFlow(clientId: string, interactive: boolean): Promise<string> {
  const redirectUri = chrome.identity.getRedirectURL();
  const scopes = encodeURIComponent(
    'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
  );
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message || 'OAuth WebFlow error'));
      }
      if (!redirectUrl) {
        return reject(new Error('OAuth flow was cancelled or returned empty URL'));
      }
      try {
        const url = new URL(redirectUrl);
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        if (token) {
          resolve(token);
        } else {
          reject(new Error('No access_token found in OAuth redirect callback'));
        }
      } catch (err: any) {
        reject(new Error(`Failed to parse OAuth redirect URL: ${err.message}`));
      }
    });
  });
}

/**
 * Signs in with Google account and stores profile
 */
export async function signInWithGoogle(
  interactive = true
): Promise<{ success: boolean; profile?: GoogleUserProfile; error?: string }> {
  try {
    setSyncStatus('syncing');
    const token = await getAuthToken(interactive);

    let profile: GoogleUserProfile = {
      id: 'google_user',
      email: 'Google Account',
      name: 'Google User',
      connectedAt: Date.now(),
    };

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        profile = {
          id: data.id || profile.id,
          email: data.email || profile.email,
          name: data.name || data.email?.split('@')[0] || profile.name,
          picture: data.picture,
          connectedAt: Date.now(),
        };
      }
    } catch (e) {
      console.warn('Could not fetch userinfo, using fallback profile info:', e);
    }

    await setGoogleProfile(profile);
    await updateCloudSyncSettings({ enabled: true });
    await chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token });
    setSyncStatus('synced');

    // Trigger initial sync to create SpaceTabs_Data folder immediately
    syncNow().catch((e) => console.warn('Initial Drive sync error:', e));

    return { success: true, profile };
  } catch (err: any) {
    const errorMsg = err?.message || 'Google sign-in failed';
    setSyncStatus('error', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Signs out and disconnects Google Drive sync
 */
export async function signOutGoogle(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
    const token = stored[STORAGE_KEY_TOKEN];
    if (token && chrome?.identity?.removeCachedAuthToken) {
      try {
        await new Promise<void>((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, () => resolve());
        });
      } catch {
        // Ignored
      }
    }
  } catch {}

  await setGoogleProfile(null);
  await updateCloudSyncSettings({ enabled: false });
  await updateSyncMeta({ lastError: null });
  await chrome.storage.local.remove(['spacetabs_mock_drive_data']);
  currentStatus = 'idle';
  currentError = null;
  notifyStatusChange();
}

// ==========================================
// GOOGLE DRIVE REST API v3 ENGINE
// ==========================================

const DRIVE_FOLDER_NAME = 'SpaceTabs_Data';
const DATA_FILE_NAME = 'data.json';

/**
 * Ensures the dedicated `SpaceTabs_Data` folder exists in Google Drive
 */
async function ensureDriveFolder(
  token: string
): Promise<{ folderId: string; folderUrl: string }> {
  // 1. Search for existing folder
  const query = encodeURIComponent(
    `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    throw new Error(`Failed to locate Drive folder: HTTP ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    const folderUrl =
      existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`;
    return { folderId: existing.id, folderUrl };
  }

  // 2. Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dedicated SpaceTabs workspace cloud sync folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create Drive folder: HTTP ${createRes.status}`);
  }

  const created = await createRes.json();
  const folderUrl = `https://drive.google.com/drive/folders/${created.id}`;
  return { folderId: created.id, folderUrl };
}

/**
 * Finds the `data.json` file inside the `SpaceTabs_Data` folder
 */
async function findDataFile(
  token: string,
  folderId: string
): Promise<{ fileId: string; modifiedTime?: string } | null> {
  const query = encodeURIComponent(
    `name = '${DATA_FILE_NAME}' and '${folderId}' in parents and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to check Drive data.json: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { fileId: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
  }
  return null;
}

/**
 * Downloads and parses `data.json` content from Google Drive
 */
async function downloadRemoteData(token: string, fileId: string): Promise<DriveDataExport> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download data.json: HTTP ${res.status}`);
  }

  return (await res.json()) as DriveDataExport;
}

/**
 * Uploads `DriveDataExport` to Google Drive (updates existing file or creates new multipart file)
 */
async function uploadDataToDrive(
  token: string,
  folderId: string,
  fileId: string | null,
  payload: DriveDataExport
): Promise<{ fileId: string }> {
  const jsonContent = JSON.stringify(payload, null, 2);

  if (fileId) {
    // Direct PATCH media upload
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      throw new Error(`Failed to update data.json: HTTP ${res.status}`);
    }

    const data = await res.json();
    return { fileId: data.id || fileId };
  } else {
    // Multipart POST to create file in folder
    const boundary = '-------SpaceTabsMultipartBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: DATA_FILE_NAME,
      parents: [folderId],
      mimeType: 'application/json',
      description: 'SpaceTabs workspace synchronized backup file',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      throw new Error(`Failed to create data.json in Drive: HTTP ${res.status}`);
    }

    const created = await res.json();
    return { fileId: created.id };
  }
}

// ==========================================
// LOCAL EXPORT BUILDER & MERGE LOGIC
// ==========================================

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

  return {
    exportedAt: Date.now(),
    spaces,
    tabs,
    resourceSections,
    resourceItems,
    notes,
    tasks,
    deletedIds,
  };
}

/**
 * Bi-directional conflict resolution and multi-device merge engine.
 * Respects tombstones (soft-deletes) and updatedAt timestamps.
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

  // Prune tombstones older than 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const mergedTombstones = Array.from(tombstoneMap.values()).filter(
    (t) => t.deletedAt > thirtyDaysAgo
  );
  const deletedSet = new Set(mergedTombstones.map((t) => t.id));

  // 2. Merge Spaces
  const spaceMap = new Map<string, Space>();
  for (const s of local.spaces || []) {
    if (!deletedSet.has(s.id)) spaceMap.set(s.id, s);
  }
  for (const s of remote.spaces || []) {
    if (deletedSet.has(s.id)) continue;
    const existing = spaceMap.get(s.id);
    if (!existing || s.updatedAt > existing.updatedAt) {
      spaceMap.set(s.id, s);
    }
  }
  const mergedSpaces = Array.from(spaceMap.values());
  const validSpaceIds = new Set(mergedSpaces.map((s) => s.id));

  // 3. Merge Saved Tabs
  const tabMap = new Map<string, Tab>();
  for (const t of local.tabs || []) {
    if (t.spaceId !== UNSAVED_SPACE_ID && !deletedSet.has(t.id) && validSpaceIds.has(t.spaceId)) {
      tabMap.set(t.id, t);
    }
  }
  for (const t of remote.tabs || []) {
    if (t.spaceId !== UNSAVED_SPACE_ID && !deletedSet.has(t.id) && validSpaceIds.has(t.spaceId)) {
      const existing = tabMap.get(t.id);
      if (!existing || t.updatedAt > existing.updatedAt) {
        tabMap.set(t.id, t);
      }
    }
  }
  const mergedTabs = Array.from(tabMap.values());

  // 4. Merge Resource Sections
  const secMap = new Map<string, ResourceSection>();
  for (const sec of local.resourceSections || []) {
    if (!deletedSet.has(sec.id) && validSpaceIds.has(sec.spaceId)) {
      secMap.set(sec.id, sec);
    }
  }
  for (const sec of remote.resourceSections || []) {
    if (!deletedSet.has(sec.id) && validSpaceIds.has(sec.spaceId)) {
      const existing = secMap.get(sec.id);
      if (!existing || sec.updatedAt > existing.updatedAt) {
        secMap.set(sec.id, sec);
      }
    }
  }
  const mergedSections = Array.from(secMap.values());
  const validSectionIds = new Set(mergedSections.map((s) => s.id));

  // 5. Merge Resource Items
  const itemMap = new Map<string, ResourceItem>();
  for (const item of local.resourceItems || []) {
    if (!deletedSet.has(item.id) && validSectionIds.has(item.sectionId)) {
      itemMap.set(item.id, item);
    }
  }
  for (const item of remote.resourceItems || []) {
    if (!deletedSet.has(item.id) && validSectionIds.has(item.sectionId)) {
      const existing = itemMap.get(item.id);
      if (!existing || item.updatedAt > existing.updatedAt) {
        itemMap.set(item.id, item);
      }
    }
  }
  const mergedItems = Array.from(itemMap.values());

  // 6. Merge Notes
  const noteMap = new Map<string, Note>();
  for (const n of local.notes || []) {
    if (!deletedSet.has(n.id) && validSpaceIds.has(n.spaceId)) {
      noteMap.set(n.id, n);
    }
  }
  for (const n of remote.notes || []) {
    if (!deletedSet.has(n.id) && validSpaceIds.has(n.spaceId)) {
      const existing = noteMap.get(n.id);
      if (!existing || n.updatedAt > existing.updatedAt) {
        noteMap.set(n.id, n);
      }
    }
  }
  const mergedNotes = Array.from(noteMap.values());

  // 7. Merge Tasks
  const taskMap = new Map<string, Task>();
  for (const t of local.tasks || []) {
    if (!deletedSet.has(t.id) && validSpaceIds.has(t.spaceId)) {
      taskMap.set(t.id, t);
    }
  }
  for (const t of remote.tasks || []) {
    if (!deletedSet.has(t.id) && validSpaceIds.has(t.spaceId)) {
      const existing = taskMap.get(t.id);
      if (!existing || t.updatedAt > existing.updatedAt) {
        taskMap.set(t.id, t);
      }
    }
  }
  const mergedTasks = Array.from(taskMap.values());

  // 8. Commit Merged Data to Local Dexie
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
      // Spaces
      if (mergedSpaces.length > 0) await db.spaces.bulkPut(mergedSpaces);
      const currentSpaces = await db.spaces.toArray();
      const spacesToDelete = currentSpaces
        .filter((s) => !spaceMap.has(s.id) || deletedSet.has(s.id))
        .map((s) => s.id);
      if (spacesToDelete.length > 0) await db.spaces.bulkDelete(spacesToDelete);

      // Saved Tabs
      if (mergedTabs.length > 0) await db.tabs.bulkPut(mergedTabs);
      const currentSavedTabs = await db.tabs
        .where('spaceId')
        .notEqual(UNSAVED_SPACE_ID)
        .toArray();
      const tabsToDelete = currentSavedTabs
        .filter((t) => !tabMap.has(t.id) || deletedSet.has(t.id))
        .map((t) => t.id);
      if (tabsToDelete.length > 0) await db.tabs.bulkDelete(tabsToDelete);

      // Resources
      if (mergedSections.length > 0) await db.resourceSections.bulkPut(mergedSections);
      const currentSections = await db.resourceSections.toArray();
      const sectionsToDelete = currentSections
        .filter((s) => !secMap.has(s.id) || deletedSet.has(s.id))
        .map((s) => s.id);
      if (sectionsToDelete.length > 0) await db.resourceSections.bulkDelete(sectionsToDelete);

      if (mergedItems.length > 0) await db.resourceItems.bulkPut(mergedItems);
      const currentItems = await db.resourceItems.toArray();
      const itemsToDelete = currentItems
        .filter((i) => !itemMap.has(i.id) || deletedSet.has(i.id))
        .map((i) => i.id);
      if (itemsToDelete.length > 0) await db.resourceItems.bulkDelete(itemsToDelete);

      // Notes
      if (mergedNotes.length > 0) await db.notes.bulkPut(mergedNotes);
      const currentNotes = await db.notes.toArray();
      const notesToDelete = currentNotes
        .filter((n) => !noteMap.has(n.id) || deletedSet.has(n.id))
        .map((n) => n.id);
      if (notesToDelete.length > 0) await db.notes.bulkDelete(notesToDelete);

      // Tasks
      if (mergedTasks.length > 0) await db.tasks.bulkPut(mergedTasks);
      const currentTasks = await db.tasks.toArray();
      const tasksToDelete = currentTasks
        .filter((t) => !taskMap.has(t.id) || deletedSet.has(t.id))
        .map((t) => t.id);
      if (tasksToDelete.length > 0) await db.tasks.bulkDelete(tasksToDelete);
    }
  );

  // Save merged tombstones
  await chrome.storage.local.set({ [STORAGE_KEY_TOMBSTONES]: mergedTombstones });

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

// ==========================================
// CORE SYNC ACTIONS (SYNC NOW, PUSH, PULL)
// ==========================================

/**
 * Bi-directional Sync:
 * Pulls remote changes from Google Drive, merges locally, and pushes back the merged state.
 */
export async function syncNow(): Promise<{
  success: boolean;
  message: string;
  stats?: { spaces: number; tabs: number; notes: number; tasks: number; resources: number };
}> {
  const profile = await getGoogleProfile();
  if (!profile) {
    return { success: false, message: 'Google account is not connected.' };
  }

  setSyncStatus('syncing');

  try {
    const localData = await buildLocalExport();

    // REAL GOOGLE DRIVE REST API FLOW
    const token = await getAuthToken(false);
    const { folderId, folderUrl } = await ensureDriveFolder(token);
    const existingFile = await findDataFile(token, folderId);

    let mergedPayload = localData;

    if (existingFile) {
      try {
        const remoteData = await downloadRemoteData(token, existingFile.fileId);
        mergedPayload = await mergeRemoteAndLocal(remoteData, localData);
      } catch (pullErr: any) {
        console.warn('Could not read existing remote data, proceeding with local push:', pullErr);
      }
    }

    // Push merged state to Drive
    const uploadRes = await uploadDataToDrive(
      token,
      folderId,
      existingFile?.fileId || null,
      mergedPayload
    );

    const now = Date.now();
    await updateSyncMeta({
      lastSyncTime: now,
      folderId,
      fileId: uploadRes.fileId,
      folderUrl,
      lastError: null,
    });

    setSyncStatus('synced');
    return {
      success: true,
      message: 'Synced successfully with Google Drive!',
      stats: {
        spaces: mergedPayload.spaces.length,
        tabs: mergedPayload.tabs.length,
        notes: mergedPayload.notes.length,
        tasks: mergedPayload.tasks.length,
        resources: mergedPayload.resourceItems.length,
      },
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Sync failed';
    setSyncStatus('error', errorMsg);
    await updateSyncMeta({ lastError: errorMsg });
    return { success: false, message: errorMsg };
  }
}

/**
 * Force Push: Overwrites Google Drive data with current local workspace state
 */
export async function forcePushToDrive(): Promise<{ success: boolean; message: string }> {
  const profile = await getGoogleProfile();
  if (!profile) return { success: false, message: 'Google account is not connected.' };

  setSyncStatus('syncing');

  try {
    const localData = await buildLocalExport();

    const token = await getAuthToken(false);
    const { folderId, folderUrl } = await ensureDriveFolder(token);
    const existingFile = await findDataFile(token, folderId);

    const uploadRes = await uploadDataToDrive(
      token,
      folderId,
      existingFile?.fileId || null,
      localData
    );

    await updateSyncMeta({
      lastSyncTime: Date.now(),
      folderId,
      fileId: uploadRes.fileId,
      folderUrl,
      lastError: null,
    });

    setSyncStatus('synced');
    return { success: true, message: 'Workspace data uploaded to Google Drive!' };
  } catch (err: any) {
    const msg = err?.message || 'Failed to upload to Drive';
    setSyncStatus('error', msg);
    return { success: false, message: msg };
  }
}

/**
 * Force Pull: Overwrites local Dexie workspace with Google Drive backup
 */
export async function forcePullFromDrive(): Promise<{ success: boolean; message: string }> {
  const profile = await getGoogleProfile();
  if (!profile) return { success: false, message: 'Google account is not connected.' };

  setSyncStatus('syncing');

  try {
    const token = await getAuthToken(false);
    const meta = await getSyncMeta();
    let fileId = meta.fileId;

    if (!fileId) {
      const { folderId } = await ensureDriveFolder(token);
      const existing = await findDataFile(token, folderId);
      fileId = existing?.fileId;
    }

    if (!fileId) {
      throw new Error('No backup file found in your Google Drive folder.');
    }

    const remoteData: DriveDataExport = await downloadRemoteData(token, fileId);

    if (!remoteData || !Array.isArray(remoteData.spaces)) {
      throw new Error('Remote backup file is empty or invalid.');
    }

    // Replace local saved tables (preserve unsaved tabs)
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
        await db.spaces.clear();
        await db.tabs.where('spaceId').notEqual(UNSAVED_SPACE_ID).delete();
        await db.resourceSections.clear();
        await db.resourceItems.clear();
        await db.notes.clear();
        await db.tasks.clear();

        if (remoteData?.spaces?.length) await db.spaces.bulkPut(remoteData.spaces);
        if (remoteData?.tabs?.length) {
          const savedTabs = remoteData.tabs.filter((t) => t.spaceId !== UNSAVED_SPACE_ID);
          if (savedTabs.length > 0) await db.tabs.bulkPut(savedTabs);
        }
        if (remoteData?.resourceSections?.length) {
          await db.resourceSections.bulkPut(remoteData.resourceSections);
        }
        if (remoteData?.resourceItems?.length) {
          await db.resourceItems.bulkPut(remoteData.resourceItems);
        }
        if (remoteData?.notes?.length) await db.notes.bulkPut(remoteData.notes);
        if (remoteData?.tasks?.length) await db.tasks.bulkPut(remoteData.tasks);
      }
    );

    await updateSyncMeta({ lastSyncTime: Date.now(), lastError: null });
    setSyncStatus('synced');
    return {
      success: true,
      message: `Restored ${remoteData.spaces.length} spaces from Google Drive!`,
    };
  } catch (err: any) {
    const msg = err?.message || 'Failed to pull from Drive';
    setSyncStatus('error', msg);
    return { success: false, message: msg };
  }
}

// ==========================================
// BACKGROUND SYNC ALARM SETUP
// ==========================================

export const DRIVE_SYNC_ALARM = 'spacetabs-drive-sync-alarm';

export async function setupDriveSyncAlarm(intervalMinutes = 15): Promise<void> {
  if (!chrome?.alarms) return;
  try {
    await chrome.alarms.clear(DRIVE_SYNC_ALARM);
    const settings = await getCloudSyncSettings();
    const profile = await getGoogleProfile();

    if (settings.enabled && settings.autoSync && profile) {
      chrome.alarms.create(DRIVE_SYNC_ALARM, {
        periodInMinutes: Math.max(5, intervalMinutes),
        delayInMinutes: 2,
      });
    }
  } catch (err) {
    console.warn('Failed to configure drive sync alarm:', err);
  }
}
