import React from 'react';
import {
  X,
  Settings,
  Sliders,
  Palette,
  Database,
  Keyboard,
  Info,
  Zap,
  Cloud,
  User,
} from 'lucide-react';
import { type SettingsModalProps, type SettingsTabId } from './settingsTabs';
import { useSettingsController } from './useSettingsController';
import { useUIStore } from '@/store/uiStore';
import { SettingsToast } from './ui/SettingsToast';
import { GeneralTab } from './tabs/GeneralTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { SuspensionTab } from './tabs/SuspensionTab';
import { CloudSyncTab } from './tabs/CloudSyncTab';
import { ConfirmPullModal } from './tabs/ConfirmPullModal';
import { BackupTab } from './tabs/BackupTab';
import { ShortcutsTab } from './tabs/ShortcutsTab';
import { AboutTab } from './tabs/AboutTab';
import { ContactTab } from './tabs/ContactTab';

const PRIMARY_NAV_ITEMS: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Sliders className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4 text-pink-400" /> },
  { id: 'suspension', label: 'Memory Saver', icon: <Zap className="w-4 h-4 text-amber-400" /> },
  { id: 'cloud', label: 'Google Drive Sync', icon: <Cloud className="w-4 h-4 text-sky-400" /> },
  { id: 'backup', label: 'Backup & Data', icon: <Database className="w-4 h-4 text-emerald-400" /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="w-4 h-4 text-purple-400" /> },
];

const SECONDARY_NAV_ITEMS: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'about', label: 'About SpaceTabs', icon: <Info className="w-4 h-4 text-cyan-400" /> },
  { id: 'contact', label: 'Credits & Contact', icon: <User className="w-4 h-4 text-emerald-400" /> },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
}) => {
  const c = useSettingsController(isOpen, initialTab);
  const { settingsScrollTarget } = useUIStore();

  if (!isOpen) return null;

  const renderNavButton = (item: { id: SettingsTabId; label: string; icon: React.ReactNode }) => {
    const isActive = c.activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => c.setActiveTab(item.id)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
          isActive
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
            : c.isLight
            ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {item.icon}
          <span>{item.label}</span>
        </div>
        {item.id === 'cloud' && c.syncInfo?.profile && (
          <span
            className={`w-2 h-2 rounded-full ${
              c.syncInfo.status === 'syncing'
                ? 'bg-amber-400 animate-pulse'
                : c.syncInfo.status === 'error'
                ? 'bg-rose-500'
                : 'bg-emerald-400'
            }`}
          />
        )}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl h-[680px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl select-none animate-in fade-in zoom-in-95 duration-100 overflow-hidden relative border ${
          c.isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-900/10'
            : 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-8 py-5 border-b flex items-center justify-between flex-shrink-0 ${
            c.isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${c.isLight ? 'text-slate-900' : 'text-white'}`}>
                Settings & Preferences
              </h2>
              <p
                className={`text-xs ${
                  c.isLight ? 'text-slate-600' : 'text-slate-300 font-medium'
                }`}
              >
                Configure appearance, window behavior, memory saver, and backups
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              c.isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          <nav
            className={`w-56 border-r p-3.5 space-y-1.5 flex-shrink-0 ${
              c.isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/90 border-slate-800'
            }`}
          >
            {PRIMARY_NAV_ITEMS.map(renderNavButton)}
            <div
              className={`pt-2 border-t my-1 ${
                c.isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            />
            {SECONDARY_NAV_ITEMS.map(renderNavButton)}
          </nav>

          <div
            className={`flex-1 overflow-y-auto p-8 text-xs space-y-7 ${
              c.isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'
            }`}
          >
            {c.activeTab === 'general' && (
              <GeneralTab
                settings={c.settings}
                isLight={c.isLight}
                onToggle={c.handleToggle}
                onRestoreAllSuspended={c.handleRestoreAllSuspended}
              />
            )}

            {c.activeTab === 'appearance' && (
              <AppearanceTab
                isLight={c.isLight}
                sidebarTheme={c.sidebarTheme}
                dashboardTheme={c.dashboardTheme}
                accentColor={c.accentColor}
                darkPalette={c.darkPalette}
                lightPalette={c.lightPalette}
                sidebarWidth={c.sidebarWidth}
                onApplyPreset={c.handleApplyPreset}
                onSidebarThemeChange={c.handleSidebarThemeChange}
                onSidebarWidthChange={c.handleSidebarWidthChange}
                onDashboardThemeChange={c.handleDashboardThemeChange}
                onAccentColorChange={c.handleAccentColorChange}
                onDarkPaletteChange={c.handleDarkPaletteChange}
                onLightPaletteChange={c.handleLightPaletteChange}
              />
            )}

            {c.activeTab === 'suspension' && (
              <SuspensionTab
                settings={c.settings}
                isLight={c.isLight}
                isSuspending={c.isSuspending}
                onToggle={c.handleToggle}
                onSelectThreshold={c.handleSelectThreshold}
                onInstantSuspend={c.handleInstantSuspend}
              />
            )}

            {c.activeTab === 'cloud' && (
              <CloudSyncTab
                syncInfo={c.syncInfo}
                isLight={c.isLight}
                isSigningIn={c.isSigningIn}
                isSyncingNow={c.isSyncingNow}
                isPushing={c.isPushing}
                isPulling={c.isPulling}
                onSignInGoogle={c.handleSignInGoogle}
                onSignOut={c.handleSignOut}
                onSyncNow={c.handleSyncNow}
                onForcePush={c.handleForcePush}
                onOpenConfirmPull={() => c.setConfirmPullModal(true)}
                onToggleAutoSync={c.handleToggleAutoSync}
                onSelectInterval={c.handleSelectInterval}
                onToggleStartupSync={c.handleToggleStartupSync}
              />
            )}

            {c.activeTab === 'backup' && (
              <BackupTab
                isLight={c.isLight}
                spacesCount={c.spacesCount}
                savedTabsCount={c.savedTabsCount}
                notesCount={c.notesCount}
                tasksCount={c.tasksCount}
                resourcesCount={c.resourcesCount}
                isPurging={c.isPurging}
                fileInputRef={c.fileInputRef}
                onExport={c.handleExport}
                onImportFile={c.handleImportFile}
                onPurge={c.handlePurge}
              />
            )}

            {c.activeTab === 'shortcuts' && (
              <ShortcutsTab
                isLight={c.isLight}
                dashboardShortcut={c.dashboardShortcut}
                isShortcutAssigned={c.isShortcutAssigned}
              />
            )}

            {c.activeTab === 'about' && (
              <AboutTab
                isLight={c.isLight}
                accentColor={c.accentColor}
                onNavigateContact={() => c.setActiveTab('contact')}
                scrollTarget={settingsScrollTarget}
              />
            )}

            {c.activeTab === 'contact' && (
              <ContactTab isLight={c.isLight} onCopyBkash={c.handleCopyBkash} />
            )}
          </div>
        </div>

        <ConfirmPullModal
          isOpen={c.confirmPullModal}
          isLight={c.isLight}
          isPulling={c.isPulling}
          onCancel={() => c.setConfirmPullModal(false)}
          onConfirm={c.handleForcePull}
        />

        <SettingsToast toast={c.toastMessage} />
      </div>
    </div>
  );
};
