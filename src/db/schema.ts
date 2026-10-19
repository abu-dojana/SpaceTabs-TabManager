// ==========================================
// DATABASE ENTITY SCHEMAS (Dexie.js)
// All entity tables include `updatedAt` for
// per-record conflict resolution during sync.
// ==========================================

export const UNSAVED_SPACE_ID = '__unsaved__';

export interface Space {
  id: string;                     // UUID (primary key)
  name: string;                   // e.g. "Power BI", "Audiobook"
  icon?: string;                  // Emoji or icon name
  color?: string;                 // UI accent color
  description?: string;           // Optional description / purpose
  section?: string;               // Optional custom section name (e.g. "Business", "Personal")
  createdAt: number;              // Unix timestamp ms
  updatedAt: number;              // Unix timestamp ms — used for sync conflict resolution
  order: number;                  // Sidebar display order
  isArchived: boolean;            // Soft-delete / archive
}

export interface Tab {
  id: string;                     // UUID (primary key)
  chromeTabId?: number;           // Runtime: Chrome's native integer tabId for O(1) event lookups
  spaceId: string;                // FK -> spaces.id, or UNSAVED_SPACE_ID ('__unsaved__')
  windowId?: number;              // Runtime: which Chrome window this tab is currently in
  url: string;
  title: string;
  favIconUrl?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface ResourceSection {
  id: string;
  spaceId: string;                // FK -> spaces.id
  title: string;                  // e.g. "Docs & Spreadsheets"
  order: number;
  updatedAt: number;
}

export interface ResourceItem {
  id: string;
  sectionId: string;              // FK -> resource_sections.id
  title: string;
  url: string;
  favIconUrl?: string;
  type: 'link' | 'doc' | 'sheet' | 'custom';
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  spaceId: string;                // FK -> spaces.id
  title: string;
  content: string;                // Markdown
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  spaceId: string;                // FK -> spaces.id
  text: string;
  completed: boolean;
  order: number;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// TRANSIENT RUNTIME STATE (chrome.storage.session)
// Survives service worker restarts.
// Cleared when browser closes.
// ==========================================

export interface WindowBinding {
  windowId: number;
  activeSpaceId: string | null;   // Which space is "active" in this window
  isTransitioning: boolean;       // Transition lock for batch operations
}

// ==========================================
// SYNC STATE (chrome.storage.local)
// ==========================================

export interface SyncState {
  needsSync: boolean;             // Dirty flag: true if local changes haven't been pushed
  lastPushTimestamp: number;      // When we last successfully pushed to Drive
  lastPullTimestamp: number;      // When we last successfully pulled from Drive
  retryCount: number;             // Current backoff retry count
  cachedFolderId?: string;        // Canonical Google Drive folder ID
  cachedFileId?: string;          // Canonical data.json file ID
}

// ==========================================
// GOOGLE DRIVE SYNC PAYLOAD & TOMBSTONES
// ==========================================

export interface Tombstone {
  id: string;                     // ID of deleted entity
  table: 'spaces' | 'tabs' | 'resource_sections' | 'resource_items' | 'notes' | 'tasks';
  deletedAt: number;              // Unix timestamp ms
}

export interface SyncManifest {
  appVersion: string;
  lastSyncTimestamp: number;
  deviceId: string;
  checksum: string;
}

export interface DriveDataExport {
  exportedAt: number;
  spaces: Space[];
  tabs: Tab[];                    // Only saved tabs (spaceId !== null)
  resourceSections: ResourceSection[];
  resourceItems: ResourceItem[];
  notes: Note[];
  tasks: Task[];
  deletedIds: Tombstone[];        // Tombstones pruned after 30 days
}
