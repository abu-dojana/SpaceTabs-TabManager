export interface ChangelogRelease {
  version: string;
  title: string;
  items: {
    lead?: string;
    codeTag?: string;
    leadSuffix?: string;
    description: string;
  }[];
  compact?: boolean;
}

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: '1.5.1',
    title: 'Version 1.5.1 — Google Drive Auto-Sync & Unsaved Session Tab Move Fix',
    items: [
      {
        lead: 'Saved Space ↔ Unsaved Session Sync Protection:',
        description:
          'Fixed a cloud sync bug where dragging or moving tabs from a synced Saved Space into an Unsaved session could allow background Google Drive Auto-Sync to pull those tabs back into the Saved Space.',
      },
      {
        lead: 'Self-Healing Unsaved Isolation & Duplicate Tab Guard:',
        description:
          'Hardened Google Drive merge and Force Pull to re-key and tombstone any local Unsaved items whose IDs still exist in remote Saved Spaces, and prevented space switching from pruning duplicate dormant tabs in a Saved Space.',
      },
    ],
  },
  {
    version: '1.5.0',
    title: 'Version 1.5.0 — Close from Tab Strip (Keep in Space), "Open Here" Batch Restore & Multi-Window Protection',
    items: [
      {
        lead: 'Close from Tab Strip (Keep Saved in Space):',
        description:
          'Added a "Close from tab strip (keep saved in space)" button on open tab rows, "Close from Strip" in the batch selection bar, and "Close all from tab strip" in the Tabs 3-dot menu so you can close tabs from Chrome’s top tab bar to free RAM and declutter while keeping them saved in your Space.',
      },
      {
        lead: '"Open Here" Batch Restore & Compact Single-Line Batch Action Bar:',
        description:
          'Added an "Open Here" button in the batch selection bar (and updated the "Open in this window" button on closed tab rows) to reopen selected closed/dormant tabs directly into the current window’s tab strip, alongside a streamlined single-line batch bar (Move to, Open Here, Open in New Window, Close from Strip).',
      },
      {
        lead: 'Multi-Window Early Window-Close Tab Protection & Duplicate Preservation:',
        description:
          'Fixed a race condition where moving or opening a tab from a saved Space into a new window and closing that window before the tab or extension finished loading could delete the tab from the Space. Also preserved deliberate duplicate and dormant tabs across background sync cycles.',
      },
    ],
  },
  {
    version: '1.4.4',
    title: 'Version 1.4.4 — Smarter ADHD-Friendly Search, Quick New Window & Resource/Note Sorting',
    items: [
      {
        lead: 'Smarter, ADHD & Forgetful-Friendly Global Search (',
        codeTag: 'Ctrl + K',
        leadSuffix: '):',
        description:
          'Spaces now appear as first-class search results at the top of the dropdown with a dedicated Spaces filter pill and relevance ranking (exact > prefix > whole-word > substring > fuzzy typo match). Added typo tolerance, semantic site-type recall (search "sheet", "doc", "colab", "video", "ai", "pdf"), a Quick Recall panel with Recent Searches and Recently Active items on focus (with Clear history & per-item dismiss buttons), and an optional "Include Archived Spaces in Search" toggle in Settings → General.',
      },
      {
        lead: 'Quick "Open a New Window" Button in Sidebar Unsaved Header:',
        description:
          'Added an "Open a New window" button right beside the "+" icon on the UNSAVED header in the sidebar to launch a fresh browser window with a single click (just like pressing Ctrl+N).',
      },
      {
        lead: 'Live Non-Zero Item Counts Beside Tabs, Resources, Notes & Tasks:',
        description:
          'Workspace navigation tabs now display live item counts directly beside each category label (e.g., Tabs(9), Resources(2), Notes(3), Tasks(4)) and automatically hide the number when a category has zero items.',
      },
      {
        lead: 'Viewport-Aware Dropdown & Popup Menus Across Sidebar & Canvas:',
        description:
          'Fixed dropdown and 3-dot context menus in the Sidebar, Right Floating Panel, Resources (Add Open Tab & 3-dot menus), Tasks, Notes, and Tabs so popups never get clipped by scroll containers or require scrolling down.',
      },
      {
        lead: 'Drag-and-Drop Reordering & Sorting for Resources & Notes:',
        description:
          'Added drag-and-drop reordering and 1-click sorting for Resource sections (drag cards, Move section up/down, Sort Sections A–Z), Resource items inside sections (drag to reorder within or across sections, Sort items A–Z, Sort items by domain), and Notes (drag to reorder notes plus a Sort menu for A–Z, Z–A, Recently Updated, and Date Created).',
      },
    ],
  },
  {
    version: '1.4.3',
    title: 'Version 1.4.3 — Right Floating Panel for Section Spaces & Live Active Section Indicator',
    items: [
      {
        lead: 'Right Floating Panel for Section Navigation:',
        description:
          'Added an optional "Right Floating Panel" layout toggle in Settings (General & Appearance). When enabled, sections in the left sidebar stay compact and clicking a section opens its Spaces in a floating panel on the right side of the canvas—supporting space switching, drag-and-drop tab movement, space reordering, and quick space creation directly inside the selected section.',
      },
      {
        lead: 'Live Blinking Green Dot on Active Sections:',
        description:
          'Sections containing your currently active Space now display a live pulsing green indicator dot in the sidebar so you can spot your active section at a glance across large workspaces (enabled by default, with a toggle in Settings).',
      },
      {
        lead: 'Independent Right Floating Panel Width Slider:',
        description:
          'Added a dedicated width slider (180px–360px) and quick presets (Compact, Default, Wide) in Appearance Settings to resize the Right Floating Panel independently of the left sidebar.',
      },
    ],
  },
  {
    version: '1.4.2',
    title: 'Version 1.4.2 — Dynamic Window Titles for Saved Spaces & Unsaved Sessions',
    items: [
      {
        lead: 'Saved Space Window Titles with Emoji:',
        description:
          'When viewing the SpaceTabs Dashboard, the browser window title now displays the active saved Space’s emoji icon and name (e.g., "🎯 GCI — SpaceTabs") so multiple dashboard windows are easily distinguishable in the OS taskbar and Alt+Tab.',
      },
      {
        lead: 'Unsaved Session Domain Summary Window Titles:',
        description:
          'Windows viewing an Unsaved session on the Dashboard now display the session’s live domain summary in the window title (e.g., "gemini.google.com + 5 — SpaceTabs") and update automatically as tabs are opened or closed.',
      },
    ],
  },
  {
    version: '1.4.1',
    title: 'Version 1.4.1 — Multi-Profile & Window-Reopen Saved Space Restoration Fix',
    items: [
      {
        lead: 'Multi-Profile & macOS Session Restoration Fix:',
        description:
          'Fixed a bug where closing a browser profile while another profile stayed open (or closing the last window on macOS) preserved the per-session initialization flag and caused reopened saved Spaces to open in an Unsaved session instead of restoring the active Space.',
      },
      {
        lead: 'Restored Tab Attachment Timing Guard:',
        description:
          'Added a brief startup wait when persisted Space bindings exist so restored tabs finish attaching to the reopened window before Space matching runs.',
      },
      {
        lead: 'Preserve Duplicate & Shared Tabs in Unsaved Sessions:',
        description:
          'Removed destructive startup deduplication on Unsaved sessions so intentional duplicate tabs and tabs whose URLs overlap with restored Spaces are preserved across browser restarts.',
      },
      {
        lead: 'Open Unsaved Sessions in a New Window:',
        description:
          'Added an "Open in new window" button (and Ctrl+Click shortcut + other-window switcher) to Unsaved sessions in the sidebar and Dashboard header.',
      },
    ],
  },
  {
    version: '1.4.0',
    title: 'Version 1.4.0 — HTML & JSON Export/Import, Multi-Window Space Switch Fix & Safe Deduplication',
    items: [
      {
        lead: 'HTML & JSON Space Export & Universal Import:',
        description:
          'Added Export as JSON and Export as HTML (styled clickable webpage + Netscape Bookmark compatible) in the Tabs menu, Sidebar Space menu, and Settings Backup tab, plus Import into Current Space and Import as New Space.',
      },
      {
        lead: 'Side-by-Side Window Space Switch Fix:',
        description:
          'Fixed a bug where opening a tab in a new window and then switching spaces could create duplicate tab records when chromeTabId bindings differed across windows.',
      },
      {
        lead: 'Safe Duplicate Tab Closing:',
        description:
          'Fixed Close Duplicate Tabs so it always preserves the live browser tab and deletes database records before closing redundant browser tabs, preventing background sync from removing the original tab.',
      },
      {
        lead: 'Non-Chrome Google Drive Token Caching & Tombstone Queue:',
        description:
          'Added OAuth access token expiry caching for Brave, Edge, Vivaldi, and custom Client IDs, serialized tombstone writes, and excluded unsaved sessions from cloud tombstones.',
      },
      {
        lead: 'Note Editor Auto-Save Race Fix & URL Sanitization:',
        description:
          'Prevented late-resolving note flushes on space switch from dropping subsequent auto-saves, and hardened Markdown links and suspended tab restoration against unsafe URI schemes.',
      },
    ],
  },
  {
    version: '1.3.1',
    title: 'Version 1.3.1 — Multi-Window Unsaved Sessions Protection & Stability',
    items: [
      {
        lead: 'Unsaved Sessions Multi-Window Protection:',
        description:
          'Fixed an issue where opening a new browser window (Ctrl+N or New window) while inside a saved space could accidentally overwrite and delete background unsaved sessions.',
      },
      {
        lead: 'Smart Tab Matching & Overlap Verification:',
        description:
          'Enhanced window space assignment to require strong tab overlap (>= 60%) before reclaiming existing sessions, ensuring blank new tab pages always open as fresh sessions without touching dormant tabs.',
      },
    ],
  },
  {
    version: '1.3.0',
    title: 'Version 1.3.0 — Unified Cross-Space Search, Persistent Sections & Workspace Polish',
    items: [
      {
        lead: 'Obsidian Charcoal, Sakura Blossom & True OLED Themes:',
        description:
          'Added Obsidian Charcoal dark palette and Sakura Blossom light palette. Refined Midnight OLED to true #000000 pitch-black across sidebar, header, canvas, and cards, and fixed full-workspace theme synchronization across Sidebar and Canvas.',
      },
      {
        lead: 'Unified Cross-Space Search with Filters:',
        description:
          'Search across Tabs, Notes, Tasks, and Resources in all Spaces and Unsaved sessions from the header. Includes instant filter pills (All, Tabs, Notes, Tasks, Resources), match counts, Space badges, and highlighted search keywords.',
      },
      {
        lead: 'Workspace Chat Preview:',
        description:
          'Added a dedicated Chat workspace option beside Tasks featuring upcoming AI space assistants and collaboration preview.',
      },
      {
        lead: 'Persistent Collapsed Sections:',
        description:
          'Sidebar space sections and resource sections now remember their collapsed or expanded state across browser restarts and synchronize across open windows.',
      },
      {
        lead: 'Space-Switch Isolation Hardening:',
        description:
          'Added cross-context per-window Web Locks, expiry-based transition locks, scoped outgoing tab stashing, and resilient tab closing so switching spaces never leaks or merges tabs between workspaces.',
      },
      {
        lead: 'Modular Architecture Upgrade:',
        description:
          'Refactored the entire codebase into focused, maintainable domain services, hooks, and UI modules with automated file-size enforcement.',
      },
    ],
  },
  {
    version: '1.2.2',
    title: 'Version 1.2.2 — Data Integrity, Unsaved Session Persistence & Shortcut Polish',
    items: [
      {
        lead: 'Unsaved Session Notes, Tasks & Resources Persistence:',
        description:
          'Notes, tasks, and resource sections inside Unsaved sessions are now preserved across browser restarts, window closes, and Google Drive syncs.',
      },
      {
        lead: 'Cloud Sync & Backup Hardening:',
        description:
          'Added cross-context Web Locks, post-download local state snapshots, runtime tab ID stripping, and tombstone-safe backup imports.',
      },
      {
        lead: 'Jump to Dashboard Shortcut (',
        codeTag: 'Alt + Shift + W',
        leadSuffix: ') & Toolbar Action:',
        description:
          'Reliable window focusing and dashboard activation from any tab, plus live shortcut status and 1-click browser shortcut configuration.',
      },
    ],
  },
  {
    version: '1.2.1',
    title: 'Version 1.2.1 — Side-by-Side Multi-Window Polish',
    items: [
      {
        lead: 'Side-by-Side Space Continuity:',
        description:
          'Opening a single tab (or selected tabs) in a new window now keeps both windows bound to the same Space with accurate This Window and Another Window indicators instead of creating duplicate Unsaved sessions.',
      },
      {
        lead: 'Seamless Tab Drag-Out Support:',
        description:
          'Dragging a tab out of a browser window with your mouse now automatically creates the pinned SpaceTabs Dashboard at index 0 and preserves its Space binding as soon as you release the tab.',
      },
    ],
  },
  {
    version: '1.2.0',
    title: 'Version 1.2.0 — Stability, Sorting & Session Continuity',
    items: [
      {
        lead: 'Custom Section Sorting:',
        description:
          'Reorder sidebar sections via drag-and-drop when unlocked or from the section menu, synced automatically with Google Drive.',
      },
      {
        lead: 'Seamless Space Restore on Browser Startup:',
        description:
          'Reopening the browser now restores your active saved Space directly without duplicating tabs into Unsaved sessions.',
      },
      {
        lead: 'Live Tab Reordering & Sorting:',
        description:
          'Drag-and-drop tabs or sort alphabetically / by domain to reorder both your SpaceTabs list and live browser tabs.',
      },
      {
        lead: 'Pinned Dashboard Rescue:',
        description:
          'Clicking bookmarks or navigating from the Dashboard opens the site in a normal tab while preserving your pinned SpaceTabs tab at index 0.',
      },
    ],
  },
  {
    version: '1.1.0',
    title: 'Version 1.1.0 — Customization & Polish',
    compact: true,
    items: [
      {
        description:
          'Interactive emoji picker when renaming Spaces in the Sidebar and Header.',
      },
      {
        description:
          'Drag-and-drop Space ordering with a 1-click lock toggle in the Sidebar.',
      },
      {
        description:
          'Distraction-free toggle to show or hide web favicons across workspaces.',
      },
    ],
  },
];
