import { db } from '@/db';
import { type Tab } from '@/db/schema';
import { decodeRealUrl, extractDomain, isSystemOrExtensionUrl } from '@/utils/urlFilter';
import { getHostWindowId } from '@/utils/chromeWindow';
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

  const hostWinId = await getHostWindowId();
  const openTabWindowMap = new Map<number, number>();
  try {
    const allOpen = await chrome.tabs.query({});
    for (const bt of allOpen) {
      if (typeof bt.id === 'number' && typeof bt.windowId === 'number') {
        openTabWindowMap.set(bt.id, bt.windowId);
      }
    }
  } catch {}

  const groups = new Map<string, Tab[]>();
  for (const t of tabs) {
    const real = decodeRealUrl(t.url).trim();
    let normalized = real;
    try {
      normalized = new URL(real).href;
    } catch {
      normalized = real;
    }
    const list = groups.get(normalized);
    if (list) {
      list.push(t);
    } else {
      groups.set(normalized, [t]);
    }
  }

  const duplicateTabIds: string[] = [];

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const scoreTab = (t: Tab): number => {
      if (typeof t.chromeTabId === 'number') {
        const winId = openTabWindowMap.get(t.chromeTabId);
        if (winId !== undefined) {
          return hostWinId && winId === hostWinId ? 3 : 2;
        }
        return 1;
      }
      return 0;
    };

    let keeper = group[0];
    let bestScore = scoreTab(keeper);
    for (let i = 1; i < group.length; i++) {
      const candidateScore = scoreTab(group[i]);
      if (candidateScore > bestScore) {
        keeper = group[i];
        bestScore = candidateScore;
      }
    }

    if (keeper.id !== group[0].id && keeper.order > group[0].order) {
      await db.tabs.update(keeper.id, {
        order: group[0].order,
        updatedAt: Date.now(),
      });
    }

    for (const item of group) {
      if (item.id !== keeper.id) {
        duplicateTabIds.push(item.id);
      }
    }
  }

  if (duplicateTabIds.length > 0) {
    await closeTabs(duplicateTabIds);
  }
  return duplicateTabIds.length;
}

export async function suspendAllTabsInCurrentWindow(): Promise<void> {
  try {
    const winId = await getHostWindowId();
    if (!winId) return;

    const browserTabs = await chrome.tabs.query({ windowId: winId });
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

    for (const t of browserTabs) {
      if (!t.id || !t.url) continue;
      if (t.pinned || t.active || t.audible) continue;
      if (t.url.startsWith(dashboardUrl) || t.url.includes('/suspended.html')) continue;

      try {
        const oldTabId = t.id;
        const discarded = await chrome.tabs.discard(oldTabId);
        if (discarded?.id && discarded.id !== oldTabId) {
          await db.tabs
            .where('chromeTabId')
            .equals(oldTabId)
            .modify({ chromeTabId: discarded.id, updatedAt: Date.now() });
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to discard all tabs:', e);
  }
}

export async function reloadAllTabsInCurrentWindow(): Promise<void> {
  try {
    const winId = await getHostWindowId();
    if (!winId) return;

    const browserTabs = await chrome.tabs.query({ windowId: winId });
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

    for (const t of browserTabs) {
      if (!t.id || !t.url) continue;
      if (t.url.startsWith(dashboardUrl)) continue;

      try {
        if (t.url.includes('/suspended.html')) {
          const cleanUrl = decodeRealUrl(t.url);
          if (cleanUrl && cleanUrl !== t.url) {
            await chrome.tabs.update(t.id, { url: cleanUrl });
            continue;
          }
        }
        await chrome.tabs.reload(t.id);
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to reload all tabs:', e);
  }
}
