import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
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
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'suspension' | 'backup' | 'shortcuts' | 'about';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = React.useState<
    'general' | 'suspension' | 'backup' | 'shortcuts' | 'about'
  >(initialTab);

  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSuspending, setIsSuspending] = React.useState(false);
  const [isPurging, setIsPurging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync initial tab when opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      getUserSettings().then(setSettings);
    }
  }, [isOpen, initialTab]);

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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl h-[560px] flex flex-col shadow-2xl select-none animate-in fade-in zoom-in-95 duration-100 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Settings & Preferences</h2>
              <p className="text-[11px] text-slate-400">Configure SpaceTabs behavior, memory saver, and backups</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Left Navigation Tabs + Right Tab Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <nav className="w-48 bg-slate-950/60 border-r border-slate-800 p-2.5 space-y-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab('suspension')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                activeTab === 'suspension'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Memory Saver</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Backup & Data</span>
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                activeTab === 'shortcuts'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-purple-400" />
              <span>Shortcuts</span>
            </button>

            <div className="pt-2 border-t border-slate-800/80 my-1" />

            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                activeTab === 'about'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>About SpaceTabs</span>
            </button>
          </nav>

          {/* Right Content Pane */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/40 text-slate-200 text-xs space-y-6">
            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-1">Window & Space Behavior</h3>
                  <p className="text-slate-400 text-[11px] mb-4">
                    Control how spaces interact with your browser windows.
                  </p>

                  <div className="space-y-3">
                    {/* Default Open Mode */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-medium text-slate-200">Open in New Window by Default</div>
                        <div className="text-[11px] text-slate-500">
                          When clicking a space, open it in a dedicated new window instead of the current window.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('defaultOpenInNewWindow')}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.defaultOpenInNewWindow ? 'bg-blue-600' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.defaultOpenInNewWindow ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Discard on Space Switch */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-medium text-slate-200">Suspend Tabs on Space Switch</div>
                        <div className="text-[11px] text-slate-500">
                          Automatically suspend tabs when switching to another space to save RAM.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('discardOnSpaceSwitch')}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.discardOnSpaceSwitch ? 'bg-blue-600' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.discardOnSpaceSwitch ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-1">Visual Preferences</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-medium text-slate-200">Show Web Favicons</div>
                        <div className="text-[11px] text-slate-500">
                          Display site favicons next to tabs and resources.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('showTabFavicons')}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.showTabFavicons ? 'bg-blue-600' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.showTabFavicons ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
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
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Chromium Native Memory Saver</span>
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Zero Tab Loss
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mb-4">
                    Discards inactive background tabs to purge RAM without losing tab history, titles, or page position.
                  </p>

                  <div className="space-y-3">
                    {/* Auto-suspend toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-medium text-slate-200">Enable Automatic Tab Discarding</div>
                        <div className="text-[11px] text-slate-500">
                          Periodically purge idle background tabs (audible & active tabs are never touched).
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('autoSuspendEnabled')}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ease-in-out ${
                          settings.autoSuspendEnabled ? 'bg-blue-600' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
                            settings.autoSuspendEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Inactive threshold */}
                    {settings.autoSuspendEnabled && (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-200">Discard tabs after being inactive for:</span>
                          <span className="font-mono text-blue-400 text-[11px]">
                            {settings.idleThresholdMinutes} minutes
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[15, 30, 60, 120].map((min) => (
                            <button
                              key={min}
                              onClick={() => handleSelectThreshold(min)}
                              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition border ${
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
                        className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl font-medium transition flex items-center justify-center gap-2"
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
                  <h3 className="text-sm font-semibold text-slate-100 mb-1">Database & Storage Statistics</h3>
                  <p className="text-slate-400 text-[11px] mb-4">
                    Your entire workspace is stored 100% locally on your machine using IndexedDB.
                  </p>

                  <div className="grid grid-cols-3 gap-2.5 mb-5">
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <Layers className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{spacesCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Spaces</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <Bookmark className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{savedTabsCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Saved Tabs</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <FileText className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{notesCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Notes</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <ListTodo className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{tasksCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Tasks</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-base font-bold text-slate-100">{resourcesCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Resources</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 mb-1">Export & Import</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200">Full Workspace Backup</div>
                        <div className="text-[11px] text-slate-400">
                          Export all spaces, tabs, notes, tasks, and resources to a single JSON backup.
                        </div>
                      </div>
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Backup</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200">Restore from Backup</div>
                        <div className="text-[11px] text-slate-400">
                          Restore spaces and workspace data from an existing SpaceTabs JSON backup.
                        </div>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700/60 transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
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

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <div className="font-semibold text-slate-200">Purge Stale Unsaved Tabs</div>
                        <div className="text-[11px] text-slate-400">
                          Clean out closed tabs from the unsaved cache to keep your storage lightweight.
                        </div>
                      </div>
                      <button
                        onClick={handlePurge}
                        disabled={isPurging}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700/60 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{isPurging ? 'Cleaning...' : 'Clean Cache'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <h3 className="text-sm font-semibold text-slate-100 mb-1">Keyboard Shortcuts</h3>
                <p className="text-slate-400 text-[11px] mb-4">
                  Boost your productivity with quick navigation and formatting hotkeys.
                </p>

                <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-300">Jump to SpaceTabs Dashboard</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-blue-300">
                      Alt + Shift + W
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-300">Force Save Note</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-blue-300">
                      Ctrl + S / Cmd + S
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-300">Bold Note Text</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-blue-300">
                      Ctrl + B / Cmd + B
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-300">Italic Note Text</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-blue-300">
                      Ctrl + I / Cmd + I
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-300">Indent in Note Editor</span>
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-blue-300">
                      Tab (2 spaces)
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto mb-2 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">SpaceTabs</h3>
                  <p className="text-xs text-blue-400 font-mono mt-0.5">Version 1.0.0 • Manifest V3</p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mt-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>No 5-Space Limit — Free & Open</span>
                  </div>
                </div>

                <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
                  <p>
                    <strong>SpaceTabs</strong> is built as a fast, private, and unlimited workspace alternative to Workona.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                    <li><strong>No Artificial Space Limits:</strong> Create as many spaces, sections, tabs, and workspaces as you want.</li>
                    <li><strong>100% Local Privacy:</strong> All data resides exclusively on your device in IndexedDB. No external tracking.</li>
                    <li><strong>Native Chromium Memory Saver:</strong> Background tabs are safely suspended using Chrome's native discard engine to save up to 80% RAM.</li>
                    <li><strong>Workona-Grade Suite:</strong> Full integration of Tabs, Resources, Notes, and Tasks per space.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-4 right-4 z-50 bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
