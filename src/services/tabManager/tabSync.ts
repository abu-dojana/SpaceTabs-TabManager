import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { isSystemOrExtensionUrl, decodeRealUrl } from '@/utils/urlFilter';
import { isTransitioning, getWindowActiveSpaceId } from './windowSpaces';

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

export function getEffectiveTabUrl(t: chrome.tabs.Tab): string {
  return t.url || t.pendingUrl || 'chrome://newtab/';
}

export function getEffectiveTabTitle(t: chrome.tabs.Tab, realUrl: string): string {
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

export async function performSyncWindowTabs(windowId: number) {
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
