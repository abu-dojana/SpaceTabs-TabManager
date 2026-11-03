import React from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { type DriveSyncInfo } from '@/services/driveSync';

interface SidebarBrandHeaderProps {
  accentColor: string;
  syncInfo: DriveSyncInfo | null;
  onOpenCloudSettings: () => void;
}

export const SidebarBrandHeader: React.FC<SidebarBrandHeaderProps> = ({
  accentColor,
  syncInfo,
  onOpenCloudSettings,
}) => {
  return (
    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-colors duration-150"
          style={{
            backgroundColor: accentColor || '#f43f5e',
            boxShadow: `0 4px 14px 0 ${accentColor || '#f43f5e'}40`,
          }}
        >
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-slate-100 tracking-tight text-base">SpaceTabs</span>
          {syncInfo?.profile ? (
            syncInfo.status === 'syncing' ? (
              <button
                onClick={onOpenCloudSettings}
                className="text-[11px] text-amber-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                title="Syncing in progress — Click to open Cloud Sync settings"
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Syncing...</span>
              </button>
            ) : syncInfo.status === 'error' ? (
              <button
                onClick={onOpenCloudSettings}
                className="text-[11px] text-rose-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                title={syncInfo.lastSyncError || 'Sync Error — Click to configure'}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Sync Error</span>
              </button>
            ) : (
              <button
                onClick={onOpenCloudSettings}
                className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                title="Google Drive connected & synced — Click to view"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Drive Synced</span>
              </button>
            )
          ) : (
            <button
              onClick={onOpenCloudSettings}
              className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center gap-1 font-medium transition cursor-pointer"
              title="Cloud Sync inactive — Sign in with Google Drive"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>Local-First</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Avatar & Sync Status */}
      <button
        onClick={onOpenCloudSettings}
        className="relative group p-0.5 rounded-full hover:ring-2 hover:ring-blue-500/50 transition cursor-pointer"
        title={
          syncInfo?.profile
            ? `${syncInfo.profile.name} (${syncInfo.profile.email})\nClick to manage Google Drive sync`
            : 'Connect Google Account to enable Cloud Sync'
        }
      >
        {syncInfo?.profile?.picture ? (
          <img
            src={syncInfo.profile.picture}
            alt={syncInfo.profile.name}
            className="w-7 h-7 rounded-full object-cover border border-blue-400/40 group-hover:border-blue-400 transition shadow-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 group-hover:border-blue-400/60 flex items-center justify-center text-xs font-bold text-blue-400 transition shadow-sm">
            {syncInfo?.profile?.name ? syncInfo.profile.name.charAt(0).toUpperCase() : 'A'}
          </div>
        )}

        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
            syncInfo?.profile
              ? syncInfo.status === 'syncing'
                ? 'bg-amber-400 animate-spin'
                : syncInfo.status === 'error'
                ? 'bg-rose-500'
                : 'bg-emerald-400'
              : 'bg-slate-500'
          }`}
        />
      </button>
    </div>
  );
};
