import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import {
  isSystemOrExtensionUrl,
  decodeRealUrl,
  isSuspendableUrl,
  isMeaningfulTitle,
  isValidWebFavicon,
} from '@/utils/urlFilter';
import { getUserSettings } from '@/services/settings';
import { buildSuspendedUrl } from './suspensionUrls';
import {
  getWindowActiveSpaceId,
  setWindowActiveSpaceId,
  setTransitionLock,
  ensureWindowUnsavedSpace,
  getAllWindowSpaces,
  setPendingNewWindowSpace,
  withWindowLock,
} from './windowSpaces';
import {
  getEffectiveTabUrl,
  getEffectiveTabTitle,
  syncWindowTabsToUnsaved,
} from './tabSync';

/**
 * Switches the current window to a target space:
 * Saves current tabs, closes them in Chrome, binds the window to the target space,
 * and opens the target space's tabs.
 * Serialized per window via withWindowLock so concurrent switches or background syncs never interleave.
 */
export async function switchWindowToSpace(
  windowId: number,
  targetSpaceId: string | null
) {
  return withWindowLock(windowId, async () => {
    const currentSpaceId = await getWindowActiveSpaceId(windowId);
    const normalizedCurrent = currentSpaceId || (await ensureWindowUnsavedSpace(windowId));
    const normalizedTarget = targetSpaceId || (await ensureWindowUnsavedSpace(windowId, true));

    if (normalizedCurrent === normalizedTarget) {
      await setWindowActiveSpaceId(windowId, normalizedTarget);
      return;
    }

    await setTransitionLock(windowId, true);

    try {
      const dashboardUrl = chrome.runtime.getURL('/dashboard.html');
      const allBrowserTabs = await chrome.tabs.query({});
      const allTabs = allBrowserTabs.filter((t) => t.windowId === windowId);
      const otherWindowOpenTabs = new Map<number, number>();
      for (const t of allBrowserTabs) {
        if (
          typeof t.id === 'number' &&
          typeof t.windowId === 'number' &&
          t.windowId !== windowId &&
          !t.pinned &&
          !getEffectiveTabUrl(t).startsWith(dashboardUrl)
        ) {
          otherWindowOpenTabs.set(t.id, t.windowId);
        }
      }

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
      const [existingCurrentTabs, currentSpace] = await Promise.all([
        db.tabs.where('spaceId').equals(normalizedCurrent).sortBy('order'),
        db.spaces.get(normalizedCurrent),
      ]);
      const claimedIds = new Set<string>();
      const claimedUrls = new Set<string>();
      const tabMatches = new Map<number, (typeof existingCurrentTabs)[number]>();

      // Pass 1: Match by exact chromeTabId first
      for (let i = 0; i < tabsToClose.length; i++) {
        const bt = tabsToClose[i];
        if (typeof bt.id !== 'number') continue;
        const match = existingCurrentTabs.find(
          (r) => !claimedIds.has(r.id) && r.chromeTabId === bt.id
        );
        if (match) {
          claimedIds.add(match.id);
          tabMatches.set(i, match);
        }
      }

      // Pass 2: Match remaining open tabs by URL against dormant records or records in this window whose chromeTabId changed
      for (let i = 0; i < tabsToClose.length; i++) {
        if (tabMatches.has(i)) continue;
        const bt = tabsToClose[i];
        const realUrl = decodeRealUrl(getEffectiveTabUrl(bt));
        const match = existingCurrentTabs.find(
          (r) =>
            !claimedIds.has(r.id) &&
            decodeRealUrl(r.url) === realUrl &&
            (!r.chromeTabId ||
              r.windowId === windowId ||
              !otherWindowOpenTabs.has(r.chromeTabId))
        );
        if (match) {
          claimedIds.add(match.id);
          tabMatches.set(i, match);
        }
      }

      // Pass 3: Match remaining open tabs by URL against records open in another window sharing this space
      for (let i = 0; i < tabsToClose.length; i++) {
        if (tabMatches.has(i)) continue;
        const bt = tabsToClose[i];
        const realUrl = decodeRealUrl(getEffectiveTabUrl(bt));
        const match = existingCurrentTabs.find(
          (r) => !claimedIds.has(r.id) && decodeRealUrl(r.url) === realUrl
        );
        if (match) {
          claimedIds.add(match.id);
          tabMatches.set(i, match);
        }
      }

      const hasTabsOutsideThisWindow = existingCurrentTabs.some(
        (r) =>
          !claimedIds.has(r.id) &&
          ((r.chromeTabId && otherWindowOpenTabs.has(r.chromeTabId)) ||
            (!r.chromeTabId && !currentSpace?.isUnsaved && r.windowId !== windowId))
      );
      const sortedMatchedOrders = Array.from(tabMatches.values())
        .map((m) => m.order)
        .sort((a, b) => a - b);
      let matchedOrderCursor = 0;
      let nextNewOrder =
        existingCurrentTabs.length > 0
          ? Math.max(...existingCurrentTabs.map((e) => e.order)) + 1
          : tabsToClose.length;

      // Snapshot existing tabs strictly within normalizedCurrent and unlink their chromeTabId & windowId
      for (let i = 0; i < tabsToClose.length; i++) {
        const bt = tabsToClose[i];
        const effectiveUrl = getEffectiveTabUrl(bt);
        const realUrl = decodeRealUrl(effectiveUrl);
        const title = getEffectiveTabTitle(bt, realUrl);
        const record = tabMatches.get(i);

        if (record) {
          claimedUrls.add(realUrl);
          const preservedTitle =
            decodeRealUrl(record.url) === realUrl &&
            !isMeaningfulTitle(bt.title, realUrl) &&
            isMeaningfulTitle(record.title, realUrl)
              ? record.title
              : title;
          const preservedFavicon = isValidWebFavicon(bt.favIconUrl)
            ? bt.favIconUrl!
            : record.favIconUrl;

          const isLiveInOtherWindow =
            typeof record.chromeTabId === 'number' &&
            record.chromeTabId !== bt.id &&
            otherWindowOpenTabs.has(record.chromeTabId);

          const targetOrder = hasTabsOutsideThisWindow
            ? (sortedMatchedOrders[matchedOrderCursor++] ?? record.order)
            : i;

          await db.tabs.update(record.id, {
            title: preservedTitle,
            url: realUrl,
            favIconUrl: preservedFavicon,
            order: targetOrder,
            updatedAt: now,
            chromeTabId: isLiveInOtherWindow ? record.chromeTabId : undefined,
            windowId: isLiveInOtherWindow
              ? otherWindowOpenTabs.get(record.chromeTabId!)
              : undefined,
          });
        } else {
          const newId = crypto.randomUUID();
          claimedIds.add(newId);
          claimedUrls.add(realUrl);
          const targetOrder = hasTabsOutsideThisWindow ? nextNewOrder++ : i;
          await db.tabs.add({
            id: newId,
            spaceId: normalizedCurrent,
            url: realUrl,
            title,
            favIconUrl: isValidWebFavicon(bt.favIconUrl) ? bt.favIconUrl! : '',
            order: targetOrder,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // Clean up or unlink any remaining records in normalizedCurrent
      for (const r of existingCurrentTabs) {
        if (claimedIds.has(r.id)) continue;

        if (r.chromeTabId && otherWindowOpenTabs.has(r.chromeTabId)) {
          const otherWinId = otherWindowOpenTabs.get(r.chromeTabId);
          if (r.windowId !== otherWinId) {
            await db.tabs.update(r.id, { windowId: otherWinId, updatedAt: now });
          }
          continue;
        }

        const rRealUrl = decodeRealUrl(r.url);
        if (r.windowId === windowId || (r.chromeTabId && !otherWindowOpenTabs.has(r.chromeTabId))) {
          if (currentSpace?.isUnsaved || claimedUrls.has(rRealUrl)) {
            await db.tabs.delete(r.id);
          } else {
            await db.tabs.update(r.id, {
              chromeTabId: undefined,
              windowId: undefined,
            });
          }
        }
      }

      // 2. Close previous tabs in Chrome (with per-tab fallback if one tab ID was already closed/replaced)
      const tabIdsToClose = tabsToClose
        .map((t) => t.id)
        .filter((id): id is number => typeof id === 'number');

      if (tabIdsToClose.length > 0) {
        try {
          await chrome.tabs.remove(tabIdsToClose);
        } catch {
          for (const id of tabIdsToClose) {
            await chrome.tabs.remove(id).catch(() => {});
          }
        }
      }

      // Re-assert focus on dashboard tab after closing previous tabs
      if (dashboardTab?.id) {
        await chrome.tabs.update(dashboardTab.id, { active: true });
      }

      // 3. Set the new active space for this window
      await setWindowActiveSpaceId(windowId, normalizedTarget);

      // 4. Fetch tabs for the target space
      const targetTabs = await db.tabs
        .where('spaceId')
        .equals(normalizedTarget)
        .sortBy('order');

      // 5. Open target tabs (dormant placeholders if discardOnSpaceSwitch is true, or real URLs if false)
      const settings = await getUserSettings();
      for (let i = 0; i < targetTabs.length; i++) {
        const tabRecord = targetTabs[i];
        const cleanUrl = decodeRealUrl(tabRecord.url);

        // If this tab is already open as a live tab in another window, preserve its binding instead of duplicating
        if (
          typeof tabRecord.chromeTabId === 'number' &&
          otherWindowOpenTabs.has(tabRecord.chromeTabId)
        ) {
          const otherWinId = otherWindowOpenTabs.get(tabRecord.chromeTabId);
          if (tabRecord.windowId !== otherWinId) {
            await db.tabs.update(tabRecord.id, {
              windowId: otherWinId,
              updatedAt: Date.now(),
            });
          }
          continue;
        }

        const shouldSuspend = settings.discardOnSpaceSwitch && isSuspendableUrl(cleanUrl);
        const openUrl = shouldSuspend
          ? buildSuspendedUrl(cleanUrl, tabRecord.title, tabRecord.favIconUrl)
          : cleanUrl;

        const created = await chrome.tabs.create({
          windowId,
          url: openUrl,
          active: false,
        });

        if (created.id) {
          await db.tabs.update(tabRecord.id, {
            chromeTabId: created.id,
            windowId,
            url: cleanUrl,
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
      await setTransitionLock(windowId, false, 600);
    }
  });
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

  // Reserve the space ID before chrome.windows.create so onCreated binds the space immediately
  await setPendingNewWindowSpace(spaceId);

  let newWindow: chrome.windows.Window;
  try {
    newWindow = await chrome.windows.create({
      type: 'normal',
      focused: true,
    });
  } catch (err) {
    await setPendingNewWindowSpace(null);
    throw err;
  }

  if (!newWindow.id) {
    await setPendingNewWindowSpace(null);
    return;
  }

  const winId = newWindow.id;
  await setTransitionLock(winId, true);
  await setWindowActiveSpaceId(winId, spaceId);
  await setPendingNewWindowSpace(null);

  await withWindowLock(winId, async () => {
    try {
      // Identify initial blank tab created by the browser with the new window
      const initialTabs = await chrome.tabs.query({ windowId: winId });
      const initialBlankTab = initialTabs.find(
        (t) =>
          !t.pinned &&
          (!t.url ||
            t.url === 'chrome://newtab/' ||
            t.pendingUrl === 'chrome://newtab/' ||
            t.url === 'about:blank')
      );

      // Ensure active space remains bound to new window
      await setWindowActiveSpaceId(winId, spaceId);

      // Restore space tabs
      const settings = await getUserSettings();
      for (let i = 0; i < spaceTabs.length; i++) {
        const tabItem = spaceTabs[i];
        const cleanUrl = decodeRealUrl(tabItem.url);
        const isFirstTab = i === 0;
        const shouldSuspend =
          !isFirstTab && settings.discardOnSpaceSwitch && isSuspendableUrl(cleanUrl);
        const openUrl = shouldSuspend
          ? buildSuspendedUrl(cleanUrl, tabItem.title, tabItem.favIconUrl)
          : cleanUrl;

        const createdTab = await chrome.tabs.create({
          windowId: winId,
          url: openUrl,
          active: isFirstTab, // only focus the first restored tab
        });

        if (createdTab.id) {
          await db.tabs.update(tabItem.id, {
            chromeTabId: createdTab.id,
            windowId: winId,
            url: cleanUrl,
            updatedAt: Date.now(),
          });
        }
      }

      // Clean up initial blank tab now that space tabs have populated the window
      if (spaceTabs.length > 0 && initialBlankTab?.id) {
        await chrome.tabs.remove(initialBlankTab.id).catch(() => {});
      }
    } finally {
      await setTransitionLock(winId, false, 600);
      setTimeout(() => {
        syncWindowTabsToUnsaved(winId);
      }, 650);
    }
  });
}

/**
 * Non-destructive opening: "Open all tabs here" (switches current window to this space)
 */
export async function openSpaceInCurrentWindow(spaceId: string, windowId: number) {
  await switchWindowToSpace(windowId, spaceId);
}
