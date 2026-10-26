import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { decodeRealUrl, isSystemOrExtensionUrl } from '@/utils/urlFilter';

const SESSION_INIT_KEY = 'spacetabs_session_initialized';
const SESSION_INIT_STATUS_KEY = 'spacetabs_session_init_status';
const PENDING_NEW_WINDOW_SPACE_KEY = 'pending_new_window_space';
const PERSISTED_WINDOW_SPACES_KEY = 'spacetabs_persisted_window_spaces';
let sessionInitPromise: Promise<void> | null = null;
const ensureUnsavedLocks = new Map<number, Promise<string>>();

/**
 * Reserves a space ID for a window about to be created via openSpaceInNewWindow,
 * preventing chrome.windows.onCreated from assigning an unsaved space to it.
 */
export async function setPendingNewWindowSpace(spaceId: string | null): Promise<void> {
  try {
    if (spaceId && spaceId !== UNSAVED_SPACE_ID) {
      await chrome.storage.session.set({ [PENDING_NEW_WINDOW_SPACE_KEY]: spaceId });
    } else {
      await chrome.storage.session.remove(PENDING_NEW_WINDOW_SPACE_KEY);
    }
  } catch {
    // Ignore session storage errors
  }
}

/**
 * Atomically reads and clears the reserved space ID for a newly created window.
 */
export async function consumePendingNewWindowSpace(): Promise<string | null> {
  try {
    const data = await chrome.storage.session.get(PENDING_NEW_WINDOW_SPACE_KEY);
    const spaceId = data?.[PENDING_NEW_WINDOW_SPACE_KEY];
    if (spaceId && spaceId !== UNSAVED_SPACE_ID) {
      await chrome.storage.session.remove(PENDING_NEW_WINDOW_SPACE_KEY);
      return spaceId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Runs once per browser session (detected via chrome.storage.session) to:
 * 1. Clear stale chromeTabId and windowId values left over from prior browser sessions.
 * 2. Deduplicate any duplicate tab records inside unsaved spaces.
 * 3. Prune empty redundant unsaved spaces.
 */
export async function ensureSessionInitialized(): Promise<void> {
  if (sessionInitPromise) {
    return sessionInitPromise;
  }

  sessionInitPromise = (async () => {
    try {
      const sessionData = await chrome.storage.session.get([
        SESSION_INIT_KEY,
        SESSION_INIT_STATUS_KEY,
      ]);
      if (sessionData && sessionData[SESSION_INIT_KEY]) {
        return;
      }

      // If another extension context (e.g. background vs dashboard) is currently initializing, wait for it
      if (sessionData && sessionData[SESSION_INIT_STATUS_KEY] === 'running') {
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 40));
          const check = await chrome.storage.session.get([
            SESSION_INIT_KEY,
            SESSION_INIT_STATUS_KEY,
          ]);
          if (check?.[SESSION_INIT_KEY] || check?.[SESSION_INIT_STATUS_KEY] === 'done') {
            return;
          }
        }
      }

      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
      if (windows.length === 0) {
        // Browser startup window not created yet; wait for first window before locking session init
        return;
      }

      await chrome.storage.session.set({ [SESSION_INIT_STATUS_KEY]: 'running' });

      // 1. Clear all stale runtime chromeTabId and windowId bindings from the previous browser session
      await db.tabs.toCollection().modify({
        chromeTabId: undefined,
        windowId: undefined,
      });

      const dashboardUrl = chrome.runtime.getURL('/dashboard.html');
      const allOpenTabs = await chrome.tabs.query({});

      // 2. Restore saved Space bindings for windows reopened after browser restart
      const localData = await chrome.storage.local.get(PERSISTED_WINDOW_SPACES_KEY);
      const rawPersisted = (localData?.[PERSISTED_WINDOW_SPACES_KEY] || {}) as Record<string, string>;
      const persistedSpaceIds = Array.from(new Set(Object.values(rawPersisted).filter(Boolean)));

      const activeSpaces = await db.spaces.filter((s) => !s.isArchived).toArray();
      const savedSpacesMap = new Map(
        activeSpaces.filter((s) => !s.isUnsaved).map((s) => [s.id, s])
      );
      const persistedSavedSpaceIds = persistedSpaceIds.filter((id) => savedSpacesMap.has(id));
      const claimedSavedSpaceIds = new Set<string>();
      const restoredSavedSpaceWindowIds = new Set<number>();
      const restoredSavedSpaceUrls = new Set<string>();
      const newPersistedMap: Record<string, string> = {};

      for (const win of windows) {
        if (!win.id) continue;
        const winTabs = allOpenTabs.filter((t) => t.windowId === win.id && !t.pinned);
        const winUrls = winTabs
          .map((t) => t.url || t.pendingUrl || '')
          .filter((u) => u && !u.startsWith(dashboardUrl) && !isSystemOrExtensionUrl(u))
          .map((u) => decodeRealUrl(u));
        const winUrlSet = new Set(winUrls);

        let matchedSavedSpaceId: string | null = null;

        // First, check persisted saved spaces from before the browser closed
        let bestScore = -1;
        for (const candidateId of persistedSavedSpaceIds) {
          if (claimedSavedSpaceIds.has(candidateId)) continue;
          const sTabs = await db.tabs.where('spaceId').equals(candidateId).toArray();
          let score = 0;
          for (const st of sTabs) {
            if (winUrlSet.has(decodeRealUrl(st.url))) {
              score++;
            }
          }
          if (
            score > bestScore ||
            (persistedSavedSpaceIds.length === 1 && windows.length === 1)
          ) {
            bestScore = score;
            matchedSavedSpaceId = candidateId;
          }
        }

        // Fallback: if no persisted saved space matched, check if all open tabs in this window belong to a saved Space
        // (unless they already match a persisted unsaved space that has those tabs)
        if (!matchedSavedSpaceId && winUrlSet.size > 0) {
          let matchesPersistedUnsaved = false;
          for (const pId of persistedSpaceIds) {
            if (savedSpacesMap.has(pId)) continue;
            const uTabs = await db.tabs.where('spaceId').equals(pId).toArray();
            if (uTabs.length > 0) {
              const uUrlSet = new Set(uTabs.map((t) => decodeRealUrl(t.url)));
              if (winUrls.every((u) => uUrlSet.has(u))) {
                matchesPersistedUnsaved = true;
                break;
              }
            }
          }

          if (!matchesPersistedUnsaved) {
            for (const [sId] of savedSpacesMap.entries()) {
              if (claimedSavedSpaceIds.has(sId)) continue;
              const sTabs = await db.tabs.where('spaceId').equals(sId).toArray();
              if (sTabs.length === 0) continue;
              const sUrlSet = new Set(sTabs.map((t) => decodeRealUrl(t.url)));
              const allWinTabsInSpace = winUrls.every((u) => sUrlSet.has(u));
              if (allWinTabsInSpace) {
                matchedSavedSpaceId = sId;
                break;
              }
            }
          }
        }

        if (matchedSavedSpaceId) {
          claimedSavedSpaceIds.add(matchedSavedSpaceId);
          restoredSavedSpaceWindowIds.add(win.id);
          newPersistedMap[String(win.id)] = matchedSavedSpaceId;
          await chrome.storage.session.set({ [`window_${win.id}_space`]: matchedSavedSpaceId });

          for (const u of winUrlSet) {
            restoredSavedSpaceUrls.add(u);
          }
          const sTabs = await db.tabs.where('spaceId').equals(matchedSavedSpaceId).toArray();
          for (const st of sTabs) {
            restoredSavedSpaceUrls.add(decodeRealUrl(st.url));
          }
        }
      }

      if (Object.keys(newPersistedMap).length > 0) {
        await chrome.storage.local.set({ [PERSISTED_WINDOW_SPACES_KEY]: newPersistedMap });
      }

      // 3. Count how many copies of each URL are currently open in non-saved-space (Unsaved) windows
      const openUrlCounts = new Map<string, number>();
      for (const t of allOpenTabs) {
        if (t.pinned) continue;
        if (t.windowId && restoredSavedSpaceWindowIds.has(t.windowId)) continue;
        const rawUrl = t.url || t.pendingUrl || '';
        if (!rawUrl || rawUrl.startsWith(dashboardUrl) || isSystemOrExtensionUrl(rawUrl)) {
          continue;
        }
        const realUrl = decodeRealUrl(rawUrl);
        openUrlCounts.set(realUrl, (openUrlCounts.get(realUrl) || 0) + 1);
      }

      // 4. Deduplicate tabs inside each unsaved space and remove tabs that belong to a restored saved Space
      const unsavedSpaces = await db.spaces
        .filter((s) => !!s.isUnsaved && !s.isArchived)
        .toArray();

      const emptyUnsavedSpaceIds: string[] = [];

      for (const uSpace of unsavedSpaces) {
        const uTabs = await db.tabs
          .where('spaceId')
          .equals(uSpace.id)
          .sortBy('order');

        if (uTabs.length === 0) {
          emptyUnsavedSpaceIds.push(uSpace.id);
          continue;
        }

        const seenUrlCounts = new Map<string, number>();
        const duplicateTabIds: string[] = [];

        for (const tab of uTabs) {
          const realUrl = decodeRealUrl(tab.url);

          // If this tab's URL belongs to a saved Space restored on startup and isn't open in any Unsaved window, remove it
          if (restoredSavedSpaceUrls.has(realUrl) && !openUrlCounts.has(realUrl)) {
            duplicateTabIds.push(tab.id);
            continue;
          }

          const countSoFar = seenUrlCounts.get(realUrl) || 0;
          const maxAllowed = Math.max(1, openUrlCounts.get(realUrl) || 1);

          if (countSoFar >= maxAllowed) {
            duplicateTabIds.push(tab.id);
          } else {
            seenUrlCounts.set(realUrl, countSoFar + 1);
          }
        }

        if (duplicateTabIds.length > 0) {
          await db.tabs.bulkDelete(duplicateTabIds);
          if (duplicateTabIds.length === uTabs.length) {
            emptyUnsavedSpaceIds.push(uSpace.id);
          }
        }
      }

      // Prune empty unsaved spaces
      if (emptyUnsavedSpaceIds.length > 0) {
        const allWindowsRestoredToSaved =
          windows.length > 0 && restoredSavedSpaceWindowIds.size === windows.length;
        const toDelete = allWindowsRestoredToSaved
          ? emptyUnsavedSpaceIds
          : emptyUnsavedSpaceIds.length === unsavedSpaces.length
          ? emptyUnsavedSpaceIds.slice(1)
          : emptyUnsavedSpaceIds;
        if (toDelete.length > 0) {
          await db.spaces.bulkDelete(toDelete);
        }
      }

      await chrome.storage.session.set({
        [SESSION_INIT_KEY]: true,
        [SESSION_INIT_STATUS_KEY]: 'done',
      });
    } catch (err) {
      console.warn('Failed to initialize session state:', err);
      await chrome.storage.session
        .set({ [SESSION_INIT_STATUS_KEY]: 'done' })
        .catch(() => {});
    } finally {
      sessionInitPromise = null;
    }
  })();

  return sessionInitPromise;
}

/**
 * Gets the active space bound to a window (null means UNSAVED)
 */
export async function getWindowActiveSpaceId(windowId: number): Promise<string | null> {
  try {
    const key = `window_${windowId}_space`;
    const data = await chrome.storage.session.get(key);
    const spaceId = data[key];
    if (spaceId && spaceId !== UNSAVED_SPACE_ID) {
      return spaceId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Binds an active space to a window and persists active bindings for startup recovery
 */
export async function setWindowActiveSpaceId(
  windowId: number,
  spaceId: string | null
) {
  try {
    const key = `window_${windowId}_space`;
    if (spaceId && spaceId !== UNSAVED_SPACE_ID) {
      await chrome.storage.session.set({ [key]: spaceId });
    } else {
      await chrome.storage.session.remove(key);
    }

    const allWinSpaces = await getAllWindowSpaces();
    const persisted: Record<string, string> = {};
    for (const [wId, sId] of allWinSpaces.entries()) {
      if (sId && sId !== UNSAVED_SPACE_ID) {
        persisted[String(wId)] = sId;
      }
    }
    await chrome.storage.local.set({ [PERSISTED_WINDOW_SPACES_KEY]: persisted });
  } catch (err) {
    console.error('Failed to set window active space:', err);
  }
}

/**
 * Removes a closed window's space binding from session storage, while preserving
 * the persisted binding in local storage if the last browser window is closing.
 */
export async function removeWindowSpaceBinding(windowId: number): Promise<void> {
  try {
    await chrome.storage.session.remove(`window_${windowId}_space`);
    await chrome.storage.session.remove(`transition_lock_${windowId}`);

    const remainingWindows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    const otherWindows = remainingWindows.filter((w) => w.id && w.id !== windowId);
    if (otherWindows.length > 0) {
      const sessionData = await chrome.storage.session.get(null);
      const persisted: Record<string, string> = {};
      for (const w of otherWindows) {
        if (w.id) {
          const sId = sessionData[`window_${w.id}_space`];
          if (sId && sId !== UNSAVED_SPACE_ID) {
            persisted[String(w.id)] = sId;
          }
        }
      }
      await chrome.storage.local.set({ [PERSISTED_WINDOW_SPACES_KEY]: persisted });
    }
  } catch {
    // Ignore storage errors during browser shutdown
  }
}

/**
 * Ensures a normal window has an active space assigned (or forces switching to an unsaved space
 * when forceUnsaved is true).
 */
export async function ensureWindowUnsavedSpace(
  windowId: number,
  forceUnsaved = false
): Promise<string> {
  const inFlight = ensureUnsavedLocks.get(windowId);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    await ensureSessionInitialized();

    const existingSpaceId = await getWindowActiveSpaceId(windowId);
    if (existingSpaceId) {
      const space = await db.spaces.get(existingSpaceId);
      if (space && !space.isArchived && (!forceUnsaved || space.isUnsaved)) {
        return existingSpaceId;
      }
    }

    // Check if there is an existing unsaved space not currently bound to another window
    const allWindowSpaces = await getAllWindowSpaces();
    const activeUnsavedIdsInWindows = new Set(
      Array.from(allWindowSpaces.entries())
        .filter(([wId]) => wId !== windowId)
        .map(([, sId]) => sId)
    );

    const availableUnsavedList = await db.spaces
      .filter((s) => !!s.isUnsaved && !s.isArchived && !activeUnsavedIdsInWindows.has(s.id))
      .toArray();

    let chosenSpaceId: string | null = null;

    if (availableUnsavedList.length === 1) {
      chosenSpaceId = availableUnsavedList[0].id;
    } else if (availableUnsavedList.length > 1) {
      // Find the unsaved space whose tabs best match the currently open tabs in this window
      const dashboardUrl = chrome.runtime.getURL('/dashboard.html');
      let windowTabs: chrome.tabs.Tab[] = [];
      try {
        windowTabs = await chrome.tabs.query({ windowId });
      } catch {}

      const windowUrls = new Set(
        windowTabs
          .filter((t) => !t.pinned)
          .map((t) => t.url || t.pendingUrl || '')
          .filter((u) => u && !u.startsWith(dashboardUrl) && !isSystemOrExtensionUrl(u))
          .map((u) => decodeRealUrl(u))
      );

      let bestSpace = availableUnsavedList[0];
      let bestScore = -1;

      for (const candidate of availableUnsavedList) {
        const candidateTabs = await db.tabs.where('spaceId').equals(candidate.id).toArray();
        let score = 0;
        for (const ct of candidateTabs) {
          if (windowUrls.has(decodeRealUrl(ct.url))) {
            score++;
          }
        }
        if (score > bestScore || (score === bestScore && candidate.updatedAt > bestSpace.updatedAt)) {
          bestScore = score;
          bestSpace = candidate;
        }
      }

      chosenSpaceId = bestSpace.id;
    }

    // Re-check before writing in case openSpaceInNewWindow or switchWindowToSpace bound a space concurrently
    const concurrentSpaceId = await getWindowActiveSpaceId(windowId);
    if (concurrentSpaceId && concurrentSpaceId !== existingSpaceId) {
      return concurrentSpaceId;
    }

    if (chosenSpaceId) {
      await setWindowActiveSpaceId(windowId, chosenSpaceId);
      return chosenSpaceId;
    }

    // Create a new unsaved space for this window
    const newId = crypto.randomUUID();
    const now = Date.now();
    await db.spaces.add({
      id: newId,
      name: '',
      isUnsaved: true,
      order: now,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });

    const finalCheckSpaceId = await getWindowActiveSpaceId(windowId);
    if (finalCheckSpaceId && finalCheckSpaceId !== existingSpaceId) {
      await db.spaces.delete(newId);
      return finalCheckSpaceId;
    }

    await setWindowActiveSpaceId(windowId, newId);
    return newId;
  })();

  ensureUnsavedLocks.set(windowId, promise);
  try {
    return await promise;
  } finally {
    ensureUnsavedLocks.delete(windowId);
  }
}

/**
 * Returns a map of windowId -> activeSpaceId for all normal windows
 */
export async function getAllWindowSpaces(): Promise<Map<number, string | null>> {
  const result = new Map<number, string | null>();
  try {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    if (windows.length === 0) return result;
    const sessionData = await chrome.storage.session.get(null);
    for (const w of windows) {
      if (w.id) {
        const spaceId = sessionData[`window_${w.id}_space`];
        result.set(w.id, spaceId && spaceId !== UNSAVED_SPACE_ID ? spaceId : null);
      }
    }
  } catch (err) {
    console.error('Failed to get all window spaces:', err);
  }
  return result;
}

/**
 * Focuses the window that currently has the specified space active
 */
export async function focusSpaceWindow(spaceId: string): Promise<boolean> {
  const winSpaces = await getAllWindowSpaces();
  for (const [winId, sId] of winSpaces.entries()) {
    if (sId === spaceId) {
      try {
        await chrome.windows.update(winId, { focused: true });
        return true;
      } catch {}
    }
  }
  return false;
}

/**
 * Transition Lock management to prevent race conditions during batch tab operations
 */
export async function setTransitionLock(windowId: number, locked: boolean) {
  try {
    if (locked) {
      await chrome.storage.session.set({ [`transition_lock_${windowId}`]: true });
    } else {
      await chrome.storage.session.remove(`transition_lock_${windowId}`);
    }
  } catch {
    // Session storage may fail if unsupported or extension reloading
  }
}

export async function isTransitioning(windowId: number): Promise<boolean> {
  try {
    const result = await chrome.storage.session.get(`transition_lock_${windowId}`);
    return !!result[`transition_lock_${windowId}`];
  } catch {
    return false;
  }
}
