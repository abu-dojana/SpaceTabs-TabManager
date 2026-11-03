import React from 'react';
import { type UserSettings } from '@/services/settings';
import { ToggleRow } from '../ui/ToggleRow';

interface GeneralTabProps {
  settings: UserSettings;
  isLight: boolean;
  onToggle: (key: keyof UserSettings) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ settings, isLight, onToggle }) => {
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
            description="Automatically suspend tabs when switching to another space to save RAM."
            checked={settings.discardOnSpaceSwitch}
            onToggle={() => onToggle('discardOnSpaceSwitch')}
            isLight={isLight}
          />
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
