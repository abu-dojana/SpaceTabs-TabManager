import React from 'react';
import { Heart, Settings, CheckCircle2 } from 'lucide-react';

interface SidebarFooterProps {
  onOpenSupport: () => void;
  onOpenSettings: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  onOpenSupport,
  onOpenSettings,
}) => {
  return (
    <div className="sidebar-footer p-2 border-t border-slate-800/80 bg-slate-950/60 flex-shrink-0 space-y-1">
      {/* Support Creator Button */}
      <button
        onClick={onOpenSupport}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition group border border-transparent text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 cursor-pointer"
        title="Support Abu Dojana (SupportKori, bKash, Patreon, SociaBuzz)"
      >
        <div className="flex items-center gap-2.5">
          <Heart className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform fill-rose-500/20 group-hover:fill-rose-500" />
          <span className="font-semibold text-slate-300 group-hover:text-rose-300">
            Support Creator
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          Donate
        </span>
      </button>

      {/* Settings Button */}
      <button
        onClick={onOpenSettings}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition group border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 hover:border-slate-800/80 cursor-pointer"
        title="Open Settings & Preferences"
      >
        <div className="flex items-center gap-2.5">
          <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition" />
          <span className="font-semibold text-slate-300 group-hover:text-white">Settings</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        </div>
      </button>
    </div>
  );
};
