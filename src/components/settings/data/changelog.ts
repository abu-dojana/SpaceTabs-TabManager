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
