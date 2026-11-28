import React from 'react';
import { type Tab } from '@/db/schema';
import { getHostWindowId } from '@/utils/chromeWindow';
import { decodeRealUrl, isSystemOrExtensionUrl } from '@/utils/urlFilter';

/**
 * Tracks all open Chrome tabs across windows and resolves the host window ID of this dashboard.
 */
export function useLiveBrowserTabs(allSpaceTabs?: Tab[]) {
  const [currentWindowId, setCurrentWindowId] = React.useState<number | null>(null);
  const [liveTabsMap, setLiveTabsMap] = React.useState<Map<number, number>>(new Map());
  const [allLiveTabsList, setAllLiveTabsList] = React.useState<chrome.tabs.Tab[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    getHostWindowId().then((winId) => {
      if (isMounted && winId) {
        setCurrentWindowId(winId);
      }
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshLiveTabs = async () => {
      try {
        const all = await chrome.tabs.query({});
        const map = new Map<number, number>();
        for (const t of all) {
          if (t.id && t.windowId) {
            map.set(t.id, t.windowId);
          }
        }
        if (isMounted) {
          setLiveTabsMap(map);
          setAllLiveTabsList(all);
        }
      } catch {}
    };

    refreshLiveTabs();

    const onEvent = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        refreshLiveTabs();
      }, 60);
    };

    chrome.tabs.onCreated.addListener(onEvent);
    chrome.tabs.onRemoved.addListener(onEvent);
    chrome.tabs.onUpdated.addListener(onEvent);
    chrome.tabs.onActivated.addListener(onEvent);
    chrome.tabs.onAttached?.addListener(onEvent);
    chrome.tabs.onDetached?.addListener(onEvent);

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      chrome.tabs.onCreated.removeListener(onEvent);
      chrome.tabs.onRemoved.removeListener(onEvent);
      chrome.tabs.onUpdated.removeListener(onEvent);
      chrome.tabs.onActivated.removeListener(onEvent);
      chrome.tabs.onAttached?.removeListener(onEvent);
      chrome.tabs.onDetached?.removeListener(onEvent);
    };
  }, []);

  const claimedChromeTabIds = React.useMemo(
    () =>
      new Set(
        (allSpaceTabs || [])
          .map((t) => t.chromeTabId)
          .filter((id): id is number => typeof id === 'number')
      ),
    [allSpaceTabs]
  );

  const resolveTabLiveState = React.useCallback(
    (tab: Tab) => {
      let resolvedChromeTabId = tab.chromeTabId;
      let liveWindowId = tab.chromeTabId ? liveTabsMap.get(tab.chromeTabId) : undefined;

      if (
        liveWindowId === undefined &&
        tab.chromeTabId !== undefined &&
        allLiveTabsList.length > 0
      ) {
        const realUrl = decodeRealUrl(tab.url);
        const match = allLiveTabsList.find((bt) => {
          if (bt.pinned || (bt.id && claimedChromeTabIds.has(bt.id))) return false;
          const raw = bt.url || bt.pendingUrl || '';
          if (!raw || isSystemOrExtensionUrl(raw)) return false;
          return (
            decodeRealUrl(bt.url || '') === realUrl ||
            decodeRealUrl(bt.pendingUrl || '') === realUrl
          );
        });
        if (match && match.windowId) {
          liveWindowId = match.windowId;
          resolvedChromeTabId = match.id;
        }
      }
      return {
        resolvedChromeTabId,
        isOpenInThisWindow: liveWindowId !== undefined && liveWindowId === currentWindowId,
        isOpenInOtherWindow: liveWindowId !== undefined && liveWindowId !== currentWindowId,
      };
    },
    [liveTabsMap, allLiveTabsList, claimedChromeTabIds, currentWindowId]
  );

  return { currentWindowId, liveTabsMap, allLiveTabsList, resolveTabLiveState };
}
