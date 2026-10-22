/**
 * Hybrid Tab Suspension Service:
 * 1. Cold Restores: Handled by suspended.html placeholder (~2KB, zero network requests).
 * 2. Idle Tabs: Uses Chrome's native Memory Saver (chrome.tabs.discard) to purge RAM
 *    without losing tab history, title, or favicons.
 *
 * Persistence & Worker Restart Resilience:
 * - Activity timestamps are cached in-memory and persisted to chrome.storage.session.
 * - Utilizes Chromium's native tab.lastAccessed for authoritative browser-level idle times.
 * - If a tab has no recorded timestamp, it defaults to NOW (current time) to prevent
 *   premature discarding upon background service worker restarts.
 */

import { db } from '@/db';

const SUSPENSION_ALARM_NAME = 'spacetabs-auto-discard-alarm';
const DEFAULT_IDLE_MINUTES = 15;
const STORAGE_KEY = 'tab_activity_timestamps';

// In-memory cache for fast O(1) synchronous reads/writes
let activityCache: Record<number, number> = {};
let isHydrated = false;
let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;

function getSessionStorage() {
  return chrome?.storage?.session || chrome?.storage?.local;
}

/**
 * Hydrates activityCache from chrome.storage.session
 */
async function ensureHydrated(): Promise<Record<number, number>> {
  if (isHydrated) return activityCache;
  try {
    const storage = getSessionStorage();
    if (storage) {
      const data = await storage.get(STORAGE_KEY);
      if (data && data[STORAGE_KEY] && typeof data[STORAGE_KEY] === 'object') {
        activityCache = { ...data[STORAGE_KEY], ...activityCache };
      }
    }
  } catch (err) {
    console.warn('Failed to hydrate tab activity from session storage:', err);
  } finally {
    isHydrated = true;
  }
  return activityCache;
}

/**
 * Persists activityCache to chrome.storage.session with debouncing
 */
function schedulePersist() {
  if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
  pendingSaveTimer = setTimeout(async () => {
    try {
      const storage = getSessionStorage();
      if (storage) {
        await storage.set({ [STORAGE_KEY]: activityCache });
      }
    } catch {
      // Ignored if session storage unavailable or extension reloading
    }
  }, 1000);
}

/**
 * Records tab activation time
 */
export function recordTabActivity(tabId: number) {
  if (!tabId || tabId <= 0) return;
  activityCache[tabId] = Date.now();
  schedulePersist();
}

/**
 * Removes tab from activity map on close
 */
export function forgetTabActivity(tabId: number) {
  if (!tabId) return;
  delete activityCache[tabId];
  schedulePersist();
}

/**
 * Discards eligible idle tabs in Chrome using the native Memory Saver API
 */
export async function discardInactiveTabs(maxIdleMinutes: number = DEFAULT_IDLE_MINUTES) {
  try {
    await ensureHydrated();

    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

    // 1. Never discard active tabs in ANY window
    const activeTabs = await chrome.tabs.query({ active: true });
    const activeTabIds = new Set(
      activeTabs.map((t) => t.id).filter((id): id is number => typeof id === 'number')
    );

    // 2. Query candidate inactive tabs
    const candidateTabs = await chrome.tabs.query({
      active: false,
      pinned: false,
      audible: false,
      discarded: false,
      status: 'complete',
    });

    const now = Date.now();
    const idleThresholdMs = maxIdleMinutes * 60 * 1000;

    for (const tab of candidateTabs) {
      if (!tab.id || !tab.url) continue;

      // Safety check: Never discard active tabs in any window
      if (activeTabIds.has(tab.id)) continue;

      // Safety check: Never discard pinned tabs or dashboard or suspended placeholders
      if (tab.pinned || tab.url.startsWith(dashboardUrl) || tab.url.includes('/suspended.html')) {
        continue;
      }

      // Safety check: Skip internal system URLs
      if (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('brave://') ||
        tab.url.startsWith('chrome-extension://')
      ) {
        continue;
      }

      // 3. Determine last active time using persisted records and Chromium's native lastAccessed
      const recordedTime = activityCache[tab.id];
      const browserLastAccessed =
        typeof tab.lastAccessed === 'number' && tab.lastAccessed > 0 && tab.lastAccessed <= now
          ? tab.lastAccessed
          : undefined;

      let lastActive: number;

      if (recordedTime && browserLastAccessed) {
        lastActive = Math.max(recordedTime, browserLastAccessed);
      } else if (recordedTime) {
        lastActive = recordedTime;
      } else if (browserLastAccessed) {
        lastActive = browserLastAccessed;
      } else {
        // Safe default: Tab was newly discovered or worker just woke up without prior record.
        // DO NOT assume 0. Default to NOW so it must wait the full threshold before discarding.
        lastActive = now;
        activityCache[tab.id] = now;
        schedulePersist();
      }

      const isIdle = now - lastActive >= idleThresholdMs;

      if (isIdle) {
        try {
          const discarded = await chrome.tabs.discard(tab.id);
          if (discarded?.id && discarded.id !== tab.id) {
            forgetTabActivity(tab.id);
            recordTabActivity(discarded.id);
            const records = await db.tabs.where('chromeTabId').equals(tab.id).toArray();
            for (const r of records) {
              await db.tabs.update(r.id, { chromeTabId: discarded.id, updatedAt: Date.now() });
            }
          }
        } catch {
          // Tab may have been closed or activated during async execution
        }
      }
    }
  } catch (err) {
    console.error('Error during auto-discard:', err);
  }
}

/**
 * Immediately discards all non-active, non-audible loaded tabs in a window
 */
export async function discardAllInactiveTabsInWindow(windowId: number) {
  try {
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');
    const tabs = await chrome.tabs.query({
      windowId,
      active: false,
      pinned: false,
      audible: false,
      discarded: false,
      status: 'complete',
    });

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (tab.url.startsWith(dashboardUrl) || tab.url.includes('/suspended.html')) {
        continue;
      }

      try {
        const discarded = await chrome.tabs.discard(tab.id);
        if (discarded?.id && discarded.id !== tab.id) {
          const records = await db.tabs.where('chromeTabId').equals(tab.id).toArray();
          for (const r of records) {
            await db.tabs.update(r.id, { chromeTabId: discarded.id, updatedAt: Date.now() });
          }
        }
      } catch {
        // Ignored
      }
    }
  } catch (err) {
    console.error('Error discarding tabs in window:', err);
  }
}

/**
 * Registers the alarm listener synchronously for Service Worker lifecycle resilience
 */
export function initSuspensionListener() {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === SUSPENSION_ALARM_NAME) {
      try {
        const data = await chrome.storage.local.get('spacetabs_user_settings');
        const settings = data?.spacetabs_user_settings;
        if (settings && settings.autoSuspendEnabled === false) {
          return;
        }
        const threshold = settings?.idleThresholdMinutes || DEFAULT_IDLE_MINUTES;
        await discardInactiveTabs(threshold);
      } catch {
        await discardInactiveTabs(DEFAULT_IDLE_MINUTES);
      }
    }
  });
}

/**
 * Sets up periodic alarm for Chrome's native Memory Saver discarding
 */
export async function setupSuspensionAlarms() {
  try {
    const existing = await chrome.alarms.get(SUSPENSION_ALARM_NAME);
    if (!existing) {
      await chrome.alarms.create(SUSPENSION_ALARM_NAME, {
        periodInMinutes: 10,
      });
    }
  } catch (err) {
    console.error('Failed to setup suspension alarm:', err);
  }
}
