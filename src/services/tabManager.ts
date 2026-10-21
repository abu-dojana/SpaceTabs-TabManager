import { db } from '@/db';
import { type Tab as DbTab, UNSAVED_SPACE_ID } from '@/db/schema';
import { isSystemOrExtensionUrl, decodeRealUrl, isSuspendableUrl } from '@/utils/urlFilter';
import { recordTombstone, recordTombstones } from '@/services/driveSync';

export const SUSPENDED_URL_PREFIX = '/suspended.html';

/**
 * Builds the URL for a suspended cold-restore placeholder tab
 */
export function buildSuspendedUrl(realUrl: string, title: string): string {
  const base = chrome.runtime.getURL(SUSPENDED_URL_PREFIX);
  const params = new URLSearchParams({
    url: realUrl,
    title: title || realUrl,
  });
  return `${base}?${params.toString()}`;
}

/**
 * Gets the active space bound to a window (null means UNSAVED)
 */
export async function getWindowActiveSpaceId(windowId: number): Promise<string | null> {
  try {
    const key = `window_${windowId}_space`;
    const data = await chrome.storage.session.get(key);
    const spaceId = data[key];
    if (spaceId && spaceId !== UNSAVED_SPACE_ID) {
      return spaceId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Binds an active space to a window
 */
export async function setWindowActiveSpaceId(
  windowId: number,
  spaceId: string | null
) {
  try {
    const key = `window_${windowId}_space`;
    if (spaceId && spaceId !== UNSAVED_SPACE_ID) {
      await chrome.storage.session.set({ [key]: spaceId });
    } else {
      await chrome.storage.session.remove(key);
    }
  } catch (err) {
    console.error('Failed to set window active space:', err);
  }
}

/**
 * Transition Lock management to prevent race conditions during batch tab operations
 */
export async function setTransitionLock(windowId: number, locked: boolean) {
  try {
    if (locked) {
      await chrome.storage.session.set({ [`transition_lock_${windowId}`]: true });
    } else {
      await chrome.storage.session.remove(`transition_lock_${windowId}`);
    }
  } catch {
    // Session storage may fail if unsupported or extension reloading
  }
}

export async function isTransitioning(windowId: number): Promise<boolean> {
  try {
    const result = await chrome.storage.session.get(`transition_lock_${windowId}`);
    return !!result[`transition_lock_${windowId}`];
  } catch {
    return false;
  }
}

const syncDebounceTimers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Debounced sync of currently open tabs in a window to the window's active space
 */
export async function syncWindowTabsToUnsaved(windowId: number) {
  const existingTimer = syncDebounceTimers.get(windowId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  syncDebounceTimers.set(
    windowId,
    setTimeout(async () => {
      syncDebounceTimers.delete(windowId);
      await performSyncWindowTabs(windowId);
    }, 250)
  );
}

function getEffectiveTabUrl(t: chrome.tabs.Tab): string {
  return t.url || t.pendingUrl || 'chrome://newtab/';
}

function getEffectiveTabTitle(t: chrome.tabs.Tab, realUrl: string): string {
  if (t.title && t.title !== realUrl) return t.title;
  if (realUrl.startsWith('chrome://newtab') || realUrl.startsWith('about:blank')) {
    return 'New Tab';
  }
  if (realUrl.startsWith('chrome://extensions')) {
    return 'Extensions';
  }
  if (realUrl.startsWith('chrome://settings')) {
    return 'Settings';
  }
  if (realUrl.startsWith('chrome://downloads')) {
    return 'Downloads';
  }
  if (realUrl.startsWith('chrome://history')) {
    return 'History';
  }
  if (realUrl.startsWith('chrome://bookmarks')) {
    return 'Bookmarks';
  }
  return t.title || realUrl;
}

async function performSyncWindowTabs(windowId: number) {
  try {
    if (await isTransitioning(windowId)) return;

    let win: chrome.windows.Window;
    try {
      win = await chrome.windows.get(windowId);
    } catch {
      return; // Window already closed
    }
    if (win.type !== 'normal') return;

    // Determine active space for this window:
    const activeSpaceId = await getWindowActiveSpaceId(windowId);
    const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

    const tabs = await chrome.tabs.query({ windowId });
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

    const validTabs = tabs.filter((t) => {
      if (t.pinned) return false;
      const effectiveUrl = getEffectiveTabUrl(t);
      if (effectiveUrl.startsWith(dashboardUrl)) return false;
      if (isSystemOrExtensionUrl(effectiveUrl)) return false;
      return true;
    });

    const now = Date.now();

    // Read existing tabs in DB for this space
    const existing = await db.tabs
      .where('spaceId')
      .equals(targetSpaceId)
      .toArray();

    const validTabIds = new Set(validTabs.map((t) => t.id));
    const matchedRecordIds = new Set<string>();

    // Map open browser tabs to Dexie records
    for (let i = 0; i < validTabs.length; i++) {
      const browserTab = validTabs[i];
      const effectiveUrl = getEffectiveTabUrl(browserTab);
      const realUrl = decodeRealUrl(effectiveUrl);
      const title = getEffectiveTabTitle(browserTab, realUrl);
      const favIconUrl = browserTab.favIconUrl || '';

      // 1. Match by exact chromeTabId first
      let match = existing.find(
        (e) => !matchedRecordIds.has(e.id) && e.chromeTabId === browserTab.id
      );

      // 2. If no exact tabId match, match by url ONLY if:
      // - The record is NOT already claimed by another active tab in this or another window
      // - And the record belongs to this windowId or has no windowId yet
      if (!match) {
        match = existing.find(
          (e) =>
            !matchedRecordIds.has(e.id) &&
            e.url === realUrl &&
            (!e.chromeTabId || e.windowId === windowId) &&
            (!e.chromeTabId || !validTabIds.has(e.chromeTabId))
        );
      }

      if (match) {
        matchedRecordIds.add(match.id);
        const tabUrl =
          browserTab.discarded && (!browserTab.url || browserTab.url === 'chrome://newtab/')
            ? match.url
            : realUrl;
        const tabTitle =
          browserTab.discarded && (!browserTab.title || browserTab.title === 'New Tab')
            ? match.title
            : title;

        await db.tabs.update(match.id, {
          chromeTabId: browserTab.id,
          windowId,
          title: tabTitle,
          url: tabUrl,
          favIconUrl: favIconUrl || match.favIconUrl,
          order: i,
          updatedAt: now,
        });
      } else {
        const newId = crypto.randomUUID();
        matchedRecordIds.add(newId);
        await db.tabs.add({
          id: newId,
          chromeTabId: browserTab.id,
          spaceId: targetSpaceId,
          windowId,
          url: realUrl,
          title,
          favIconUrl,
          order: i,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Clean up closed tabs for THIS window only
    for (const record of existing) {
      // Critical Guard: NEVER delete a record that was matched or updated during this sync cycle!
      if (matchedRecordIds.has(record.id)) continue;

      if (
        record.windowId === windowId &&
        record.chromeTabId &&
        !validTabIds.has(record.chromeTabId)
      ) {
        // Safe check: Verify if the tab is truly closed before deleting from Dexie
        let stillExistsInBrowser = false;
        try {
          const checkTab = await chrome.tabs.get(record.chromeTabId);
          if (checkTab) {
            stillExistsInBrowser = true;
            if (checkTab.windowId !== windowId) {
              await db.tabs.update(record.id, { windowId: checkTab.windowId, updatedAt: now });
            }
          }
        } catch {
          stillExistsInBrowser = false;
        }

        if (!stillExistsInBrowser) {
          await db.tabs.delete(record.id);
        }
      }
    }
  } catch (err) {
    console.error('Error syncing window tabs:', err);
  }
}

/**
 * Switches the current window to a target space:
 * Saves current tabs, closes them in Chrome, binds the window to the target space,
 * and opens the target space's tabs.
 */
export async function switchWindowToSpace(
  windowId: number,
  targetSpaceId: string | null
) {
  const currentSpaceId = await getWindowActiveSpaceId(windowId);
  const normalizedCurrent = currentSpaceId || UNSAVED_SPACE_ID;
  const normalizedTarget = targetSpaceId || UNSAVED_SPACE_ID;

  if (normalizedCurrent === normalizedTarget) return;

  await setTransitionLock(windowId, true);

  try {
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');
    const allTabs = await chrome.tabs.query({ windowId });

    // Explicitly identify the pinned dashboard tab
    const dashboardTab = allTabs.find((t) => t.url?.startsWith(dashboardUrl));
    if (dashboardTab?.id) {
      // Focus dashboard first so closing other tabs doesn't trigger random tab focus handover
      await chrome.tabs.update(dashboardTab.id, { active: true });
    }

    // 1. Identify open tabs to save and close
    const tabsToClose = allTabs.filter((t) => {
      if (t.pinned) return false;
      const effectiveUrl = getEffectiveTabUrl(t);
      if (effectiveUrl.startsWith(dashboardUrl)) return false;
      if (isSystemOrExtensionUrl(effectiveUrl)) return false;
      return true;
    });

    const now = Date.now();

    // Snapshot existing tabs and unlink their chromeTabId
    for (let i = 0; i < tabsToClose.length; i++) {
      const bt = tabsToClose[i];
      const effectiveUrl = getEffectiveTabUrl(bt);
      const realUrl = decodeRealUrl(effectiveUrl);
      const title = getEffectiveTabTitle(bt, realUrl);

      const record = await db.tabs
        .where('chromeTabId')
        .equals(bt.id!)
        .first();

      if (record) {
        await db.tabs.update(record.id, {
          title,
          url: realUrl,
          favIconUrl: bt.favIconUrl || record.favIconUrl,
          order: i,
          updatedAt: now,
          chromeTabId: undefined, // Disassociate from closed tab
        });
      } else {
        await db.tabs.add({
          id: crypto.randomUUID(),
          spaceId: normalizedCurrent,
          windowId,
          url: realUrl,
          title,
          favIconUrl: bt.favIconUrl || '',
          order: i,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 2. Close previous tabs in Chrome
    const tabIdsToClose = tabsToClose
      .map((t) => t.id)
      .filter((id): id is number => typeof id === 'number');

    if (tabIdsToClose.length > 0) {
      await chrome.tabs.remove(tabIdsToClose);
    }

    // Re-assert focus on dashboard tab after closing previous tabs
    if (dashboardTab?.id) {
      await chrome.tabs.update(dashboardTab.id, { active: true });
    }

    // 3. Set the new active space for this window
    await setWindowActiveSpaceId(windowId, targetSpaceId);

    // 4. Fetch tabs for the target space
    const targetTabs = await db.tabs
      .where('spaceId')
      .equals(normalizedTarget)
      .sortBy('order');

    // 5. Open target tabs dormant in the background
    for (let i = 0; i < targetTabs.length; i++) {
      const tabRecord = targetTabs[i];
      const openUrl = isSuspendableUrl(tabRecord.url)
        ? buildSuspendedUrl(tabRecord.url, tabRecord.title)
        : tabRecord.url;

      const created = await chrome.tabs.create({
        windowId,
        url: openUrl,
        active: false,
      });

      if (created.id) {
        await db.tabs.update(tabRecord.id, {
          chromeTabId: created.id,
          windowId,
          updatedAt: Date.now(),
        });
      }
    }

    // 6. Guarantee that focus remains locked to the dashboard tab
    if (dashboardTab?.id) {
      await chrome.tabs.update(dashboardTab.id, { active: true });
    }
  } catch (err) {
    console.error('Error switching space:', err);
  } finally {
    setTimeout(() => {
      setTransitionLock(windowId, false);
    }, 600);
  }
}

/**
 * Non-destructive opening: "Open all tabs in another window"
 */
export async function openSpaceInNewWindow(spaceId: string) {
  const space = await db.spaces.get(spaceId);
  if (!space) return;

  const spaceTabs = await db.tabs
    .where('spaceId')
    .equals(spaceId)
    .sortBy('order');

  const newWindow = await chrome.windows.create({
    type: 'normal',
    focused: true,
  });

  if (!newWindow.id) return;

  await setTransitionLock(newWindow.id, true);

  try {
    // Bind active space to new window
    await setWindowActiveSpaceId(newWindow.id, spaceId);

    // Restore space tabs
    for (let i = 0; i < spaceTabs.length; i++) {
      const tabItem = spaceTabs[i];
      const openUrl = isSuspendableUrl(tabItem.url)
        ? buildSuspendedUrl(tabItem.url, tabItem.title)
        : tabItem.url;

      const createdTab = await chrome.tabs.create({
        windowId: newWindow.id,
        url: openUrl,
        active: i === 0, // only focus the first restored tab
      });

      if (createdTab.id) {
        await db.tabs.update(tabItem.id, {
          chromeTabId: createdTab.id,
          windowId: newWindow.id,
          updatedAt: Date.now(),
        });
      }
    }
  } finally {
    setTimeout(() => {
      if (newWindow.id) setTransitionLock(newWindow.id, false);
    }, 600);
  }
}

/**
 * Non-destructive opening: "Open all tabs here" (switches current window to this space)
 */
export async function openSpaceInCurrentWindow(spaceId: string, windowId: number) {
  await switchWindowToSpace(windowId, spaceId);
}

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

