import React from 'react';
import {
  Cloud,
  RefreshCw,
  FolderOpen,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { type DriveSyncInfo } from '@/services/driveSync';
import { formatSyncTimestamp } from '@/utils/time';

interface CloudSyncTabProps {
  syncInfo: DriveSyncInfo | null;
  isLight: boolean;
  isSigningIn: boolean;
  isSyncingNow: boolean;
  isPushing: boolean;
  isPulling: boolean;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onForcePush: () => void;
  onOpenConfirmPull: () => void;
  onToggleAutoSync: () => void;
  onSelectInterval: (minutes: number) => void;
  onToggleStartupSync: () => void;
}

export const CloudSyncTab: React.FC<CloudSyncTabProps> = ({
  syncInfo,
  isLight,
  isSigningIn,
  isSyncingNow,
  isPushing,
  isPulling,
  onSignInGoogle,
  onSignOut,
  onSyncNow,
  onForcePush,
  onOpenConfirmPull,
  onToggleAutoSync,
  onSelectInterval,
  onToggleStartupSync,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      {/* 1. Header & Account Status */}
      <div>
        <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Google Account & Cloud Backup
        </h3>
        <p className={`text-xs mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          Bi-directionally synchronize your spaces, tabs, notes, tasks, and resources directly with your personal Google Drive.
        </p>

        {syncInfo?.profile ? (
          <div
            className={`p-5 rounded-2xl border ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                    Last synced: {formatSyncTimestamp(syncInfo.lastSyncTime)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onSyncNow}
                  disabled={isSyncingNow || syncInfo.status === 'syncing'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSyncingNow || syncInfo.status === 'syncing' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {isSyncingNow || syncInfo.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </span>
                </button>
                <button
                  onClick={onSignOut}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isLight
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
          <div
            className={`p-6 rounded-2xl border ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    isLight ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  Keep your spaces, saved tabs, notes, tasks, and bookmarks synchronized across all your computers. Everything is stored directly in your private Google Drive under{' '}
                  <span className="font-mono text-blue-400 font-semibold">SpaceTabs_Data</span> with zero intermediate servers.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onSignInGoogle}
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

      {/* 2. Drive Storage & Folder Details */}
      {syncInfo?.profile && (
        <div>
          <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Google Drive Storage
          </h3>
          <p className={`text-xs mb-3 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Target folder and backup file located on your Google Drive.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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

            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                onClick={onForcePush}
                disabled={isPushing}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>{isPushing ? 'Uploading...' : 'Push to Drive'}</span>
              </button>
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                onClick={onOpenConfirmPull}
                disabled={isPulling}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs border transition disabled:opacity-50 cursor-pointer ${
                  isLight
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
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
              onClick={onToggleAutoSync}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                syncInfo?.settings?.autoSync
                  ? 'bg-blue-600'
                  : isLight
                  ? 'bg-slate-300'
                  : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block w-4 h-4 rounded-full bg-white transition-transform transform ${
                  syncInfo?.settings?.autoSync ? 'translate-x-6' : 'translate-x-1'
                } top-1 absolute left-0 shadow`}
              />
            </button>
          </div>

          {syncInfo?.settings?.autoSync && (
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
                    onClick={() => onSelectInterval(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      (syncInfo?.settings?.syncIntervalMinutes || 15) === m
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

          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
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
              onClick={onToggleStartupSync}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                syncInfo?.settings?.syncOnStartup
                  ? 'bg-blue-600'
                  : isLight
                  ? 'bg-slate-300'
                  : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block w-4 h-4 rounded-full bg-white transition-transform transform ${
                  syncInfo?.settings?.syncOnStartup ? 'translate-x-6' : 'translate-x-1'
                } top-1 absolute left-0 shadow`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
