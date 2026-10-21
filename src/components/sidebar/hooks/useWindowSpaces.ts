import React from 'react';
import { getAllWindowSpaces } from '@/services/tabManager';

/**
 * Custom hook to subscribe and track active spaces across all browser windows
 */
export function useWindowSpaces() {
  const [windowSpaces, setWindowSpaces] = React.useState<Map<number, string | null>>(new Map());
  const [currentWindowId, setCurrentWindowId] = React.useState<number | null>(null);

  const refreshWindowSpaces = React.useCallback(async () => {
    try {
      const [spacesMap, curWin] = await Promise.all([
        getAllWindowSpaces(),
        chrome.windows.getCurrent(),
      ]);
      setWindowSpaces(spacesMap);
      if (curWin.id) setCurrentWindowId(curWin.id);
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
    chrome.windows.onFocusChanged.addListener(handleWindowEvents);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.windows.onRemoved.removeListener(handleWindowEvents);
      chrome.windows.onFocusChanged.removeListener(handleWindowEvents);
    };
  }, [refreshWindowSpaces]);

  return { windowSpaces, currentWindowId, refreshWindowSpaces };
}
