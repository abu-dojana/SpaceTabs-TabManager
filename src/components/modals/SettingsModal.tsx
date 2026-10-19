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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl h-[680px] max-h-[90vh] flex flex-col shadow-2xl select-none animate-in fade-in zoom-in-95 duration-100 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Settings & Preferences</h2>
              <p className="text-xs text-slate-400">Configure appearance, window behavior, memory saver, and backups</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Left Navigation Tabs + Right Tab Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <nav className="w-56 bg-slate-950/60 border-r border-slate-800 p-3.5 space-y-1.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'appearance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Palette className="w-4 h-4 text-pink-400" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('suspension')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'suspension'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Memory Saver</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Backup & Data</span>
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'shortcuts'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Keyboard className="w-4 h-4 text-purple-400" />
              <span>Shortcuts</span>
            </button>

            <div className="pt-2 border-t border-slate-800/80 my-1" />

            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'about'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span>About SpaceTabs</span>
            </button>
          </nav>

          {/* Right Content Pane */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-900/40 text-slate-200 text-xs space-y-7">
            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 mb-1">Window & Space Behavior</h3>
                  <p className="text-slate-400 text-xs mb-5">
                    Control how spaces interact with your browser windows.
                  </p>

                  <div className="space-y-3.5">
                    {/* Default Open Mode */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Open in New Window by Default</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          When clicking a space, open it in a dedicated new window instead of the current window.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('defaultOpenInNewWindow')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.defaultOpenInNewWindow ? 'bg-blue-600' : 'bg-slate-800'
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
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Suspend Tabs on Space Switch</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Automatically suspend tabs when switching to another space to save RAM.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('discardOnSpaceSwitch')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.discardOnSpaceSwitch ? 'bg-blue-600' : 'bg-slate-800'
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
                  <h3 className="text-sm font-bold text-slate-100 mb-1">Visual Preferences</h3>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Show Web Favicons</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Display site favicons next to tabs and resources.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('showTabFavicons')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.showTabFavicons ? 'bg-blue-600' : 'bg-slate-800'
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

            {/* TAB: APPEARANCE (NEW!) */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-pink-400" />
                      <span>Appearance & Color Themes</span>
                    </h3>
                  </div>
                  <p className="text-slate-400 text-xs mb-5">
                    Customize your workspace appearance. You can change the Sidebar and Dashboard themes independently.
                  </p>

                  {/* Quick Presets */}
                  <div className="mb-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">Quick Style Presets</div>
                      <div className="text-[11px] text-slate-500">1-click popular color themes</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplyPreset('dark', 'light')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                          sidebarTheme === 'dark' && dashboardTheme === 'light'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        Workona (Dark/Light)
                      </button>

                      <button
                        onClick={() => handleApplyPreset('dark', 'dark')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                          sidebarTheme === 'dark' && dashboardTheme === 'dark'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        All Dark
                      </button>

                      <button
                        onClick={() => handleApplyPreset('light', 'light')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                          sidebarTheme === 'light' && dashboardTheme === 'light'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        All Light
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Sidebar Theme */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Columns className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Sidebar Theme
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Color scheme for spaces, sections, and the left navigation menu.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Dark Sidebar Card */}
                      <div
                        onClick={() => handleSidebarThemeChange('dark')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          sidebarTheme === 'dark'
                            ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                        }`}
                      >
                        {/* Mockup Preview Box */}
                        <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden">
                          <div className="w-1/3 h-full rounded bg-slate-900 border border-slate-800/80 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-blue-600/60" />
                            <div className="w-3/4 h-1.5 rounded bg-slate-700" />
                            <div className="w-4/5 h-1.5 rounded bg-slate-700" />
                          </div>
                          <div className="flex-1 h-full rounded bg-slate-900/50 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-slate-800" />
                            <div className="w-full h-6 rounded bg-slate-800/60" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                              <Moon className="w-3.5 h-3.5 text-blue-400" />
                              <span>Dark Sidebar</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Deep slate palette</div>
                          </div>
                          {sidebarTheme === 'dark' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Light Sidebar Card */}
                      <div
                        onClick={() => handleSidebarThemeChange('light')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          sidebarTheme === 'light'
                            ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                        }`}
                      >
                        {/* Mockup Preview Box */}
                        <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden">
                          <div className="w-1/3 h-full rounded bg-white border border-slate-200 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-blue-600" />
                            <div className="w-3/4 h-1.5 rounded bg-slate-300" />
                            <div className="w-4/5 h-1.5 rounded bg-slate-300" />
                          </div>
                          <div className="flex-1 h-full rounded bg-slate-900/50 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-slate-800" />
                            <div className="w-full h-6 rounded bg-slate-800/60" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                              <Sun className="w-3.5 h-3.5 text-amber-400" />
                              <span>Light Sidebar</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Clean white & crisp borders</div>
                          </div>
                          {sidebarTheme === 'light' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Dashboard Canvas Theme */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Layout className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Dashboard & Canvas Theme
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Color scheme for tabs, resources, markdown notes, and tasks.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Dark Dashboard Card */}
                      <div
                        onClick={() => handleDashboardThemeChange('dark')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          dashboardTheme === 'dark'
                            ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                        }`}
                      >
                        {/* Mockup Preview Box */}
                        <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden">
                          <div className="w-1/4 h-full rounded bg-slate-900 border border-slate-800/80 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-slate-800" />
                          </div>
                          <div className="flex-1 h-full rounded bg-slate-900 border border-slate-800 p-1.5 flex flex-col gap-1.5">
                            <div className="w-full h-2 rounded bg-slate-800" />
                            <div className="flex gap-1">
                              <div className="flex-1 h-7 rounded bg-slate-800/80" />
                              <div className="flex-1 h-7 rounded bg-slate-800/80" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                              <Moon className="w-3.5 h-3.5 text-blue-400" />
                              <span>Dark Dashboard</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Deep slate background</div>
                          </div>
                          {dashboardTheme === 'dark' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Light Dashboard Card */}
                      <div
                        onClick={() => handleDashboardThemeChange('light')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
                          dashboardTheme === 'light'
                            ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                        }`}
                      >
                        {/* Mockup Preview Box */}
                        <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden">
                          <div className="w-1/4 h-full rounded bg-slate-900 border border-slate-800/80 p-1 flex flex-col gap-1">
                            <div className="w-full h-2 rounded bg-slate-800" />
                          </div>
                          <div className="flex-1 h-full rounded bg-white border border-slate-200 p-1.5 flex flex-col gap-1.5">
                            <div className="w-full h-2 rounded bg-slate-200" />
                            <div className="flex gap-1">
                              <div className="flex-1 h-7 rounded bg-slate-100 border border-slate-200" />
                              <div className="flex-1 h-7 rounded bg-slate-100 border border-slate-200" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                              <Sun className="w-3.5 h-3.5 text-amber-400" />
                              <span>Light Dashboard</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">White workspace (Workona look)</div>
                          </div>
                          {dashboardTheme === 'light' && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
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
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Chromium Native Memory Saver</span>
                    </h3>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                      Zero Tab Loss
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mb-5">
                    Discards inactive background tabs to purge RAM without losing tab history, titles, or page position.
                  </p>

                  <div className="space-y-4">
                    {/* Auto-suspend toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Enable Automatic Tab Discarding</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Periodically purge idle background tabs (audible & active tabs are never touched).
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('autoSuspendEnabled')}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.autoSuspendEnabled ? 'bg-blue-600' : 'bg-slate-800'
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
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-slate-200 text-xs">Discard tabs after being inactive for:</span>
                          <span className="font-mono text-blue-400 text-xs font-bold">
                            {settings.idleThresholdMinutes} minutes
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2.5">
                          {[15, 30, 60, 120].map((min) => (
                            <button
                              key={min}
                              onClick={() => handleSelectThreshold(min)}
                              className={`py-2 px-3 rounded-lg text-xs font-semibold transition border ${
                                settings.idleThresholdMinutes === min
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
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
                        className="w-full py-3 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-sm"
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
                  <h3 className="text-sm font-bold text-slate-100 mb-1">Database & Storage Statistics</h3>
                  <p className="text-slate-400 text-xs mb-5">
                    Your entire workspace is stored 100% locally on your machine using IndexedDB.
                  </p>

                  <div className="grid grid-cols-5 gap-3 mb-6">
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <Layers className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{spacesCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Spaces</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <Bookmark className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{savedTabsCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Saved Tabs</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <FileText className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{notesCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Notes</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <ListTodo className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{tasksCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tasks</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{resourcesCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Resources</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 mb-1">Export & Import</h3>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Full Workspace Backup</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Export all spaces, tabs, notes, tasks, and resources to a single JSON backup.
                        </div>
                      </div>
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export Backup</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Restore from Backup</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Restore spaces and workspace data from an existing SpaceTabs JSON backup.
                        </div>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/60 transition"
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

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">Purge Stale Unsaved Tabs</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Clean out closed tabs from the unsaved cache to keep your storage lightweight.
                        </div>
                      </div>
                      <button
                        onClick={handlePurge}
                        disabled={isPurging}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/60 transition"
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
                <h3 className="text-sm font-bold text-slate-100 mb-1">Keyboard Shortcuts</h3>
                <p className="text-slate-400 text-xs mb-5">
                  Boost your productivity with quick navigation and formatting hotkeys.
                </p>

                <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-200 font-medium">Jump to SpaceTabs Dashboard</span>
                    <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 font-semibold">
                      Alt + Shift + W
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-200 font-medium">Force Save Active Note</span>
                    <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 font-semibold">
                      Ctrl + S / Cmd + S
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-200 font-medium">Bold Note Text</span>
                    <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 font-semibold">
                      Ctrl + B / Cmd + B
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-200 font-medium">Italic Note Text</span>
                    <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 font-semibold">
                      Ctrl + I / Cmd + I
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3.5">
                    <span className="text-slate-200 font-medium">Indent Checklist / Line in Note</span>
                    <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-blue-300 font-semibold">
                      Tab (2 spaces)
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 mx-auto mb-3 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                    <Layers className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">SpaceTabs</h3>
                  <p className="text-xs text-blue-400 font-mono mt-0.5">Version 1.0.0 • Manifest V3</p>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mt-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No 5-Space Limit — Free & Open Workspace Suite</span>
                  </div>
                </div>

                <div className="space-y-3 text-slate-300 text-xs leading-relaxed">
                  <p className="text-slate-200 font-medium">
                    <strong>SpaceTabs</strong> is built as a fast, private, and completely free alternative to Workona.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs">
                    <li><strong>No Artificial Space Limits:</strong> Create unlimited spaces, sections, tabs, and resources.</li>
                    <li><strong>Independent Theming:</strong> Toggle light/dark mode for sidebar and workspace canvas separately.</li>
                    <li><strong>100% Local Privacy:</strong> All data resides on your machine in IndexedDB. Zero cloud telemetry.</li>
                    <li><strong>Native Chromium Memory Saver:</strong> Background tabs are safely suspended using Chrome's native discard engine to save up to 80% RAM.</li>
                    <li><strong>Full Workspace Productivity:</strong> Integrated Tabs, Resources, Notes, and Tasks for each space.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-5 right-5 z-50 bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
