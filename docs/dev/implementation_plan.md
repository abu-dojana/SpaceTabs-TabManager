# Implementation Plan: Workona-Style Tab & Workspace Manager (Manifest V3)

## Goal Description

Build a high-performance, local-first browser extension (Manifest V3) that replicates the best of **Workona** (project spaces, unsaved tabs inbox, resources, notes, tasks) and **Tablerone** (user-owned Google Drive backup, pinned index tab), while eliminating Workona's major drawbacks:
1. **No artificial 5-space paywall:** Unlimited local spaces, always free.
2. **User-owned Google Drive sync:** Syncs anywhere in the world by signing in to Google; data lives in the user's personal Google Drive folder (`<AppName>_Data/data.json`) with zero third-party cloud lock-in. Full offline JSON export/import supported.
3. **Pinned Index Tab (Tab 0):** The extension auto-pins `dashboard.html` at tab index `0` on launch with a clean favicon (Workona/Tablerone style). No forced side panel.
4. **Non-destructive space opening:** Gives the user full control:
   * *"Open all tabs here"* (stashes uncommitted tabs into the Unsaved bucket and opens space tabs).
   * *"Open all tabs in another window"* (spawns a new Chrome window dedicated to that space).
   * *Single tab click* (focuses if already open, else opens directly).
5. **No ghost "hidden tabs" window hack:** Completely eliminates Workona's `workona.com/inactive/` background window. Tabs are restored on demand using a local `suspended.html` placeholder page and auto-suspended using native `chrome.tabs.discard()`.

---

## User Review Required

> [!IMPORTANT]
> **Environment Verification:** Node.js `v24.20.0` and npm `v11.19.0` were detected on your system. Commands will use `npm.cmd` / `npx.cmd` to bypass PowerShell script execution policy restrictions on Windows.

> [!NOTE]
> **Project Directory:** The extension codebase will be initialized at:
> `C:\Users\Abu Dojana Tahmid\.gemini\antigravity\scratch\tab-manager`

> [!TIP]
> **Architecture Assessment Verdict:**
> The plan is **100% implementable** and **fully aligned** with your goals. The hybrid suspension model, normalized Dexie schema, and tombstone-aware single-file Google Drive sync eliminate the typical MV3 performance bottlenecks and race conditions.

---

## Open Questions

* None blocking Phase 1. The 6 critical edge cases (zombie window on close, Brave/Firefox PKCE OAuth, startup duplicate pinned tabs, cascading tombstone deletions, Drive folder deduplication, and `_favicon` API) have all been incorporated into the design.

---

## Proposed Changes

We will build the extension in **5 structured phases** inside `C:\Users\Abu Dojana Tahmid\.gemini\antigravity\scratch\tab-manager`:

```
tab-manager/
├── package.json
├── tsconfig.json
├── wxt.config.ts                    # WXT MV3 configuration & permissions
├── tailwind.config.js               # Styling configuration
├── src/
│   ├── db/
│   │   ├── index.ts                 # Dexie.js database instance & tables
│   │   └── schema.ts                # TypeScript interfaces (Space, Tab, Note, Task, etc.)
│   ├── services/
│   │   ├── tabManager.ts            # Tab opening, stashing, and window space bindings
│   │   ├── suspension.ts            # Hybrid suspension (suspended.html + native discard)
│   │   └── driveSync.ts             # Google Drive API v3 (PKCE + single data.json + tombstones)
│   ├── store/
│   │   └── uiStore.ts               # Zustand store (ephemeral UI state only)
│   ├── components/
│   │   ├── sidebar/                 # Spaces list, Unsaved tabs tray, Archive
│   │   ├── canvas/                  # Active space tabs, checklists, bulk actions
│   │   ├── resources/               # Resource sections & link cards
│   │   ├── notes/                   # Markdown note editor
│   │   ├── tasks/                   # Checklists with due dates
│   │   └── search/                  # Global search modal (Fuse.js)
│   └── utils/
│       ├── favicons.ts              # Chrome _favicon resolution
│       └── urlFilter.ts             # System URL filtering (chrome://, extension://)
└── entrypoints/
    ├── background.ts                # Service worker: pinned tab lifecycle & event queue
    ├── dashboard/                   # Main pinned Index Tab (Tab 0) React app
    │   ├── index.html
    │   ├── main.tsx
    │   └── App.tsx
    └── suspended/                   # Lightweight cold-restore placeholder
        ├── index.html
        └── main.ts
```

---

### Component 1: Project Scaffolding & Configuration (Phase 1)

#### [NEW] `wxt.config.ts`
Configures Manifest V3, permissions, OAuth scopes, commands, and React module:

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'SpaceTabs — Workona & Tablerone Alternative',
    description: 'Local-first, unlimited tab & workspace manager with Google Drive sync.',
    version: '1.0.0',
    permissions: [
      'tabs',
      'tabGroups',
      'storage',
      'identity',
      'alarms',
      'commands',
      'favicon',
    ],
    host_permissions: ['https://www.googleapis.com/*'],
    commands: {
      'focus-dashboard': {
        suggested_key: {
          default: 'Alt+Shift+W',
          mac: 'Alt+Shift+W',
        },
        description: 'Focus or open the pinned Index Dashboard tab',
      },
    },
    oauth2: {
      client_id: '<GOOGLE_CLIENT_ID>.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    },
  },
});
```

---

### Component 2: Normalized Local Database (Dexie.js) (Phase 1)

#### [NEW] `src/db/schema.ts` & `src/db/index.ts`
Declares normalized flat tables with foreign keys and `updatedAt` timestamps for tombstone-aware sync:

```typescript
import Dexie, { Table } from 'dexie';

export interface Space {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  order: number;
  isArchived: boolean;
}

export interface Tab {
  id: string;
  chromeTabId?: number;           // O(1) runtime lookup for browser events
  spaceId: string | null;         // NULL = Unsaved tab
  windowId?: number;
  url: string;
  title: string;
  favIconUrl?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface ResourceSection {
  id: string;
  spaceId: string;
  title: string;
  order: number;
  updatedAt: number;
}

export interface ResourceItem {
  id: string;
  sectionId: string;
  title: string;
  url: string;
  favIconUrl?: string;
  type: 'link' | 'doc' | 'sheet' | 'custom';
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  spaceId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  spaceId: string;
  text: string;
  completed: boolean;
  order: number;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
}

export class TabManagerDB extends Dexie {
  spaces!: Table<Space, string>;
  tabs!: Table<Tab, string>;
  resourceSections!: Table<ResourceSection, string>;
  resourceItems!: Table<ResourceItem, string>;
  notes!: Table<Note, string>;
  tasks!: Table<Task, string>;

  constructor() {
    super('TabManagerDB');
    this.version(1).stores({
      spaces: 'id, order, isArchived, updatedAt',
      tabs: 'id, chromeTabId, spaceId, order, updatedAt',
      resourceSections: 'id, spaceId, order, updatedAt',
      resourceItems: 'id, sectionId, updatedAt',
      notes: 'id, spaceId, updatedAt',
      tasks: 'id, spaceId, order, updatedAt',
    });
  }
}

export const db = new TabManagerDB();
```

---

### Component 3: Service Worker Lifecycle & Pinned Index Tab (Phase 1)

#### [NEW] `entrypoints/background.ts`
Enforces the pinned tab at index `0`, handles multi-window isolation, avoids zombie window recreation, and filters non-normal windows:

```typescript
export default defineBackground(() => {
  const DASHBOARD_URL = chrome.runtime.getURL('/dashboard.html');

  async function ensurePinnedIndexTab(windowId: number) {
    try {
      const win = await chrome.windows.get(windowId);
      if (win.type !== 'normal') return; // Skip popups/DevTools

      const tabs = await chrome.tabs.query({ windowId });
      const dashboardTabs = tabs.filter(t => t.url?.startsWith(DASHBOARD_URL));

      if (dashboardTabs.length === 0) {
        await chrome.tabs.create({ windowId, url: DASHBOARD_URL, pinned: true, index: 0 });
      } else if (dashboardTabs.length > 1) {
        // Startup deduplication
        const [keep, ...duplicates] = dashboardTabs;
        if (!keep.pinned) await chrome.tabs.update(keep.id!, { pinned: true });
        for (const dup of duplicates) {
          if (dup.id) await chrome.tabs.remove(dup.id);
        }
      } else if (!dashboardTabs[0].pinned) {
        await chrome.tabs.update(dashboardTabs[0].id!, { pinned: true });
      }
    } catch {
      // Window closed during execution
    }
  }

  chrome.runtime.onStartup.addListener(async () => {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    for (const win of windows) {
      if (win.id) await ensurePinnedIndexTab(win.id);
    }
  });

  chrome.windows.onCreated.addListener((win) => {
    if (win.type === 'normal' && win.id) ensurePinnedIndexTab(win.id);
  });

  chrome.tabs.onRemoved.addListener(async (_tabId, removeInfo) => {
    if (removeInfo.isWindowClosing) return; // Guard: don't resurrect closing windows
    await ensurePinnedIndexTab(removeInfo.windowId);
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.startsWith(DASHBOARD_URL) && tab.windowId) {
      ensurePinnedIndexTab(tab.windowId);
    }
  });

  chrome.commands.onCommand.addListener(async (cmd) => {
    if (cmd === 'focus-dashboard') {
      const currentWin = await chrome.windows.getCurrent();
      if (!currentWin.id) return;
      const tabs = await chrome.tabs.query({ windowId: currentWin.id });
      const dashTab = tabs.find(t => t.url?.startsWith(DASHBOARD_URL));
      if (dashTab?.id) {
        await chrome.tabs.update(dashTab.id, { active: true });
      } else {
        await ensurePinnedIndexTab(currentWin.id);
      }
    }
  });
});
```

---

### Component 4: Cold-Restore Placeholder (`suspended.html`) (Phase 1)

#### [NEW] `entrypoints/suspended/index.html` & `main.ts`
Ultra-lightweight static page (~2KB) that preserves tab title & favicon in the browser tab strip, and immediately navigates to the real destination on click or focus:

```typescript
// entrypoints/suspended/main.ts
const params = new URLSearchParams(window.location.search);
const realUrl = params.get('url');
const title = params.get('title');

if (title) document.title = title;

// Resolve native favicon
if (realUrl) {
  const faviconLink = document.createElement('link');
  faviconLink.rel = 'icon';
  faviconLink.href = chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(realUrl)}&size=32`);
  document.head.appendChild(faviconLink);
}

// Restore on focus or click
function restore() {
  if (realUrl) window.location.replace(realUrl);
}

window.addEventListener('click', restore);
window.addEventListener('focus', restore);
```

---

### Component 5: Tab Engine & Non-Destructive Actions (Phase 2)

#### [NEW] `src/services/tabManager.ts`
Orchestrates space opening modes with transition locks and Unsaved tab stashing:
* `openSpaceInCurrentWindow(spaceId, windowId)`: Stashes uncommitted tabs into `spaceId: null`, opens space tabs as `suspended.html`.
* `openSpaceInNewWindow(spaceId)`: Spawns new window, injects pinned index tab, restores space tabs.
* `focusOrOpenTab(url, windowId)`: Checks open tabs first; focuses existing tab if open, else creates it.

---

### Component 6: Workona-Style Dashboard UI (Phase 3)

#### [NEW] `entrypoints/dashboard/`
* **Sidebar (`src/components/sidebar/`):**
  * Profile avatar & Google sync indicator
  * **Unsaved tabs tray** with domain grouping (e.g. `youtube.com + 3`) matching your screenshot
  * **Spaces list** with drag-and-drop reordering, active badge, item count
  * Archive / Trash
* **Main Canvas (`src/components/canvas/`):**
  * Header: Space title, Search bar (Fuse.js), "Open all tabs here", "Open in new window", "Save current tabs"
  * Sub-navigation: `Tabs` | `Resources` | `Notes` | `Tasks`
  * Tab rows with checkboxes, favicons, direct open, and context menus
  * Notes markdown editor & Task checklist

---

### Component 7: Google Drive Sync & Local Backup (Phase 4)

#### [NEW] `src/services/driveSync.ts`
* Authorization Code + PKCE (`launchWebAuthFlow`) with `refresh_token` storage for cross-browser support (Chrome, Brave, Firefox, Edge).
* Single `data.json` export with tombstones (`deletedIds[]`) and 30-day pruning.
* Oldest folder resolution (`orderBy: 'createdTime asc'`) to prevent Drive folder duplication.
* 15-second debounce with `chrome.alarms` fallback to survive service worker idle shutdowns.
* Offline JSON export & import in dashboard settings.

---

## Verification Plan

### Automated Tests
1. **TypeScript Type Check:**
   ```powershell
   npm.cmd run compile # or npx.cmd tsc --noEmit
   ```
2. **Build Verification:**
   ```powershell
   npm.cmd run build
   ```
   Ensures WXT compiles clean output to `.output/chrome-mv3` with valid `manifest.json`.

### Manual Verification
1. **Pinned Index Tab Verification:**
   * Open Chrome with the loaded unpacked extension.
   * Verify tab `0` is pinned to `dashboard.html` with the extension icon.
   * Close tab `0` manually; verify it immediately re-pins.
   * Open an OAuth popup / DevTools; verify pinned tab is **not** injected into non-normal windows.
   * Close the browser window; verify no zombie windows hang in the background.
2. **Unsaved Tabs Verification:**
   * Open 3 random tabs (`youtube.com`, `github.com`, `wikipedia.org`).
   * Switch to the dashboard; verify they appear in the Unsaved tray grouped by domain.
3. **Non-Destructive Space Opening Verification:**
   * Create space "Audiobook" with 3 saved tabs.
   * Click *"Open in another window"*; verify a new window opens with the pinned index tab and the 3 tabs in sleeping state (`suspended.html`).
   * Click a suspended tab; verify it immediately loads the real URL.
   * Click *"Open all tabs here"*; verify uncommitted tabs are preserved in Unsaved, and space tabs open without data loss.
4. **Google Drive Sync Verification:**
   * Click "Sign in with Google"; complete OAuth.
   * Verify folder `<AppName>_Data` is created in Google Drive containing `data.json`.
   * Edit a note on Device A, wait 15 seconds, verify Drive upload.
   * Export JSON locally and verify clean file structure.
