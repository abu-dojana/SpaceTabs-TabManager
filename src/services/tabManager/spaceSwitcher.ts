import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { isSystemOrExtensionUrl, decodeRealUrl, isSuspendableUrl } from '@/utils/urlFilter';
import { getUserSettings } from '@/services/settings';
import { buildSuspendedUrl } from './suspensionUrls';
import { getWindowActiveSpaceId, setWindowActiveSpaceId, setTransitionLock } from './windowSpaces';
import { getEffectiveTabUrl, getEffectiveTabTitle } from './tabSync';

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

    // 5. Open target tabs (dormant placeholders if discardOnSpaceSwitch is true, or real URLs if false)
    const settings = await getUserSettings();
    for (let i = 0; i < targetTabs.length; i++) {
      const tabRecord = targetTabs[i];
      const shouldSuspend = settings.discardOnSpaceSwitch && isSuspendableUrl(tabRecord.url);
      const openUrl = shouldSuspend
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
    // Identify initial blank tab created by the browser with the new window
    const initialTabs = await chrome.tabs.query({ windowId: newWindow.id });
    const initialBlankTab = initialTabs.find(
      (t) => !t.pinned && (!t.url || t.url === 'chrome://newtab/' || t.pendingUrl === 'chrome://newtab/' || t.url === 'about:blank')
    );

    // Bind active space to new window
    await setWindowActiveSpaceId(newWindow.id, spaceId);

    // Restore space tabs
    const settings = await getUserSettings();
    for (let i = 0; i < spaceTabs.length; i++) {
      const tabItem = spaceTabs[i];
      const shouldSuspend = settings.discardOnSpaceSwitch && isSuspendableUrl(tabItem.url);
      const openUrl = shouldSuspend
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

    // Clean up initial blank tab now that space tabs have populated the window
    if (spaceTabs.length > 0 && initialBlankTab?.id) {
      await chrome.tabs.remove(initialBlankTab.id).catch(() => {});
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
