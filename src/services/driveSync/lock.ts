import { type Tab } from '@/db/schema';

/**
 * Strips browser-local runtime fields (chromeTabId, windowId) from a Tab record
 * so cloud exports and backups remain portable across devices and browser sessions.
 */
export function stripRuntimeTabFields({ chromeTabId, windowId, ...rest }: Tab): Tab {
  return rest as Tab;
}

/**
 * Cross-context sync mutex shared between the background Service Worker and Dashboard tabs
 * via the standard Web Locks API. Prevents concurrent alarm and manual sync interleaving.
 */
export async function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks?.request) {
    return navigator.locks.request('spacetabs-sync', fn);
  }
  return fn();
}
