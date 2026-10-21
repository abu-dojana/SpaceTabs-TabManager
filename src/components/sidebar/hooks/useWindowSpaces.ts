import React from 'react';
import { getAllWindowSpaces } from '@/services/tabManager';

/**
 * Custom hook to subscribe and track active spaces across all browser windows.
 * The host window ID is anchored to this dashboard tab and kept stable.
 */
export function useWindowSpaces() {
  const [windowSpaces, setWindowSpaces] = React.useState<Map<number, string | null>>(new Map());
  const [currentWindowId, setCurrentWindowId] = React.useState<number | null>(null);

  // Initialize and anchor host window ID from the dashboard's own tab context
  React.useEffect(() => {
    let isMounted = true;
    const initHostWindow = async () => {
      try {
        const curTab = await chrome.tabs.getCurrent();
        if (isMounted && curTab?.windowId) {
          setCurrentWindowId(curTab.windowId);
          return;
        }
      } catch {}
      try {
        const curWin = await chrome.windows.getCurrent();
        if (isMounted && curWin?.id) {
          setCurrentWindowId(curWin.id);
        }
      } catch {}
    };
    initHostWindow();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshWindowSpaces = React.useCallback(async () => {
    try {
      const spacesMap = await getAllWindowSpaces();
      setWindowSpaces(spacesMap);
    } catch (err) {
      console.warn('Failed to refresh window spaces:', err);
    }
  }, []);

  React.useEffect(() => {
    refreshWindowSpaces();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === 'session') {
        const hasWindowSpaceChange = Object.keys(changes).some(
          (k) => k.startsWith('window_') && k.endsWith('_space')
        );
        if (hasWindowSpaceChange) {
          refreshWindowSpaces();
        }
      }
    };

    const handleWindowEvents = () => {
      refreshWindowSpaces();
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    chrome.windows.onRemoved.addListener(handleWindowEvents);
    chrome.windows.onCreated.addListener(handleWindowEvents);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.windows.onRemoved.removeListener(handleWindowEvents);
      chrome.windows.onCreated.removeListener(handleWindowEvents);
    };
  }, [refreshWindowSpaces]);

  return { windowSpaces, currentWindowId, refreshWindowSpaces };
}
