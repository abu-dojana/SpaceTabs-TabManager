# SpaceTabs — Complete Feature Documentation & User Manual

> **SpaceTabs** is a local-first, privacy-focused, unlimited tab and workspace manager for Chromium browsers (Chrome, Brave, Edge, Opera, Vivaldi), built with Manifest V3, React 18, TypeScript, Dexie (IndexedDB), and Tailwind CSS.

---

## Table of Contents
1. [Core Architecture & Philosophy](#1-core-architecture--philosophy)
2. [Spaces & Sections Management](#2-spaces--sections-management)
3. [Tab Management & Multi-Window Engine](#3-tab-management--multi-window-engine)
4. [Workspace Productivity Suite](#4-workspace-productivity-suite)
   - [Tabs Canvas](#tabs-canvas)
   - [Resources Canvas](#resources-canvas)
   - [Notes Canvas](#notes-canvas)
   - [Tasks Canvas](#tasks-canvas)
5. [Memory Saver & Tab Suspension](#5-memory-saver--tab-suspension)
6. [Google Drive Cloud Backup & Sync](#6-google-drive-cloud-backup--sync)
7. [Theming & Personalization Engine](#7-theming--personalization-engine)
8. [Keyboard Shortcuts & Hotkeys](#8-keyboard-shortcuts--hotkeys)
9. [Data Storage & Security Model](#9-data-storage--security-model)
10. [Support & Donations (Patreon)](#10-support--donations-patreon)

---

## 1. Core Architecture & Philosophy

SpaceTabs is designed as a **direct, privacy-respecting alternative to Workona and Toby**, removing artificial paywalls, subscription fees, and third-party cloud data harvesting.

* **100% Local-First:** All spaces, tabs, notes, tasks, and bookmarks live primarily inside your browser's high-speed **IndexedDB** database (`spacetabs_db`). The extension functions fully offline with zero internet connection required.
* **Anchor Tab Protection:** The SpaceTabs Dashboard is automatically anchored at **pinned tab #0** of your browser window. Switching spaces or closing tabs will never accidentally close your active dashboard.
* **Manifest V3 Compliant:** Engineered according to Google's strictest extension standards, utilizing modern service worker alarms, transition locks, and non-blocking asynchronous APIs.

---

## 2. Spaces & Sections Management

Spaces are dedicated workspaces that group together browser tabs, resources, project notes, and checklists.

### Space Features
* **Unlimited Spaces:** Create as many spaces as you need without tier limits.
* **Custom Icons & Colors:** Assign unique emoji or standard folder icons to each space for rapid visual recognition.
* **Space Descriptions:** Add context, project goals, or client notes visible beneath the space header.
* **Inline Renaming:** Click the active space title in the header at any time to edit the space name. Press `Enter` to save or `Escape` to cancel.
* **Duplicate Space:** Clone any space, including its saved tabs, notes, resources, and tasks.
* **Archive Spaces:** Move finished or paused projects to the Archive to declutter your active sidebar without losing historical data.
* **Delete Safeguard:** Deleting a space requires explicit confirmation to prevent accidental data loss.

### Sections (Workona-Style Grouping)
* **Custom Folders:** Group related spaces into collapsible sections (e.g., *Work*, *Personal*, *Open Source*, *Research*).
* **Drag-and-Drop Moving:** Drag spaces between sections in the sidebar or use the **"Move to Section"** modal.
* **Section Actions:** Rename sections or safely archive/delete all spaces contained within a section in one click.

---

## 3. Tab Management & Multi-Window Engine

SpaceTabs provides granular control over open browser tabs and multi-monitor setups.

### The "Unsaved" Session
* **Dynamic Tab Capture:** Any tab opened outside an active space automatically populates the **Unsaved** workspace.
* **1-Click Quick-Save:** A prominent **SAVE** button in the header converts all open unsaved tabs into a dedicated permanent Space in seconds.
* **Purge Stale Tabs:** Settings includes a one-click clean-up tool to eliminate closed background tabs from the unsaved cache.

### Multi-Tab Actions
* **Multi-Select Checkboxes:** Click checkboxes on individual tab cards or use the master checkbox to select all tabs.
* **Batch Moving:** Move selected tabs to any existing space or create an **on-the-fly "Move to a New Space"** directly from the drop-down menu.
* **Batch Close / Duplicate:** Close or clone dozens of tabs simultaneously.
* **Tab Sorting:** Sort tabs alphabetically (A–Z), by domain (grouping all Google, GitHub, or YouTube tabs together), or by creation date.
* **Real Browser Tab Reordering:** Moving tabs in SpaceTabs immediately updates the actual tab strip in your physical Chrome browser window.

### Multi-Window Intelligence
* **Window-Space Association:** SpaceTabs remembers which Chrome window is assigned to which space.
* **"This Window" Indicator:** Clearly indicates which tabs are open in your current monitor vs. a background window.
* **Open in New Window:** Open any space's tabs in an isolated, clean new browser window without disturbing your current window.
* **Locate Tab:** Clicking any tab immediately focuses that tab and brings its browser window to the front.

---

## 4. Workspace Productivity Suite

Each space includes 4 specialized canvas views accessible via the top sub-navigation bar:

```
[ 🗂️ Tabs ]   [ 🔖 Resources ]   [ 📝 Notes ]   [ ☑️ Tasks ]
```

### Tabs Canvas
* Visual grid/list of open and saved tabs.
* Domain pills, favicon status, and one-click suspension triggers.
* Search filter to locate tabs instantly within the active space.

### Resources Canvas
* Curated permanent bookmarks dedicated specifically to the active space.
* **Custom Sections:** Organize resources into categories like *Docs*, *Figma*, *Dashboards*, *Tools*.
* **1-Click Import from Open Tabs:** Easily turn any currently open browser tab into a saved resource without copy-pasting URLs.
* External link launch with keyboard accessibility.

### Notes Canvas
* Built-in Markdown notepad for meeting notes, code snippets, and daily logs.
* **Formatting Controls:** Quick buttons for Bold (`Ctrl+B`), Italic (`Ctrl+I`), Headers, Code Blocks, and Lists.
* **Interactive Checklists:** Clickable `- [ ]` checkboxes inside notes that toggle in real-time.
* **Lossless Auto-Save:** Powered by debounced background saving and component unmount flush locks, ensuring zero lost edits.

### Tasks Canvas
* Interactive project checklist for space-specific action items.
* **Progress Tracking:** Real-time percentage bar reflecting completed tasks.
* **Due Dates:** Assign deadlines and sort tasks by urgency.
* **Instant Reordering:** Drag or move tasks to prioritize your day.

---

## 5. Memory Saver & Tab Suspension

SpaceTabs includes a built-in Native Chromium tab suspension engine to free up to **80% of browser RAM**.

### How Suspension Works
* Inactive tabs that exceed your configured idle threshold (15m, 30m, 1h, 2h) are replaced with a lightweight internal page (`suspended.html`).
* The suspended page consumes virtually zero CPU and RAM while preserving the tab's title, favicon, and original URL.
* **1-Click Restoration:** Simply clicking anywhere on the suspended page instantly reloads the original website.

### Whitelist & Smart Exclusions
SpaceTabs automatically detects and avoids suspending:
* Pinned browser tabs.
* Tabs actively playing audio or video (e.g. YouTube, Spotify, Google Meet).
* The active dashboard tab.
* User-specified domains added to your custom whitelist in Settings.

---

## 6. Google Drive Cloud Backup & Sync

SpaceTabs synchronizes your data across all your computers using your personal Google Drive account.

### Privacy & Cloud Security
* **Zero Third-Party Servers:** Your data travels directly between your browser and your own Google Drive. No intermediary databases.
* **Isolated App Folder:** Backups are stored in a dedicated folder named `SpaceTabs_Data` on your Google Drive.
* **Strict Minimal Scope (`drive.file`):** SpaceTabs can *only* access files it creates. It has zero access to your other Google Drive files, photos, or documents.

### Synchronization Engine
* **OAuth2 Authentication:** Instant 1-click login using Chrome's native `chrome.identity` API.
* **Bi-directional Sync:** Changes made on Laptop A automatically push to Google Drive; Laptop B detects and pulls updates seamlessly.
* **Tombstone Architecture:** Deleted spaces or tabs remain deleted across all devices instead of resurfacing.
* **Manual Force Controls:** Dedicated "Push Local to Drive" and "Pull Drive to Local" buttons in Settings for full manual control.

---

## 7. Theming & Personalization Engine

Tailor the look and feel of SpaceTabs to match your monitor and environment:

* **Dual-Zone Independent Themes:**
  - Sidebar: Set to Light or Dark mode.
  - Workspace Canvas: Set to Light or Dark mode independently.
* **8 Curated Light & Dark Palettes:**
  - Dark: *Slate*, *Midnight OLED (True Pitch Black)*, *Space Indigo*, *Forest Dark*, *Warm Espresso*.
  - Light: *Pure Snow*, *Warm Paper (Notion Cream)*, *Cool Zinc*, *Soft Sky*, *Fresh Mint*.
* **Custom Accent Color Picker:** Choose any HEX accent color; SpaceTabs automatically calculates matching hover, glow, and alpha borders.
* **Adjustable Sidebar Width:** Smooth range slider (240px to 400px) with 1-click presets: *Default (260px)*, *Medium (320px)*, *Wide (380px)*.
* **Responsive Header:** Dynamic breakpoints prevent the active space title from shrinking into an ellipsis, even on compact 13" laptop screens.

---

## 8. Keyboard Shortcuts & Hotkeys

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Alt + Shift + W` | Open / Focus SpaceTabs Dashboard | Global Browser |
| `Ctrl + S` / `Cmd + S` | Force-Save Active Note | Notes View |
| `Ctrl + B` / `Cmd + B` | Bold Selected Text | Notes View |
| `Ctrl + I` / `Cmd + I` | Italic Selected Text | Notes View |
| `Tab` | Indent Checklist Item (2 spaces) | Notes View |
| `Enter` | Save Inline Space Title Rename | Header |
| `Escape` | Cancel Space Title Rename | Header |

---

## 9. Data Storage & Security Model

| Data Item | Storage Location | Retention / Privacy |
| :--- | :--- | :--- |
| Spaces, Tabs, Notes, Tasks | Local IndexedDB (`spacetabs_db`) | Stored on user's disk; never shared |
| Preferences & Theme | `chrome.storage.local` | Stored locally inside browser extension storage |
| Cloud Sync Backup | Google Drive (`SpaceTabs_Data/data.json`) | Private to user's Google Account |
| Analytics / Telemetry | **None** | SpaceTabs contains 0 trackers, 0 ads, 0 analytics |

---

## 10. Support & Donations (Patreon)

SpaceTabs is maintained as an independent open project without venture capital, paywalls, or feature gating.

* **Support on Patreon:** Click the **Support on Patreon** button in the sidebar footer or under **Settings > About**.
* **Configurable Creator URL:** Developers can configure their custom Patreon creator URL directly in Settings.
* **Global Creator Payouts:** Patreon supports Payoneer payouts internationally, making it easy for users worldwide to support continued development.
