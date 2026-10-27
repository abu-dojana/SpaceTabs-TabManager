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
  type UserSettings,
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
import {
  X,
  Settings,
  Sliders,
  Palette,
  Database,
  Keyboard,
  Info,
  Zap,
  Download,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  CheckCircle2,
  Layers,
  FileText,
  ListTodo,
  Bookmark,
  Sun,
  Moon,
  Layout,
  Columns,
  PanelLeft,
  Pipette,
  Cloud,
  RefreshCw,
  FolderOpen,
  ShieldCheck,
  ExternalLink,
  Key,
  LogOut,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronDown,
  Heart,
  Github,
  Youtube,
  Linkedin,
  Mail,
  MessageCircle,
  User,
  Copy,
  Coffee,
  HeartHandshake,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'appearance' | 'suspension' | 'cloud' | 'backup' | 'shortcuts' | 'about' | 'contact';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = React.useState<
    'general' | 'appearance' | 'suspension' | 'cloud' | 'backup' | 'shortcuts' | 'about' | 'contact'
  >(initialTab);

  const {
    sidebarTheme,
    dashboardTheme,
    accentColor,
    darkPalette,
    lightPalette,
    sidebarWidth,
    patreonUrl,
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
    setSidebarWidth,
    setPatreonUrl,
  } = useUIStore();

  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);
  const [patreonInput, setPatreonInput] = React.useState('');
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSuspending, setIsSuspending] = React.useState(false);
  const [isPurging, setIsPurging] = React.useState(false);

  // Cloud Drive Sync State
  const [syncInfo, setSyncInfo] = React.useState<DriveSyncInfo | null>(null);
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [isSyncingNow, setIsSyncingNow] = React.useState(false);
  const [isPushing, setIsPushing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const [customClientIdInput, setCustomClientIdInput] = React.useState('');
  const [showAdvancedAuth, setShowAdvancedAuth] = React.useState(false);
  const [confirmPullModal, setConfirmPullModal] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isLight = dashboardTheme === 'light';

  // Sync initial tab when opened & subscribe to Drive sync status
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
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
          setPatreonInput(loaded.patreonUrl);
        } else {
          setPatreonInput('https://www.patreon.com');
        }
      });

      getDriveSyncInfo().then((info) => {
        setSyncInfo(info);
        if (info.settings.customClientId) {
          setCustomClientIdInput(info.settings.customClientId);
        }
      });

      const unsub = subscribeSyncStatus((info) => {
        setSyncInfo(info);
      });
      return () => unsub();
    }
  }, [
    isOpen,
    initialTab,
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
  ]);

  // Live Database stats for the Backup & Storage view
  const spacesCount = useLiveQuery(() => db.spaces.count()) ?? 0;
  const savedTabsCount = useLiveQuery(() =>
    db.tabs.where('spaceId').notEqual(UNSAVED_SPACE_ID).count()
  ) ?? 0;
  const notesCount = useLiveQuery(() => db.notes.count()) ?? 0;
  const tasksCount = useLiveQuery(() => db.tasks.count()) ?? 0;
  const resourcesCount = useLiveQuery(() => db.resourceItems.count()) ?? 0;

  if (!isOpen) return null;

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

  const handleDarkPaletteChange = async (palette: 'slate' | 'midnight' | 'indigo' | 'forest' | 'espresso') => {
    setDarkPalette(palette);
    const updated = await updateUserSettings({ darkPalette: palette });
    setSettings(updated);
    showToast(`Dark palette set to ${palette}`);
  };

  const handleLightPaletteChange = async (palette: 'snow' | 'paper' | 'zinc' | 'sky' | 'mint') => {
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
    showToast(`Theme preset applied!`);
  };

  const handleSavePatreonUrl = async () => {
    const trimmed = patreonInput.trim() || 'https://www.patreon.com';
    setPatreonUrl(trimmed);
    const updated = await updateUserSettings({ patreonUrl: trimmed });
    setSettings(updated);
    showToast('Patreon link updated');
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

  // Google Drive Sync Handlers
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

  const handleSaveCustomClientId = async () => {
    await updateCloudSyncSettings({ customClientId: customClientIdInput.trim() });
    showToast('OAuth Client ID saved!');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl h-[680px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl select-none animate-in fade-in zoom-in-95 duration-100 overflow-hidden relative border ${isLight
          ? 'bg-white border-slate-300 text-slate-900 shadow-slate-900/10'
          : 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-8 py-5 border-b flex items-center justify-between flex-shrink-0 ${isLight
            ? 'bg-slate-50 border-slate-200'
            : 'bg-slate-950/80 border-slate-800'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Settings & Preferences
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300 font-medium'}`}>
                Configure appearance, window behavior, memory saver, and backups
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${isLight
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Left Navigation Tabs + Right Tab Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <nav
            className={`w-56 border-r p-3.5 space-y-1.5 flex-shrink-0 ${isLight
              ? 'bg-slate-50/90 border-slate-200'
              : 'bg-slate-950/90 border-slate-800'
              }`}
          >
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Sliders className="w-4 h-4" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${activeTab === 'appearance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Palette className="w-4 h-4 text-pink-400" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('suspension')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${activeTab === 'suspension'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Memory Saver</span>
            </button>

            {/* Google Drive Cloud Sync */}
            <button
              onClick={() => setActiveTab('cloud')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${activeTab === 'cloud'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>Google Drive Sync</span>
              </div>
              {syncInfo?.profile && (
                <span
                  className={`w-2 h-2 rounded-full ${syncInfo.status === 'syncing'
                    ? 'bg-amber-400 animate-pulse'
                    : syncInfo.status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-emerald-400'
                    }`}
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${activeTab === 'backup'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Backup & Data</span>
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${activeTab === 'shortcuts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Keyboard className="w-4 h-4 text-purple-400" />
              <span>Shortcuts</span>
            </button>

            <div className={`pt-2 border-t my-1 ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />

            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${activeTab === 'about'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span>About SpaceTabs</span>
            </button>

            <button
              onClick={() => setActiveTab('contact')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${activeTab === 'contact'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Credits & Contact</span>
            </button>
          </nav>

          {/* Right Content Pane */}
          <div
            className={`flex-1 overflow-y-auto p-8 text-xs space-y-7 ${isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
              }`}
          >
            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Window & Space Behavior
                  </h3>
                  <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Control how spaces interact with your browser windows.
                  </p>

                  <div className="space-y-3.5">
                    {/* Default Open Mode */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Open in New Window by Default
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          When clicking a space, open it in a dedicated new window instead of the current window.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('defaultOpenInNewWindow')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${settings.defaultOpenInNewWindow ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${settings.defaultOpenInNewWindow ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Discard on Space Switch */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Suspend Tabs on Space Switch
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Automatically suspend tabs when switching to another space to save RAM.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('discardOnSpaceSwitch')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${settings.discardOnSpaceSwitch ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${settings.discardOnSpaceSwitch ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Visual Preferences
                  </h3>
                  <div className="space-y-3.5">
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Show Web Favicons
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Display site favicons next to tabs and resources.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('showTabFavicons')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${settings.showTabFavicons ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${settings.showTabFavicons ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: APPEARANCE (High Contrast & Clear Typography) */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <Palette className="w-4 h-4 text-pink-400" />
                      <span>Appearance & Color Themes</span>
                    </h3>
                  </div>
                  <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Customize your workspace appearance. You can change the Sidebar and Dashboard themes independently.
                  </p>

                  {/* Quick Presets */}
                  <div
                    className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${isLight
                      ? 'bg-slate-50 border-slate-200 shadow-sm'
                      : 'bg-slate-950 border-slate-700'
                      }`}
                  >
                    <div>
                      <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Quick Style Presets
                      </div>
                      <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        1-click popular color combinations
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplyPreset('dark', 'light')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${sidebarTheme === 'dark' && dashboardTheme === 'light'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600'
                          }`}
                      >
                        Split (Dark/Light)
                      </button>

                      <button
                        onClick={() => handleApplyPreset('dark', 'dark')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${sidebarTheme === 'dark' && dashboardTheme === 'dark'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600'
                          }`}
                      >
                        All Dark
                      </button>

                      <button
                        onClick={() => handleApplyPreset('light', 'light')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${sidebarTheme === 'light' && dashboardTheme === 'light'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600'
                          }`}
                      >
                        All Light
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Sidebar Theme */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Columns className="w-4 h-4 text-blue-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        Sidebar Theme
                      </h4>
                    </div>
                    <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Color scheme for spaces, sections, and the left navigation menu.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Dark Sidebar Card */}
                      <div
                        onClick={() => handleSidebarThemeChange('dark')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${sidebarTheme === 'dark'
                          ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500 shadow-md'
                          : isLight
                            ? 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-950 border-slate-700 hover:border-slate-500 hover:bg-slate-950/80'
                          }`}
                      >
                        {/* High-contrast Mockup Preview */}
                        <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
                          <div className="w-1/3 h-full rounded bg-slate-900 border border-slate-800 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-blue-500" />
                            <div className="w-3/4 h-1.5 rounded bg-slate-600" />
                            <div className="w-4/5 h-1.5 rounded bg-slate-600" />
                          </div>
                          <div className="flex-1 h-full rounded bg-slate-900/50 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-slate-800" />
                            <div className="w-full h-6 rounded bg-slate-800/80" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-bold flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              <Moon className="w-3.5 h-3.5 text-blue-400" />
                              <span>Dark Sidebar</span>
                            </div>
                            <div className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              Deep slate palette
                            </div>
                          </div>
                          {sidebarTheme === 'dark' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Light Sidebar Card */}
                      <div
                        onClick={() => handleSidebarThemeChange('light')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${sidebarTheme === 'light'
                          ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600 shadow-md'
                          : isLight
                            ? 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-950 border-slate-700 hover:border-slate-500 hover:bg-slate-950/80'
                          }`}
                      >
                        {/* High-contrast Mockup Preview */}
                        <div className="w-full h-20 rounded-lg bg-slate-200 border border-slate-300 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
                          <div className="w-1/3 h-full rounded bg-white border border-slate-300 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-blue-600" />
                            <div className="w-3/4 h-1.5 rounded bg-slate-400" />
                            <div className="w-4/5 h-1.5 rounded bg-slate-400" />
                          </div>
                          <div className="flex-1 h-full rounded bg-slate-100 p-1 flex flex-col gap-1 border border-slate-200">
                            <div className="w-full h-2 rounded bg-slate-300" />
                            <div className="w-full h-6 rounded bg-slate-200" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-bold flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                              <span>Light Sidebar</span>
                            </div>
                            <div className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              Clean white & crisp borders
                            </div>
                          </div>
                          {sidebarTheme === 'light' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Sidebar Width Slider */}
                  <div className={`mb-7 p-4 rounded-xl border ${isLight
                    ? 'bg-slate-50 border-slate-200 shadow-sm'
                    : 'bg-slate-950 border-slate-750'
                    }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <PanelLeft className="w-4 h-4 text-blue-500" />
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          Sidebar Width
                        </h4>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        sidebarWidth >= 340
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : sidebarWidth <= 270
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                        {sidebarWidth <= 270 ? 'Default' : sidebarWidth >= 340 ? 'Wide' : 'Expanded'} ({sidebarWidth || 260}px)
                      </span>
                    </div>

                    <p className={`text-xs mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Slide the width of the sidebar from default to wide so longer space titles and labels are completely visible.
                    </p>

                    <div className="space-y-3">
                      <input
                        type="range"
                        min={240}
                        max={400}
                        step={4}
                        value={sidebarWidth || 260}
                        onChange={(e) => handleSidebarWidthChange(Number(e.target.value))}
                        className="w-full h-2 rounded-lg cursor-pointer"
                      />

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSidebarWidthChange(260)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                            sidebarWidth <= 270
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                        >
                          Default (260px)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSidebarWidthChange(320)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                            sidebarWidth > 270 && sidebarWidth < 340
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                        >
                          Medium (320px)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSidebarWidthChange(380)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                            sidebarWidth >= 340
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                        >
                          Wide (380px)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Dashboard Canvas Theme */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Layout className="w-4 h-4 text-emerald-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        Dashboard & Canvas Theme
                      </h4>
                    </div>
                    <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Color scheme for tabs, resources, markdown notes, and tasks.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Dark Dashboard Card */}
                      <div
                        onClick={() => handleDashboardThemeChange('dark')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${dashboardTheme === 'dark'
                          ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500 shadow-md'
                          : isLight
                            ? 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-950 border-slate-700 hover:border-slate-500 hover:bg-slate-950/80'
                          }`}
                      >
                        {/* High-contrast Mockup Preview */}
                        <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
                          <div className="w-1/4 h-full rounded bg-slate-900 border border-slate-800 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-slate-700" />
                          </div>
                          <div className="flex-1 h-full rounded bg-slate-900 border border-slate-800 p-1.5 flex flex-col gap-1.5">
                            <div className="w-full h-2 rounded bg-slate-700" />
                            <div className="flex gap-1">
                              <div className="flex-1 h-7 rounded bg-slate-800 border border-slate-700" />
                              <div className="flex-1 h-7 rounded bg-slate-800 border border-slate-700" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-bold flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              <Moon className="w-3.5 h-3.5 text-blue-400" />
                              <span>Dark Dashboard</span>
                            </div>
                            <div className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              Deep slate background
                            </div>
                          </div>
                          {dashboardTheme === 'dark' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Light Dashboard Card */}
                      <div
                        onClick={() => handleDashboardThemeChange('light')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${dashboardTheme === 'light'
                          ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600 shadow-md'
                          : isLight
                            ? 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-950 border-slate-700 hover:border-slate-500 hover:bg-slate-950/80'
                          }`}
                      >
                        {/* High-contrast Mockup Preview */}
                        <div className="w-full h-20 rounded-lg bg-slate-100 border border-slate-300 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
                          <div className="w-1/4 h-full rounded bg-slate-200 border border-slate-300 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-slate-400" />
                          </div>
                          <div className="flex-1 h-full rounded bg-white border border-slate-300 p-1.5 flex flex-col gap-1.5">
                            <div className="w-full h-2 rounded bg-slate-300" />
                            <div className="flex gap-1">
                              <div className="flex-1 h-7 rounded bg-slate-50 border border-slate-300" />
                              <div className="flex-1 h-7 rounded bg-slate-50 border border-slate-300" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-bold flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                              <span>Light Dashboard</span>
                            </div>
                            <div className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              Clean white workspace
                            </div>
                          </div>
                          {dashboardTheme === 'light' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Accent Color Palette */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Pipette className="w-4 h-4 text-pink-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        Accent Color
                      </h4>
                    </div>
                    <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Primary highlight color for active tabs, checkboxes, primary buttons, and focus states.
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {[
                        { name: 'Ocean Blue', hex: '#2563eb' },
                        { name: 'Royal Indigo', hex: '#6366f1' },
                        { name: 'Violet Purple', hex: '#8b5cf6' },
                        { name: 'Emerald Green', hex: '#10b981' },
                        { name: 'Crimson Rose', hex: '#f43f5e' },
                        { name: 'Amber Gold', hex: '#f59e0b' },
                        { name: 'Ocean Cyan', hex: '#06b6d4' },
                        { name: 'Sunset Orange', hex: '#f97316' },
                      ].map((item) => {
                        const isSelected = (accentColor || '#2563eb').toLowerCase() === item.hex.toLowerCase();
                        return (
                          <button
                            key={item.hex}
                            onClick={() => handleAccentColorChange(item.hex)}
                            title={item.name}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${isSelected
                              ? 'ring-2 ring-blue-500 border-white shadow-md'
                              : isLight
                                ? 'bg-white border-slate-300 hover:bg-slate-50'
                                : 'bg-slate-950 border-slate-700 hover:bg-slate-900'
                              }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center shadow-inner flex-shrink-0"
                              style={{ backgroundColor: item.hex }}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </span>
                            <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{item.name}</span>
                          </button>
                        );
                      })}

                      {/* Custom Color Input */}
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                          }`}
                        title="Choose custom hex color"
                      >
                        <input
                          type="color"
                          value={accentColor || '#2563eb'}
                          onChange={(e) => handleAccentColorChange(e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className={`text-xs font-mono font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          {accentColor || '#2563eb'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Dark Mode Theme Tone */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Moon className="w-4 h-4 text-blue-400" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        Dark Mode Tone & Palette
                      </h4>
                    </div>
                    <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Select your preferred dark surface tone. Applies when dark mode is enabled.
                    </p>

                    <div className="grid grid-cols-5 gap-2.5">
                      {[
                        { id: 'slate', name: 'Deep Slate', bg: '#0b1329', card: '#0f172a', desc: 'Classic navy' },
                        { id: 'midnight', name: 'Midnight', bg: '#09090b', card: '#121215', desc: 'OLED black' },
                        { id: 'indigo', name: 'Space Indigo', bg: '#0b0e20', card: '#121633', desc: 'Cosmic galaxy' },
                        { id: 'forest', name: 'Forest Dark', bg: '#07150f', card: '#0d2218', desc: 'Pine charcoal' },
                        { id: 'espresso', name: 'Warm Espresso', bg: '#151210', card: '#201c19', desc: 'Rich cocoa' },
                      ].map((pal) => {
                        const isSelected = (darkPalette || 'slate') === pal.id;
                        return (
                          <div
                            key={pal.id}
                            onClick={() => handleDarkPaletteChange(pal.id as any)}
                            className={`p-2.5 rounded-xl border-2 cursor-pointer transition text-left ${isSelected
                              ? 'border-blue-500 ring-2 ring-blue-500 shadow-md'
                              : isLight
                                ? 'bg-white border-slate-200 hover:border-slate-300'
                                : 'bg-slate-950 border-slate-700 hover:border-slate-500'
                              }`}
                          >
                            <div
                              className="w-full h-8 rounded-lg mb-2 p-1 flex gap-1 border border-white/10 shadow-inner"
                              style={{ backgroundColor: pal.bg }}
                            >
                              <div className="w-1/3 h-full rounded" style={{ backgroundColor: pal.card }} />
                              <div className="flex-1 h-full rounded opacity-75" style={{ backgroundColor: pal.card }} />
                            </div>
                            <div className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {pal.name}
                            </div>
                            <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {pal.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 5: Light Mode Theme Tone */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        Light Mode Tone & Palette
                      </h4>
                    </div>
                    <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Select your preferred light surface tone. Applies when light mode is enabled.
                    </p>

                    <div className="grid grid-cols-5 gap-2.5">
                      {[
                        { id: 'snow', name: 'Pure Snow', bg: '#f8fafc', card: '#ffffff', desc: 'Crisp white' },
                        { id: 'paper', name: 'Warm Paper', bg: '#f7f5ef', card: '#fdfcf9', desc: 'Cozy cream' },
                        { id: 'zinc', name: 'Cool Zinc', bg: '#f4f4f5', card: '#ffffff', desc: 'Modern silver' },
                        { id: 'sky', name: 'Soft Sky', bg: '#f0f7ff', card: '#ffffff', desc: 'Airy blue' },
                        { id: 'mint', name: 'Fresh Mint', bg: '#f0fdf4', card: '#ffffff', desc: 'Calming sage' },
                      ].map((pal) => {
                        const isSelected = (lightPalette || 'snow') === pal.id;
                        return (
                          <div
                            key={pal.id}
                            onClick={() => handleLightPaletteChange(pal.id as any)}
                            className={`p-2.5 rounded-xl border-2 cursor-pointer transition text-left ${isSelected
                              ? 'border-blue-500 ring-2 ring-blue-500 shadow-md'
                              : isLight
                                ? 'bg-white border-slate-200 hover:border-slate-300'
                                : 'bg-slate-950 border-slate-700 hover:border-slate-500'
                              }`}
                          >
                            <div
                              className="w-full h-8 rounded-lg mb-2 p-1 flex gap-1 border border-slate-300 shadow-inner"
                              style={{ backgroundColor: pal.bg }}
                            >
                              <div className="w-1/3 h-full rounded border border-slate-200" style={{ backgroundColor: pal.card }} />
                              <div className="flex-1 h-full rounded border border-slate-200" style={{ backgroundColor: pal.card }} />
                            </div>
                            <div className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {pal.name}
                            </div>
                            <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {pal.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SUSPENSION / MEMORY SAVER */}
            {activeTab === 'suspension' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Chromium Native Memory Saver</span>
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">
                      Zero Tab Loss
                    </span>
                  </div>
                  <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Discards inactive background tabs to purge RAM without losing tab history, titles, or page position.
                  </p>

                  <div className="space-y-4">
                    {/* Auto-suspend toggle */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Enable Automatic Tab Discarding
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Periodically purge idle background tabs (audible & active tabs are never touched).
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('autoSuspendEnabled')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${settings.autoSuspendEnabled ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${settings.autoSuspendEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Inactive threshold */}
                    {settings.autoSuspendEnabled && (
                      <div
                        className={`p-4 rounded-xl border ${isLight
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950/70 border-slate-800'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Discard tabs after being inactive for:
                          </span>
                          <span className="font-mono text-blue-500 text-xs font-bold">
                            {settings.idleThresholdMinutes} minutes
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2.5">
                          {[15, 30, 60, 120].map((min) => (
                            <button
                              key={min}
                              onClick={() => handleSelectThreshold(min)}
                              className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${settings.idleThresholdMinutes === min
                                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                : isLight
                                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-650'
                                }`}
                            >
                              {min < 60 ? `${min}m` : `${min / 60}h`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Instant suspend button */}
                    <div className="pt-2">
                      <button
                        onClick={handleInstantSuspend}
                        disabled={isSuspending}
                        className="w-full py-3 px-4 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>{isSuspending ? 'Purging RAM...' : 'Suspend All Inactive Tabs Now'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GOOGLE CLOUD SYNC */}
            {activeTab === 'cloud' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* 1. Header & Account Status */}
                <div>
                  <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Google Account & Cloud Backup
                  </h3>
                  <p className={`text-xs mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Bi-directionally synchronize your spaces, tabs, notes, tasks, and resources directly with your personal Google Drive.
                  </p>

                  {/* Connected Account Card */}
                  {syncInfo?.profile ? (
                    <div
                      className={`p-5 rounded-2xl border ${isLight
                        ? 'bg-slate-50 border-slate-200 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          {syncInfo.profile.picture ? (
                            <img
                              src={syncInfo.profile.picture}
                              alt={syncInfo.profile.name}
                              className="w-12 h-12 rounded-full border-2 border-blue-500/40 object-cover shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-base font-bold text-blue-400">
                              {syncInfo.profile.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {syncInfo.profile.name}
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Connected
                              </span>
                            </div>
                            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              {syncInfo.profile.email}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last synced:{' '}
                              {syncInfo.lastSyncTime
                                ? (() => {
                                  const d = new Date(syncInfo.lastSyncTime);
                                  const timeStr = d.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  });
                                  const day = String(d.getDate()).padStart(2, '0');
                                  const month = d.toLocaleString('en-US', { month: 'short' });
                                  const year = d.getFullYear();
                                  return `${timeStr} (${day} ${month}, ${year})`;
                                })()
                                : 'Never'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSyncNow}
                            disabled={isSyncingNow || syncInfo.status === 'syncing'}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${isSyncingNow || syncInfo.status === 'syncing' ? 'animate-spin' : ''
                                }`}
                            />
                            <span>
                              {isSyncingNow || syncInfo.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                            </span>
                          </button>
                          <button
                            onClick={handleSignOut}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${isLight
                              ? 'bg-white hover:bg-rose-50 text-rose-600 border-slate-300 hover:border-rose-300 shadow-sm'
                              : 'bg-slate-900 hover:bg-rose-950/30 text-rose-400 border-slate-800 hover:border-rose-900/50'
                              }`}
                            title="Disconnect Google Account"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>

                      {/* Error Banner if last sync had an issue */}
                      {syncInfo.lastSyncError && (
                        <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-400">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">Sync Error Encountered:</div>
                            <div className="text-[11px] mt-0.5">{syncInfo.lastSyncError}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Disconnected State / Sign-in Hero */
                    <div
                      className={`p-6 rounded-2xl border ${isLight
                        ? 'bg-slate-50 border-slate-200 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-500">
                          <Cloud className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Connect Your Personal Google Drive
                          </h4>
                          <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            Keep your spaces, saved tabs, notes, tasks, and bookmarks synchronized across all your computers. Everything is stored directly in your private Google Drive under <span className="font-mono text-blue-400 font-semibold">SpaceTabs_Data</span> with zero intermediate servers.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {/* Sign in with Google Button */}
                        <button
                          onClick={handleSignInGoogle}
                          disabled={isSigningIn}
                          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="currentColor"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="currentColor"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-4 text-[11px] text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Zero telemetry. 100% owned and stored in your personal Google account.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Drive Storage & Folder Details (When connected) */}
                {syncInfo?.profile && (
                  <div>
                    <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Google Drive Storage
                    </h3>
                    <p className={`text-xs mb-3 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      Target folder and backup file located on your Google Drive.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Folder Card */}
                      <div
                        className={`p-4 rounded-xl border flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              SpaceTabs_Data
                            </div>
                            <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              Google Drive Folder
                            </div>
                          </div>
                        </div>

                        {syncInfo.folderUrl && (
                          <a
                            href={syncInfo.folderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition cursor-pointer"
                          >
                            <span>Open Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* File Card */}
                      <div
                        className={`p-4 rounded-xl border flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              data.json
                            </div>
                            <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              Synchronized JSON Payload
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                          Active Sync
                        </span>
                      </div>
                    </div>

                    {/* Manual Push / Pull Operations */}
                    <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Manual Sync & Force Actions
                    </h3>
                    <div className="space-y-3 mb-6">
                      {/* Push Force */}
                      <div
                        className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                          }`}
                      >
                        <div>
                          <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Upload to Google Drive (Force Push)
                          </div>
                          <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            Overwrites remote data.json on Google Drive with your current local spaces and tabs.
                          </div>
                        </div>
                        <button
                          onClick={handleForcePush}
                          disabled={isPushing}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>{isPushing ? 'Uploading...' : 'Push to Drive'}</span>
                        </button>
                      </div>

                      {/* Pull Force */}
                      <div
                        className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                          }`}
                      >
                        <div>
                          <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Download from Google Drive (Force Pull)
                          </div>
                          <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            Restores local workspaces by downloading and replacing them with Google Drive data.
                          </div>
                        </div>
                        <button
                          onClick={() => setConfirmPullModal(true)}
                          disabled={isPulling}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs border transition disabled:opacity-50 cursor-pointer ${isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-750'
                            }`}
                        >
                          <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                          <span>{isPulling ? 'Downloading...' : 'Pull from Drive'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Auto-Sync Schedule Preferences */}
                <div>
                  <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Sync Preferences & Automation
                  </h3>
                  <p className={`text-xs mb-3 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Configure how frequently SpaceTabs syncs in the background.
                  </p>

                  <div className="space-y-3">
                    {/* Auto-Sync Toggle */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Background Auto-Sync
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Periodically merge and upload changes in the background without interrupting your work.
                        </div>
                      </div>
                      <button
                        onClick={handleToggleAutoSync}
                        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${syncInfo?.settings?.autoSync ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-800'
                          }`}
                      >
                        <span
                          className={`inline-block w-4 h-4 rounded-full bg-white transition-transform transform ${syncInfo?.settings?.autoSync ? 'translate-x-6' : 'translate-x-1'
                            } top-1 absolute left-0 shadow`}
                        />
                      </button>
                    </div>

                    {/* Sync Interval */}
                    {syncInfo?.settings?.autoSync && (
                      <div
                        className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                          }`}
                      >
                        <div>
                          <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Sync Frequency
                          </div>
                          <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            How often background sync runs while browser is active.
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[5, 15, 30, 60].map((m) => (
                            <button
                              key={m}
                              onClick={() => handleSelectInterval(m)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${(syncInfo?.settings?.syncIntervalMinutes || 15) === m
                                ? 'bg-blue-600 text-white shadow-sm'
                                : isLight
                                  ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                                }`}
                            >
                              {m}m
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Startup Sync Toggle */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Sync on Startup
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Automatically pull latest workspace changes whenever you launch your browser.
                        </div>
                      </div>
                      <button
                        onClick={handleToggleStartupSync}
                        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${syncInfo?.settings?.syncOnStartup ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-800'
                          }`}
                      >
                        <span
                          className={`inline-block w-4 h-4 rounded-full bg-white transition-transform transform ${syncInfo?.settings?.syncOnStartup ? 'translate-x-6' : 'translate-x-1'
                            } top-1 absolute left-0 shadow`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BACKUP & DATA */}
            {activeTab === 'backup' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Database & Storage Statistics
                  </h3>
                  <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Your entire workspace is stored 100% locally on your machine using IndexedDB.
                  </p>

                  <div className="grid grid-cols-5 gap-3 mb-6">
                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <Layers className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{spacesCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Spaces</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <Bookmark className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{savedTabsCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Saved Tabs</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <FileText className="w-5 h-5 text-amber-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{notesCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Notes</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <ListTodo className="w-5 h-5 text-purple-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{tasksCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Tasks</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <Sparkles className="w-5 h-5 text-cyan-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{resourcesCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Resources</div>
                      </div>
                    </div>
                  </div>

                  <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Export & Import
                  </h3>
                  <div className="space-y-3.5">
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Full Workspace Backup
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Export all spaces, tabs, notes, tasks, and resources to a single JSON backup.
                        </div>
                      </div>
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export Backup</span>
                      </button>
                    </div>

                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Restore from Backup
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Restore spaces and workspace data from an existing SpaceTabs JSON backup.
                        </div>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition ${isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-650'
                          }`}
                      >
                        <Upload className="w-4 h-4" />
                        <span>Restore Backup</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </div>

                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                        }`}
                    >
                      <div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Purge Stale Unsaved Tabs
                        </div>
                        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Clean out closed tabs from the unsaved cache to keep your storage lightweight.
                        </div>
                      </div>
                      <button
                        onClick={handlePurge}
                        disabled={isPurging}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition ${isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-650'
                          }`}
                      >
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span>{isPurging ? 'Cleaning...' : 'Clean Cache'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Keyboard Shortcuts
                </h3>
                <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  Boost your productivity with quick navigation and formatting hotkeys.
                </p>

                <div
                  className={`divide-y border rounded-xl overflow-hidden ${isLight
                    ? 'divide-slate-200 border-slate-200 bg-slate-50 shadow-sm'
                    : 'divide-slate-800 border-slate-800 bg-slate-950/70'
                    }`}
                >
                  <div className="flex items-center justify-between p-4">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      Jump to SpaceTabs Dashboard
                    </span>
                    <kbd
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${isLight
                        ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-blue-300'
                        }`}
                    >
                      Alt + Shift + W
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      Force Save Active Note
                    </span>
                    <kbd
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${isLight
                        ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-blue-300'
                        }`}
                    >
                      Ctrl + S / Cmd + S
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      Bold Note Text
                    </span>
                    <kbd
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${isLight
                        ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-blue-300'
                        }`}
                    >
                      Ctrl + B / Cmd + B
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      Italic Note Text
                    </span>
                    <kbd
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${isLight
                        ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-blue-300'
                        }`}
                    >
                      Ctrl + I / Cmd + I
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      Indent Checklist / Line in Note
                    </span>
                    <kbd
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${isLight
                        ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-blue-300'
                        }`}
                    >
                      Tab (2 spaces)
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ABOUT */}
            {/* TAB: ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div
                  className={`p-6 rounded-2xl border text-center ${isLight
                    ? 'bg-blue-50/80 border-blue-200 shadow-sm'
                    : 'bg-blue-950/40 border-blue-800'
                    }`}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white shadow-xl transition-colors duration-150"
                    style={{
                      backgroundColor: accentColor || '#f43f5e',
                      boxShadow: `0 10px 25px -5px ${accentColor || '#f43f5e'}50`,
                    }}
                  >
                    <Layers className="w-7 h-7" />
                  </div>
                  <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    SpaceTabs — Tab Manager
                  </h3>
                  <p className="text-xs text-blue-500 font-mono mt-0.5 font-bold">
                    Version {chrome.runtime?.getManifest?.()?.version || '1.2.0'} • Manifest V3
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold mt-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No Limits — Free, Private & Open Workspace Suite!</span>
                  </div>
                </div>

                {/* Support Creator Quick Callout */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    isLight
                      ? 'bg-rose-50/80 border-rose-200 text-slate-800'
                      : 'bg-rose-950/20 border-rose-900/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow flex-shrink-0">
                      <Heart className="w-4 h-4 fill-white" />
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Support Independent Development
                      </div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        SpaceTabs is 100% free with zero paywalls. Support via SupportKori, bKash, Patreon, or SociaBuzz!
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('contact')}
                    className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Support & Credits →</span>
                  </button>
                </div>

                <div className={`space-y-3 text-xs leading-relaxed ${isLight ? 'text-slate-800 font-medium' : 'text-slate-200 font-medium'}`}>
                  <p className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    SpaceTabs — Tab Manager is a fast, private, and completely free workspace & tab manager.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-xs">
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>No Artificial Space Limits:</strong> Create unlimited spaces, sections, tabs, and resources.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>Independent Theming:</strong> Toggle light/dark mode for sidebar and workspace canvas separately.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>100% Local Privacy:</strong> All data resides on your machine in IndexedDB. Zero cloud telemetry.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>Native Chromium Memory Saver:</strong> Background tabs are safely suspended using Chrome's native discard engine to save up to 80% RAM.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>Full Workspace Productivity:</strong> Integrated Tabs, Resources, Notes, and Tasks for each space.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>Google Drive Cloud Backup:</strong> Optionally sync spaces across multiple machines seamlessly.</li>
                  </ul>
                </div>

                {/* What's New / Release Changelog */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-3 border-slate-500/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        What's New in SpaceTabs
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      v1.2.0 Latest
                    </span>
                  </div>

                  {/* v1.2.0 Highlights */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Version 1.2.0 — Stability, Sorting & Session Continuity
                      </span>
                    </div>
                    <ul className={`list-disc pl-5 space-y-1.5 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <li>
                        <strong className={isLight ? 'text-slate-900' : 'text-white'}>Custom Section Sorting:</strong> Reorder sidebar sections via drag-and-drop when unlocked or from the section menu, synced automatically with Google Drive.
                      </li>
                      <li>
                        <strong className={isLight ? 'text-slate-900' : 'text-white'}>Seamless Space Restore on Browser Startup:</strong> Reopening the browser now restores your active saved Space directly without duplicating tabs into Unsaved sessions.
                      </li>
                      <li>
                        <strong className={isLight ? 'text-slate-900' : 'text-white'}>Live Tab Reordering & Sorting:</strong> Drag-and-drop tabs or sort alphabetically / by domain to reorder both your SpaceTabs list and live browser tabs.
                      </li>
                      <li>
                        <strong className={isLight ? 'text-slate-900' : 'text-white'}>Pinned Dashboard Rescue:</strong> Clicking bookmarks or navigating from the Dashboard opens the site in a normal tab while preserving your pinned SpaceTabs tab at index 0.
                      </li>
                      <li>
                        <strong className={isLight ? 'text-slate-900' : 'text-white'}>Multi-Window Space Sync:</strong> Improved "Open in Window" workspace binding and smart multi-window status indicators.
                      </li>
                    </ul>
                  </div>

                  {/* v1.1.0 Highlights */}
                  <div className="pt-3 border-t border-slate-500/15 space-y-1.5">
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Version 1.1.0 — Customization & Polish
                    </div>
                    <ul className={`list-disc pl-5 space-y-1 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      <li>Interactive emoji picker when renaming Spaces in the Sidebar and Header.</li>
                      <li>Drag-and-drop Space ordering with a 1-click lock toggle in the Sidebar.</li>
                      <li>Distraction-free toggle to show or hide web favicons across workspaces.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CREDITS & CONTACT */}
            {activeTab === 'contact' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* Developer Profile Header */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isLight
                      ? 'bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border-slate-200 shadow-sm'
                      : 'bg-gradient-to-r from-slate-950/80 via-blue-950/30 to-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20 flex-shrink-0">
                      AD
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Abu Dojana Tahmid
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-500 border border-blue-500/25">
                          Creator & Developer
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25">
                          SpaceTabs — Tab Manager
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Hi there! I designed and built SpaceTabs to give power users a clean, fast, privacy-first workspace manager with zero paywalls. If SpaceTabs helps you declutter your browser and saves you time, your support helps me continue actively developing and maintaining this project!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Support & Donations */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Support & Donations
                      </h4>
                    </div>
                    <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      International & Bangladesh local payment options
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. SupportKori (Bangladesh - bKash/Nagad/Rocket/Cards) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                        isLight
                          ? 'bg-rose-50/60 hover:bg-rose-50 border-rose-200'
                          : 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-rose-500">
                            <HeartHandshake className="w-4 h-4" />
                            <span>SupportKori (Bangladesh)</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/20">
                            bKash / Nagad / Rocket
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Ideal for supporters in Bangladesh. Easily tip or donate using bKash, Nagad, Rocket, or local debit/credit cards.
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-rose-500/15">
                        <a
                          href="https://www.supportkori.com/abudojana"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition cursor-pointer"
                        >
                          <span>Donate on SupportKori</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* 2. bKash Personal Direct (Bangladesh) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                        isLight
                          ? 'bg-pink-50/60 hover:bg-pink-50 border-pink-200'
                          : 'bg-pink-950/20 hover:bg-pink-950/30 border-pink-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-pink-500">
                            <span className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-extrabold">
                              ৳
                            </span>
                            <span>bKash Personal Direct</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-500 border border-pink-500/20">
                            Direct Transfer
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Send Money or Cash In directly to personal bKash number:
                        </p>
                        <div className={`mt-2 font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                          isLight ? 'bg-white border-pink-200 text-pink-700' : 'bg-slate-900 border-pink-800 text-pink-300'
                        }`}>
                          <span>+8801521566157</span>
                          <span className="text-[10px] text-pink-500 font-sans font-normal">Personal</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-pink-500/15">
                        <button
                          onClick={handleCopyBkash}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-pink-600 hover:bg-pink-500 text-white shadow-sm transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy bKash Number</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Patreon (International / Monthly & One-time) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                        isLight
                          ? 'bg-amber-50/60 hover:bg-amber-50 border-amber-200'
                          : 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-amber-500">
                            <Heart className="w-4 h-4 fill-amber-500/40" />
                            <span>Patreon</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20">
                            International / Payoneer
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Support monthly or one-time via international credit/debit cards. Deposits directly via Payoneer.
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-amber-500/15">
                        <a
                          href="https://patreon.com/abudojana"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-sm transition cursor-pointer"
                        >
                          <span>Support on Patreon</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* 4. SociaBuzz (International / Global) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                        isLight
                          ? 'bg-sky-50/60 hover:bg-sky-50 border-sky-200'
                          : 'bg-sky-950/20 hover:bg-sky-950/30 border-sky-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-sky-500">
                            <Coffee className="w-4 h-4" />
                            <span>SociaBuzz</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-500 border border-sky-500/20">
                            Global Tip & Tribe
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          Leave a quick one-time tip or join the tribe from anywhere in the world with global payment methods.
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-sky-500/15">
                        <a
                          href="https://sociabuzz.com/abudojana/tribe"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition cursor-pointer"
                        >
                          <span>Support on SociaBuzz</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Connect & Socials */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Connect & Contact
                      </h4>
                    </div>
                    <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Feedback, feature requests & collaborations
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* GitHub */}
                    <a
                      href="https://github.com/abu-dojana"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition group ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Github className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                        <div>
                          <div>GitHub</div>
                          <div className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            github.com/abu-dojana
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>

                    {/* LinkedIn */}
                    <a
                      href="https://www.linkedin.com/in/abu-dojana/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition group ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Linkedin className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                        <div>
                          <div>LinkedIn</div>
                          <div className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            linkedin.com/in/abu-dojana
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>

                    {/* YouTube */}
                    <a
                      href="https://www.youtube.com/@abuDojanaTahmid"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition group ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Youtube className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                        <div>
                          <div>YouTube</div>
                          <div className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            youtube.com/@abuDojanaTahmid
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>

                    {/* WhatsApp */}
                    <a
                      href="https://wa.me/8801521566157"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition group ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageCircle className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <div>
                          <div>WhatsApp</div>
                          <div className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            +880 1521-566157
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>

                    {/* Primary Email */}
                    <a
                      href="mailto:abudojana2001@gmail.com"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition group ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail className="w-4 h-4 text-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0">
                          <div>Personal Email</div>
                          <div className={`text-[10px] font-normal truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            abudojana2001@gmail.com
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1" />
                    </a>

                    {/* Secondary Email */}
                    <a
                      href="mailto:abudojanatahmid@gmail.com"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition group ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0">
                          <div>Direct Email</div>
                          <div className={`text-[10px] font-normal truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            abudojanatahmid@gmail.com
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Force Pull Safety Confirmation Modal */}
        {confirmPullModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-100">
            <div
              className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-100 ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Download from Google Drive?</h4>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Local workspace data replacement
                  </p>
                </div>
              </div>
              <p className={`text-xs mb-5 leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                This will overwrite your local spaces, tabs, notes, tasks, and resources with the latest version from your Google Drive (<span className="font-mono text-blue-400">data.json</span>).
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => setConfirmPullModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleForcePull}
                  disabled={isPulling}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition cursor-pointer disabled:opacity-50"
                >
                  {isPulling ? 'Restoring...' : 'Restore from Drive'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-5 right-5 z-50 bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {toastMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
