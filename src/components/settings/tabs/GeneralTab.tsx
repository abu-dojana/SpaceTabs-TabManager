import React from 'react';
import { RotateCcw } from 'lucide-react';
import { type UserSettings } from '@/services/settings';
import { ToggleRow } from '../ui/ToggleRow';

interface GeneralTabProps {
  settings: UserSettings;
  isLight: boolean;
  onToggle: (key: keyof UserSettings) => void;
  onRestoreAllSuspended?: () => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({
  settings,
  isLight,
  onToggle,
  onRestoreAllSuspended,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Window & Space Behavior
        </h3>
        <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          Control how spaces interact with your browser windows.
        </p>

        <div className="space-y-3.5">
          <ToggleRow
            title="Open in New Window by Default"
            description="When clicking a space, open it in a dedicated new window instead of the current window."
            checked={settings.defaultOpenInNewWindow}
            onToggle={() => onToggle('defaultOpenInNewWindow')}
            isLight={isLight}
          />

          <ToggleRow
            title="Suspend Tabs on Space Switch"
            description="Automatically suspend tabs when switching to another space to save RAM (keeps clean #https://... URLs at the end)."
            checked={settings.discardOnSpaceSwitch}
            onToggle={() => onToggle('discardOnSpaceSwitch')}
            isLight={isLight}
          />

          {onRestoreAllSuspended && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Restore All Suspended Tabs to Clean URLs
                </div>
                <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Unsuspend all open placeholder tabs back to their clean website URLs (useful before disabling or removing the extension).
                </div>
              </div>
              <button
                type="button"
                onClick={onRestoreAllSuspended}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore URLs</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Visual Preferences
        </h3>
        <div className="space-y-3.5">
          <ToggleRow
            title="Show Web Favicons"
            description="Display site favicons next to tabs and resources."
            checked={settings.showTabFavicons}
            onToggle={() => onToggle('showTabFavicons')}
            isLight={isLight}
          />
        </div>
      </div>
    </div>
  );
};
