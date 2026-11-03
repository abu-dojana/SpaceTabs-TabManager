# SpaceTabs — Project Directory Tree & File Guide

> **SpaceTabs (`spacetabs`)** is a local-first, memory-saving browser workspace and tab manager for Chromium and Firefox browsers, built with the [WXT extension framework](https://wxt.dev/), React 18, TypeScript, Tailwind CSS, Dexie.js (IndexedDB), and Google Drive sync.

---

## 🌳 Directory Tree Structure

```text
D:\tab-manager
├── .editorconfig                                # Editor formatting rules (indentation, charset, EOL)
├── .gitattributes                               # Git line-ending normalization attributes
├── .gitignore                                   # Git exclusion rules for node_modules, builds, secrets
├── client_secret_...brave and other chrome.json # Google OAuth 2.0 client credential configuration (Brave/Chrome)
├── client_secret_...brave-test.json             # Google OAuth 2.0 test credential configuration
├── DIRECTORY_TREE.md                            # Comprehensive directory tree and file guide (this file)
├── LICENSE                                      # GNU General Public License v3.0 (GPL-3.0)
├── package-lock.json                            # Exact npm dependency lockfile
├── package.json                                 # NPM manifest, build scripts, and dependencies
├── postcss.config.js                            # PostCSS config registering Tailwind CSS and Autoprefixer
├── PS Dtab-manager tree.txt                     # Saved terminal log from PowerShell tree command
├── README.md                                    # Main repository documentation, feature showcase, and setup guide
├── spacetabs-v1.1.0.zip                         # Zipped release build package (v1.1.0)
├── tailwind.config.js                           # Tailwind CSS theme styling, color tokens, and plugin configs
├── tsconfig.json                                # TypeScript compiler configuration and path aliases (@/* -> src/*)
├── wxt.config.ts                                # WXT extension framework config, permissions, icons, and OAuth scopes
│
├── docs/                                        # Project documentation and store assets
│   ├── CHROME_WEB_STORE_GUIDE.md                # Guide and checklist for Chrome Web Store publishing
│   ├── FEATURES.md                              # Detailed feature breakdown and user capabilities
│   ├── index.md                                 # Documentation index and overview
│   ├── PRIVACY_POLICY.md                        # Extension privacy policy regarding local storage & Google Drive
│   │
│   ├── dev/                                     # Architecture plans, refactoring specs, and developer audits
│   │   ├── chatgpt_audit plan.txt               # Codebase audit notes and modularization suggestions
│   │   ├── claude_opus_5-5_audit_report_....md  # Audit report and implementation plan for sync & locks
│   │   ├── implementation_plan.md               # Core architectural roadmap and technical milestones
│   │   ├── monolithic_refractoring_walkthrough.md # Refactoring log: decomposing monolithic files into modules
│   │   └── tab_manager_plan.md                  # Comprehensive architectural blueprint and system design
│   │
│   └── screenshots/                             # Screenshots and visual promotional assets
│       ├── batch-actions.png                    # Screenshot: Batch selection and tab actions bar
│       ├── dashboard-dark-emerald.png           # Screenshot: Dashboard in Dark Emerald palette
│       ├── dashboard-light-rose.png             # Screenshot: Dashboard in Light Rose theme
│       ├── dashboard-split-purple.png           # Screenshot: Dashboard in Split Purple palette
│       ├── dashboard-split.png                  # Screenshot: Dashboard split view
│       ├── google-drive-sync.png                # Screenshot: Google Drive cloud sync settings UI
│       ├── notes-markdown-editor.png            # Screenshot: Space markdown notes editor
│       ├── settings-appearance.png              # Screenshot: Settings appearance tab
│       └── settings-palettes-accents.png        # Screenshot: Settings theme and accent palette selectors
│
├── public/                                      # Extension static assets (copied directly to build output)
│   ├── developer-pfp.png                        # Developer avatar displayed in About settings tab
│   ├── icon-16.png                              # 16x16 extension icon (toolbar, favicon)
│   ├── icon-32.png                              # 32x32 extension icon (Windows taskbar, retina display)
│   ├── icon-48.png                              # 48x48 extension icon (Chrome extensions management page)
│   ├── icon-128.png                             # 128x128 extension icon (Chrome Web Store, installation)
│   └── icon.svg                                 # Vector SVG master extension icon
│
├── scripts/                                     # Developer utility and build validation scripts
│   ├── check-file-size.js                       # Linter script enforcing file size ceilings (<600 lines)
│   └── generate-icons.js                        # Script generating pixel-perfect PNG icons from raw buffers
│
└── src/                                         # Main source code directory
    ├── db/                                      # Local database layer (Dexie.js / IndexedDB)
    │   ├── index.ts                             # Dexie database class initialization and schema migrations
    │   └── schema.ts                            # Entity interfaces: Space, Tab, Resource, Note, Task
    │
    ├── entrypoints/                             # Extension entrypoints managed by WXT
    │   ├── background.ts                        # Manifest V3 service worker (alarms, tab listeners, window sync)
    │   ├── dashboard/                           # Main extension dashboard app (pinned index tab)
    │   │   ├── App.tsx                          # Root React component, layout shell, and Error Boundary
    │   │   ├── index.html                       # HTML document container for the dashboard
    │   │   └── main.tsx                         # React 18 DOM mount point and entry script
    │   └── suspended/                           # Lightweight placeholder for cold-restored tabs
    │       ├── index.html                       # Minimalist HTML placeholder page (~2KB)
    │       └── main.ts                          # Tab restoration logic on click or activation
    │
    ├── hooks/                                   # Shared React custom hooks
    │   ├── useAutoFocusSelect.ts                # Auto-focuses and selects input text on mount/active
    │   ├── useClickOutside.ts                   # Triggers dismiss callbacks when clicking outside ref elements
    │   ├── useDriveSyncInfo.ts                  # Subscribes to reactive Google Drive sync status updates
    │   ├── useHydrateUiFromSettings.ts          # Hydrates UI store appearance from stored user settings
    │   └── useUserSettings.ts                   # Reactively syncs and listens to chrome.storage user settings
    │
    ├── public/                                  # Source mirrored static assets (icons and developer avatar)
    │   ├── developer-pfp.png                    # Developer profile picture
    │   ├── icon-16.png                          # 16px icon
    │   ├── icon-32.png                          # 32px icon
    │   ├── icon-48.png                          # 48px icon
    │   ├── icon-128.png                         # 128px icon
    │   └── icon.svg                             # SVG vector icon
    │
    ├── services/                                # Business logic and service layers
    │   ├── driveSync.ts                         # Re-export facade for Google Drive synchronization modules
    │   ├── settings.ts                          # User preferences service (defaults, storage, exports/imports)
    │   ├── suspension.ts                        # Tab suspension & memory saver service (alarms, idle discard)
    │   ├── tabManager.ts                        # Re-export facade for tab, window, and space operations
    │   │
    │   ├── driveSync/                           # Modular Google Drive sync subsystem
    │   │   ├── alarm.ts                         # Background chrome.alarms scheduler for automatic sync
    │   │   ├── auth.ts                          # Google OAuth2 token handling & profile fetch (Chrome/Brave)
    │   │   ├── driveApi.ts                      # Direct REST calls to Google Drive API v3 (appDataFolder)
    │   │   ├── lock.ts                          # Mutex lock preventing concurrent background & manual syncs
    │   │   ├── merge.ts                         # 3-way last-write-wins merge engine with tombstone resolution
    │   │   ├── status.ts                        # Sync state management, progress tracking, and pub/sub bus
    │   │   ├── storage.ts                       # Local storage persistence for sync preferences and tombstones
    │   │   ├── sync.ts                          # Master sync orchestrator (Pull -> Merge -> Push)
    │   │   └── types.ts                         # TypeScript interfaces for drive sync data formats and states
    │   │
    │   ├── spaces/                              # Space organization and management services
    │   │   ├── sectionActions.ts                # Section management (renaming, archiving grouped spaces)
    │   │   ├── spaceActions.ts                  # Space duplication, deletion, and deep-cloning
    │   │   ├── spaceExport.ts                   # Per-space JSON export and file download
    │   │   └── unsavedSessions.ts               # Temporary window session tracking and orphan cleanup
    │   │
    │   └── tabManager/                          # Core browser tab and window management services
    │       ├── spaceSwitcher.ts                 # Atomic space switching per window with mutex serialization
    │       ├── suspensionUrls.ts                # Builders and decoders for suspended placeholder URLs
    │       ├── tabBulkActions.ts                # Bulk tab operations (reordering, domain grouping, close all)
    │       ├── tabOperations.ts                 # Individual tab operations (focus, open in new window, close)
    │       ├── tabSync.ts                       # Debounced browser-to-Dexie tab state synchronizer
    │       ├── windowLocks.ts                   # Web Locks API wrapper serializing window transitions
    │       └── windowSpaces.ts                  # Chrome window-to-space session mappings and state bindings
    │
    ├── store/                                   # Client state management
    │   └── uiStore.ts                           # Zustand store for UI states (active space, tabs, themes, modals)
    │
    ├── styles/                                  # Styling and theme definitions
    │   └── globals.css                          # Tailwind CSS imports, custom scrollbars, and color palette tokens
    │
    ├── utils/                                   # Shared utility functions
    │   ├── appVersion.ts                        # Helper retrieving extension version from runtime manifest
    │   ├── chromeWindow.ts                      # Resolves the current extension tab's host window ID
    │   ├── color.ts                             # Color utilities (hexToRgba, adjustBrightness for themes)
    │   ├── download.ts                          # Browser file download helper using Object URLs
    │   ├── time.ts                              # Formats relative timestamps ("5m ago") and due date badges
    │   └── urlFilter.ts                         # Filters system/internal URLs and decodes suspended links
    │
    └── components/                              # React UI component library
        ├── canvas/                              # Main workspace canvas views
        │   ├── NotesView.tsx                    # Space notes canvas hosting note list and editor
        │   ├── ResourcesView.tsx                # Bookmark & resource board grouped by custom sections
        │   ├── TabBatchBar.tsx                  # Floating bar for batch actions on selected tabs
        │   ├── TabItem.tsx                      # Individual tab card item with favicon, title, domain, close
        │   ├── TabsContainerMenu.tsx            # Header menu for tabs canvas (search, sort, bulk actions)
        │   ├── TabsView.tsx                     # Main tab grid/list canvas for active space or unsaved session
        │   ├── TasksView.tsx                    # Space to-do task list with completion toggles and due dates
        │   │
        │   ├── hooks/                           # Canvas-specific React hooks
        │   │   └── useLiveBrowserTabs.ts        # Real-time listener for open Chrome tabs and active tab state
        │   │
        │   ├── notes/                           # Notes subsystem components
        │   │   ├── DeleteNoteModal.tsx          # Confirmation modal when deleting a note
        │   │   ├── FormattingToolbar.tsx        # Markdown editor formatting buttons (bold, headers, code, lists)
        │   │   ├── NotesList.tsx                # Sidebar list of notes within the current space
        │   │   ├── NoteTopToolbar.tsx           # Note title editor, export button, and delete trigger
        │   │   ├── useNoteEditor.ts             # Hook managing active note state, debounced auto-save, and input
        │   │   └── markdown/                    # Markdown rendering components
        │   │       └── MarkdownRenderer.tsx     # Custom lightweight markdown parser with code highlighting
        │   │
        │   └── resources/                       # Resources subsystem components
        │       ├── AddFromOpenTabsDropdown.tsx  # Quick dropdown to add open browser tabs as space resources
        │       ├── ResourceItemRow.tsx          # Individual bookmark item row with link preview and actions
        │       ├── ResourceModal.tsx            # Modal to add or edit resource title, URL, and category
        │       ├── ResourceSectionCard.tsx      # Section container grouping resources with drag-and-drop
        │       ├── resourceUtils.tsx            # Favicon resolution and type badge helpers for resources
        │       └── useResourceActions.ts        # Hook providing CRUD operations for resource items and sections
        │
        ├── header/                              # Canvas header component
        │   └── Header.tsx                       # Top bar: active space icon/title, view tabs switcher, search
        │
        ├── modals/                              # Top-level modal dialogues
        │   ├── CreateSpaceModal.tsx             # Modal to create a new space with emoji picker and color
        │   ├── MoveToSectionModal.tsx           # Modal to categorize a space into a custom section
        │   └── SettingsModal.tsx                # Re-export facade for the settings modal dialog
        │
        ├── settings/                            # Comprehensive settings modal subsystem
        │   ├── SettingsModal.tsx                # Main settings dialog shell with navigation tab sidebar
        │   ├── settingsTabs.ts                  # Settings tab definitions, icons, and type identifiers
        │   ├── useSettingsController.ts         # Hook handling setting mutations, imports, and toast alerts
        │   │
        │   ├── data/                            # Static settings content
        │   │   ├── changelog.ts                 # Version release notes and change history
        │   │   └── contactLinks.ts              # Links to GitHub issues, Discord, email, and social media
        │   │
        │   ├── tabs/                            # Individual settings tab views
        │   │   ├── AboutTab.tsx                 # Extension version info, developer bio, and changelog
        │   │   ├── AppearanceTab.tsx            # Dark/light theme mode, color palettes, and accent pickers
        │   │   ├── BackupTab.tsx                # Offline JSON full database backup, export, and import
        │   │   ├── CloudSyncTab.tsx             # Google Drive OAuth login, auto-sync frequency, manual sync
        │   │   ├── ConfirmPullModal.tsx         # Safety dialog warning before pulling and overwriting data
        │   │   ├── ContactTab.tsx               # Feedback channels and issue reporting links
        │   │   ├── GeneralTab.tsx               # General behavior options (window opening, tab favicons)
        │   │   ├── ShortcutsTab.tsx             # Cheat sheet of keyboard shortcuts and commands
        │   │   └── SuspensionTab.tsx            # Auto-discard idle timer, memory saver rules, whitelist
        │   │
        │   └── ui/                              # Reusable settings UI elements
        │       ├── SettingsToast.tsx            # Floating toast notification for save confirmation
        │       ├── ThemeOptionCard.tsx          # Selectable preview card for themes and palettes
        │       └── ToggleRow.tsx                # Reusable switch row component for boolean preferences
        │
        └── sidebar/                             # Left application navigation sidebar
            ├── ArchiveDrawer.tsx                # Slide-out drawer to view and restore archived spaces
            ├── SectionGroup.tsx                 # Collapsible section header grouping related spaces
            ├── Sidebar.tsx                      # Main sidebar container with navigation, spaces, and footer
            ├── SidebarBrandHeader.tsx           # Logo, title, and quick "New Space" button
            ├── SidebarFooter.tsx                # Bottom bar with sync indicator, storage count, and settings trigger
            ├── SidebarModals.tsx                # Modal container for sidebar actions (rename section, confirm delete)
            ├── SpaceContextMenu.tsx             # Right-click menu for spaces (duplicate, export, archive, delete)
            ├── SpaceItem.tsx                    # Individual space item with active window badge and tab count
            ├── UnsavedSessionsSection.tsx       # Unsaved temporary window sessions list with save/close buttons
            │
            └── hooks/                           # Sidebar-specific hooks
                ├── useSidebarSpaces.ts          # Queries and filters spaces (active, archived, by section)
                ├── useSpaceDragReorder.ts       # Drag-and-drop reordering for spaces across sections
                └── useWindowSpaces.ts           # Tracks open Chrome windows and their assigned space IDs
```

---

## 📦 Build Artifacts & Generated Folders

These directories are generated during development and builds, and are typically excluded from source control (`.gitignore`):

| Directory | Description |
| :--- | :--- |
| **`.output/`** | WXT build target containing bundled, unpacked extensions ready for loading in browser developer mode (`chrome-mv3` and `firefox-mv2`). |
| **`.wxt/`** | Internal WXT temporary directory containing generated TypeScript types (`types/`) and build metadata. |
| **`dist/`** | Production release distribution copied from `.output/chrome-mv3` by the `postbuild` script. |
| **`node_modules/`** | Installed external npm packages and dependencies. |

---

## 📑 Detailed File Descriptions

### 1. Root Configuration & Project Meta

| File | Description |
| :--- | :--- |
| **`.editorconfig`** | Configures editor conventions such as 2-space indentation, UTF-8 encoding, and LF line endings. |
| **`.gitattributes`** | Sets Git attributes to normalize line endings across Windows and Unix platforms. |
| **`.gitignore`** | Specifies intentionally untracked files including build outputs (`dist/`, `.output/`, `.wxt/`), `node_modules/`, and local OAuth secret JSONs. |
| **`client_secret_...brave and other chrome....json`** | Google Cloud Console OAuth 2.0 Client credentials used for Google Drive sync in Chromium-based browsers. |
| **`client_secret_...brave-test.json`** | Secondary Google OAuth 2.0 Client test credentials for development environments. |
| **`LICENSE`** | The full text of the GNU General Public License v3.0 under which SpaceTabs is distributed. |
| **`package.json`** | Defines project metadata, npm scripts (`dev`, `build`, `zip`, `compile`, `lint:size`), dependencies (`react`, `dexie`, `zustand`, `lucide-react`, `tailwindcss`), and dev dependencies. |
| **`package-lock.json`** | Locks the exact versions of all installed npm dependencies to guarantee reproducible builds. |
| **`postcss.config.js`** | Configures PostCSS to run Tailwind CSS and Autoprefixer when compiling stylesheets. |
| **`PS Dtab-manager tree.txt`** | Terminal output log capture of the raw Windows PowerShell `tree` command. |
| **`README.md`** | Comprehensive project documentation featuring architecture overviews, screenshots, installation guides, and license information. |
| **`spacetabs-v1.1.0.zip`** | Pre-packaged zip archive of the v1.1.0 release build ready for manual browser installation. |
| **`tailwind.config.js`** | Configures Tailwind CSS content paths, custom color palettes (`slate`, `midnight`, `indigo`, `forest`, `espresso`, etc.), and utilities. |
| **`tsconfig.json`** | TypeScript compiler configuration specifying strict type checking, JSX settings, and `@/*` path mapping to `./src/*`. |
| **`wxt.config.ts`** | Central configuration for the WXT extension framework; defines Chrome Manifest V3 permissions (`tabs`, `storage`, `identity`, `alarms`, `favicon`), keyboard shortcuts, and OAuth scopes. |

---

### 2. Documentation (`docs/`)

| File | Description |
| :--- | :--- |
| **`docs/CHROME_WEB_STORE_GUIDE.md`** | Detailed checklist and store asset specifications for submitting SpaceTabs to the Chrome Web Store. |
| **`docs/FEATURES.md`** | Exhaustive catalog of all user-facing features, keyboard shortcuts, themes, and memory-saving behaviors. |
| **`docs/index.md`** | Root documentation landing page and quick reference link. |
| **`docs/PRIVACY_POLICY.md`** | User privacy policy detailing local-first data guarantees, absence of analytics trackers, and restricted Google Drive API scope usage. |
| **`docs/dev/chatgpt_audit plan.txt`** | Notes and architectural audit recommendations on decoupling modules and preventing memory leaks. |
| **`docs/dev/claude_opus_5-5_audit_report_implementation plan.md`** | Detailed architectural plan outlining window lock mechanisms, tombstone records, and race-condition mitigations. |
| **`docs/dev/implementation_plan.md`** | Multi-phase development roadmap for tabs, notes, tasks, drive sync, and theming. |
| **`docs/dev/monolithic_refractoring_walkthrough.md`** | Documentation tracking the refactoring of large monolithic files into maintainable, modular submodules (<600 lines each). |
| **`docs/dev/tab_manager_plan.md`** | Original technical design document specifying data structures, window session sync logic, and synchronization algorithms. |
| **`docs/screenshots/*`** | High-resolution screenshots demonstrating SpaceTabs dark/light themes, markdown editor, batch actions, and cloud sync. |

---

### 3. Developer Scripts (`scripts/`)

| File | Description |
| :--- | :--- |
| **`scripts/check-file-size.js`** | CI/pre-commit linter script that inspects all `.ts` and `.tsx` files in `src/` to ensure no file exceeds the 600-line modularity ceiling. |
| **`scripts/generate-icons.js`** | Standalone Node.js script using raw PNG chunk and CRC32 encoding to generate extension icons (16, 32, 48, 128 px) from scratch without canvas dependencies. |

---

### 4. Database Layer (`src/db/`)

| File | Description |
| :--- | :--- |
| **`src/db/index.ts`** | Instantiates the Dexie `TabManagerDB` IndexedDB database with schema version upgrades (v1, v2, v3) and indexed fields. |
| **`src/db/schema.ts`** | Core TypeScript entity models: `Space`, `Tab`, `ResourceSection`, `ResourceItem`, `Note`, and `Task`, each with `updatedAt` timestamps for sync conflict resolution. |

---

### 5. Extension Entrypoints (`src/entrypoints/`)

| File | Description |
| :--- | :--- |
| **`src/entrypoints/background.ts`** | Background Manifest V3 service worker: orchestrates alarm triggers, Chrome window/tab lifecycle events, auto-discard memory timers, and Google Drive background syncs. |
| **`src/entrypoints/dashboard/App.tsx`** | Top-level React dashboard component integrating the Sidebar, Header, dynamic canvas views (Tabs, Resources, Notes, Tasks), modals, and React ErrorBoundary. |
| **`src/entrypoints/dashboard/index.html`** | HTML shell hosting the React dashboard application. |
| **`src/entrypoints/dashboard/main.tsx`** | Mounts the React 18 root and imports global styles (`globals.css`). |
| **`src/entrypoints/suspended/index.html`** | Lightweight (~2KB) HTML placeholder page displayed for cold-restored suspended tabs to prevent network and memory usage. |
| **`src/entrypoints/suspended/main.ts`** | Client script in the suspended placeholder that restores the original target URL upon click or window focus after a grace period. |

---

### 6. Services & Subsystems (`src/services/`)

#### Top-Level Facades
| File | Description |
| :--- | :--- |
| **`src/services/driveSync.ts`** | Central facade re-exporting all Google Drive synchronization modules, types, and functions. |
| **`src/services/settings.ts`** | Manages user settings persistence in `chrome.storage.local`, default options, and full offline database JSON export/import. |
| **`src/services/suspension.ts`** | Hybrid tab suspension service: manages idle tab memory saver alarms (`chrome.tabs.discard`) and persists tab activity timestamps across service worker restarts. |
| **`src/services/tabManager.ts`** | Central facade re-exporting tab, space, and window operations from `tabManager/` and `spaces/`. |

#### Google Drive Sync (`src/services/driveSync/`)
| File | Description |
| :--- | :--- |
| **`src/services/driveSync/alarm.ts`** | Manages periodic background sync alarms via `chrome.alarms` based on user sync frequency settings. |
| **`src/services/driveSync/auth.ts`** | Handles OAuth 2.0 authentication flows (`chrome.identity`), token caching, and fetching user email and profile pictures. |
| **`src/services/driveSync/driveApi.ts`** | Wraps Google Drive REST API v3 operations: searching files, reading file contents, uploading multipart backup JSONs to `appDataFolder`. |
| **`src/services/driveSync/lock.ts`** | Provides distributed mutex locking (`withSyncLock`) to prevent concurrent manual and background sync executions. |
| **`src/services/driveSync/merge.ts`** | 3-way last-write-wins merge algorithm resolving records across spaces, tabs, notes, tasks, and resources using `updatedAt` and tombstones. |
| **`src/services/driveSync/status.ts`** | Tracks current sync status (`idle`, `syncing`, `error`, `success`) and provides a pub/sub listener bus for UI components. |
| **`src/services/driveSync/storage.ts`** | Handles storage and retrieval of sync settings, credentials, and deleted record tombstones in `chrome.storage.local`. |
| **`src/services/driveSync/sync.ts`** | Main sync execution pipeline: acquires lock, fetches remote file, merges with local Dexie tables, resolves conflicts, and uploads new backup. |
| **`src/services/driveSync/types.ts`** | TypeScript type definitions for drive sync payloads, export formats, sync state, and tombstones. |

#### Spaces Management (`src/services/spaces/`)
| File | Description |
| :--- | :--- |
| **`src/services/spaces/sectionActions.ts`** | Manages custom space sections in the sidebar: renaming sections and bulk-archiving spaces in a section. |
| **`src/services/spaces/spaceActions.ts`** | Handles space cloning (duplicating a space with all its tabs, notes, tasks, and resources) and permanent deletion. |
| **`src/services/spaces/spaceExport.ts`** | Exports a single space's data (metadata, tabs, notes, tasks, resources) as a standalone portable JSON file. |
| **`src/services/spaces/unsavedSessions.ts`** | Detects empty unsaved sessions, auto-deletes abandoned windows, and safeguards unsaved sessions containing notes or tasks. |

#### Tab & Window Management (`src/services/tabManager/`)
| File | Description |
| :--- | :--- |
| **`src/services/tabManager/spaceSwitcher.ts`** | Atomically switches a Chrome window to another space: saves current tabs, opens target tabs, and re-binds window state with window-level mutex locks. |
| **`src/services/tabManager/suspensionUrls.ts`** | Generates suspended placeholder URLs (`/suspended.html?url=...&title=...`) for cold-restoring tabs. |
| **`src/services/tabManager/tabBulkActions.ts`** | Handles batch tab actions: closing multiple tabs, deduplicating tabs by URL, sorting tabs by domain, and reordering Chrome browser tabs. |
| **`src/services/tabManager/tabOperations.ts`** | Executes single-tab operations: focusing an open tab, opening in current or new window, and closing tabs. |
| **`src/services/tabManager/tabSync.ts`** | Debounced synchronizer tracking Chrome tab creations, updates, and moves, persisting current window tabs to Dexie. |
| **`src/services/tabManager/windowLocks.ts`** | Implements the Web Locks API (`navigator.locks`) with in-memory fallbacks to prevent race conditions during window transitions. |
| **`src/services/tabManager/windowSpaces.ts`** | Maps Chrome `windowId`s to active `spaceId`s, initializes session bindings, and manages persisted window associations. |

---

### 7. State Management (`src/store/`)

| File | Description |
| :--- | :--- |
| **`src/store/uiStore.ts`** | Global Zustand store controlling active space ID, selected tabs set, active canvas view (`tabs`/`resources`/`notes`/`tasks`), search query, modal open states, and theme/palette settings. |

---

### 8. Custom Hooks (`src/hooks/`)

| File | Description |
| :--- | :--- |
| **`src/hooks/useAutoFocusSelect.ts`** | Automatically focuses and highlights the text of an `<input>` or `<textarea>` when activated. |
| **`src/hooks/useClickOutside.ts`** | Listens for mouse clicks outside referenced DOM elements and triggers a dismiss callback (also supports `Escape` key). |
| **`src/hooks/useDriveSyncInfo.ts`** | Loads initial Google Drive sync metadata and subscribes to live status updates from `status.ts`. |
| **`src/hooks/useHydrateUiFromSettings.ts`** | Reads persisted user preferences from `settings.ts` and updates Zustand UI store theme, accent, and width states. |
| **`src/hooks/useUserSettings.ts`** | Reactive hook listening to `chrome.storage.onChanged` to keep components updated with user settings in real-time. |

---

### 9. Utilities (`src/utils/`)

| File | Description |
| :--- | :--- |
| **`src/utils/appVersion.ts`** | Retrieves the current extension version dynamically from `chrome.runtime.getManifest()`. |
| **`src/utils/chromeWindow.ts`** | Identifies the Chrome window hosting the current extension tab, with fallback to `chrome.windows.getCurrent()`. |
| **`src/utils/color.ts`** | Color manipulation functions: `hexToRgba` for alpha transparency and `adjustBrightness` for theme surface styling. |
| **`src/utils/download.ts`** | Triggers browser file downloads for JSON and text content via ephemeral blob Object URLs. |
| **`src/utils/time.ts`** | Human-readable time formatting: relative timestamps ("2h ago", "Yesterday") and task due date badges. |
| **`src/utils/urlFilter.ts`** | Utility to identify internal extension/system URLs, check URL suspendability (`http`/`https`), and extract domains. |

---

### 10. Styles (`src/styles/`)

| File | Description |
| :--- | :--- |
| **`src/styles/globals.css`** | Tailwind CSS layer directives, minimalist custom scrollbar rules, and CSS variables for dark/light themes and custom color palettes. |

---

### 11. React UI Components (`src/components/`)

#### Canvas & Workspace Views (`src/components/canvas/`)
| File | Description |
| :--- | :--- |
| **`src/components/canvas/NotesView.tsx`** | Space notes canvas view integrating the notes list sidebar and active note editor. |
| **`src/components/canvas/ResourcesView.tsx`** | Space resources view organizing links, documents, and sheets into categorized section cards. |
| **`src/components/canvas/TabBatchBar.tsx`** | Floating bottom action bar appearing when multiple tabs are selected, enabling bulk move, close, or suspend. |
| **`src/components/canvas/TabItem.tsx`** | Card displaying a single tab with its favicon, title, domain, audio playing status, selection checkbox, and close button. |
| **`src/components/canvas/TabsContainerMenu.tsx`** | Canvas toolbar offering tab search filtering, sort by domain/title/time, and bulk select/deduplicate options. |
| **`src/components/canvas/TabsView.tsx`** | Main canvas displaying grid or list of open and saved tabs in the active space or unsaved session. |
| **`src/components/canvas/TasksView.tsx`** | Space task list allowing users to create, complete, reorder, and assign due dates to to-dos. |
| **`src/components/canvas/hooks/useLiveBrowserTabs.ts`** | Custom hook providing real-time synchronization with active Chrome browser tabs and window focus. |
| **`src/components/canvas/notes/DeleteNoteModal.tsx`** | Confirmation dialog preventing accidental note deletion. |
| **`src/components/canvas/notes/FormattingToolbar.tsx`** | Markdown formatting bar for notes (bold, italic, code block, headings, lists, tables). |
| **`src/components/canvas/notes/NotesList.tsx`** | List of all notes in the active space with search filtering and "New Note" creation button. |
| **`src/components/canvas/notes/NoteTopToolbar.tsx`** | Top toolbar of the note editor containing the title input, markdown export, and delete button. |
| **`src/components/canvas/notes/useNoteEditor.ts`** | Hook handling note selection, debounced auto-saving to Dexie, and keyboard shortcuts. |
| **`src/components/canvas/notes/markdown/MarkdownRenderer.tsx`** | Custom lightweight markdown renderer rendering formatted HTML, syntax styling, and interactive checkboxes. |
| **`src/components/canvas/resources/AddFromOpenTabsDropdown.tsx`** | Dropdown permitting one-click addition of any open browser tab into a resource section. |
| **`src/components/canvas/resources/ResourceItemRow.tsx`** | Renders an individual resource bookmark with favicon, title, URL link, and context actions. |
| **`src/components/canvas/resources/ResourceModal.tsx`** | Modal dialog to create or edit a resource's title, URL, and category type. |
| **`src/components/canvas/resources/ResourceSectionCard.tsx`** | Section container grouping resource items with drag reordering, inline adding, and section renaming. |
| **`src/components/canvas/resources/resourceUtils.tsx`** | Helper functions resolving resource icons, fallback favicons, and badge labels. |
| **`src/components/canvas/resources/useResourceActions.ts`** | Hook exposing CRUD functions for resource items and sections within Dexie. |

#### Header (`src/components/header/`)
| File | Description |
| :--- | :--- |
| **`src/components/header/Header.tsx`** | Top dashboard header displaying active space name and emoji, navigation view tabs (`Tabs`, `Resources`, `Notes`, `Tasks`), tab counter, and search bar. |

#### Top-Level Modals (`src/components/modals/`)
| File | Description |
| :--- | :--- |
| **`src/components/modals/CreateSpaceModal.tsx`** | Modal dialog for creating a new space, featuring an emoji icon picker and space name input. |
| **`src/components/modals/MoveToSectionModal.tsx`** | Modal dialog allowing users to move a space into an existing or newly created sidebar section. |
| **`src/components/modals/SettingsModal.tsx`** | Re-export bridge for `SettingsModal` from `src/components/settings/`. |

#### Settings Subsystem (`src/components/settings/`)
| File | Description |
| :--- | :--- |
| **`src/components/settings/SettingsModal.tsx`** | Master settings dialog component containing navigation tabs and active tab content. |
| **`src/components/settings/settingsTabs.ts`** | Metadata and icons for the settings tabs (General, Appearance, Suspension, Cloud, Backup, Shortcuts, About, Contact). |
| **`src/components/settings/useSettingsController.ts`** | Controller hook managing settings mutations, saving to storage, and firing toast feedback. |
| **`src/components/settings/data/changelog.ts`** | Version history, new features, and bug fixes listed in the About tab. |
| **`src/components/settings/data/contactLinks.ts`** | Official contact URLs (GitHub repo, issues, email, feedback). |
| **`src/components/settings/tabs/AboutTab.tsx`** | Shows extension version, author details, license information, and release changelog. |
| **`src/components/settings/tabs/AppearanceTab.tsx`** | Customizes UI themes: dark/light toggle, dark palettes (`slate`, `midnight`, `indigo`, `forest`, `espresso`), light palettes (`snow`, `paper`, `zinc`, `sky`, `mint`), and accent colors. |
| **`src/components/settings/tabs/BackupTab.tsx`** | Exports complete local database to JSON and imports backups for offline migration. |
| **`src/components/settings/tabs/CloudSyncTab.tsx`** | Google Drive sync controls: OAuth login/logout, auto-sync frequency toggle, manual "Sync Now" button, and status indicator. |
| **`src/components/settings/tabs/ConfirmPullModal.tsx`** | Confirmation modal warning that pulling remote cloud data will overwrite local data. |
| **`src/components/settings/tabs/ContactTab.tsx`** | Displays developer contact options, bug report links, and feature request forms. |
| **`src/components/settings/tabs/GeneralTab.tsx`** | General preferences: default new window behavior, favicon display toggles, and shortcut links. |
| **`src/components/settings/tabs/ShortcutsTab.tsx`** | Reference table of keyboard shortcuts (`Alt+Shift+W`, tab navigation, note shortcuts). |
| **`src/components/settings/tabs/SuspensionTab.tsx`** | Configures memory saver and tab suspension idle threshold minutes, space switch discard, and suspension behavior. |
| **`src/components/settings/ui/SettingsToast.tsx`** | Reusable toast notification for settings feedback ("Settings saved", "Sync complete"). |
| **`src/components/settings/ui/ThemeOptionCard.tsx`** | Visual card component used for selecting theme modes and color palettes. |
| **`src/components/settings/ui/ToggleRow.tsx`** | Standardized toggle switch row with title, description, and switch control. |

#### Sidebar Navigation (`src/components/sidebar/`)
| File | Description |
| :--- | :--- |
| **`src/components/sidebar/ArchiveDrawer.tsx`** | Slide-out panel listing archived spaces with options to unarchive or permanently delete them. |
| **`src/components/sidebar/SectionGroup.tsx`** | Collapsible section container in the sidebar grouping spaces by category name. |
| **`src/components/sidebar/Sidebar.tsx`** | Left navigation sidebar containing the brand header, unsaved sessions, space sections, archive button, and footer. |
| **`src/components/sidebar/SidebarBrandHeader.tsx`** | Sidebar header with extension branding, logo, and "Create Space" button. |
| **`src/components/sidebar/SidebarFooter.tsx`** | Bottom sidebar panel showing live Google Drive sync status, storage stats, and settings button. |
| **`src/components/sidebar/SidebarModals.tsx`** | Houses sidebar-specific action dialogs (rename section, confirm space delete/archive). |
| **`src/components/sidebar/SpaceContextMenu.tsx`** | Right-click context menu on space items (rename, change color/icon, move to section, duplicate, export, archive, delete). |
| **`src/components/sidebar/SpaceItem.tsx`** | Sidebar space row component showing emoji, space name, active Chrome window indicator, and tab count pill. |
| **`src/components/sidebar/UnsavedSessionsSection.tsx`** | Lists open browser windows not yet saved as spaces, with buttons to save as a space or close. |
| **`src/components/sidebar/hooks/useSidebarSpaces.ts`** | Reactively queries active, archived, and section-grouped spaces from Dexie. |
| **`src/components/sidebar/hooks/useSpaceDragReorder.ts`** | Provides HTML5 drag-and-drop support for reordering spaces and moving them between sections. |
| **`src/components/sidebar/hooks/useWindowSpaces.ts`** | Tracks real-time Chrome window-to-space bindings and active window assignments. |
