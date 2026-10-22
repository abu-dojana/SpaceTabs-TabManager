import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';

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
 * Binds an active space to a window
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
  } catch (err) {
    console.error('Failed to set window active space:', err);
  }
}

/**
 * Ensures a normal window has an unsaved space assigned if no active space exists.
 */
export async function ensureWindowUnsavedSpace(windowId: number): Promise<string> {
  const existingSpaceId = await getWindowActiveSpaceId(windowId);
  if (existingSpaceId) {
    const space = await db.spaces.get(existingSpaceId);
    if (space && !space.isArchived) {
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

  const availableUnsaved = await db.spaces
    .filter((s) => !!s.isUnsaved && !s.isArchived && !activeUnsavedIdsInWindows.has(s.id))
    .first();

  if (availableUnsaved) {
    await setWindowActiveSpaceId(windowId, availableUnsaved.id);
    return availableUnsaved.id;
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

  await setWindowActiveSpaceId(windowId, newId);
  return newId;
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
