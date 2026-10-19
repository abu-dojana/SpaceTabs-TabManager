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
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'appearance' | 'suspension' | 'backup' | 'shortcuts' | 'about';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = React.useState<
    'general' | 'appearance' | 'suspension' | 'backup' | 'shortcuts' | 'about'
  >(initialTab);

  const {
    sidebarTheme,
    dashboardTheme,
    setSidebarTheme,
    setDashboardTheme,
  } = useUIStore();

  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSuspending, setIsSuspending] = React.useState(false);
  const [isPurging, setIsPurging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isLight = dashboardTheme === 'light';

  // Sync initial tab when opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      getUserSettings().then((loaded) => {
        setSettings(loaded);
        if (loaded.sidebarTheme) setSidebarTheme(loaded.sidebarTheme);
        if (loaded.dashboardTheme) setDashboardTheme(loaded.dashboardTheme);
      });
    }
  }, [isOpen, initialTab, setSidebarTheme, setDashboardTheme]);

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

  const handleDashboardThemeChange = async (theme: 'dark' | 'light') => {
    setDashboardTheme(theme);
    const updated = await updateUserSettings({ dashboardTheme: theme });
    setSettings(updated);
    showToast(`Dashboard set to ${theme} mode`);
  };

  const handleApplyPreset = async (sb: 'dark' | 'light', dbTheme: 'dark' | 'light') => {
    setSidebarTheme(sb);
    setDashboardTheme(dbTheme);
    const updated = await updateUserSettings({ sidebarTheme: sb, dashboardTheme: dbTheme });
    setSettings(updated);
    showToast(`Theme preset applied!`);
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl h-[680px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl select-none animate-in fade-in zoom-in-95 duration-100 overflow-hidden relative border ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-900/10'
            : 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-8 py-5 border-b flex items-center justify-between flex-shrink-0 ${
            isLight
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
            className={`p-2 rounded-xl transition ${
              isLight
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
            className={`w-56 border-r p-3.5 space-y-1.5 flex-shrink-0 ${
              isLight
                ? 'bg-slate-50/90 border-slate-200'
                : 'bg-slate-950/90 border-slate-800'
            }`}
          >
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'general'
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
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'appearance'
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
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'suspension'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Memory Saver</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'backup'
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
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'shortcuts'
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
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'about'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span>About SpaceTabs</span>
            </button>
          </nav>

          {/* Right Content Pane */}
          <div
            className={`flex-1 overflow-y-auto p-8 text-xs space-y-7 ${
              isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
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
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isLight
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
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.defaultOpenInNewWindow ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.defaultOpenInNewWindow ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Discard on Space Switch */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isLight
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
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.discardOnSpaceSwitch ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.discardOnSpaceSwitch ? 'translate-x-6' : 'translate-x-0'
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
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isLight
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
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.showTabFavicons ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.showTabFavicons ? 'translate-x-6' : 'translate-x-0'
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
                    className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
                      isLight
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
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                          sidebarTheme === 'dark' && dashboardTheme === 'light'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600'
                        }`}
                      >
                        Workona (Dark/Light)
                      </button>

                      <button
                        onClick={() => handleApplyPreset('dark', 'dark')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                          sidebarTheme === 'dark' && dashboardTheme === 'dark'
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
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                          sidebarTheme === 'light' && dashboardTheme === 'light'
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
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          sidebarTheme === 'dark'
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
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          sidebarTheme === 'light'
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

                  {/* Section 2: Dashboard Canvas Theme */}
                  <div>
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
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          dashboardTheme === 'dark'
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
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          dashboardTheme === 'light'
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
                              White workspace (Workona look)
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
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isLight
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
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.autoSuspendEnabled ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.autoSuspendEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Inactive threshold */}
                    {settings.autoSuspendEnabled && (
                      <div
                        className={`p-4 rounded-xl border ${
                          isLight
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
                              className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                                settings.idleThresholdMinutes === min
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
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <Layers className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{spacesCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Spaces</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <Bookmark className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{savedTabsCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Saved Tabs</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-amber-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{notesCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Notes</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <ListTodo className="w-5 h-5 text-purple-500" />
                      <div>
                        <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{tasksCount}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Tasks</div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition ${
                          isLight
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
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition ${
                          isLight
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
                  className={`divide-y border rounded-xl overflow-hidden ${
                    isLight
                      ? 'divide-slate-200 border-slate-200 bg-slate-50 shadow-sm'
                      : 'divide-slate-800 border-slate-800 bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-center justify-between p-4">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      Jump to SpaceTabs Dashboard
                    </span>
                    <kbd
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
                        isLight
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
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
                        isLight
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
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
                        isLight
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
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
                        isLight
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
                      className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
                        isLight
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
            {activeTab === 'about' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div
                  className={`p-6 rounded-2xl border text-center ${
                    isLight
                      ? 'bg-blue-50/80 border-blue-200 shadow-sm'
                      : 'bg-blue-950/40 border-blue-800'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 mx-auto mb-3 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                    <Layers className="w-7 h-7" />
                  </div>
                  <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    SpaceTabs
                  </h3>
                  <p className="text-xs text-blue-500 font-mono mt-0.5 font-bold">
                    Version 1.0.0 • Manifest V3
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold mt-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No 5-Space Limit — Free & Open Workspace Suite</span>
                  </div>
                </div>

                <div className={`space-y-3 text-xs leading-relaxed ${isLight ? 'text-slate-800 font-medium' : 'text-slate-200 font-medium'}`}>
                  <p className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    SpaceTabs is built as a fast, private, and completely free alternative to Workona.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-xs">
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>No Artificial Space Limits:</strong> Create unlimited spaces, sections, tabs, and resources.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>Independent Theming:</strong> Toggle light/dark mode for sidebar and workspace canvas separately.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>100% Local Privacy:</strong> All data resides on your machine in IndexedDB. Zero cloud telemetry.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>Native Chromium Memory Saver:</strong> Background tabs are safely suspended using Chrome's native discard engine to save up to 80% RAM.</li>
                    <li><strong className={isLight ? 'text-slate-950' : 'text-white'}>Full Workspace Productivity:</strong> Integrated Tabs, Resources, Notes, and Tasks for each space.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

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
