import { defineBackground } from 'wxt/sandbox';
import { syncWindowTabsToUnsaved } from '@/services/tabManager';
import {
  setupSuspensionAlarms,
  recordTabActivity,
  forgetTabActivity,
} from '@/services/suspension';

export default defineBackground(() => {
  const DASHBOARD_PAGE = '/dashboard.html';
  const DASHBOARD_URL = chrome.runtime.getURL(DASHBOARD_PAGE);

  /**
   * Idempotent check: ensures exactly one pinned dashboard tab at index 0
   * for a given normal browser window.
   */
  async function ensurePinnedIndexTab(windowId: number) {
    try {
      const win = await chrome.windows.get(windowId);
      // Guard: Skip popups, devtools, and app frames
      if (win.type !== 'normal') return;

      const tabs = await chrome.tabs.query({ windowId });
      const dashboardTabs = tabs.filter((t) => t.url?.startsWith(DASHBOARD_URL));

      if (dashboardTabs.length === 0) {
        // None exists: create pinned at index 0
        await chrome.tabs.create({
          windowId,
          url: DASHBOARD_URL,
          pinned: true,
          index: 0,
        });
      } else if (dashboardTabs.length > 1) {
        // Deduplicate (e.g. startup "Continue where you left off" + extension init)
        const [keep, ...duplicates] = dashboardTabs;
        if (!keep.pinned) {
          await chrome.tabs.update(keep.id!, { pinned: true });
        }
        for (const dup of duplicates) {
          if (dup.id) await chrome.tabs.remove(dup.id);
        }
      } else if (!dashboardTabs[0].pinned) {
        await chrome.tabs.update(dashboardTabs[0].id!, { pinned: true });
      }
    } catch {
      // Window may have already closed during async execution
    }
  }

  // 1. Startup & Window Lifecycle
  chrome.runtime.onStartup.addListener(async () => {
    await setupSuspensionAlarms();
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    for (const win of windows) {
      if (win.id) {
        await ensurePinnedIndexTab(win.id);
        await syncWindowTabsToUnsaved(win.id);
      }
    }
  });

  chrome.runtime.onInstalled.addListener(async () => {
    await setupSuspensionAlarms();
  });

  chrome.windows.onCreated.addListener((window) => {
    if (window.type === 'normal' && window.id) {
      ensurePinnedIndexTab(window.id);
    }
  });

  chrome.windows.onRemoved.addListener(async (windowId) => {
    try {
      await chrome.storage.session.remove(`window_${windowId}_space`);
      await chrome.storage.session.remove(`transition_lock_${windowId}`);
    } catch {
      // Ignored
    }
  });

  // 2. Tab Removed Guard (Prevents Zombie Windows)
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    forgetTabActivity(tabId);
    // Critical Guard: NEVER recreate if the entire window is closing
    if (removeInfo.isWindowClosing) return;

    await ensurePinnedIndexTab(removeInfo.windowId);
    await syncWindowTabsToUnsaved(removeInfo.windowId);
  });

  // 3. Tab Updated: Sync immediately without waiting for 'complete' status
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!tab.windowId) return;

    if (tab.url?.startsWith(DASHBOARD_URL)) {
      if (changeInfo.status === 'complete') {
        ensurePinnedIndexTab(tab.windowId);
      }
    } else {
      // Sync immediately on any update (loading, url, title, favIconUrl)
      syncWindowTabsToUnsaved(tab.windowId);
    }
  });

  // 4. Tab Created, Moved & Activated
  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.windowId) syncWindowTabsToUnsaved(tab.windowId);
  });

  chrome.tabs.onMoved.addListener((_tabId, moveInfo) => {
    syncWindowTabsToUnsaved(moveInfo.windowId);
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    recordTabActivity(activeInfo.tabId);
    syncWindowTabsToUnsaved(activeInfo.windowId);
  });

  // 5. Keyboard Shortcut to focus Dashboard (Alt+Shift+W)
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'focus-dashboard') {
      const currentWin = await chrome.windows.getCurrent();
      if (!currentWin.id) return;

      const tabs = await chrome.tabs.query({ windowId: currentWin.id });
      const dashTab = tabs.find((t) => t.url?.startsWith(DASHBOARD_URL));

      if (dashTab?.id) {
        await chrome.tabs.update(dashTab.id, { active: true });
      } else {
        await ensurePinnedIndexTab(currentWin.id);
      }
    }
  });
});
