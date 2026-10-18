/**
 * Hybrid Tab Suspension Service:
 * 1. Cold Restores: Handled by suspended.html placeholder (~2KB, zero network requests).
 * 2. Idle Tabs: Uses Chrome's native Memory Saver (chrome.tabs.discard) to purge RAM
 *    without losing tab history, title, or favicons.
 */

const SUSPENSION_ALARM_NAME = 'spacetabs-auto-discard-alarm';
const DEFAULT_IDLE_MINUTES = 15;

// Memory map of last active timestamps per tab ID
const tabLastActiveTimes = new Map<number, number>();

/**
 * Records tab activation time
 */
export function recordTabActivity(tabId: number) {
  tabLastActiveTimes.set(tabId, Date.now());
}

/**
 * Removes tab from activity map on close
 */
export function forgetTabActivity(tabId: number) {
  tabLastActiveTimes.delete(tabId);
}

/**
 * Discards eligible idle tabs in Chrome using the native Memory Saver API
 */
export async function discardInactiveTabs(maxIdleMinutes: number = DEFAULT_IDLE_MINUTES) {
  try {
    const dashboardUrl = chrome.runtime.getURL('/dashboard.html');
    const tabs = await chrome.tabs.query({
      active: false,
      pinned: false,
      audible: false,
      discarded: false,
      status: 'complete',
    });

    const now = Date.now();
    const idleThresholdMs = maxIdleMinutes * 60 * 1000;

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      // Never discard the pinned dashboard or already-suspended placeholder tabs
      if (tab.url.startsWith(dashboardUrl) || tab.url.includes('/suspended.html')) {
        continue;
      }

      const lastActive = tabLastActiveTimes.get(tab.id) || 0;
      const isIdle = now - lastActive > idleThresholdMs;

      if (isIdle) {
        try {
          await chrome.tabs.discard(tab.id);
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
        await chrome.tabs.discard(tab.id);
      } catch {
        // Ignored
      }
    }
  } catch (err) {
    console.error('Error discarding tabs in window:', err);
  }
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

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === SUSPENSION_ALARM_NAME) {
        discardInactiveTabs();
      }
    });
  } catch (err) {
    console.error('Failed to setup suspension alarm:', err);
  }
}
