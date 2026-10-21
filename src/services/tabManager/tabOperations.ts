import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { decodeRealUrl } from '@/utils/urlFilter';
import { recordTombstones } from '@/services/driveSync';

/**
 * Single Tab Click: Focus if already open, or create new tab
 */
export async function focusOrOpenTab(url: string, windowId?: number) {
  const realUrl = decodeRealUrl(url);
  const tabs = await chrome.tabs.query({ currentWindow: true });

  const existingTab = tabs.find((t) => decodeRealUrl(t.url) === realUrl);
  if (existingTab?.id) {
    await chrome.tabs.update(existingTab.id, { active: true });
    if (existingTab.windowId) {
      try {
        await chrome.windows.update(existingTab.windowId, { focused: true });
      } catch {}
    }
  } else {
    await chrome.tabs.create({
      url: realUrl,
      windowId,
      active: true,
    });
  }
}

/**
 * Locates an existing open tab across ANY window, activates it,
 * and brings its window to the foreground.
 * If not currently open anywhere, creates it in the current window.
 */
export async function locateOrOpenTab(tabRecord: {
  id: string;
  url: string;
  chromeTabId?: number;
  windowId?: number;
}) {
  const realUrl = decodeRealUrl(tabRecord.url);
  const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

  // 1. Check if the tab's recorded chromeTabId is still open
  if (tabRecord.chromeTabId) {
    try {
      const liveTab = await chrome.tabs.get(tabRecord.chromeTabId);
      if (liveTab && liveTab.id) {
        await chrome.tabs.update(liveTab.id, { active: true });
        if (liveTab.windowId) {
          await chrome.windows.update(liveTab.windowId, { focused: true });
        }
        return;
      }
    } catch {
      // Tab may have been closed or reloaded
    }
  }

  // 2. Search across ALL open windows for a tab matching realUrl
  try {
    const allTabs = await chrome.tabs.query({});
    const match = allTabs.find((t) => {
      if (!t.url) return false;
      if (t.url.startsWith(dashboardUrl)) return false;
      const tabReal = decodeRealUrl(t.url);
      const tabPending = decodeRealUrl(t.pendingUrl || '');
      return tabReal === realUrl || tabPending === realUrl;
    });

    if (match && match.id) {
      await chrome.tabs.update(match.id, { active: true });
      if (match.windowId) {
        await chrome.windows.update(match.windowId, { focused: true });
      }
      await db.tabs.update(tabRecord.id, {
        chromeTabId: match.id,
        windowId: match.windowId,
        updatedAt: Date.now(),
      });
      return;
    }
  } catch (err) {
    console.error('Failed to locate tab across windows:', err);
  }

  // 3. Not currently open anywhere: open it in current window
  try {
    const currentWin = await chrome.windows.getCurrent();
    const newTab = await chrome.tabs.create({
      url: realUrl,
      windowId: currentWin.id,
      active: true,
    });
    if (newTab.id && currentWin.id) {
      await db.tabs.update(tabRecord.id, {
        chromeTabId: newTab.id,
        windowId: currentWin.id,
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.error('Failed to open tab:', err);
  }
}

/**
 * Moves one or more tabs to a target space.
 * Closes the tab from the active Chrome window if it was open,
 * so the workspace remains clean.
 */
export async function moveTabsToSpace(
  tabIds: string[],
  targetSpaceId: string | null
) {
  if (!tabIds || tabIds.length === 0) return;
  const normalizedTarget = targetSpaceId || UNSAVED_SPACE_ID;
  const now = Date.now();

  const targetTabs = await db.tabs
    .where('spaceId')
    .equals(normalizedTarget)
    .sortBy('order');
  let nextOrder = targetTabs.length > 0 ? targetTabs[targetTabs.length - 1].order + 1 : 0;

  for (const id of tabIds) {
    const tab = await db.tabs.get(id);
    if (!tab) continue;
    if (tab.spaceId === normalizedTarget) continue;

    const oldChromeTabId = tab.chromeTabId;

    await db.tabs.update(id, {
      spaceId: normalizedTarget,
      chromeTabId: undefined,
      order: nextOrder++,
      updatedAt: now,
    });

    if (oldChromeTabId) {
      try {
        await chrome.tabs.remove(oldChromeTabId);
      } catch {
        // Tab might already be closed
      }
    }
  }
}

/**
 * Closes one or more tabs:
 * 1. Closes the physical Chrome browser tab if it is currently open in any window.
 * 2. Removes the tab record from the database.
 */
export async function closeTabs(tabIds: string[]) {
  if (!tabIds || tabIds.length === 0) return;
  const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

  let currentWindowId: number | undefined;
  try {
    const curWin = await chrome.windows.getCurrent();
    currentWindowId = curWin.id;
  } catch {}

  let allBrowserTabs: chrome.tabs.Tab[] = [];
  try {
    allBrowserTabs = await chrome.tabs.query({});
  } catch {}

  const tombstonesToRecord: { id: string; table: 'tabs' }[] = [];

  for (const id of tabIds) {
    const record = await db.tabs.get(id);
    if (!record) {
      await db.tabs.delete(id);
      continue;
    }

    const realUrl = decodeRealUrl(record.url);
    let targetBrowserTabId: number | undefined;

    // 1. Try exact match by chromeTabId
    if (record.chromeTabId) {
      const match = allBrowserTabs.find((t) => t.id === record.chromeTabId);
      if (match?.id && !match.url?.startsWith(dashboardUrl)) {
        targetBrowserTabId = match.id;
      }
    }

    // 2. Fallback: match by URL within record's windowId or current window
    if (!targetBrowserTabId) {
      const preferredWinId = record.windowId || currentWindowId;
      const match = allBrowserTabs.find((t) => {
        if (!t.id || t.url?.startsWith(dashboardUrl)) return false;
        if (preferredWinId && t.windowId !== preferredWinId) return false;
        const tReal = decodeRealUrl(t.url || '');
        const tPending = decodeRealUrl(t.pendingUrl || '');
        return tReal === realUrl || tPending === realUrl;
      });
      if (match?.id) {
        targetBrowserTabId = match.id;
      }
    }

    // Close the physical browser tab in Chrome if open
    if (targetBrowserTabId) {
      try {
        await chrome.tabs.remove(targetBrowserTabId);
        // Exclude the closed tab from subsequent iterations
        allBrowserTabs = allBrowserTabs.filter((t) => t.id !== targetBrowserTabId);
      } catch (err) {
        // Tab might have already been closed
      }
    }

    // Collect tombstone for cloud sync if this is a saved workspace tab
    if (record && record.spaceId !== UNSAVED_SPACE_ID) {
      tombstonesToRecord.push({ id, table: 'tabs' });
    }

    // Always delete the record from Dexie
    await db.tabs.delete(id);
  }

  // Atomically record all tombstones in a single batch to avoid race conditions
  if (tombstonesToRecord.length > 0) {
    await recordTombstones(tombstonesToRecord);
  }
}
