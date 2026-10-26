import { db } from '@/db';
import { type Tab, UNSAVED_SPACE_ID } from '@/db/schema';
import { isSystemOrExtensionUrl, decodeRealUrl } from '@/utils/urlFilter';
import {
  isTransitioning,
  getWindowActiveSpaceId,
  ensureWindowUnsavedSpace,
  ensureSessionInitialized,
  getAllWindowSpaces,
} from './windowSpaces';
import { recordTombstone } from '@/services/driveSync';

const syncDebounceTimers = new Map<number, ReturnType<typeof setTimeout>>();
const activeSyncPromises = new Map<number, Promise<void>>();
const pendingSyncWindows = new Set<number>();

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

/**
 * Migrates any legacy tabs stored with spaceId '__unsaved__' into an active unsaved space
 */
export async function migrateLegacyUnsavedTabs(): Promise<void> {
  try {
    const legacyTabs = await db.tabs
      .where('spaceId')
      .equals(UNSAVED_SPACE_ID)
      .toArray();

    if (legacyTabs.length > 0) {
      let targetSpace = await db.spaces
        .filter((s) => !!s.isUnsaved && !s.isArchived)
        .first();

      if (!targetSpace) {
        const id = crypto.randomUUID();
        const now = Date.now();
        targetSpace = {
          id,
          name: '',
          isUnsaved: true,
          order: now,
          createdAt: now,
          updatedAt: now,
          isArchived: false,
        };
        await db.spaces.add(targetSpace);
      }

      const existingInTarget = await db.tabs
        .where('spaceId')
        .equals(targetSpace.id)
        .toArray();
      const existingUrls = new Set(existingInTarget.map((t) => decodeRealUrl(t.url)));
      const existingChromeTabIds = new Set(
        existingInTarget.map((t) => t.chromeTabId).filter((id): id is number => typeof id === 'number')
      );

      for (const lt of legacyTabs) {
        const realUrl = decodeRealUrl(lt.url);
        if (
          (lt.chromeTabId && existingChromeTabIds.has(lt.chromeTabId)) ||
          existingUrls.has(realUrl)
        ) {
          await db.tabs.delete(lt.id);
        } else {
          existingUrls.add(realUrl);
          if (lt.chromeTabId) existingChromeTabIds.add(lt.chromeTabId);
          await db.tabs.update(lt.id, { spaceId: targetSpace.id });
        }
      }
    }
  } catch (err) {
    console.warn('Error migrating legacy unsaved tabs:', err);
  }
}

export async function performSyncWindowTabs(windowId: number): Promise<void> {
  if (activeSyncPromises.has(windowId)) {
    pendingSyncWindows.add(windowId);
    return activeSyncPromises.get(windowId);
  }

  const runSync = async () => {
    try {
      await executeSyncWindowTabs(windowId);
    } finally {
      activeSyncPromises.delete(windowId);
      if (pendingSyncWindows.has(windowId)) {
        pendingSyncWindows.delete(windowId);
        await performSyncWindowTabs(windowId);
      }
    }
  };

  const promise = runSync();
  activeSyncPromises.set(windowId, promise);
  return promise;
}

async function executeSyncWindowTabs(windowId: number) {
  try {
    await ensureSessionInitialized();
    if (await isTransitioning(windowId)) return;

    let win: chrome.windows.Window;
    try {
      win = await chrome.windows.get(windowId);
    } catch {
      return; // Window already closed
    }
    if (win.type !== 'normal') return;

    const allBrowserTabs = await chrome.tabs.query({});
    const allOpenTabIds = new Set(
      allBrowserTabs.map((t) => t.id).filter((id): id is number => typeof id === 'number')
    );
    const tabs = allBrowserTabs.filter((t) => t.windowId === windowId);
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

    let validTabs = tabs.filter((t) => {
      if (t.pinned) return false;
      const effectiveUrl = getEffectiveTabUrl(t);
      if (effectiveUrl.startsWith(dashboardUrl)) return false;
      if (isSystemOrExtensionUrl(effectiveUrl)) return false;
      return true;
    });

    // Determine active space for this window (assign dedicated unsaved space if none yet):
    let targetSpaceId = await getWindowActiveSpaceId(windowId);
    if (!targetSpaceId) {
      const allWinSpaces = await getAllWindowSpaces();
      const otherActiveSpaceIds = Array.from(allWinSpaces.entries())
        .filter(([wId, sId]) => wId !== windowId && !!sId)
        .map(([, sId]) => sId as string);

      if (otherActiveSpaceIds.length > 0) {
        const otherSpaceTabs = await db.tabs
          .where('spaceId')
          .anyOf(otherActiveSpaceIds)
          .toArray();
        const otherSpaceUrls = new Set(otherSpaceTabs.map((t) => decodeRealUrl(t.url)));

        validTabs = validTabs.filter(
          (t) => !otherSpaceUrls.has(decodeRealUrl(getEffectiveTabUrl(t)))
        );
        if (validTabs.length === 0) {
          return;
        }
      }

      targetSpaceId = await ensureWindowUnsavedSpace(windowId);
    }

    const targetSpace = await db.spaces.get(targetSpaceId);
    const isUnsavedSpace = !targetSpace || !!targetSpace.isUnsaved;

    const now = Date.now();

    // Read existing tabs in DB for this space
    const existing = await db.tabs
      .where('spaceId')
      .equals(targetSpaceId)
      .sortBy('order');

    const validTabIds = new Set(validTabs.map((t) => t.id));
    const matchedRecordIds = new Set<string>();
    const matchedUrls = new Set<string>();
    const tabMatches = new Map<number, Tab>();

    // Pass 1: Match by exact chromeTabId across all open tabs in this window first
    for (let i = 0; i < validTabs.length; i++) {
      const browserTab = validTabs[i];
      if (!browserTab.id) continue;
      const match = existing.find(
        (e) => !matchedRecordIds.has(e.id) && e.chromeTabId === browserTab.id
      );
      if (match) {
        matchedRecordIds.add(match.id);
        tabMatches.set(i, match);
      }
    }

    // Pass 2: Match remaining open tabs by decoded URL against unclaimed records in this space
    // (or records already bound to a live tab in another window sharing this space)
    for (let i = 0; i < validTabs.length; i++) {
      if (tabMatches.has(i)) continue;
      const browserTab = validTabs[i];
      const effectiveUrl = getEffectiveTabUrl(browserTab);
      const realUrl = decodeRealUrl(effectiveUrl);

      let match = existing.find(
        (e) =>
          !matchedRecordIds.has(e.id) &&
          decodeRealUrl(e.url) === realUrl &&
          (!e.chromeTabId || !allOpenTabIds.has(e.chromeTabId))
      );

      if (!match) {
        match = existing.find(
          (e) =>
            !matchedRecordIds.has(e.id) &&
            decodeRealUrl(e.url) === realUrl &&
            !!e.chromeTabId &&
            allOpenTabIds.has(e.chromeTabId) &&
            e.windowId !== windowId
        );
      }

      if (match) {
        matchedRecordIds.add(match.id);
        tabMatches.set(i, match);
      }
    }

    // Pass 3: If counts match (e.g. startup restore where a tab redirected), match by tab order
    if (existing.length === validTabs.length) {
      for (let i = 0; i < validTabs.length; i++) {
        if (tabMatches.has(i)) continue;
        const match = existing.find(
          (e) =>
            !matchedRecordIds.has(e.id) &&
            e.order === i &&
            (!e.chromeTabId || !allOpenTabIds.has(e.chromeTabId))
        );
        if (match) {
          matchedRecordIds.add(match.id);
          tabMatches.set(i, match);
        }
      }
    }

    // Apply updates or insert new records
    for (let i = 0; i < validTabs.length; i++) {
      const browserTab = validTabs[i];
      const effectiveUrl = getEffectiveTabUrl(browserTab);
      const realUrl = decodeRealUrl(effectiveUrl);
      const title = getEffectiveTabTitle(browserTab, realUrl);
      const favIconUrl = browserTab.favIconUrl || '';
      const match = tabMatches.get(i);

      if (match) {
        const tabUrl =
          browserTab.discarded && (!browserTab.url || browserTab.url === 'chrome://newtab/')
            ? match.url
            : realUrl;
        const tabTitle =
          browserTab.discarded && (!browserTab.title || browserTab.title === 'New Tab')
            ? match.title
            : title;

        matchedUrls.add(decodeRealUrl(tabUrl));

        // If this record is already bound to a live tab in another window, preserve its binding
        const isLiveInOtherWindow =
          !!match.chromeTabId &&
          allOpenTabIds.has(match.chromeTabId) &&
          !!match.windowId &&
          match.windowId !== windowId;

        await db.tabs.update(match.id, {
          chromeTabId: isLiveInOtherWindow ? match.chromeTabId : browserTab.id,
          windowId: isLiveInOtherWindow ? match.windowId : windowId,
          title: tabTitle,
          url: tabUrl,
          favIconUrl: favIconUrl || match.favIconUrl,
          order: i,
          updatedAt: now,
        });
      } else {
        const newId = crypto.randomUUID();
        matchedRecordIds.add(newId);
        matchedUrls.add(realUrl);
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

    const allTabsLoaded =
      validTabs.length > 0 && validTabs.every((t) => t.status === 'complete');

    // Clean up closed or stale duplicate tabs in this space
    for (const record of existing) {
      // Critical Guard: NEVER delete a record that was matched or updated during this sync cycle!
      if (matchedRecordIds.has(record.id)) continue;

      if (record.chromeTabId && !validTabIds.has(record.chromeTabId)) {
        // Safe check: Verify if the tab is truly alive as a normal tab in another window
        let stillExistsInOtherWindow = false;
        try {
          const checkTab = await chrome.tabs.get(record.chromeTabId);
          if (
            checkTab &&
            checkTab.windowId !== windowId &&
            !checkTab.pinned &&
            !getEffectiveTabUrl(checkTab).startsWith(dashboardUrl)
          ) {
            stillExistsInOtherWindow = true;
            await db.tabs.update(record.id, { windowId: checkTab.windowId, updatedAt: now });
          }
        } catch {
          stillExistsInOtherWindow = false;
        }

        if (!stillExistsInOtherWindow) {
          if (record.spaceId && record.spaceId !== UNSAVED_SPACE_ID && !isUnsavedSpace) {
            await recordTombstone(record.id, 'tabs');
          }
          await db.tabs.delete(record.id);
        }
      } else if (!record.chromeTabId) {
        const recordRealUrl = decodeRealUrl(record.url);
        // Delete unclaimed duplicate of an already matched URL, or stale unclaimed unsaved tab once window finishes loading
        if (matchedUrls.has(recordRealUrl) || (isUnsavedSpace && allTabsLoaded)) {
          await db.tabs.delete(record.id);
        }
      }
    }
  } catch (err) {
    console.error('Error syncing window tabs:', err);
  }
}
