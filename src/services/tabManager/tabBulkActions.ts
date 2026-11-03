import { db } from '@/db';
import { type Tab } from '@/db/schema';
import { decodeRealUrl, extractDomain, isSystemOrExtensionUrl } from '@/utils/urlFilter';
import { setTransitionLock } from './windowSpaces';
import { closeTabs } from './tabOperations';

/**
 * Reorders tabs in Dexie AND synchronously reorders open Chrome tabs in the browser window.
 */
export async function reorderTabsAndSyncBrowser(sortedTabs: Tab[]): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.tabs, async () => {
    for (let i = 0; i < sortedTabs.length; i++) {
      await db.tabs.update(sortedTabs[i].id, {
        order: i,
        updatedAt: now,
      });
    }
  });

  try {
    const allBrowserTabs = await chrome.tabs.query({});
    const windowIds = Array.from(
      new Set(
        allBrowserTabs
          .map((t) => t.windowId)
          .filter((id): id is number => typeof id === 'number')
      )
    );

    for (const winId of windowIds) {
      const windowTabs = allBrowserTabs.filter((t) => t.windowId === winId);
      const pinnedCount = windowTabs.filter((t) => t.pinned).length;

      const usedBrowserTabIds = new Set<number>();
      const orderedTabIds: number[] = [];

      for (const st of sortedTabs) {
        let match = windowTabs.find(
          (wt) =>
            wt.id &&
            !usedBrowserTabIds.has(wt.id) &&
            st.chromeTabId &&
            wt.id === st.chromeTabId
        );
        if (!match) {
          const stRealUrl = decodeRealUrl(st.url);
          match = windowTabs.find((wt) => {
            if (!wt.id || usedBrowserTabIds.has(wt.id) || wt.pinned) return false;
            const wtUrl = wt.url || wt.pendingUrl || '';
            if (!wtUrl || isSystemOrExtensionUrl(wtUrl)) return false;
            return decodeRealUrl(wtUrl) === stRealUrl;
          });
        }
        if (match?.id) {
          usedBrowserTabIds.add(match.id);
          orderedTabIds.push(match.id);
        }
      }

      if (orderedTabIds.length > 0) {
        await setTransitionLock(winId, true);
        try {
          try {
            await chrome.tabs.move(orderedTabIds, { index: pinnedCount });
          } catch {
            for (let idx = 0; idx < orderedTabIds.length; idx++) {
              try {
                await chrome.tabs.move(orderedTabIds[idx], { index: pinnedCount + idx });
              } catch {}
            }
          }
        } finally {
          await setTransitionLock(winId, false);
        }
      }
    }
  } catch (err) {
    console.error('Failed to reorder Chrome tabs:', err);
  }
}

export async function sortTabsAlphabetically(tabs: Tab[]): Promise<void> {
  if (!tabs || tabs.length <= 1) return;
  const sorted = [...tabs].sort((a, b) =>
    (a.title || a.url).localeCompare(b.title || b.url, undefined, {
      sensitivity: 'base',
      numeric: true,
    })
  );
  if (sorted.every((t, idx) => t.id === tabs[idx].id)) {
    sorted.reverse();
  }
  await reorderTabsAndSyncBrowser(sorted);
}

export async function sortTabsByDomain(tabs: Tab[]): Promise<void> {
  if (!tabs || tabs.length <= 1) return;
  const sorted = [...tabs].sort((a, b) => {
    const domainA = extractDomain(a.url).toLowerCase();
    const domainB = extractDomain(b.url).toLowerCase();
    if (domainA !== domainB) {
      return domainA.localeCompare(domainB);
    }
    return (a.title || a.url).localeCompare(b.title || b.url, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
  if (sorted.every((t, idx) => t.id === tabs[idx].id)) {
    sorted.reverse();
  }
  await reorderTabsAndSyncBrowser(sorted);
}

export async function closeDuplicateTabs(tabs: Tab[]): Promise<number> {
  if (!tabs || tabs.length <= 1) return 0;
  const seenUrls = new Set<string>();
  const duplicateTabIds: string[] = [];

  for (const t of tabs) {
    const real = decodeRealUrl(t.url).trim();
    let normalized = real;
    try {
      normalized = new URL(real).href;
    } catch {
      normalized = real;
    }
    if (seenUrls.has(normalized)) {
      duplicateTabIds.push(t.id);
    } else {
      seenUrls.add(normalized);
    }
  }

  if (duplicateTabIds.length > 0) {
    await closeTabs(duplicateTabIds);
  }
  return duplicateTabIds.length;
}

export async function suspendAllTabsInCurrentWindow(): Promise<void> {
  try {
    const curWin = await chrome.windows.getCurrent();
    if (!curWin.id) return;

    const browserTabs = await chrome.tabs.query({ windowId: curWin.id });
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

    for (const t of browserTabs) {
      if (!t.id || !t.url) continue;
      if (t.pinned || t.active || t.audible) continue;
      if (t.url.startsWith(dashboardUrl) || t.url.includes('/suspended.html')) continue;

      try {
        await chrome.tabs.discard(t.id);
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to discard all tabs:', e);
  }
}

export async function reloadAllTabsInCurrentWindow(): Promise<void> {
  try {
    const curWin = await chrome.windows.getCurrent();
    if (!curWin.id) return;

    const browserTabs = await chrome.tabs.query({ windowId: curWin.id });
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

    for (const t of browserTabs) {
      if (!t.id || !t.url) continue;
      if (t.url.startsWith(dashboardUrl)) continue;

      try {
        await chrome.tabs.reload(t.id);
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to reload all tabs:', e);
  }
}
