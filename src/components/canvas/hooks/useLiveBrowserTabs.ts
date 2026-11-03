import React from 'react';
import { getHostWindowId } from '@/utils/chromeWindow';

/**
 * Tracks all open Chrome tabs across windows and resolves the host window ID of this dashboard.
 */
export function useLiveBrowserTabs() {
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
      refreshLiveTabs();
    };

    chrome.tabs.onCreated.addListener(onEvent);
    chrome.tabs.onRemoved.addListener(onEvent);
    chrome.tabs.onUpdated.addListener(onEvent);
    chrome.tabs.onActivated.addListener(onEvent);
    chrome.tabs.onAttached?.addListener(onEvent);
    chrome.tabs.onDetached?.addListener(onEvent);

    return () => {
      isMounted = false;
      chrome.tabs.onCreated.removeListener(onEvent);
      chrome.tabs.onRemoved.removeListener(onEvent);
      chrome.tabs.onUpdated.removeListener(onEvent);
      chrome.tabs.onActivated.removeListener(onEvent);
      chrome.tabs.onAttached?.removeListener(onEvent);
      chrome.tabs.onDetached?.removeListener(onEvent);
    };
  }, []);

  return { currentWindowId, liveTabsMap, allLiveTabsList };
}
