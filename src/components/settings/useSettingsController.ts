import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  getUserSettings,
  updateUserSettings,
  exportAllSpacesBackup,
  importSpacesBackup,
  purgeStaleUnsavedTabs,
  suspendAllInactiveNow,
  restoreAllSuspendedTabsToCleanUrls,
  type UserSettings,
  type DarkPalette,
  type LightPalette,
  DEFAULT_SETTINGS,
} from '@/services/settings';
import {
  signInWithGoogle,
  signOutGoogle,
  syncNow,
  forcePushToDrive,
  forcePullFromDrive,
  getDriveSyncInfo,
  subscribeSyncStatus,
  updateCloudSyncSettings,
  setupDriveSyncAlarm,
  type DriveSyncInfo,
} from '@/services/driveSync';
import { type SettingsTabId, type ToastMessage } from './settingsTabs';

export function useSettingsController(isOpen: boolean, initialTab: SettingsTabId = 'general') {
  const [activeTab, setActiveTab] = React.useState<SettingsTabId>(initialTab);

  const {
    sidebarTheme,
    dashboardTheme,
    accentColor,
    darkPalette,
    lightPalette,
    sidebarWidth,
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
    setSidebarWidth,
    setPatreonUrl,
  } = useUIStore();

  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);
  const [toastMessage, setToastMessage] = React.useState<ToastMessage | null>(null);
  const [isSuspending, setIsSuspending] = React.useState(false);
  const [isPurging, setIsPurging] = React.useState(false);

  const [syncInfo, setSyncInfo] = React.useState<DriveSyncInfo | null>(null);
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [isSyncingNow, setIsSyncingNow] = React.useState(false);
  const [isPushing, setIsPushing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const [confirmPullModal, setConfirmPullModal] = React.useState(false);
  const [dashboardShortcut, setDashboardShortcut] = React.useState<string>('Alt + Shift + W');
  const [isShortcutAssigned, setIsShortcutAssigned] = React.useState<boolean>(true);

  const fileInputRef = React.useRef<HTMLInputElement>(null!);

  const isLight = dashboardTheme === 'light';

  const refreshShortcutBinding = React.useCallback(() => {
    try {
      chrome.commands?.getAll?.((commands) => {
        const cmd = commands?.find((c) => c.name === 'focus-dashboard');
        if (cmd) {
          if (cmd.shortcut && cmd.shortcut.trim()) {
            setDashboardShortcut(cmd.shortcut);
            setIsShortcutAssigned(true);
          } else {
            setDashboardShortcut('Not assigned in browser');
            setIsShortcutAssigned(false);
          }
        }
      });
    } catch {}
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      refreshShortcutBinding();
      getUserSettings().then((loaded) => {
        setSettings(loaded);
        if (loaded.sidebarTheme) setSidebarTheme(loaded.sidebarTheme);
        if (loaded.dashboardTheme) setDashboardTheme(loaded.dashboardTheme);
        if (loaded.accentColor) setAccentColor(loaded.accentColor);
        if (loaded.darkPalette) setDarkPalette(loaded.darkPalette);
        if (loaded.lightPalette) setLightPalette(loaded.lightPalette);
        if (loaded.sidebarWidth) setSidebarWidth(loaded.sidebarWidth);
        if (loaded.patreonUrl) {
          setPatreonUrl(loaded.patreonUrl);
        }
      });

      getDriveSyncInfo().then((info) => {
        setSyncInfo(info);
      });

      const unsub = subscribeSyncStatus((info) => {
        setSyncInfo(info);
      });
      return () => unsub();
    }
  }, [
    isOpen,
    initialTab,
    refreshShortcutBinding,
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
    setSidebarWidth,
    setPatreonUrl,
  ]);

  const backupMetrics = useLiveQuery(async () => {
    const allSpaces = await db.spaces.toArray();
    const savedSpaceIds = allSpaces
      .filter((s) => !s.isUnsaved && !s.isArchived)
      .map((s) => s.id);
    if (savedSpaceIds.length === 0) {
      return {
        spacesCount: 0,
        savedTabsCount: 0,
        notesCount: 0,
        tasksCount: 0,
        resourcesCount: 0,
      };
    }
    const [tabsCount, notesCount, tasksCount, sections] = await Promise.all([
      db.tabs.where('spaceId').anyOf(savedSpaceIds).count(),
      db.notes.where('spaceId').anyOf(savedSpaceIds).count(),
      db.tasks.where('spaceId').anyOf(savedSpaceIds).count(),
      db.resourceSections.where('spaceId').anyOf(savedSpaceIds).toArray(),
    ]);
    const sectionIds = sections.map((s) => s.id);
    const resourcesCount =
      sectionIds.length > 0
        ? await db.resourceItems.where('sectionId').anyOf(sectionIds).count()
        : 0;
    return {
      spacesCount: savedSpaceIds.length,
      savedTabsCount: tabsCount,
      notesCount,
      tasksCount,
      resourcesCount,
    };
  });

  const spacesCount = backupMetrics?.spacesCount ?? 0;
  const savedTabsCount = backupMetrics?.savedTabsCount ?? 0;
  const notesCount = backupMetrics?.notesCount ?? 0;
  const tasksCount = backupMetrics?.tasksCount ?? 0;
  const resourcesCount = backupMetrics?.resourcesCount ?? 0;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleToggle = async (key: keyof UserSettings) => {
    const updated = await updateUserSettings({ [key]: !settings[key] });
    setSettings(updated);
    showToast('Setting saved');
  };

  const handleSelectThreshold = async (minutes: number) => {
    const updated = await updateUserSettings({ idleThresholdMinutes: minutes });
    setSettings(updated);
    showToast(`Idle threshold set to ${minutes}m`);
  };

  const handleSidebarThemeChange = async (theme: 'dark' | 'light') => {
    setSidebarTheme(theme);
    const updated = await updateUserSettings({ sidebarTheme: theme });
    setSettings(updated);
    showToast(`Sidebar set to ${theme} mode`);
  };

  const handleSidebarWidthChange = async (width: number) => {
    setSidebarWidth(width);
    const updated = await updateUserSettings({ sidebarWidth: width });
    setSettings(updated);
  };

  const handleDashboardThemeChange = async (theme: 'dark' | 'light') => {
    setDashboardTheme(theme);
    const updated = await updateUserSettings({ dashboardTheme: theme });
    setSettings(updated);
    showToast(`Dashboard set to ${theme} mode`);
  };

  const handleAccentColorChange = async (color: string) => {
    setAccentColor(color);
    const updated = await updateUserSettings({ accentColor: color });
    setSettings(updated);
    showToast('Accent color updated');
  };

  const handleDarkPaletteChange = async (palette: DarkPalette) => {
    setDarkPalette(palette);
    const updated = await updateUserSettings({ darkPalette: palette });
    setSettings(updated);
    showToast(`Dark palette set to ${palette}`);
  };

  const handleLightPaletteChange = async (palette: LightPalette) => {
    setLightPalette(palette);
    const updated = await updateUserSettings({ lightPalette: palette });
    setSettings(updated);
    showToast(`Light palette set to ${palette}`);
  };

  const handleApplyPreset = async (sb: 'dark' | 'light', dbTheme: 'dark' | 'light') => {
    setSidebarTheme(sb);
    setDashboardTheme(dbTheme);
    const updated = await updateUserSettings({ sidebarTheme: sb, dashboardTheme: dbTheme });
    setSettings(updated);
    showToast('Theme preset applied!');
  };

  const handleCopyBkash = () => {
    navigator.clipboard.writeText('+8801521566157');
    showToast('bKash number copied (+8801521566157)!');
  };

  const handleInstantSuspend = async () => {
    setIsSuspending(true);
    try {
      const purgedWindows = await suspendAllInactiveNow();
      showToast(`RAM freed! Inactive tabs purged in ${purgedWindows} window(s).`);
    } catch {
      showToast('Failed to suspend inactive tabs.', 'error');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleRestoreAllSuspended = async () => {
    try {
      const count = await restoreAllSuspendedTabsToCleanUrls();
      if (count > 0) {
        showToast(`Restored ${count} suspended tab(s) to their original clean URLs!`);
      } else {
        showToast('All open tabs already have clean URLs.');
      }
    } catch {
      showToast('Failed to restore suspended tabs.', 'error');
    }
  };

  const handleExport = async () => {
    try {
      await exportAllSpacesBackup();
      showToast('Backup downloaded successfully!');
    } catch {
      showToast('Failed to export backup.', 'error');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importSpacesBackup(text);
      if (result.success) {
        showToast(result.message);
      } else {
        showToast(result.message, 'error');
      }
    } catch {
      showToast('Error reading backup file.', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const count = await purgeStaleUnsavedTabs();
      showToast(`Cleaned ${count} stale closed tab(s) from cache.`);
    } catch {
      showToast('Failed to purge stale tabs.', 'error');
    } finally {
      setIsPurging(false);
    }
  };

  const handleSignInGoogle = async () => {
    setIsSigningIn(true);
    const res = await signInWithGoogle(true);
    setIsSigningIn(false);
    if (res.success) {
      showToast('Connected to Google Drive!');
    } else {
      showToast(res.error || 'Failed to sign in with Google.', 'error');
    }
  };

  const handleSignOut = async () => {
    await signOutGoogle();
    showToast('Signed out of Google Account.');
  };

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    const res = await syncNow();
    setIsSyncingNow(false);
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleForcePush = async () => {
    setIsPushing(true);
    const res = await forcePushToDrive();
    setIsPushing(false);
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleForcePull = async () => {
    setIsPulling(true);
    const res = await forcePullFromDrive();
    setIsPulling(false);
    setConfirmPullModal(false);
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleToggleAutoSync = async () => {
    if (!syncInfo) return;
    const newVal = !syncInfo.settings.autoSync;
    const updated = await updateCloudSyncSettings({ autoSync: newVal });
    await setupDriveSyncAlarm(updated.syncIntervalMinutes);
    showToast(`Auto-sync ${newVal ? 'enabled' : 'disabled'}`);
  };

  const handleSelectInterval = async (minutes: number) => {
    const updated = await updateCloudSyncSettings({ syncIntervalMinutes: minutes });
    await setupDriveSyncAlarm(minutes);
    showToast(`Sync frequency set to ${minutes}m`);
  };

  const handleToggleStartupSync = async () => {
    if (!syncInfo) return;
    const newVal = !syncInfo.settings.syncOnStartup;
    await updateCloudSyncSettings({ syncOnStartup: newVal });
    showToast(`Startup sync ${newVal ? 'enabled' : 'disabled'}`);
  };

  return {
    activeTab,
    setActiveTab,
    isLight,
    sidebarTheme,
    dashboardTheme,
    accentColor,
    darkPalette,
    lightPalette,
    sidebarWidth,
    settings,
    toastMessage,
    isSuspending,
    isPurging,
    syncInfo,
    isSigningIn,
    isSyncingNow,
    isPushing,
    isPulling,
    confirmPullModal,
    setConfirmPullModal,
    dashboardShortcut,
    isShortcutAssigned,
    fileInputRef,
    spacesCount,
    savedTabsCount,
    notesCount,
    tasksCount,
    resourcesCount,
    handleToggle,
    handleSelectThreshold,
    handleSidebarThemeChange,
    handleSidebarWidthChange,
    handleDashboardThemeChange,
    handleAccentColorChange,
    handleDarkPaletteChange,
    handleLightPaletteChange,
    handleApplyPreset,
    handleCopyBkash,
    handleInstantSuspend,
    handleRestoreAllSuspended,
    handleExport,
    handleImportFile,
    handlePurge,
    handleSignInGoogle,
    handleSignOut,
    handleSyncNow,
    handleForcePush,
    handleForcePull,
    handleToggleAutoSync,
    handleSelectInterval,
    handleToggleStartupSync,
  };
}
