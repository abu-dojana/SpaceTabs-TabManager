import React from 'react';

function readLocalSet(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item): item is string => typeof item === 'string'));
    }
  } catch {
    // Ignore storage read errors
  }
  return new Set();
}

function writePersistedSet(storageKey: string, nextSet: Set<string>): void {
  const arr = Array.from(nextSet);
  try {
    localStorage.setItem(storageKey, JSON.stringify(arr));
  } catch {
    // Ignore localStorage quota/access errors
  }
  try {
    chrome.storage?.local?.set({ [storageKey]: arr });
  } catch {
    // Ignore if outside extension context
  }
}

/**
 * Persists a Set<string> across browser restarts using synchronous localStorage
 * (for zero-flicker initial render) and chrome.storage.local (for durable extension
 * storage and multi-window synchronization).
 */
export function usePersistedSet(
  storageKey: string
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  const [state, setState] = React.useState<Set<string>>(() => readLocalSet(storageKey));

  // Hydrate from chrome.storage.local and subscribe to cross-window changes
  React.useEffect(() => {
    let mounted = true;

    chrome.storage?.local
      ?.get(storageKey)
      .then((data) => {
        if (!mounted) return;
        const stored = data?.[storageKey];
        if (Array.isArray(stored)) {
          const valid = stored.filter((item): item is string => typeof item === 'string');
          try {
            localStorage.setItem(storageKey, JSON.stringify(valid));
          } catch {}
          setState(new Set(valid));
        } else {
          const currentLocal = readLocalSet(storageKey);
          if (currentLocal.size > 0) {
            chrome.storage?.local?.set({ [storageKey]: Array.from(currentLocal) });
          }
        }
      })
      .catch(() => {});

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[storageKey]?.newValue) {
        const nextArr = changes[storageKey].newValue;
        if (Array.isArray(nextArr)) {
          const valid = nextArr.filter((item): item is string => typeof item === 'string');
          try {
            localStorage.setItem(storageKey, JSON.stringify(valid));
          } catch {}
          setState(new Set(valid));
        }
      }
    };

    chrome.storage?.onChanged?.addListener(handleStorageChange);
    return () => {
      mounted = false;
      chrome.storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, [storageKey]);

  const setPersistedState: React.Dispatch<React.SetStateAction<Set<string>>> = React.useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writePersistedSet(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  return [state, setPersistedState];
}
