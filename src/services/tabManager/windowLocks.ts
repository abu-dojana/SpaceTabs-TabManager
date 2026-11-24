const inProcessWindowQueues = new Map<number, Promise<unknown>>();
const closingWindowIds = new Map<number, number>();
const closingWindowTabIds = new Map<number, number>();
const CLOSING_TTL_MS = 10000;

export function markWindowClosing(windowId: number): void {
  closingWindowIds.set(windowId, Date.now() + CLOSING_TTL_MS);
}

export function markTabClosingWithWindow(tabId: number, windowId?: number): void {
  const exp = Date.now() + CLOSING_TTL_MS;
  closingWindowTabIds.set(tabId, exp);
  if (typeof windowId === 'number') {
    closingWindowIds.set(windowId, exp);
  }
}

export function isTabOrWindowClosing(tabId?: number, windowId?: number): boolean {
  const now = Date.now();
  if (typeof tabId === 'number') {
    const exp = closingWindowTabIds.get(tabId);
    if (exp && now < exp) return true;
  }
  if (typeof windowId === 'number') {
    const exp = closingWindowIds.get(windowId);
    if (exp && now < exp) return true;
  }
  return false;
}

export async function withUnsavedLock<T>(windowId: number, fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks?.request) {
    return navigator.locks.request(`spacetabs-unsaved-win-${windowId}`, fn);
  }
  return fn();
}

/**
 * Serializes window-level tab/space operations across all extension contexts
 * (Service Worker background sync and Dashboard space switching) so they never interleave.
 */
export async function withWindowLock<T>(windowId: number, fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks?.request) {
    return navigator.locks.request(`spacetabs-window-op-${windowId}`, fn);
  }
  const prev = inProcessWindowQueues.get(windowId) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  inProcessWindowQueues.set(windowId, next);
  try {
    return await next;
  } finally {
    if (inProcessWindowQueues.get(windowId) === next) {
      inProcessWindowQueues.delete(windowId);
    }
  }
}

/**
 * Transition Lock management to prevent race conditions during batch tab operations.
 * Uses an expiry timestamp so a previous switch's cooldown never prematurely unlocks a newer switch.
 */
export async function setTransitionLock(
  windowId: number,
  locked: boolean,
  cooldownMs = 0
) {
  try {
    const key = `transition_lock_${windowId}`;
    if (locked) {
      await chrome.storage.session.set({ [key]: Date.now() + 30000 });
    } else if (cooldownMs > 0) {
      await chrome.storage.session.set({ [key]: Date.now() + cooldownMs });
    } else {
      await chrome.storage.session.remove(key);
    }
  } catch {
    // Session storage may fail if unsupported or extension reloading
  }
}

export async function isTransitioning(windowId: number): Promise<boolean> {
  try {
    const key = `transition_lock_${windowId}`;
    const result = await chrome.storage.session.get(key);
    const val = result[key];
    if (typeof val === 'number') {
      if (Date.now() < val) {
        return true;
      }
      chrome.storage.session.remove(key).catch(() => {});
      return false;
    }
    return !!val;
  } catch {
    return false;
  }
}
