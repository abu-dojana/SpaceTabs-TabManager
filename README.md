# SpaceTabs 🚀

> **The local-first, memory-saver alternative to Workona and Tablerone.**  
> Built for Google Chrome, Brave, Microsoft Edge, and Chromium browsers (Manifest V3).

SpaceTabs is a modern tab and workspace manager that organizes your browsing into dedicated **Spaces**, frees up gigabytes of RAM using on-demand tab suspension and native discard APIs, and keeps your browsing data strictly private on your device.

---

<p align="center">
  <img src="https://github.com/user-attachments/assets/ceb00445-3644-43b5-818a-c3c220c450e0" alt="SpaceTabs Dashboard" width="100%" />
</p>

---

## ✨ Features

- 📂 **Workspaces & Spaces:** Organize tabs into project spaces with custom icons and names. Switching spaces closes previous tabs and opens the target space's tabs cleanly.
- ⚡ **Zero-RAM Cold Restores:** Restoring a space with 50 tabs opens dormant lightweight placeholder tabs (`suspended.html`) consuming only ~1–2 MB each and zero network bandwidth until clicked.
- 🧹 **Native Chrome Memory Saver:** Automatically discards idle tabs using `chrome.tabs.discard()` without losing tab strip position, favicon, or navigation history.
- 🎯 **Drag & Drop to Spaces:** Drag any tab (or batch of selected tabs) from the canvas directly onto any Space or the Unsaved session in the sidebar.
- 📌 **Always-Accessible Dashboard:** An auto-pinned Index Tab at Tab 0 that never gets lost or closed accidentally, accessible anytime via `Alt+Shift+W`.
- 📝 **Inline Quick-Save:** Click "Unsaved" in the header to instantly name and convert your open browsing session into a permanent Space.
- 🌐 **Browser Internal Tabs:** Full support for `chrome://extensions`, `chrome://settings`, `chrome://newtab`, etc., with custom category SVG icons.
- 🔒 **Local-First & Private:** Everything is stored locally in IndexedDB via Dexie. No cloud tracking, no 5-space paywalls.

---

## 🛠️ Tech Stack

- **Framework:** [WXT](https://wxt.dev/) (Next-gen Web Extension Framework)
- **UI:** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Database:** Dexie.js (IndexedDB wrapper with live reactive hooks)
- **State:** Zustand (ephemeral UI state) + Dexie Live Queries
- **Platform:** Chromium Manifest V3

---

## 🚀 Getting Started — Install for Beta Testing

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- npm or pnpm

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/abu-dojana/SpaceTabs-TabManager.git

# Go into the project directory
cd SpaceTabs-TabManager

# Install dependencies
npm install
```

<details>
<summary><b>⚠️ Windows Troubleshooting: Fix <code>PSSecurityException</code> on <code>npm install</code></b></summary>

<br />

If PowerShell blocks `npm install` with the error `File npm.ps1 cannot be loaded because running scripts is disabled on this system`:

#### Method 1: Allow Local Scripts (Recommended)
Run this command in PowerShell to allow locally installed CLI tools:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then run `npm install` again.

#### Method 2: Call `npm.cmd` Directly
If you don't want to change execution policy, invoke the Windows Command wrapper:
```powershell
npm.cmd install
```
</details>

### 2. Build the Extension

```bash
# Compile and build the extension
npm run build
```

The compiled extension is output to `.output/chrome-mv3` and mirrored into `dist/`.

### 3. Load into Chrome / Brave / Edge

1. Open your browser and navigate to `chrome://extensions/` (or `brave://extensions/`, `edge://extensions/`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist` folder inside your project directory (e.g. `D:\tab-manager\dist` or wherever you cloned the repo).
5. **SpaceTabs** is now installed and will automatically pin the dashboard tab at Tab 0!

---

## ⌨️ Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + Shift + W` | Focus or open the pinned SpaceTabs Dashboard |

---

## 📄 License

MIT License. Open-source and free forever.
