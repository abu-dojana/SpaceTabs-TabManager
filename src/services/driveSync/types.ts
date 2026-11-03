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

export const STORAGE_KEY_PROFILE = 'spacetabs_google_profile';
export const STORAGE_KEY_TOKEN = 'spacetabs_google_token';
export const STORAGE_KEY_SETTINGS = 'spacetabs_sync_settings';
export const STORAGE_KEY_META = 'spacetabs_sync_meta';
export const STORAGE_KEY_TOMBSTONES = 'spacetabs_tombstones';
