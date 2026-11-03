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
