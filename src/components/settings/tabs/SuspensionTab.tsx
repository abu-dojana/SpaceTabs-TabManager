import React from 'react';
import { Zap } from 'lucide-react';
import { type UserSettings } from '@/services/settings';
import { ToggleRow } from '../ui/ToggleRow';

interface SuspensionTabProps {
  settings: UserSettings;
  isLight: boolean;
  isSuspending: boolean;
  onToggle: (key: keyof UserSettings) => void;
  onSelectThreshold: (minutes: number) => void;
  onInstantSuspend: () => void;
}

export const SuspensionTab: React.FC<SuspensionTabProps> = ({
  settings,
  isLight,
  isSuspending,
  onToggle,
  onSelectThreshold,
  onInstantSuspend,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3
            className={`text-sm font-bold flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
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
          <ToggleRow
            title="Enable Automatic Tab Discarding"
            description="Periodically purge idle background tabs (audible & active tabs are never touched)."
            checked={settings.autoSuspendEnabled}
            onToggle={() => onToggle('autoSuspendEnabled')}
            isLight={isLight}
          />

          {settings.autoSuspendEnabled && (
            <div
              className={`p-4 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
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
                    onClick={() => onSelectThreshold(min)}
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

          <div className="pt-2">
            <button
              onClick={onInstantSuspend}
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
  );
};
