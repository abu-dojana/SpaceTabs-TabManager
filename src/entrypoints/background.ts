import { defineBackground } from 'wxt/sandbox';
import { db } from '@/db';
import {
  syncWindowTabsToUnsaved,
  ensureWindowUnsavedSpace,
  ensureSessionInitialized,
  getWindowActiveSpaceId,
  setWindowActiveSpaceId,
  removeWindowSpaceBinding,
  setTransitionLock,
  consumePendingNewWindowSpace,
  getAllWindowSpaces,
  migrateLegacyUnsavedTabs,
} from '@/services/tabManager';
import {
  setupSuspensionAlarms,
  initSuspensionListener,
  recordTabActivity,
  forgetTabActivity,
} from '@/services/suspension';
import {
  DRIVE_SYNC_ALARM,
  setupDriveSyncAlarm,
  syncNow,
  getCloudSyncSettings,
  getGoogleProfile,
} from '@/services/driveSync';

export default defineBackground(() => {
  // Synchronously bind alarm listener so Service Worker receives wakeups reliably
  initSuspensionListener();

  // Background Drive Sync alarm listener
  chrome.alarms?.onAlarm?.addListener(async (alarm) => {
    if (alarm.name === DRIVE_SYNC_ALARM) {
      try {
        const settings = await getCloudSyncSettings();
        const profile = await getGoogleProfile();
        if (settings.enabled && settings.autoSync && profile) {
          console.log('[Background] Executing scheduled Google Drive sync...');
          await syncNow();
        }
      } catch (err) {
        console.warn('[Background] Drive sync alarm failed:', err);
      }
    }
  });

  const DASHBOARD_PAGE = '/dashboard.html';
  const DASHBOARD_URL = chrome.runtime.getURL(DASHBOARD_PAGE);
  const pinnedCheckLocks = new Set<number>();
  const dashboardTabIds = new Map<number, number>();
  let initWindowsPromise: Promise<void> | null = null;

  function isDashboardTab(tab: chrome.tabs.Tab): boolean {
    return Boolean(
      tab.url?.startsWith(DASHBOARD_URL) ||
      tab.pendingUrl?.startsWith(DASHBOARD_URL)
    );
  }

  /**
   * Idempotent check: ensures exactly one pinned dashboard tab at index 0
   * for a given normal browser window. Retries automatically if Chromium blocks
   * tab creation while the user is actively dragging a tab with the mouse.
   */
  async function ensurePinnedIndexTab(
    windowId: number,
    activateIfCreated?: boolean,
    retryCount = 0
  ) {
    if (pinnedCheckLocks.has(windowId)) return;
    pinnedCheckLocks.add(windowId);
    let shouldRetry = false;
    try {
      const win = await chrome.windows.get(windowId);
      // Guard: Skip popups, devtools, and app frames
      if (win.type !== 'normal') return;

      const tabs = await chrome.tabs.query({ windowId });
      const dashboardTabs = tabs.filter(isDashboardTab);

      if (dashboardTabs.length === 0) {
        // None exists: create pinned at index 0
        const created = await chrome.tabs.create({
          windowId,
          url: DASHBOARD_URL,
          pinned: true,
          index: 0,
          active: activateIfCreated ?? tabs.length === 0,
        });
        if (created.id) {
          dashboardTabIds.set(windowId, created.id);
        }
      } else if (dashboardTabs.length > 1) {
        // Deduplicate (e.g. startup "Continue where you left off" + extension init)
        const [keep, ...duplicates] = dashboardTabs;
        if (keep.id) {
          dashboardTabIds.set(windowId, keep.id);
          if (!keep.pinned) {
            await chrome.tabs.update(keep.id, { pinned: true });
          }
          if (keep.index !== 0) {
            await chrome.tabs.move(keep.id, { index: 0 });
          }
        }
        for (const dup of duplicates) {
          if (dup.id) await chrome.tabs.remove(dup.id);
        }
      } else {
        const dash = dashboardTabs[0];
        if (dash.id) {
          dashboardTabIds.set(windowId, dash.id);
          if (!dash.pinned) {
            await chrome.tabs.update(dash.id, { pinned: true });
          }
          if (dash.index !== 0) {
            await chrome.tabs.move(dash.id, { index: 0 });
          }
        }
      }
    } catch {
      // Chromium blocks tab edits while user's mouse button is held down dragging a tab.
      // If the window still exists, retry once the mouse drag finishes.
      if (retryCount < 15) {
        try {
          const checkWin = await chrome.windows.get(windowId);
          if (checkWin && checkWin.type === 'normal') {
            shouldRetry = true;
          }
        } catch {
          // Window was closed
        }
      }
    } finally {
      pinnedCheckLocks.delete(windowId);
      if (shouldRetry) {
        setTimeout(() => {
          ensurePinnedIndexTab(windowId, activateIfCreated, retryCount + 1);
        }, 200);
      }
    }
  }

  /**
   * Initializes all existing normal browser windows by ensuring
   * the pinned dashboard index tab is present and tabs are synchronized.
   */
  async function initializeAllWindows() {
    if (initWindowsPromise) {
      return initWindowsPromise;
    }

    initWindowsPromise = (async () => {
      try {
        await ensureSessionInitialized();
        await migrateLegacyUnsavedTabs();
        const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
        for (const win of windows) {
          if (win.id) {
            const activeSpaceId = await getWindowActiveSpaceId(win.id);
            if (!activeSpaceId) {
              await ensureWindowUnsavedSpace(win.id);
            }
            await ensurePinnedIndexTab(win.id);
            await syncWindowTabsToUnsaved(win.id);
          }
        }
      } catch (err) {
        console.warn('[Background] Error initializing windows:', err);
      } finally {
        initWindowsPromise = null;
      }
    })();

    return initWindowsPromise;
  }

  // 1. Startup & Window Lifecycle
  chrome.runtime.onStartup.addListener(async () => {
    await migrateLegacyUnsavedTabs();
    await setupSuspensionAlarms();
    const syncSettings = await getCloudSyncSettings();
    if (syncSettings.enabled && syncSettings.syncOnStartup) {
      syncNow().catch((e) => console.warn('[Background] Startup Drive sync error:', e));
    }
    await setupDriveSyncAlarm(syncSettings.syncIntervalMinutes);
    await initializeAllWindows();
  });

  chrome.runtime.onInstalled.addListener(async () => {
    await migrateLegacyUnsavedTabs();
    await setupSuspensionAlarms();
    await setupDriveSyncAlarm();
    await initializeAllWindows();
  });

  chrome.windows.onCreated.addListener(async (window) => {
    if (window.type === 'normal' && window.id) {
      const pendingSpaceId = await consumePendingNewWindowSpace();
      if (pendingSpaceId) {
        await setTransitionLock(window.id, true);
        await setWindowActiveSpaceId(window.id, pendingSpaceId);
      } else {
        let adoptedSpaceId: string | null = null;
        try {
          const winTabs = await chrome.tabs.query({ windowId: window.id });
          for (const wt of winTabs) {
            if (wt.id && !wt.pinned && !isDashboardTab(wt)) {
              const existingRec = await db.tabs.where('chromeTabId').equals(wt.id).first();
              if (existingRec?.spaceId) {
                const sp = await db.spaces.get(existingRec.spaceId);
                if (sp && !sp.isUnsaved && !sp.isArchived) {
                  adoptedSpaceId = sp.id;
                  await db.tabs.update(existingRec.id, {
                    windowId: window.id,
                    updatedAt: Date.now(),
                  });
                  break;
                }
              }
            }
          }
        } catch {}

        if (adoptedSpaceId) {
          await setWindowActiveSpaceId(window.id, adoptedSpaceId);
        } else {
          await ensureWindowUnsavedSpace(window.id);
        }
      }
      await ensurePinnedIndexTab(window.id, false);
      await syncWindowTabsToUnsaved(window.id);
    }
  });

  chrome.windows.onRemoved.addListener(async (windowId) => {
    try {
      const spaceId = await getWindowActiveSpaceId(windowId);
      if (spaceId) {
        const space = await db.spaces.get(spaceId);
        if (space?.isUnsaved) {
          const tabCount = await db.tabs.where('spaceId').equals(spaceId).count();
          if (tabCount === 0) {
            await db.spaces.delete(spaceId);
          }
        }
      }
      dashboardTabIds.delete(windowId);
      await removeWindowSpaceBinding(windowId);
      await db.tabs
        .where('windowId')
        .equals(windowId)
        .modify({ chromeTabId: undefined, windowId: undefined });
    } catch {
      // Ignored
    }
  });

  // 2. Tab Removed Guard (Prevents Zombie Windows)
  chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    forgetTabActivity(tabId);
    if (dashboardTabIds.get(removeInfo.windowId) === tabId) {
      dashboardTabIds.delete(removeInfo.windowId);
    }
    // Critical Guard: NEVER recreate if the entire window is closing
    if (removeInfo.isWindowClosing) return;

    await ensurePinnedIndexTab(removeInfo.windowId);
    await syncWindowTabsToUnsaved(removeInfo.windowId);
  });

  // 3. Tab Updated: Sync immediately and record activity on load/navigation
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!tab.windowId) return;

    if (changeInfo.status === 'complete' || changeInfo.url) {
      recordTabActivity(tabId);
    }

    if (isDashboardTab(tab)) {
      dashboardTabIds.set(tab.windowId, tabId);
      if (changeInfo.status === 'complete') {
        ensurePinnedIndexTab(tab.windowId);
      }
    } else {
      const currentUrl = tab.url || tab.pendingUrl || changeInfo.url;
      const wasDashboardTab = dashboardTabIds.get(tab.windowId) === tabId;

      if (
        currentUrl &&
        (wasDashboardTab ||
          (tab.pinned && tab.index === 0 && !dashboardTabIds.has(tab.windowId)))
      ) {
        let shouldRescue = wasDashboardTab;
        if (!shouldRescue) {
          try {
            const winTabs = await chrome.tabs.query({ windowId: tab.windowId });
            const existingDash = winTabs.find(isDashboardTab);
            if (existingDash?.id) {
              dashboardTabIds.set(tab.windowId, existingDash.id);
            } else {
              shouldRescue = true;
            }
          } catch {}
        }

        if (shouldRescue) {
          dashboardTabIds.delete(tab.windowId);
          try {
            await chrome.tabs.update(tabId, { pinned: false });
            await chrome.tabs.move(tabId, { index: -1 });
          } catch {}
          await ensurePinnedIndexTab(tab.windowId, false);
          await syncWindowTabsToUnsaved(tab.windowId);
          return;
        }
      }

      // Sync immediately on any update (loading, url, title, favIconUrl)
      syncWindowTabsToUnsaved(tab.windowId);
    }
  });

  // 4. Tab Created, Moved & Activated
  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id) recordTabActivity(tab.id);
    if (tab.windowId) {
      ensurePinnedIndexTab(tab.windowId);
      syncWindowTabsToUnsaved(tab.windowId);
    }
  });

  chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
    recordTabActivity(tabId);
    try {
      const existingRec = await db.tabs.where('chromeTabId').equals(tabId).first();
      if (existingRec?.spaceId) {
        await db.tabs.update(existingRec.id, {
          windowId: attachInfo.newWindowId,
          updatedAt: Date.now(),
        });

        const sp = await db.spaces.get(existingRec.spaceId);
        if (sp && !sp.isUnsaved && !sp.isArchived) {
          const curWinSpaceId = await getWindowActiveSpaceId(attachInfo.newWindowId);
          const curWinSpace = curWinSpaceId ? await db.spaces.get(curWinSpaceId) : undefined;
          if (!curWinSpaceId || curWinSpace?.isUnsaved) {
            const winTabs = await chrome.tabs.query({ windowId: attachInfo.newWindowId });
            const nonDashTabs = winTabs.filter((t) => !t.pinned && !isDashboardTab(t));
            if (nonDashTabs.length === 1 && nonDashTabs[0].id === tabId) {
              if (curWinSpaceId && curWinSpace?.isUnsaved) {
                const count = await db.tabs.where('spaceId').equals(curWinSpaceId).count();
                if (count === 0) {
                  await db.spaces.delete(curWinSpaceId);
                }
              }
              await setWindowActiveSpaceId(attachInfo.newWindowId, sp.id);
            }
          }
        }
      }
    } catch {}

    await ensurePinnedIndexTab(attachInfo.newWindowId, false);
    await syncWindowTabsToUnsaved(attachInfo.newWindowId);
  });

  chrome.tabs.onDetached.addListener(async (_tabId, detachInfo) => {
    await ensurePinnedIndexTab(detachInfo.oldWindowId, false);
    await syncWindowTabsToUnsaved(detachInfo.oldWindowId);
  });

  chrome.tabs.onMoved.addListener((_tabId, moveInfo) => {
    syncWindowTabsToUnsaved(moveInfo.windowId);
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    recordTabActivity(activeInfo.tabId);
    syncWindowTabsToUnsaved(activeInfo.windowId);
  });

  // 5. Tab Replaced (Chromium discards, prerenders, or process swaps)
  chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
    recordTabActivity(addedTabId);
    forgetTabActivity(removedTabId);

    try {
      const records = await db.tabs
        .where('chromeTabId')
        .equals(removedTabId)
        .toArray();

      for (const rec of records) {
        await db.tabs.update(rec.id, {
          chromeTabId: addedTabId,
          updatedAt: Date.now(),
        });
      }

      const tab = await chrome.tabs.get(addedTabId);
      if (tab?.windowId) {
        syncWindowTabsToUnsaved(tab.windowId);
      }
    } catch {
      // Ignored
    }
  });

  // 6. Keyboard Shortcut to focus Dashboard (Alt+Shift+W)
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

  // Immediate check on Service Worker startup / load unpacked
  initializeAllWindows();
});
